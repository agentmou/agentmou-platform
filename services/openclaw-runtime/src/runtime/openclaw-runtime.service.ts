import { randomUUID } from 'node:crypto';

import {
  AgentProfileSchema,
  OpenClawCapabilitySchema,
  OpenClawTraceResponseSchema,
  OpenClawTurnInputSchema,
  type AgentProfile,
  type OpenClawCapability,
  type OpenClawTraceResponse,
  type OpenClawTurnInput,
  type OpenClawTurnResult,
} from '@agentmou/contracts';

import {
  FileStateStore,
  type StoredRemoteSession,
  type StoredTenantRegistry,
  type StoredTraceEvent,
  type StoredTurnRecord,
} from './file-state-store.js';
import { OpenClawPlanner } from './openclaw-planner.js';

export class OpenClawRuntimeService {
  private readonly store: FileStateStore;
  private readonly planner: OpenClawPlanner;
  private initialized = false;

  constructor(options?: { store?: FileStateStore; planner?: OpenClawPlanner }) {
    this.store = options?.store ?? new FileStateStore();
    this.planner = options?.planner ?? new OpenClawPlanner();
  }

  async registerAgentProfiles(tenantId: string, profiles: AgentProfile[]) {
    await this.ensureInitialized();
    const existing = await this.loadTenantRegistry(tenantId);
    await this.store.saveTenantRegistry({
      tenantId,
      agentProfiles: profiles.map((profile) => AgentProfileSchema.parse(profile)),
      capabilities: existing.capabilities,
      updatedAt: new Date().toISOString(),
    });
  }

  async registerCapabilities(tenantId: string, capabilities: OpenClawCapability[]) {
    await this.ensureInitialized();
    const existing = await this.loadTenantRegistry(tenantId);
    await this.store.saveTenantRegistry({
      tenantId,
      agentProfiles: existing.agentProfiles,
      capabilities: capabilities.map((capability) => OpenClawCapabilitySchema.parse(capability)),
      updatedAt: new Date().toISOString(),
    });
  }

  async startTurn(input: OpenClawTurnInput): Promise<OpenClawTurnResult> {
    await this.ensureInitialized();
    const parsed = OpenClawTurnInputSchema.parse(input);
    const remoteSessionId = parsed.remoteSessionId || randomUUID();
    const registry = await this.loadTenantRegistry(parsed.tenantId, parsed);
    const existingSession = parsed.remoteSessionId
      ? await this.store.loadSession(parsed.remoteSessionId)
      : null;

    const result = await this.planner.planTurn({
      input: {
        ...parsed,
        agentProfiles: registry.agentProfiles,
        capabilities: registry.capabilities,
      },
      remoteSessionId,
      previousActiveAgentId: existingSession?.activeAgentId,
      previousTurnCount: existingSession?.turns.length ?? 0,
    });

    await this.persistTurn({
      input: parsed,
      remoteSessionId,
      result,
      existingSession,
    });

    return result;
  }

  async continueTurn(input: OpenClawTurnInput): Promise<OpenClawTurnResult> {
    return this.startTurn(input);
  }

  async cancelObjective(input: {
    tenantId: string;
    objectiveId: string;
    remoteSessionId: string;
    reason?: string;
  }) {
    await this.ensureInitialized();
    const session = await this.store.loadSession(input.remoteSessionId);
    if (!session) {
      return;
    }

    session.status = 'cancelled';
    session.updatedAt = new Date().toISOString();
    session.traceReference = {
      ...session.traceReference,
      cancelledAt: session.updatedAt,
      cancelReason: input.reason ?? 'Cancelled by internal-ops.',
    };
    session.traceEvents.push({
      id: randomUUID(),
      timestamp: session.updatedAt,
      type: 'objective.cancelled',
      payload: {
        objectiveId: input.objectiveId,
        tenantId: input.tenantId,
        reason: input.reason ?? 'Cancelled by internal-ops.',
      },
    });

    await this.store.saveSession(session);
  }

  async fetchTrace(input: {
    tenantId: string;
    objectiveId: string;
    remoteSessionId: string;
  }): Promise<OpenClawTraceResponse> {
    await this.ensureInitialized();
    const session = await this.store.loadSession(input.remoteSessionId);
    if (
      !session ||
      session.tenantId !== input.tenantId ||
      session.objectiveId !== input.objectiveId
    ) {
      throw new Error('Remote OpenClaw session not found for objective trace.');
    }

    return OpenClawTraceResponseSchema.parse({
      remoteSessionId: session.remoteSessionId,
      traceReference: session.traceReference,
      events: session.traceEvents,
    });
  }

  private async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    await this.store.initialize();
    this.initialized = true;
  }

  private async loadTenantRegistry(
    tenantId: string,
    fallback?: Pick<OpenClawTurnInput, 'agentProfiles' | 'capabilities'>
  ): Promise<StoredTenantRegistry> {
    const existing = await this.store.loadTenantRegistry(tenantId);
    if (existing) {
      return existing;
    }

    return {
      tenantId,
      agentProfiles: fallback?.agentProfiles ?? [],
      capabilities: fallback?.capabilities ?? [],
      updatedAt: new Date().toISOString(),
    };
  }

  private async persistTurn(input: {
    input: OpenClawTurnInput;
    remoteSessionId: string;
    result: OpenClawTurnResult;
    existingSession: StoredRemoteSession | null;
  }) {
    const now = new Date().toISOString();
    const turn: StoredTurnRecord = {
      turnId: randomUUID(),
      timestamp: now,
      trigger: input.input.trigger,
      operatorMessage: input.input.operatorMessage,
      approvalIntent: input.input.approvalIntent,
      activeAgentId: input.result.activeAgentId,
      summary: input.result.summary,
      status: input.result.status,
      participants: input.result.participants,
      toolCalls: input.result.toolCalls,
      delegations: input.result.delegations,
      workOrders: input.result.workOrders,
      operatorMessages: input.result.operatorMessages,
      checkpointToken: input.result.checkpointToken,
    };

    const traceEvents: StoredTraceEvent[] = [
      {
        id: randomUUID(),
        timestamp: now,
        type: input.existingSession ? 'turn.continued' : 'turn.started',
        payload: {
          trigger: input.input.trigger,
          operatorMessage: input.input.operatorMessage,
          approvalIntent: input.input.approvalIntent,
        },
      },
      {
        id: randomUUID(),
        timestamp: now,
        type: 'turn.result',
        payload: {
          summary: input.result.summary,
          status: input.result.status,
          activeAgentId: input.result.activeAgentId,
          participants: input.result.participants,
          toolCalls: input.result.toolCalls,
          workOrders: input.result.workOrders,
        },
      },
    ];

    const session: StoredRemoteSession = input.existingSession
      ? {
          ...input.existingSession,
          activeAgentId: input.result.activeAgentId,
          status: input.result.status,
          updatedAt: now,
          checkpointToken: input.result.checkpointToken,
          traceReference: input.result.traceReference,
          turns: [...input.existingSession.turns, turn],
          traceEvents: [...input.existingSession.traceEvents, ...traceEvents],
        }
      : {
          tenantId: input.input.tenantId,
          objectiveId: input.input.objectiveId,
          remoteSessionId: input.remoteSessionId,
          activeAgentId: input.result.activeAgentId,
          status: input.result.status,
          createdAt: now,
          updatedAt: now,
          checkpointToken: input.result.checkpointToken,
          traceReference: input.result.traceReference,
          turns: [turn],
          traceEvents,
        };

    await this.store.saveSession(session);
  }
}
