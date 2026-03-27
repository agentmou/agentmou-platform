import {
  DelegationEnvelopeSchema,
  OpenClawTurnResultSchema,
  type ApprovalIntent,
  type CoherenceSignalSummary,
  type DelegationEnvelope,
  type OpenClawOperatorMessage,
  type OpenClawPlannedDelegation,
  type OpenClawPlannedWorkOrder,
  type OpenClawTurnInput,
  type WorkOrderKind,
} from '@agentmou/contracts';
import {
  db,
  internalCapabilityBindings,
  internalConversationSessions,
  internalDelegations,
  internalMemoryEntries,
  internalObjectives,
  internalOpenClawSessions,
  internalProtocolEvents,
  internalWorkOrders,
} from '@agentmou/db';
import type { InternalWorkOrderPayload } from '@agentmou/queue';
import { and, desc, eq } from 'drizzle-orm';

import {
  createExecutionSnapshot,
  runCoherenceCycle,
  summarizeCycle,
} from '../coherence/runtime.js';
import {
  INTERNAL_AGENT_PROFILES,
  INTERNAL_OPENCLAW_CAPABILITIES,
} from '../org-registry.js';
import type { DecisionRecordInput } from './internal-ops-persistence.js';

const INTERNAL_ENVELOPE_VERSION = '2.0.0';

interface QueueableWorkOrder {
  agentId: string;
  workType: WorkOrderKind;
  executionTarget: 'native' | 'agent_installation' | 'workflow_installation' | 'telegram';
  capabilityKey?: string;
  title: string;
  summary: string;
  requiresApproval: boolean;
  parentDelegationId?: string;
  payload: Record<string, unknown>;
  resumeFromWorkOrderId?: string;
}

export interface PersistedTurnContext {
  sessionId: string;
  objectiveId: string;
  rootRunId: string;
  openclawSessionId: string;
  objectiveOwnerAgentId: string;
  coherence: CoherenceSignalSummary;
}

export interface PersistTurnOptions {
  sessionId: string;
  objectiveId: string;
  rootRunId: string;
  remoteSessionId: string;
  turnResult: ReturnType<typeof OpenClawTurnResultSchema.parse>;
  operatorMessageText: string;
  eventKey: string;
  source: 'telegram' | 'internal_callback' | 'system';
  sourceEventId?: string;
}

interface TurnQueueInput {
  sessionId: string;
  objectiveId: string;
  openclawSessionId: string;
  turnResult: ReturnType<typeof OpenClawTurnResultSchema.parse>;
  coherence: CoherenceSignalSummary;
  operatorChatId: string;
  operatorUserId: string;
}

interface BuildTurnInputOptions {
  sessionId: string;
  objectiveId: string;
  activeAgentId: string;
  operatorMessage: string;
  trigger: OpenClawTurnInput['trigger'];
  remoteSessionId?: string;
  approvalIntent?: ApprovalIntent;
}

interface InternalOpsTurnManagerOptions {
  tenantId: string;
  enqueueWorkOrder: (payload: InternalWorkOrderPayload) => Promise<void>;
  recordDecision: (input: DecisionRecordInput) => Promise<void>;
}

export class InternalOpsTurnManager {
  private readonly tenantId: string;
  private readonly enqueueWorkOrder: (payload: InternalWorkOrderPayload) => Promise<void>;
  private readonly recordDecision: (input: DecisionRecordInput) => Promise<void>;

  constructor(options: InternalOpsTurnManagerOptions) {
    this.tenantId = options.tenantId;
    this.enqueueWorkOrder = options.enqueueWorkOrder;
    this.recordDecision = options.recordDecision;
  }

  async buildTurnInput(input: BuildTurnInputOptions) {
    const memoryRows = await db
      .select()
      .from(internalMemoryEntries)
      .where(eq(internalMemoryEntries.objectiveId, input.objectiveId))
      .orderBy(desc(internalMemoryEntries.createdAt))
      .limit(8);
    const memory: Array<{
      scope: 'agent' | 'objective' | 'session';
      title: string;
      summary: string;
    }> = memoryRows
      .filter((entry) => isMemoryScope(entry.scope))
      .map((entry) => ({
        scope: entry.scope as 'agent' | 'objective' | 'session',
        title: entry.title,
        summary: entry.summary,
      }));

    return {
      tenantId: this.tenantId,
      sessionId: input.sessionId,
      objectiveId: input.objectiveId,
      remoteSessionId: input.remoteSessionId,
      trigger: input.trigger,
      activeAgentId: input.activeAgentId,
      operatorMessage: input.operatorMessage,
      approvalIntent: input.approvalIntent,
      agentProfiles: INTERNAL_AGENT_PROFILES,
      capabilities: INTERNAL_OPENCLAW_CAPABILITIES,
      memory,
      context: {
        operatorInterface: 'telegram',
        singleTenantInternalOps: true,
      },
    } satisfies OpenClawTurnInput;
  }

