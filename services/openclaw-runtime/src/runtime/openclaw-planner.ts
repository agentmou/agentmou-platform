import { randomUUID } from 'node:crypto';

import OpenAI from 'openai';
import {
  OpenClawTurnResultSchema,
  type AgentProfile,
  type ApprovalIntent,
  type OpenClawCapability,
  type OpenClawOperatorMessage,
  type OpenClawPlannedDelegation,
  type OpenClawPlannedWorkOrder,
  type OpenClawTurnInput,
  type OpenClawTurnResult,
} from '@agentmou/contracts';

interface PlanTurnOptions {
  input: OpenClawTurnInput;
  remoteSessionId: string;
  previousActiveAgentId?: string;
  previousTurnCount?: number;
}

interface PlannedTurnDraft {
  activeAgentId: string;
  summary: string;
  status: 'active' | 'waiting_approval' | 'completed' | 'blocked';
  closeObjective?: boolean;
  delegations: OpenClawPlannedDelegation[];
  workOrders: OpenClawPlannedWorkOrder[];
  operatorMessages: OpenClawOperatorMessage[];
  participants: string[];
  contextChannels: string[];
  toolCalls: string[];
  successfulResults: number;
  retryCount: number;
}

export class OpenClawPlanner {
  private readonly openai: OpenAI | null;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = options?.model ?? process.env.OPENCLAW_MODEL ?? 'gpt-4o-mini';
  }

  async planTurn(options: PlanTurnOptions): Promise<OpenClawTurnResult> {
    const llmDraft = await this.tryModelPlan(options);
    const draft = llmDraft ?? this.buildHeuristicPlan(options);
    const checkpointToken = `cp_${randomUUID()}`;

    return OpenClawTurnResultSchema.parse({
      remoteSessionId: options.remoteSessionId,
      activeAgentId: draft.activeAgentId,
      summary: draft.summary,
      status: draft.status,
      closeObjective: draft.closeObjective ?? false,
      delegations: draft.delegations,
      workOrders: draft.workOrders,
      operatorMessages: draft.operatorMessages,
      participants: dedupeStrings(draft.participants),
      contextChannels: dedupeStrings(draft.contextChannels),
      toolCalls: dedupeStrings(draft.toolCalls),
      successfulResults: Math.max(0, draft.successfulResults),
      retryCount: Math.max(0, draft.retryCount),
      checkpointToken,
      traceReference: {
        remoteSessionId: options.remoteSessionId,
        checkpointToken,
        turnIndex: options.previousTurnCount ?? 0,
      },
    });
  }

  private async tryModelPlan(options: PlanTurnOptions): Promise<PlannedTurnDraft | null> {
    if (!this.openai) {
      return null;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You are OpenClaw, the remote reasoning runtime for Agentmou internal ops.',
              'Return a single JSON object only.',
              'Use only the agent ids and capability keys provided.',
              'Prefer a CEO -> chief -> subagent delegation chain.',
              'Prefer native prepare_artifact when uncertain.',
              'Use requiresApproval=true for risky actions involving production, billing, spend, pricing, deletion, legal, contracts, DNS, or public launches.',
              'Do not invent installation ids.',
              'If you choose an external capability, set executionTarget to agent_installation or workflow_installation and include capabilityKey only.',
              'Buttons are not needed in operatorMessages.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              objectiveId: options.input.objectiveId,
              trigger: options.input.trigger,
              operatorMessage: options.input.operatorMessage,
              approvalIntent: options.input.approvalIntent,
              activeAgentId: options.input.activeAgentId,
              previousActiveAgentId: options.previousActiveAgentId,
              memory: options.input.memory,
              agentProfiles: options.input.agentProfiles.map((profile) => ({
                id: profile.id,
                parentAgentId: profile.parentAgentId,
                roleTitle: profile.roleTitle,
                department: profile.department,
                allowedCapabilities: profile.allowedCapabilities,
                riskBudget: profile.riskBudget,
                maxDelegationDepth: profile.maxDelegationDepth,
              })),
              capabilities: options.input.capabilities,
            }),
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content) as Partial<PlannedTurnDraft>;
      const heuristic = this.buildHeuristicPlan(options);

      return {
        activeAgentId: this.resolveAgentId(
          parsed.activeAgentId,
          options.input.agentProfiles,
          heuristic.activeAgentId
        ),
        summary: asNonEmpty(parsed.summary) ?? heuristic.summary,
        status: normalizeStatus(parsed.status) ?? heuristic.status,
        closeObjective:
          typeof parsed.closeObjective === 'boolean'
            ? parsed.closeObjective
            : heuristic.closeObjective,
        delegations:
          Array.isArray(parsed.delegations) && parsed.delegations.length > 0
            ? parsed.delegations.map((item, index) =>
                sanitizeDelegation(
                  item,
                  options.input.agentProfiles,
                  index,
                  heuristic.delegations[0]?.senderAgentId ?? 'ceo'
                )
              )
            : heuristic.delegations,
        workOrders:
          Array.isArray(parsed.workOrders) && parsed.workOrders.length > 0
            ? parsed.workOrders.map((item, index) =>
                sanitizeWorkOrder(
                  item,
                  options.input.agentProfiles,
                  options.input.capabilities,
                  index
                )
              )
            : heuristic.workOrders,
        operatorMessages:
          Array.isArray(parsed.operatorMessages) && parsed.operatorMessages.length > 0
            ? (parsed.operatorMessages
                .map((item) => sanitizeOperatorMessage(item))
                .filter(Boolean) as OpenClawOperatorMessage[])
            : heuristic.operatorMessages,
        participants:
          Array.isArray(parsed.participants) && parsed.participants.length > 0
            ? parsed.participants
                .map((participant) =>
                  this.resolveAgentId(participant, options.input.agentProfiles, '')
                )
                .filter(Boolean)
            : heuristic.participants,
        contextChannels:
          Array.isArray(parsed.contextChannels) && parsed.contextChannels.length > 0
            ? parsed.contextChannels.filter(isNonEmptyString)
            : heuristic.contextChannels,
        toolCalls:
          Array.isArray(parsed.toolCalls) && parsed.toolCalls.length > 0
            ? parsed.toolCalls.filter(isNonEmptyString)
            : heuristic.toolCalls,
        successfulResults:
          typeof parsed.successfulResults === 'number'
            ? parsed.successfulResults
            : heuristic.successfulResults,
        retryCount:
          typeof parsed.retryCount === 'number' ? parsed.retryCount : heuristic.retryCount,
      };
    } catch {
      return null;
    }
  }

  private buildHeuristicPlan(options: PlanTurnOptions): PlannedTurnDraft {
    const chief = selectChiefAgent(options.input.operatorMessage, options.input.agentProfiles);
    const delegate = selectDelegateAgent(chief, options.input.agentProfiles);
    const capability = selectCapability(
      options.input.operatorMessage,
      chief,
      delegate,
      options.input.capabilities
    );
    const approvalRequired = requiresApproval(
      options.input.operatorMessage,
      capability?.executionTarget,
      options.input.approvalIntent
    );
    const isReformulation = Boolean(options.input.approvalIntent);
    const activeAgentId = delegate?.id ?? chief.id;
    const workOrders: OpenClawPlannedWorkOrder[] = [];

    if (isReformulation) {
      workOrders.push({
        agentId: activeAgentId,
        workType: 'prepare_artifact',
        title: 'Safer alternative plan',
        summary:
          'Produce a safer alternative that narrows scope, avoids irreversible actions, and explains the next recommended step.',
        requiresApproval: false,
        executionTarget: 'native',
        payload: {
          recommendedAction: 'Review the safer alternative and continue from Telegram.',
          reason: options.input.operatorMessage,
        },
      });
    } else if (capability?.executionTarget === 'agent_installation') {
      workOrders.push({
        agentId: activeAgentId,
        workType: 'run_agent_installation',
        title: `${delegate?.roleTitle ?? chief.roleTitle} execution`,
        summary: summarizeExecution(options.input.operatorMessage, chief.roleTitle),
        requiresApproval: approvalRequired,
        executionTarget: 'agent_installation',
        capabilityKey: capability.capabilityKey,
        payload: {
          input: {
            request: options.input.operatorMessage,
            objectiveId: options.input.objectiveId,
          },
          riskLevel: approvalRequired ? 'high' : 'medium',
        },
      });
    } else if (capability?.executionTarget === 'workflow_installation') {
      workOrders.push({
        agentId: activeAgentId,
        workType: 'run_workflow_installation',
        title: `${chief.roleTitle} workflow dispatch`,
        summary: summarizeExecution(options.input.operatorMessage, chief.roleTitle),
        requiresApproval: approvalRequired,
        executionTarget: 'workflow_installation',
        capabilityKey: capability.capabilityKey,
        payload: {
          input: {
            request: options.input.operatorMessage,
            objectiveId: options.input.objectiveId,
          },
          riskLevel: approvalRequired ? 'high' : 'medium',
        },
      });
    } else {
      workOrders.push({
        agentId: activeAgentId,
        workType: 'prepare_artifact',
        title: `${chief.roleTitle} brief`,
        summary: buildBriefSummary(options.input.operatorMessage, chief.roleTitle),
        requiresApproval: false,
        executionTarget: 'native',
        payload: {
          recommendedAction: approvalRequired
            ? 'Wait for operator approval before executing the risky action.'
            : 'Review the brief and continue execution if useful.',
          request: options.input.operatorMessage,
        },
      });
    }

    const summary = isReformulation
      ? `He reformulado el objetivo con una alternativa más segura liderada por ${chief.roleTitle}.`
      : approvalRequired
        ? `He preparado una acción liderada por ${chief.roleTitle} y la he dejado pendiente de tu aprobación.`
        : `He delegado el objetivo a ${chief.roleTitle}${delegate ? ` y ${delegate.roleTitle}` : ''}.`;

    return {
      activeAgentId,
      summary,
      status: approvalRequired ? 'waiting_approval' : 'active',
      closeObjective: false,
      delegations: buildDelegations(
        chief,
        delegate,
        options.input.operatorMessage,
        isReformulation
      ),
      workOrders,
      operatorMessages: [
        {
          mode: approvalRequired ? 'status' : 'ack',
          text: summary,
          buttons: [],
        },
      ],
      participants: dedupeStrings(['ceo', chief.id, delegate?.id ?? '']),
      contextChannels: dedupeStrings(['telegram', chief.department]),
      toolCalls: dedupeStrings([
        'route_objective',
        isReformulation ? 'reformulate_plan' : 'plan_execution',
        approvalRequired ? 'request_human_approval' : '',
      ]),
      successfulResults: workOrders.length,
      retryCount: options.previousTurnCount ?? 0,
    };
  }

  private resolveAgentId(
    candidate: string | undefined,
    profiles: AgentProfile[],
    fallback: string
  ) {
    if (!candidate) {
      return fallback;
    }

    return profiles.some((profile) => profile.id === candidate) ? candidate : fallback;
  }
}

