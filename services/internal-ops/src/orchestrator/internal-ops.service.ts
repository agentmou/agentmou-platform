import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  ApprovalIntentSchema,
  DelegationEnvelopeSchema,
  InternalOpsResponseSchema,
  OpenClawTurnResultSchema,
  TelegramUpdateSchema,
  type ApprovalIntent,
  type CoherenceSignalSummary,
  type DelegationEnvelope,
  type InternalOpsResponse,
  type OpenClawOperatorMessage,
  type OpenClawPlannedDelegation,
  type OpenClawPlannedWorkOrder,
  type OpenClawTurnInput,
  type TelegramUpdate,
  type WorkOrderKind,
} from '@agentmou/contracts';
import {
  approvalRequests,
  db,
  executionRuns,
  internalAgentProfiles,
  internalAgentRelationships,
  internalCapabilityBindings,
  internalConversationSessions,
  internalDecisions,
  internalDelegations,
  internalMemoryEntries,
  internalObjectives,
  internalOpenClawSessions,
  internalProtocolEvents,
  internalTelegramMessages,
  internalWorkOrders,
} from '@agentmou/db';
import { getQueue, QUEUE_NAMES, type InternalWorkOrderPayload } from '@agentmou/queue';
import { and, desc, eq } from 'drizzle-orm';

import {
  createExecutionSnapshot,
  runCoherenceCycle,
  summarizeCycle,
} from '../coherence/runtime.js';
import {
  HttpOpenClawAdapter,
  type OpenClawRunner,
} from '../openclaw/openclaw-runner.js';
import {
  DEFAULT_INTERNAL_CAPABILITY_BINDINGS,
  INTERNAL_AGENT_PROFILES,
  INTERNAL_AGENT_RELATIONSHIPS,
  INTERNAL_OPENCLAW_CAPABILITIES,
} from '../org-registry.js';

const INTERNAL_ENVELOPE_VERSION = '2.0.0';

interface TelegramRequestMeta {
  secretToken?: string;
}

interface ApprovalCallbackInput {
  approvalId: string;
  decision: 'approved' | 'rejected' | 'postponed' | 'reformulate';
  reason?: string;
  actorLabel?: string;
}

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

interface PersistedTurnContext {
  sessionId: string;
  objectiveId: string;
  rootRunId: string;
  openclawSessionId: string;
  objectiveOwnerAgentId: string;
  coherence: CoherenceSignalSummary;
}

interface PersistTurnOptions {
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

interface InternalOpsServiceOptions {
  tenantId?: string;
  runner?: OpenClawRunner;
  enqueueWorkOrder?: (payload: InternalWorkOrderPayload) => Promise<void>;
  telegramBotToken?: string;
  telegramWebhookSecret?: string;
  callbackSecret?: string;
  allowedChatIds?: string[];
  allowedUserIds?: string[];
}

export class InternalOpsService {
  private readonly tenantId: string;
  private readonly runner: OpenClawRunner;
  private readonly enqueueWorkOrder: (payload: InternalWorkOrderPayload) => Promise<void>;
  private readonly telegramBotToken?: string;
  private readonly telegramWebhookSecret?: string;
  private readonly callbackSecret?: string;
  private readonly allowedChatIds: Set<string>;
  private readonly allowedUserIds: Set<string>;
  private registrySynced = false;

  constructor(options: InternalOpsServiceOptions = {}) {
    this.tenantId = options.tenantId ?? process.env.INTERNAL_OPS_TENANT_ID ?? '';
    this.runner = options.runner ?? new HttpOpenClawAdapter();
    this.enqueueWorkOrder =
      options.enqueueWorkOrder ??
      (async (payload) => {
        await getQueue(QUEUE_NAMES.INTERNAL_WORK_ORDER).add(
          `internal-work-order:${payload.workOrderId}`,
          payload,
        );
      });
    this.telegramBotToken =
      options.telegramBotToken ?? process.env.INTERNAL_OPS_TELEGRAM_BOT_TOKEN;
    this.telegramWebhookSecret =
      options.telegramWebhookSecret ??
      process.env.INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET;
    this.callbackSecret =
      options.callbackSecret ?? process.env.INTERNAL_OPS_CALLBACK_SECRET;
    this.allowedChatIds = new Set(
      options.allowedChatIds ??
        parseEnvIdList(process.env.INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS),
    );
    this.allowedUserIds = new Set(
      options.allowedUserIds ??
        parseEnvIdList(process.env.INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS),
    );
  }