  async persistTurn(options: PersistTurnOptions): Promise<PersistedTurnContext> {
    const snapshot = createExecutionSnapshot({
      messageText: options.operatorMessageText,
      activeAgentId: options.turnResult.activeAgentId,
      participants: dedupeStrings([
        'ceo',
        ...options.turnResult.participants,
        ...options.turnResult.delegations.map((item) => item.recipientAgentId),
      ]),
      contextChannels: dedupeStrings([
        'telegram',
        ...options.turnResult.contextChannels,
      ]),
      toolCalls: options.turnResult.toolCalls,
      successfulResults: options.turnResult.successfulResults,
      retryCount: options.turnResult.retryCount,
      checkpointToken: options.turnResult.checkpointToken,
    });

    const cycle = runCoherenceCycle(snapshot, {
      flowId: `flow.openclaw.${options.objectiveId}.${options.remoteSessionId}`,
    });
    const coherence = summarizeCycle(cycle);

    const [existingOpenClawSession] = await db
      .select()
      .from(internalOpenClawSessions)
      .where(eq(internalOpenClawSessions.remoteSessionId, options.remoteSessionId));

    if (existingOpenClawSession) {
      await db
        .update(internalOpenClawSessions)
        .set({
          status: mapTurnStatusToSessionStatus(options.turnResult.status),
          activeAgentId: options.turnResult.activeAgentId,
          traceReference: options.turnResult.traceReference,
          lastTurnAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(internalOpenClawSessions.id, existingOpenClawSession.id));
    } else {
      await db.insert(internalOpenClawSessions).values({
        tenantId: this.tenantId,
        objectiveId: options.objectiveId,
        remoteSessionId: options.remoteSessionId,
        status: mapTurnStatusToSessionStatus(options.turnResult.status),
        activeAgentId: options.turnResult.activeAgentId,
        primaryAgentId: 'ceo',
        traceReference: options.turnResult.traceReference,
        metadata: {},
      });
    }

    const objectiveStatus = mapTurnStatusToObjectiveStatus(
      options.turnResult.status,
      coherence,
    );

    await db
      .update(internalObjectives)
      .set({
        ownerAgentId: options.turnResult.activeAgentId,
        openclawSessionId: options.remoteSessionId,
        status: objectiveStatus,
        coherenceSummary: coherence,
        updatedAt: new Date(),
        completedAt: objectiveStatus === 'completed' ? new Date() : undefined,
      })
      .where(eq(internalObjectives.id, options.objectiveId));

    await db
      .update(internalConversationSessions)
      .set({
        currentObjectiveId: options.objectiveId,
        openclawSessionId: options.remoteSessionId,
        status:
          objectiveStatus === 'blocked'
            ? 'blocked'
            : objectiveStatus === 'completed'
              ? 'completed'
              : objectiveStatus === 'waiting_approval'
                ? 'waiting_approval'
                : 'active',
        updatedAt: new Date(),
      })
      .where(eq(internalConversationSessions.id, options.sessionId));

    await db.insert(internalProtocolEvents).values({
      tenantId: this.tenantId,
      sessionId: options.sessionId,
      objectiveId: options.objectiveId,
      remoteSessionId: options.remoteSessionId,
      source: options.source,
      sourceEventId: options.sourceEventId,
      eventKey: options.eventKey,
      eventType: 'openclaw.turn',
      businessEnvelope: {
        operatorMessage: options.operatorMessageText,
        turnResult: options.turnResult,
      },
      coherenceArtifacts: {
        alerts: cycle.alerts,
        controlSequences: cycle.control_sequences,
        controlResults: cycle.control_results,
        governorDecision: cycle.governor_decision,
        executionControls: cycle.execution_controls,
      },
      traceReference: options.turnResult.traceReference,
    });

    await this.recordDecision({
      objectiveId: options.objectiveId,
      agentId: options.turnResult.activeAgentId,
      outcome:
        objectiveStatus === 'completed'
          ? 'completed'
          : objectiveStatus === 'blocked'
            ? 'blocked'
            : 'queued',
      summary: options.turnResult.summary,
      rationale: `OpenClaw produced ${options.turnResult.delegations.length} delegation(s) and ${options.turnResult.workOrders.length} work order(s).`,
      metadata: {
        remoteSessionId: options.remoteSessionId,
        traceReference: options.turnResult.traceReference,
      },
    });

    return {
      sessionId: options.sessionId,
      objectiveId: options.objectiveId,
      rootRunId: options.rootRunId,
      openclawSessionId: options.remoteSessionId,
      objectiveOwnerAgentId: options.turnResult.activeAgentId,
      coherence,
    };
  }

  async queueTurnOutputs(input: TurnQueueInput) {
    const queuedWorkOrderIds: string[] = [];
    const persistedDelegationIds = new Map<string, string>();

    for (const delegation of input.turnResult.delegations) {
      const resolvedParentDelegationId = delegation.parentDelegationId
        ? persistedDelegationIds.get(delegation.parentDelegationId)
        : undefined;
      const envelope = buildDelegationEnvelope({
        sessionId: input.sessionId,
        objectiveId: input.objectiveId,
        delegation,
        resolvedParentDelegationId,
        coherence: input.coherence,
      });
      const [created] = await db
        .insert(internalDelegations)
        .values({
          tenantId: this.tenantId,
          objectiveId: input.objectiveId,
          sessionId: input.sessionId,
          senderAgentId: delegation.senderAgentId,
          recipientAgentId: delegation.recipientAgentId,
          parentDelegationId: resolvedParentDelegationId,
          depth: delegation.depth,
          kind: delegation.kind,
          status: 'accepted',
          envelope,
        })
        .returning();

      persistedDelegationIds.set(
        delegation.delegationId ?? buildDelegationKey(delegation),
        created.id,
      );

      await db.insert(internalProtocolEvents).values({
        tenantId: this.tenantId,
        sessionId: input.sessionId,
        objectiveId: input.objectiveId,
        delegationId: created.id,
        remoteSessionId: input.openclawSessionId,
        source: 'system',
        sourceEventId: created.id,
        eventKey: `delegation:${created.id}`,
        eventType: 'delegation.created',
        businessEnvelope: envelope,
        coherenceArtifacts: {},
        traceReference: input.turnResult.traceReference,
      });
    }

    const workOrders = await this.materializeWorkOrders({
      objectiveId: input.objectiveId,
      sessionId: input.sessionId,
      openclawSessionId: input.openclawSessionId,
      workOrders: input.turnResult.workOrders,
      operatorChatId: input.operatorChatId,
      operatorUserId: input.operatorUserId,
      persistedDelegationIds,
      defaultAgentId: input.turnResult.activeAgentId,
    });

    if (
      (input.coherence.reviewRequired || input.coherence.paused) &&
      !workOrders.some((item) => item.workType === 'request_human_approval')
    ) {
      workOrders.push({
        agentId: input.turnResult.activeAgentId,
        workType: 'request_human_approval',
        executionTarget: 'native',
        title: 'Coherence review required',
        summary:
          'The coherence governor requested a bounded review before execution continues.',
        requiresApproval: false,
        payload: {
          reason: 'coherence-governor',
          riskLevel: 'high',
        },
      });
    }

    const operatorMessages =
      input.turnResult.operatorMessages.length > 0
        ? input.turnResult.operatorMessages
        : [
            {
              mode: 'ack',
              text: input.turnResult.summary,
              buttons: [],
            } satisfies OpenClawOperatorMessage,
          ];

    for (const message of operatorMessages) {
      workOrders.push({
        agentId: input.turnResult.activeAgentId,
        workType: 'notify_telegram',
        executionTarget: 'telegram',
        title: `Telegram ${message.mode}`,
        summary: message.text,
        requiresApproval: false,
        payload: {
          mode: message.mode,
          text: message.text,
          buttons: message.buttons,
          chatId: input.operatorChatId,
          userId: input.operatorUserId,
        },
      });
    }

    for (const workOrder of workOrders) {
      const [created] = await db
        .insert(internalWorkOrders)
        .values({
          tenantId: this.tenantId,
          objectiveId: input.objectiveId,
          delegationId: workOrder.parentDelegationId
            ? persistedDelegationIds.get(workOrder.parentDelegationId)
            : undefined,
          parentDelegationId: workOrder.parentDelegationId
            ? persistedDelegationIds.get(workOrder.parentDelegationId)
            : undefined,
          agentId: workOrder.agentId,
          workType: workOrder.workType,
          status: 'queued',
          executionTarget: workOrder.executionTarget,
          capabilityKey: workOrder.capabilityKey,
          openclawSessionId: input.openclawSessionId,
          resumeFromWorkOrderId: workOrder.resumeFromWorkOrderId,
          title: workOrder.title,
          summary: workOrder.summary,
          requiresApproval: workOrder.requiresApproval,
          payload: workOrder.payload,
        })
        .returning();

      queuedWorkOrderIds.push(created.id);
      await this.enqueueWorkOrder({
        tenantId: this.tenantId,
        objectiveId: input.objectiveId,
        workOrderId: created.id,
        workType: created.workType as WorkOrderKind,
      });
    }

    return queuedWorkOrderIds;
  }

  async createNotifyTelegramWorkOrder(input: {
    objectiveId: string;
    sessionId: string;
    openclawSessionId?: string;
    agentId: string;
    chatId: string;
    userId: string;
    mode: 'ack' | 'status' | 'approval' | 'summary' | 'callback';
    text: string;
    buttons?: Array<{ action: string; label: string }>;
  }) {
    const [created] = await db
      .insert(internalWorkOrders)
      .values({
        tenantId: this.tenantId,
        objectiveId: input.objectiveId,
        agentId: input.agentId,
        workType: 'notify_telegram',
        status: 'queued',
        executionTarget: 'telegram',
        openclawSessionId: input.openclawSessionId,
        title: `Telegram ${input.mode}`,
        summary: input.text,
        requiresApproval: false,
        payload: {
          mode: input.mode,
          text: input.text,
          buttons: input.buttons ?? [],
          chatId: input.chatId,
          userId: input.userId,
        },
      })
      .returning();

    await this.enqueueWorkOrder({
      tenantId: this.tenantId,
      objectiveId: input.objectiveId,
      workOrderId: created.id,
      workType: 'notify_telegram',
    });

    return created.id;
  }

  private async materializeWorkOrders(input: {
    objectiveId: string;
    sessionId: string;
    openclawSessionId: string;
    workOrders: OpenClawPlannedWorkOrder[];
    operatorChatId: string;
    operatorUserId: string;
    persistedDelegationIds: Map<string, string>;
    defaultAgentId: string;
  }): Promise<QueueableWorkOrder[]> {
    const materialized: QueueableWorkOrder[] = [];

    for (const workOrder of input.workOrders) {
      if (workOrder.executionTarget === 'telegram') {
        materialized.push({
          agentId: workOrder.agentId || input.defaultAgentId,
          workType: 'notify_telegram',
          executionTarget: 'telegram',
          title: workOrder.title,
          summary: workOrder.summary,
          requiresApproval: false,
          parentDelegationId: workOrder.parentDelegationId,
          payload: {
            mode: 'status',
            text: workOrder.summary,
            chatId: input.operatorChatId,
            userId: input.operatorUserId,
          },
        });
        continue;
      }

      if (
        workOrder.executionTarget === 'agent_installation' ||
        workOrder.executionTarget === 'workflow_installation'
      ) {
        const binding = workOrder.capabilityKey
          ? await this.resolveCapabilityBinding(workOrder.capabilityKey)
          : null;

        if (!binding) {
          materialized.push({
            agentId: workOrder.agentId,
            workType: 'prepare_artifact',
            executionTarget: 'native',
            title: `${workOrder.title} (binding missing)`,
            summary:
              'The requested Agentmou capability is not bound in the internal tenant, so the system produced a native brief instead of external execution.',
            requiresApproval: false,
            parentDelegationId: workOrder.parentDelegationId,
            payload: {
              requestedWorkType: workOrder.workType,
              requestedExecutionTarget: workOrder.executionTarget,
              capabilityKey: workOrder.capabilityKey,
              originalPayload: workOrder.payload,
            },
          });
          continue;
        }

        materialized.push({
          agentId: workOrder.agentId,
          workType:
            binding.targetType === 'agent_installation'
              ? 'run_agent_installation'
              : 'run_workflow_installation',
          executionTarget:
            binding.targetType === 'agent_installation'
              ? 'agent_installation'
              : 'workflow_installation',
          capabilityKey: workOrder.capabilityKey,
          title: workOrder.title,
          summary: workOrder.summary,
          requiresApproval: workOrder.requiresApproval,
          parentDelegationId: workOrder.parentDelegationId,
          resumeFromWorkOrderId: workOrder.resumeFromWorkOrderId,
          payload: {
            ...workOrder.payload,
            capabilityKey: workOrder.capabilityKey,
            agentInstallationId: binding.agentInstallationId,
            workflowInstallationId: binding.workflowInstallationId,
            input: workOrder.payload.input ?? {
              objectiveId: input.objectiveId,
              sessionId: input.sessionId,
              operatorChatId: input.operatorChatId,
              operatorUserId: input.operatorUserId,
            },
          },
        });
        continue;
      }

      materialized.push({
        agentId: workOrder.agentId,
        workType: workOrder.workType,
        executionTarget: workOrder.executionTarget,
        capabilityKey: workOrder.capabilityKey,
        title: workOrder.title,
        summary: workOrder.summary,
        requiresApproval: workOrder.requiresApproval,
        parentDelegationId: workOrder.parentDelegationId,
        resumeFromWorkOrderId: workOrder.resumeFromWorkOrderId,
        payload: workOrder.payload,
      });
    }

    return materialized;
  }

  private async resolveCapabilityBinding(capabilityKey: string) {
    const [binding] = await db
      .select()
      .from(internalCapabilityBindings)
      .where(
        and(
          eq(internalCapabilityBindings.tenantId, this.tenantId),
          eq(internalCapabilityBindings.capabilityKey, capabilityKey),
          eq(internalCapabilityBindings.enabled, true),
        ),
      );

    return binding ?? null;
  }
}

function buildDelegationEnvelope(input: {
  sessionId: string;
  objectiveId: string;
  delegation: OpenClawPlannedDelegation;
  resolvedParentDelegationId?: string;
  coherence: CoherenceSignalSummary;
}): DelegationEnvelope {
  return DelegationEnvelopeSchema.parse({
    contract: {
      system: 'agentmou-internal-ops',
      version: INTERNAL_ENVELOPE_VERSION,
    },
    kind: input.delegation.kind,
    senderAgentId: input.delegation.senderAgentId,
    recipientAgentId: input.delegation.recipientAgentId,
    sessionId: input.sessionId,
    objectiveId: input.objectiveId,
    parentDelegationId: input.resolvedParentDelegationId,
    headline: input.delegation.headline,
    summary: input.delegation.summary,
    requestedAction: input.delegation.requestedAction,
    constraints: input.delegation.constraints,
    expectedArtifacts: input.delegation.expectedArtifacts,
    capabilityKeys: input.delegation.capabilityKeys,
    executionTarget: input.delegation.executionTarget,
    coherence: input.coherence,
    payload: input.delegation.payload,
  });
}

function buildDelegationKey(delegation: OpenClawPlannedDelegation) {
  return [
    delegation.senderAgentId,
    delegation.recipientAgentId,
    delegation.headline,
    delegation.depth,
  ].join(':');
}

function mapTurnStatusToObjectiveStatus(
  status: 'active' | 'waiting_approval' | 'completed' | 'blocked',
  coherence: CoherenceSignalSummary,
) {
  if (status === 'blocked') {
    return 'blocked' as const;
  }
  if (status === 'completed') {
    return 'completed' as const;
  }
  if (status === 'waiting_approval' || coherence.reviewRequired || coherence.paused) {
    return 'waiting_approval' as const;
  }
  return 'active' as const;
}

function mapTurnStatusToSessionStatus(
  status: 'active' | 'waiting_approval' | 'completed' | 'blocked',
) {
  if (status === 'blocked') {
    return 'blocked';
  }
  if (status === 'completed') {
    return 'completed';
  }
  if (status === 'waiting_approval') {
    return 'paused';
  }
  return 'active';
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isMemoryScope(value: string): value is 'agent' | 'objective' | 'session' {
  return value === 'agent' || value === 'objective' || value === 'session';
}