function buildDelegations(
  chief: AgentProfile,
  delegate: AgentProfile | null,
  operatorMessage: string,
  isReformulation: boolean
) {
  const delegations: OpenClawPlannedDelegation[] = [
    {
      senderAgentId: 'ceo',
      recipientAgentId: chief.id,
      kind: isReformulation ? 'escalation' : 'delegation',
      headline: `${chief.roleTitle} takes ownership`,
      summary: operatorMessage,
      requestedAction: 'plan',
      constraints: isReformulation
        ? ['Produce a safer alternative and reduce risk.']
        : ['Keep the objective within the allowed capability set.'],
      expectedArtifacts: ['brief'],
      capabilityKeys: [],
      executionTarget: 'native',
      payload: {},
      depth: 0,
    },
  ];

  if (delegate) {
    delegations.push({
      senderAgentId: chief.id,
      recipientAgentId: delegate.id,
      kind: 'delegation',
      headline: `${delegate.roleTitle} prepares execution`,
      summary: operatorMessage,
      requestedAction: isReformulation ? 'review' : 'execute',
      constraints: isReformulation
        ? ['Avoid irreversible actions.', 'Produce a bounded alternative.']
        : ['Stay within approved risk budget.', 'Escalate if operator approval is required.'],
      expectedArtifacts: ['brief'],
      capabilityKeys: [],
      executionTarget: 'native',
      payload: {},
      depth: 1,
    });
  }

  return delegations;
}