  async handleTelegramUpdate(
    updateInput: unknown,
    meta: TelegramRequestMeta = {},
  ): Promise<InternalOpsResponse> {
    this.ensureTenantId();
    this.assertTelegramSecret(meta.secretToken);
    await this.syncRegistry();

    const update = TelegramUpdateSchema.parse(updateInput);

    if (update.callback_query?.data) {
      return this.handleTelegramCallback(update);
    }

    const text = update.message?.text?.trim();
    const chatId = update.message?.chat.id;
    const userId = update.message?.from?.id;

    if (!text || chatId === undefined || userId === undefined) {
      return InternalOpsResponseSchema.parse({
        ok: true,
        summary: 'Webhook accepted but no actionable Telegram message was found.',
      });
    }

    this.assertTelegramOperator(String(chatId), String(userId));

    const dedupeKey = `telegram:update:${update.update_id}`;
    const existingMessage = await this.findTelegramMessage(dedupeKey);
    if (existingMessage) {
      return InternalOpsResponseSchema.parse({
        ok: true,
        summary: 'Duplicate Telegram update ignored.',
      });
    }

    const session = await this.resolveSession(String(chatId), String(userId), text);
    await this.recordTelegramMessage({
      tenantId: this.tenantId,
      sessionId: session.id,
      direction: 'inbound',
      mode: 'ack',
      chatId: String(chatId),
      userId: String(userId),
      updateId: update.update_id,
      messageId: update.message?.message_id,
      dedupeKey,
      payload: update,
    });

    const [rootRun] = await db
      .insert(executionRuns)
      .values({
        tenantId: this.tenantId,
        status: 'running',
        triggeredBy: 'agent',
        tags: [
          'internal-ops',
          'telegram',
          `chat:${chatId}`,
          `operator:${userId}`,
        ],
      })
      .returning();

    const [objective] = await db
      .insert(internalObjectives)
      .values({
        tenantId: this.tenantId,
        sessionId: session.id,
        runId: rootRun.id,
        ownerAgentId: 'ceo',
        rootAgentId: 'ceo',
        title: summarizeTitle(text),
        summary: text,
        status: 'active',
        requestedBy: String(userId),
        sourceMessage: text,
        coherenceSummary: {},
      })
      .returning();

    const turnInput = await this.buildTurnInput({
      sessionId: session.id,
      objectiveId: objective.id,
      activeAgentId: 'ceo',
      operatorMessage: text,
      trigger: 'telegram_message',
    });
    const turnResult = OpenClawTurnResultSchema.parse(
      await this.runner.startTurn(turnInput),
    );

    const persistedTurn = await this.persistTurn({
      sessionId: session.id,
      objectiveId: objective.id,
      rootRunId: rootRun.id,
      remoteSessionId: turnResult.remoteSessionId,
      turnResult,
      operatorMessageText: text,
      eventKey: dedupeKey,
      source: 'telegram',
      sourceEventId: String(update.update_id),
    });

    const queuedWorkOrderIds = await this.queueTurnOutputs({
      sessionId: session.id,
      objectiveId: objective.id,
      openclawSessionId: turnResult.remoteSessionId,
      turnResult,
      coherence: persistedTurn.coherence,
      operatorChatId: String(chatId),
      operatorUserId: String(userId),
    });

    return InternalOpsResponseSchema.parse({
      ok: true,
      sessionId: session.id,
      objectiveId: objective.id,
      summary: turnResult.summary,
      approvalRequired: persistedTurn.coherence.reviewRequired,
      queuedWorkOrderIds,
    });
  }