function selectChiefAgent(message: string, profiles: AgentProfile[]) {
  const chiefById = new Map(profiles.map((profile) => [profile.id, profile]));
  const normalized = message.toLowerCase();

  const engineering = /deploy|release|feature|bug|repo|code|infra|database|api|product|fix/;
  const marketing = /launch|campaign|content|seo|social|newsletter|brand|ad|growth/;
  const sales = /lead|crm|pipeline|sales|prospect|outbound|meeting|deal|revenue/;
  const finance = /budget|cash|runway|invoice|pricing|spend|vendor|finance|forecast|payment/;
  const operations = /ops|follow[- ]?up|meeting|process|cadence|coordination|handoff|review/;

  if (finance.test(normalized)) {
    return chiefById.get('cfo') ?? chiefById.get('chief-of-staff')!;
  }
  if (sales.test(normalized)) {
    return chiefById.get('cro') ?? chiefById.get('chief-of-staff')!;
  }
  if (marketing.test(normalized)) {
    return chiefById.get('cmo') ?? chiefById.get('chief-of-staff')!;
  }
  if (engineering.test(normalized)) {
    return chiefById.get('cto') ?? chiefById.get('chief-of-staff')!;
  }
  if (operations.test(normalized)) {
    return chiefById.get('coo') ?? chiefById.get('chief-of-staff')!;
  }

  return chiefById.get('chief-of-staff') ?? chiefById.get('ceo')!;
}

function selectDelegateAgent(chief: AgentProfile, profiles: AgentProfile[]) {
  return profiles.find((profile) => profile.parentAgentId === chief.id) ?? null;
}

function selectCapability(
  message: string,
  chief: AgentProfile,
  delegate: AgentProfile | null,
  capabilities: OpenClawCapability[]
) {
  const normalized = message.toLowerCase();
  const agent = delegate ?? chief;

  const prefersExecution = /implement|build|run|execute|dispatch|launch|ship|create|prepare/;
  if (!prefersExecution.test(normalized)) {
    return null;
  }

  for (const capabilityKey of agent.allowedCapabilities) {
    const capability = capabilities.find((item) => item.capabilityKey === capabilityKey);
    if (!capability || capability.executionTarget === 'native') {
      continue;
    }
    return capability;
  }

  return null;
}

function requiresApproval(
  message: string,
  executionTarget: OpenClawCapability['executionTarget'] | undefined,
  approvalIntent?: ApprovalIntent
) {
  if (approvalIntent) {
    return false;
  }

  const normalized = message.toLowerCase();
  const risky =
    /deploy|production|pricing|invoice|budget|spend|vendor|delete|remove|dns|customer|public|launch|billing|contract|legal/.test(
      normalized
    );

  return (
    risky || executionTarget === 'workflow_installation' || executionTarget === 'agent_installation'
  );
}

function summarizeExecution(message: string, roleTitle: string) {
  return `${roleTitle} will execute the request: ${truncate(message, 180)}`;
}