  async handleApprovalCallback(
    input: ApprovalCallbackInput,
  ): Promise<InternalOpsResponse> {
    this.ensureTenantId();

    const [approval] = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.id, input.approvalId),
          eq(approvalRequests.tenantId, this.tenantId),
        ),
      );

    if (!approval) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: `Approval ${input.approvalId} was not found.`,
      });
    }

    if (!approval.objectiveId || !approval.workOrderId) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: `Approval ${approval.id} is missing its linked objective or work order.`,
      });
    }

    const [objective] = await db
      .select()
      .from(internalObjectives)
      .where(eq(internalObjectives.id, approval.objectiveId));
    const [workOrder] = await db
      .select()
      .from(internalWorkOrders)
      .where(eq(internalWorkOrders.id, approval.workOrderId));
    const [session] = objective
      ? await db
          .select()
          .from(internalConversationSessions)
          .where(eq(internalConversationSessions.id, objective.sessionId))
      : [];
    const [openclawSession] = objective
      ? await db
          .select()
          .from(internalOpenClawSessions)
          .where(eq(internalOpenClawSessions.objectiveId, objective.id))
          .orderBy(desc(internalOpenClawSessions.createdAt))
      : [];

    if (!objective || !workOrder || !session) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: 'Approval cannot be resolved because the linked state is incomplete.',
      });
    }

    const now = new Date();
    const status =
      input.decision === 'approved'
        ? 'approved'
        : input.decision === 'postponed'
          ? 'pending'
          : 'rejected';

    await db
      .update(approvalRequests)
      .set({
        status,
        decidedAt: input.decision === 'postponed' ? approval.decidedAt : now,
        decisionReason: input.reason,
      })
      .where(eq(approvalRequests.id, approval.id));

    if (input.decision === 'postponed') {
      const notificationId = await this.createNotifyTelegramWorkOrder({
        objectiveId: objective.id,
        sessionId: session.id,
        openclawSessionId: objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        agentId: workOrder.agentId,
        chatId: session.externalChatId,
        userId: session.externalUserId,
        mode: 'status',
        text: 'La aprobación queda pospuesta. El sistema mantiene el objetivo en espera.',
      });

      return InternalOpsResponseSchema.parse({
        ok: true,
        sessionId: session.id,
        objectiveId: objective.id,
        summary: `Approval ${input.decision} processed for work order ${workOrder.id}.`,
        approvalRequired: true,
        queuedWorkOrderIds: [notificationId],
      });
    }

    if (input.decision === 'approved') {
      const resumeWorkOrderId =
        workOrder.workType === 'request_human_approval'
          ? workOrder.resumeFromWorkOrderId
          : workOrder.id;

      await db
        .update(internalWorkOrders)
        .set({
          status:
            workOrder.workType === 'request_human_approval'
              ? 'completed'
              : 'queued',
          updatedAt: now,
          completedAt:
            workOrder.workType === 'request_human_approval' ? now : undefined,
        })
        .where(eq(internalWorkOrders.id, workOrder.id));

      await db
        .update(internalObjectives)
        .set({
          status: 'active',
          updatedAt: now,
        })
        .where(eq(internalObjectives.id, objective.id));

      await db
        .update(internalConversationSessions)
        .set({
          status: 'active',
          updatedAt: now,
        })
        .where(eq(internalConversationSessions.id, session.id));

      if (resumeWorkOrderId) {
        const [resumeWorkOrder] = await db
          .select()
          .from(internalWorkOrders)
          .where(eq(internalWorkOrders.id, resumeWorkOrderId));

        if (resumeWorkOrder) {
          await this.enqueueWorkOrder({
            tenantId: this.tenantId,
            objectiveId: objective.id,
            workOrderId: resumeWorkOrder.id,
            workType: resumeWorkOrder.workType as WorkOrderKind,
          });
        }
      }

      const notificationId = await this.createNotifyTelegramWorkOrder({
        objectiveId: objective.id,
        sessionId: session.id,
        openclawSessionId: objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        agentId: workOrder.agentId,
        chatId: session.externalChatId,
        userId: session.externalUserId,
        mode: 'status',
        text: 'Aprobación recibida. Reanudo exactamente el work order bloqueado.',
      });

      await this.recordDecision({
        objectiveId: objective.id,
        workOrderId: workOrder.id,
        agentId: workOrder.agentId,
        outcome: 'approved',
        summary: `Approval ${input.decision}`,
        rationale: input.reason ?? `Decision from ${input.actorLabel ?? 'telegram'}`,
        metadata: { approvalId: approval.id, actorLabel: input.actorLabel },
      });

      return InternalOpsResponseSchema.parse({
        ok: true,
        sessionId: session.id,
        objectiveId: objective.id,
        summary: `Approval ${input.decision} processed for work order ${workOrder.id}.`,
        approvalRequired: false,
        queuedWorkOrderIds: [
          ...(resumeWorkOrderId ? [resumeWorkOrderId] : []),
          notificationId,
        ],
      });
    }

    await db
      .update(internalWorkOrders)
      .set({
        status: 'blocked',
        updatedAt: now,
        completedAt: now,
      })
      .where(eq(internalWorkOrders.id, workOrder.id));

    if (input.decision === 'rejected') {
      await db
        .update(internalObjectives)
        .set({
          status: 'blocked',
          updatedAt: now,
        })
        .where(eq(internalObjectives.id, objective.id));

      await db
        .update(internalConversationSessions)
        .set({
          status: 'blocked',
          updatedAt: now,
        })
        .where(eq(internalConversationSessions.id, session.id));

      await db
        .update(executionRuns)
        .set({
          status: 'failed',
          completedAt: now,
        })
        .where(eq(executionRuns.id, objective.runId));

      if (openclawSession) {
        await this.runner.cancelObjective({
          tenantId: this.tenantId,
          objectiveId: objective.id,
          remoteSessionId: openclawSession.remoteSessionId,
          reason: input.reason ?? 'Operator rejected the action.',
        });
      }

      const notificationId = await this.createNotifyTelegramWorkOrder({
        objectiveId: objective.id,
        sessionId: session.id,
        openclawSessionId: objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        agentId: workOrder.agentId,
        chatId: session.externalChatId,
        userId: session.externalUserId,
        mode: 'summary',
        text: 'He detenido el objetivo porque rechazaste la acción crítica.',
      });

      await this.recordDecision({
        objectiveId: objective.id,
        workOrderId: workOrder.id,
        agentId: workOrder.agentId,
        outcome: 'rejected',
        summary: `Approval ${input.decision}`,
        rationale: input.reason ?? `Decision from ${input.actorLabel ?? 'telegram'}`,
        metadata: { approvalId: approval.id, actorLabel: input.actorLabel },
      });

      return InternalOpsResponseSchema.parse({
        ok: true,
        sessionId: session.id,
        objectiveId: objective.id,
        summary: `Approval ${input.decision} processed for work order ${workOrder.id}.`,
        approvalRequired: false,
        queuedWorkOrderIds: [notificationId],
      });
    }

    const turnInput = await this.buildTurnInput({
      sessionId: session.id,
      objectiveId: objective.id,
      activeAgentId: openclawSession?.activeAgentId ?? objective.ownerAgentId,
      operatorMessage:
        input.reason?.trim() ||
        'Reformulate the plan and produce a safer alternative.',
      trigger: 'approval_resolution',
      remoteSessionId:
        objective.openclawSessionId ?? openclawSession?.remoteSessionId,
      approvalIntent: ApprovalIntentSchema.parse({
        objectiveId: objective.id,
        workOrderId: workOrder.id,
        sessionId: session.id,
        openclawSessionId:
          objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        source: 'telegram',
        requestedAction: 'Reformulate the blocked action.',
        resumeToken: approval.resumeToken ?? `internal-work-order:${workOrder.id}`,
        resumeTarget: 'turn',
        sourceMetadata: {
          approvalId: approval.id,
          actorLabel: input.actorLabel,
        },
      }),
    });

    const turnResult = OpenClawTurnResultSchema.parse(
      await this.runner.continueTurn(turnInput),
    );
    const persistedTurn = await this.persistTurn({
      sessionId: session.id,
      objectiveId: objective.id,
      rootRunId: objective.runId,
      remoteSessionId: turnResult.remoteSessionId,
      turnResult,
      operatorMessageText: input.reason ?? 'Reformulate the blocked action.',
      eventKey: `approval:${approval.id}:reformulate:${Date.now()}`,
      source: 'internal_callback',
      sourceEventId: approval.id,
    });
    const queuedWorkOrderIds = await this.queueTurnOutputs({
      sessionId: session.id,
      objectiveId: objective.id,
      openclawSessionId: turnResult.remoteSessionId,
      turnResult,
      coherence: persistedTurn.coherence,
      operatorChatId: session.externalChatId,
      operatorUserId: session.externalUserId,
    });

    await this.recordDecision({
      objectiveId: objective.id,
      workOrderId: workOrder.id,
      agentId: workOrder.agentId,
      outcome: 'blocked',
      summary: 'Approval reformulate',
      rationale: input.reason ?? `Decision from ${input.actorLabel ?? 'telegram'}`,
      metadata: { approvalId: approval.id, actorLabel: input.actorLabel },
    });

    return InternalOpsResponseSchema.parse({
      ok: true,
      sessionId: session.id,
      objectiveId: objective.id,
      summary: turnResult.summary,
      approvalRequired: persistedTurn.coherence.reviewRequired,
      queuedWorkOrderIds,
    });
  }

  private async handleTelegramCallback(
    update: TelegramUpdate,
  ): Promise<InternalOpsResponse> {
    const callback = parseSignedApprovalCallback(
      update.callback_query?.data,
      this.callbackSecret,
    );

    if (!callback) {
      await this.answerCallbackQuery(
        update.callback_query?.id,
        'Callback no valida.',
      );
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: 'Invalid callback payload.',
      });
    }

    const chatId = update.callback_query?.message?.chat.id;
    const userId = update.callback_query?.from.id;

    if (chatId === undefined || userId === undefined) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: 'Callback payload is missing operator context.',
      });
    }

    this.assertTelegramOperator(String(chatId), String(userId));

    const dedupeKey = `telegram:callback:${update.callback_query?.id}`;
    const existingMessage = await this.findTelegramMessage(dedupeKey);
    if (existingMessage) {
      await this.answerCallbackQuery(update.callback_query?.id, 'Decision already received.');
      return InternalOpsResponseSchema.parse({
        ok: true,
        summary: 'Duplicate Telegram callback ignored.',
      });
    }

    const [approval] = await db
      .select({
        objectiveId: approvalRequests.objectiveId,
      })
      .from(approvalRequests)
      .where(eq(approvalRequests.id, callback.approvalId));
    const objectiveId = approval?.objectiveId ?? undefined;
    const [objective] = objectiveId
      ? await db
          .select()
          .from(internalObjectives)
          .where(eq(internalObjectives.id, objectiveId))
      : [];

    await this.recordTelegramMessage({
      tenantId: this.tenantId,
      sessionId: objective?.sessionId,
      objectiveId,
      direction: 'inbound',
      mode: 'callback',
      chatId: String(chatId),
      userId: String(userId),
      callbackQueryId: update.callback_query?.id,
      messageId: update.callback_query?.message?.message_id,
      dedupeKey,
      payload: update,
    });

    await this.answerCallbackQuery(update.callback_query?.id, 'Decision received.');

    return this.handleApprovalCallback({
      approvalId: callback.approvalId,
      decision: callback.decision,
      actorLabel:
        update.callback_query?.from.username ??
        update.callback_query?.from.first_name ??
        String(update.callback_query?.from.id),
    });
  }

  private async syncRegistry() {
    if (this.registrySynced) {
      return;
    }

    for (const profile of INTERNAL_AGENT_PROFILES) {
      await db
        .insert(internalAgentProfiles)
        .values({
          id: profile.id,
          tenantId: this.tenantId,
          roleTitle: profile.roleTitle,
          department: profile.department,
          mission: profile.mission,
          parentAgentId: profile.parentAgentId,
          kpis: profile.kpis,
          allowedTools: profile.allowedTools,
          allowedCapabilities: profile.allowedCapabilities,
          allowedWorkflowTags: profile.allowedWorkflowTags,
          memoryScope: profile.memoryScope,
          riskBudget: profile.riskBudget,
          participantBudget: profile.participantBudget,
          maxDelegationDepth: profile.maxDelegationDepth,
          escalationPolicy: profile.escalationPolicy,
          playbooks: profile.playbooks,
        })
        .onConflictDoNothing({ target: internalAgentProfiles.id });
    }

    for (const relationship of INTERNAL_AGENT_RELATIONSHIPS) {
      const [existingRelationship] = await db
        .select()
        .from(internalAgentRelationships)
        .where(
          and(
            eq(internalAgentRelationships.tenantId, this.tenantId),
            eq(
              internalAgentRelationships.parentAgentId,
              relationship.parentAgentId,
            ),
            eq(
              internalAgentRelationships.childAgentId,
              relationship.childAgentId,
            ),
          ),
        );

      if (!existingRelationship) {
        await db.insert(internalAgentRelationships).values({
          tenantId: this.tenantId,
          parentAgentId: relationship.parentAgentId,
          childAgentId: relationship.childAgentId,
          relationship: relationship.relationship,
        });
      }
    }

    for (const binding of DEFAULT_INTERNAL_CAPABILITY_BINDINGS) {
      const [existingBinding] = await db
        .select()
        .from(internalCapabilityBindings)
        .where(
          and(
            eq(internalCapabilityBindings.tenantId, this.tenantId),
            eq(internalCapabilityBindings.capabilityKey, binding.capabilityKey),
          ),
        );

      if (!existingBinding) {
        await db.insert(internalCapabilityBindings).values({
          tenantId: this.tenantId,
          capabilityKey: binding.capabilityKey,
          title: binding.title,
          description: binding.description,
          targetType: binding.targetType,
          enabled: binding.enabled,
          config: binding.config,
        });
      }
    }

    await this.runner.registerAgentProfiles(this.tenantId, INTERNAL_AGENT_PROFILES);
    await this.runner.registerCapabilities(
      this.tenantId,
      INTERNAL_OPENCLAW_CAPABILITIES,
    );

    this.registrySynced = true;
  }

  private async buildTurnInput(input: {
    sessionId: string;
    objectiveId: string;
    activeAgentId: string;
    operatorMessage: string;
    trigger: OpenClawTurnInput['trigger'];
    remoteSessionId?: string;
    approvalIntent?: ApprovalIntent;
  }) {
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

  private async persistTurn(
    options: PersistTurnOptions,
  ): Promise<PersistedTurnContext> {
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
        completedAt:
          objectiveStatus === 'completed' ? new Date() : undefined,
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

  private async queueTurnOutputs(input: {
    sessionId: string;
    objectiveId: string;
    openclawSessionId: string;
    turnResult: ReturnType<typeof OpenClawTurnResultSchema.parse>;
    coherence: CoherenceSignalSummary;
    operatorChatId: string;
    operatorUserId: string;
  }) {
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
              'The requested AgentMou capability is not bound in the internal tenant, so the system produced a native brief instead of external execution.',
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

  private async resolveSession(
    externalChatId: string,
    externalUserId: string,
    messageText: string,
  ) {
    const [session] = await db
      .select()
      .from(internalConversationSessions)
      .where(
        and(
          eq(internalConversationSessions.tenantId, this.tenantId),
          eq(internalConversationSessions.channel, 'telegram'),
          eq(internalConversationSessions.externalChatId, externalChatId),
          eq(internalConversationSessions.externalUserId, externalUserId),
        ),
      );

    if (session) {
      await db
        .update(internalConversationSessions)
        .set({
          lastMessage: messageText,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(internalConversationSessions.id, session.id));

      return session;
    }

    const [created] = await db
      .insert(internalConversationSessions)
      .values({
        tenantId: this.tenantId,
        channel: 'telegram',
        externalChatId,
        externalUserId,
        status: 'active',
        lastMessage: messageText,
      })
      .returning();

    return created;
  }

  private async recordDecision(input: {
    objectiveId: string;
    workOrderId?: string;
    agentId: string;
    outcome: 'queued' | 'approved' | 'rejected' | 'completed' | 'blocked';
    summary: string;
    rationale: string;
    metadata?: Record<string, unknown>;
  }) {
    await db.insert(internalDecisions).values({
      tenantId: this.tenantId,
      objectiveId: input.objectiveId,
      workOrderId: input.workOrderId,
      agentId: input.agentId,
      outcome: input.outcome,
      summary: input.summary,
      rationale: input.rationale,
      metadata: input.metadata ?? {},
    });
  }

  private async createNotifyTelegramWorkOrder(input: {
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

  private async findTelegramMessage(dedupeKey: string) {
    const [message] = await db
      .select()
      .from(internalTelegramMessages)
      .where(eq(internalTelegramMessages.dedupeKey, dedupeKey));

    return message;
  }

  private async recordTelegramMessage(input: {
    tenantId: string;
    sessionId?: string;
    objectiveId?: string;
    direction: 'inbound' | 'outbound';
    mode: 'ack' | 'status' | 'approval' | 'summary' | 'callback';
    chatId: string;
    userId?: string;
    updateId?: number;
    messageId?: number;
    callbackQueryId?: string;
    dedupeKey: string;
    payload: Record<string, unknown>;
    deliveredAt?: Date;
  }) {
    await db.insert(internalTelegramMessages).values({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      objectiveId: input.objectiveId,
      direction: input.direction,
      mode: input.mode,
      chatId: input.chatId,
      userId: input.userId,
      updateId: input.updateId,
      messageId: input.messageId,
      callbackQueryId: input.callbackQueryId,
      dedupeKey: input.dedupeKey,
      payload: input.payload,
      deliveredAt: input.deliveredAt,
    });
  }

  private async answerCallbackQuery(
    callbackQueryId: string | undefined,
    text: string,
  ) {
    if (!callbackQueryId || !this.telegramBotToken) {
      return;
    }

    await fetch(
      `https://api.telegram.org/bot${this.telegramBotToken}/answerCallbackQuery`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: false,
        }),
      },
    );
  }

  private assertTelegramSecret(secretToken?: string) {
    if (
      this.telegramWebhookSecret &&
      secretToken !== this.telegramWebhookSecret
    ) {
      throw new Error('Invalid Telegram webhook secret.');
    }
  }

  private assertTelegramOperator(chatId: string, userId: string) {
    if (this.allowedChatIds.size > 0 && !this.allowedChatIds.has(chatId)) {
      throw new Error(`Chat ${chatId} is not authorized for internal ops.`);
    }

    if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
      throw new Error(`User ${userId} is not authorized for internal ops.`);
    }
  }

  private ensureTenantId() {
    if (!this.tenantId) {
      throw new Error(
        'INTERNAL_OPS_TENANT_ID must be configured to use the internal ops service.',
      );
    }
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

function summarizeTitle(messageText: string) {
  const collapsed = messageText.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= 80) {
    return collapsed;
  }
  return `${collapsed.slice(0, 77)}...`;
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

function parseEnvIdList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSignedApprovalCallback(
  data: string | undefined,
  secret: string | undefined,
): {
  approvalId: string;
  decision: 'approved' | 'rejected' | 'postponed' | 'reformulate';
} | null {
  if (!data || !secret) {
    return null;
  }

  const match = /^ap:([a-f0-9-]+):(approve|reject|postpone|reformulate):([a-f0-9]{12})$/i.exec(
    data,
  );

  if (!match) {
    return null;
  }

  const payload = `ap:${match[1]}:${match[2]}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 12);

  const received = Buffer.from(match[3], 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');

  if (received.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(received, expected)) {
    return null;
  }

  return {
    approvalId: match[1],
    decision:
      match[2] === 'approve'
        ? 'approved'
        : match[2] === 'reject'
          ? 'rejected'
          : match[2] === 'postpone'
            ? 'postponed'
            : 'reformulate',
  };
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isMemoryScope(value: string): value is 'agent' | 'objective' | 'session' {
  return value === 'agent' || value === 'objective' || value === 'session';
}