function buildBriefSummary(message: string, roleTitle: string) {
  return `${roleTitle} will turn the request into a concise execution brief: ${truncate(
    message,
    180
  )}`;
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function sanitizeDelegation(
  value: unknown,
  profiles: AgentProfile[],
  index: number,
  fallbackSender: string
): OpenClawPlannedDelegation {
  const fallbackRecipient =
    profiles.find((profile) => profile.parentAgentId === fallbackSender)?.id ??
    profiles.find((profile) => profile.id !== 'ceo')?.id ??
    'chief-of-staff';
  const record = asRecord(value);
  const senderAgentId = resolveProfileId(record.senderAgentId, profiles, fallbackSender);
  const recipientAgentId = resolveProfileId(record.recipientAgentId, profiles, fallbackRecipient);

  return {
    delegationId:
      typeof record.delegationId === 'string' && record.delegationId.length > 0
        ? record.delegationId
        : `delegation_${index + 1}`,
    senderAgentId,
    recipientAgentId,
    kind: normalizeDelegationKind(record.kind),
    headline: asNonEmpty(record.headline) ?? `Delegation ${index + 1}`,
    summary: asNonEmpty(record.summary) ?? 'Continue the objective.',
    requestedAction: normalizeRequestedAction(record.requestedAction),
    constraints: asStringArray(record.constraints),
    expectedArtifacts: asStringArray(record.expectedArtifacts),
    capabilityKeys: asStringArray(record.capabilityKeys),
    executionTarget: normalizeExecutionTarget(record.executionTarget),
    payload: asRecord(record.payload),
    parentDelegationId:
      typeof record.parentDelegationId === 'string' ? record.parentDelegationId : undefined,
    depth: typeof record.depth === 'number' ? Math.max(0, Math.trunc(record.depth)) : index,
  };
}

function sanitizeWorkOrder(
  value: unknown,
  profiles: AgentProfile[],
  capabilities: OpenClawCapability[],
  index: number
): OpenClawPlannedWorkOrder {
  const record = asRecord(value);
  const capabilityKey =
    typeof record.capabilityKey === 'string' &&
    capabilities.some((capability) => capability.capabilityKey === record.capabilityKey)
      ? record.capabilityKey
      : undefined;
  const defaultExecutionTarget = capabilityKey
    ? capabilities.find((capability) => capability.capabilityKey === capabilityKey)?.executionTarget
    : undefined;
  const executionTarget = normalizeExecutionTarget(
    record.executionTarget,
    defaultExecutionTarget ?? 'native'
  );

  return {
    agentId: resolveProfileId(
      record.agentId,
      profiles,
      profiles.find((profile) => profile.id !== 'ceo')?.id ?? 'chief-of-staff'
    ),
    workType: normalizeWorkType(record.workType, executionTarget),
    title: asNonEmpty(record.title) ?? `Work order ${index + 1}`,
    summary: asNonEmpty(record.summary) ?? 'Continue the objective.',
    requiresApproval: Boolean(record.requiresApproval),
    executionTarget,
    capabilityKey,
    payload: asRecord(record.payload),
    parentDelegationId:
      typeof record.parentDelegationId === 'string' ? record.parentDelegationId : undefined,
    resumeFromWorkOrderId:
      typeof record.resumeFromWorkOrderId === 'string' ? record.resumeFromWorkOrderId : undefined,
  };
}

function sanitizeOperatorMessage(value: unknown) {
  const record = asRecord(value);
  const text = asNonEmpty(record.text);
  if (!text) {
    return null;
  }

  return {
    mode: normalizeMessageMode(record.mode),
    text,
    buttons: [],
  } satisfies OpenClawOperatorMessage;
}

function resolveProfileId(value: unknown, profiles: AgentProfile[], fallback: string) {
  return typeof value === 'string' && profiles.some((profile) => profile.id === value)
    ? value
    : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function asNonEmpty(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStatus(value: unknown) {
  return value === 'active' ||
    value === 'waiting_approval' ||
    value === 'completed' ||
    value === 'blocked'
    ? value
    : undefined;
}

function normalizeDelegationKind(value: unknown) {
  return value === 'delegation' ||
    value === 'response' ||
    value === 'conflict' ||
    value === 'escalation'
    ? value
    : 'delegation';
}

function normalizeRequestedAction(value: unknown) {
  return value === 'plan' ||
    value === 'execute' ||
    value === 'review' ||
    value === 'approve' ||
    value === 'escalate'
    ? value
    : 'plan';
}

function normalizeExecutionTarget(
  value: unknown,
  fallback: 'native' | 'agent_installation' | 'workflow_installation' | 'telegram' = 'native'
) {
  return value === 'native' ||
    value === 'agent_installation' ||
    value === 'workflow_installation' ||
    value === 'telegram'
    ? value
    : fallback;
}

function normalizeWorkType(
  value: unknown,
  executionTarget: 'native' | 'agent_installation' | 'workflow_installation' | 'telegram'
) {
  if (
    value === 'prepare_artifact' ||
    value === 'run_agent_installation' ||
    value === 'run_workflow_installation' ||
    value === 'request_human_approval' ||
    value === 'sync_internal_state' ||
    value === 'notify_telegram'
  ) {
    return value;
  }

  if (executionTarget === 'agent_installation') {
    return 'run_agent_installation';
  }
  if (executionTarget === 'workflow_installation') {
    return 'run_workflow_installation';
  }
  if (executionTarget === 'telegram') {
    return 'notify_telegram';
  }

  return 'prepare_artifact';
}

function normalizeMessageMode(value: unknown) {
  return value === 'ack' ||
    value === 'status' ||
    value === 'approval' ||
    value === 'summary' ||
    value === 'callback'
    ? value
    : 'status';
}

function dedupeStrings(values: Array<string | undefined>) {
  return [...new Set(values.filter(isNonEmptyString))];
}
