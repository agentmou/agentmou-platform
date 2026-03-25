import { z } from 'zod';

export const InternalDepartmentSchema = z.enum([
  'executive',
  'engineering',
  'marketing',
  'operations',
  'sales',
  'finance',
]);

export type InternalDepartment = z.infer<typeof InternalDepartmentSchema>;

export const InternalChannelSchema = z.enum([
  'telegram',
  'internal_callback',
  'system',
]);

export type InternalChannel = z.infer<typeof InternalChannelSchema>;

export const SessionStatusSchema = z.enum([
  'active',
  'waiting_approval',
  'blocked',
  'completed',
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ObjectiveStatusSchema = z.enum([
  'active',
  'in_progress',
  'waiting_approval',
  'blocked',
  'completed',
  'cancelled',
]);

export type ObjectiveStatus = z.infer<typeof ObjectiveStatusSchema>;

export const DelegationKindSchema = z.enum([
  'delegation',
  'response',
  'conflict',
  'escalation',
]);

export type DelegationKind = z.infer<typeof DelegationKindSchema>;

export const WorkOrderKindSchema = z.enum([
  'prepare_artifact',
  'run_agent_installation',
  'run_workflow_installation',
  'request_human_approval',
  'sync_internal_state',
  'notify_telegram',
]);

export type WorkOrderKind = z.infer<typeof WorkOrderKindSchema>;

export const WorkOrderStatusSchema = z.enum([
  'queued',
  'waiting_approval',
  'in_progress',
  'dispatched',
  'completed',
  'blocked',
  'cancelled',
]);

export type WorkOrderStatus = z.infer<typeof WorkOrderStatusSchema>;

export const ArtifactKindSchema = z.enum([
  'brief',
  'decision_log',
  'workflow_handoff',
  'approval_summary',
  'memory_summary',
  'execution_run_summary',
  'telegram_delivery',
]);

export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const MemoryScopeSchema = z.enum(['objective', 'agent', 'session']);

export type MemoryScope = z.infer<typeof MemoryScopeSchema>;

export const ExecutionTargetSchema = z.enum([
  'native',
  'agent_installation',
  'workflow_installation',
  'telegram',
]);

export type ExecutionTarget = z.infer<typeof ExecutionTargetSchema>;

export const CapabilityBindingTargetSchema = z.enum([
  'native',
  'agent_installation',
  'workflow_installation',
]);

export type CapabilityBindingTarget = z.infer<
  typeof CapabilityBindingTargetSchema
>;

export const ProtocolEnvelopeActionSchema = z.enum([
  'plan',
  'execute',
  'review',
  'approve',
  'escalate',
]);

export type ProtocolEnvelopeAction = z.infer<
  typeof ProtocolEnvelopeActionSchema
>;

export const AgentKpiSchema = z.object({
  name: z.string().min(1),
  target: z.string().min(1).optional(),
});

export type AgentKpi = z.infer<typeof AgentKpiSchema>;

export const AgentProfileSchema = z.object({
  id: z.string().min(1),
  roleTitle: z.string().min(1),
  department: InternalDepartmentSchema,
  parentAgentId: z.string().min(1).optional(),
  mission: z.string().min(1),
  kpis: z.array(AgentKpiSchema).default([]),
  allowedTools: z.array(z.string()).default([]),
  allowedCapabilities: z.array(z.string()).default([]),
  allowedWorkflowTags: z.array(z.string()).default([]),
  memoryScope: MemoryScopeSchema,
  riskBudget: z.enum(['low', 'medium', 'high']),
  participantBudget: z.number().int().min(1).default(4),
  maxDelegationDepth: z.number().int().min(1).default(3),
  escalationPolicy: z.string().min(1),
  playbooks: z.array(z.string()).default([]),
});

export type AgentProfile = z.infer<typeof AgentProfileSchema>;

export const AgentRelationshipSchema = z.object({
  id: z.string().uuid().optional(),
  parentAgentId: z.string().min(1),
  childAgentId: z.string().min(1),
  relationship: z.enum(['manages', 'delegates_to', 'reviews']),
});

export type AgentRelationship = z.infer<typeof AgentRelationshipSchema>;

export const CoherenceSignalSummarySchema = z.object({
  continueMode: z.enum(['continue', 'rerun_bounded', 'pause', 'escalate']),
  alertIds: z.array(z.string()).default([]),
  controlTypes: z.array(z.string()).default([]),
  reviewRequired: z.boolean().default(false),
  paused: z.boolean().default(false),
});

export type CoherenceSignalSummary = z.infer<
  typeof CoherenceSignalSummarySchema
>;

export const DelegationEnvelopeSchema = z.object({
  contract: z.object({
    system: z.literal('agentmou-internal-ops'),
    version: z.string().min(1),
  }),
  kind: DelegationKindSchema,
  senderAgentId: z.string().min(1),
  recipientAgentId: z.string().min(1),
  sessionId: z.string().uuid(),
  objectiveId: z.string().uuid(),
  parentDelegationId: z.string().uuid().optional(),
  headline: z.string().min(1),
  summary: z.string().min(1),
  requestedAction: ProtocolEnvelopeActionSchema,
  constraints: z.array(z.string()).default([]),
  expectedArtifacts: z.array(z.string()).default([]),
  capabilityKeys: z.array(z.string()).default([]),
  executionTarget: ExecutionTargetSchema.default('native'),
  coherence: CoherenceSignalSummarySchema.optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const ProtocolEnvelopeSchema = DelegationEnvelopeSchema;

export type DelegationEnvelope = z.infer<typeof DelegationEnvelopeSchema>;
export type ProtocolEnvelope = DelegationEnvelope;

export const ConversationSessionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  channel: InternalChannelSchema,
  externalChatId: z.string().min(1),
  externalUserId: z.string().min(1),
  status: SessionStatusSchema,
  currentObjectiveId: z.string().uuid().optional(),
  openclawSessionId: z.string().min(1).optional(),
  lastMessage: z.string().min(1).optional(),
  lastMessageAt: z.string(),
});

export type ConversationSession = z.infer<typeof ConversationSessionSchema>;

export const ObjectiveSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  runId: z.string().uuid(),
  ownerAgentId: z.string().min(1),
  rootAgentId: z.string().min(1),
  openclawSessionId: z.string().min(1).optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: ObjectiveStatusSchema,
  requestedBy: z.string().min(1),
  sourceMessage: z.string().min(1),
  coherence: CoherenceSignalSummarySchema,
});

export type Objective = z.infer<typeof ObjectiveSchema>;

export const DelegationSchema = z.object({
  id: z.string().uuid(),
  objectiveId: z.string().uuid(),
  sessionId: z.string().uuid(),
  senderAgentId: z.string().min(1),
  recipientAgentId: z.string().min(1),
  kind: DelegationKindSchema,
  parentDelegationId: z.string().uuid().optional(),
  depth: z.number().int().min(0).default(0),
  envelope: ProtocolEnvelopeSchema,
  status: z.enum(['created', 'accepted', 'blocked', 'completed']),
});

export type Delegation = z.infer<typeof DelegationSchema>;

export const WorkOrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  objectiveId: z.string().uuid(),
  delegationId: z.string().uuid().optional(),
  parentDelegationId: z.string().uuid().optional(),
  agentId: z.string().min(1),
  workType: WorkOrderKindSchema,
  status: WorkOrderStatusSchema,
  executionTarget: ExecutionTargetSchema,
  capabilityKey: z.string().min(1).optional(),
  openclawSessionId: z.string().min(1).optional(),
  executionRunId: z.string().uuid().optional(),
  resumeFromWorkOrderId: z.string().uuid().optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  requiresApproval: z.boolean(),
  approvalRequestId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type WorkOrder = z.infer<typeof WorkOrderSchema>;

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  objectiveId: z.string().uuid(),
  workOrderId: z.string().uuid().optional(),
  agentId: z.string().min(1),
  summary: z.string().min(1),
  rationale: z.string().min(1),
  outcome: z.enum(['queued', 'approved', 'rejected', 'completed', 'blocked']),
});

export type Decision = z.infer<typeof DecisionSchema>;

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  objectiveId: z.string().uuid(),
  workOrderId: z.string().uuid().optional(),
  executionRunId: z.string().uuid().optional(),
  agentId: z.string().min(1),
  artifactType: ArtifactKindSchema,
  title: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const ApprovalIntentSchema = z.object({
  objectiveId: z.string().uuid(),
  workOrderId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  openclawSessionId: z.string().min(1).optional(),
  source: z.enum(['telegram', 'internal_orchestrator']),
  requestedAction: z.string().min(1),
  resumeToken: z.string().min(1),
  resumeTarget: z.enum(['turn', 'work_order']).default('work_order'),
  sourceMetadata: z.record(z.string(), z.unknown()).default({}),
});

export type ApprovalIntent = z.infer<typeof ApprovalIntentSchema>;

export const TelegramUserSchema = z.object({
  id: z.number().int(),
  is_bot: z.boolean().optional(),
  first_name: z.string().optional(),
  username: z.string().optional(),
});

export type TelegramUser = z.infer<typeof TelegramUserSchema>;

export const TelegramChatSchema = z.object({
  id: z.number().int(),
  type: z.string().min(1),
  title: z.string().optional(),
  username: z.string().optional(),
});

export type TelegramChat = z.infer<typeof TelegramChatSchema>;

export const TelegramMessageSchema = z.object({
  message_id: z.number().int(),
  from: TelegramUserSchema.optional(),
  chat: TelegramChatSchema,
  date: z.number().int(),
  text: z.string().min(1).optional(),
  reply_markup: z.record(z.string(), z.unknown()).optional(),
});

export type TelegramMessage = z.infer<typeof TelegramMessageSchema>;

export const TelegramCallbackQuerySchema = z.object({
  id: z.string().min(1),
  from: TelegramUserSchema,
  data: z.string().min(1).optional(),
  message: TelegramMessageSchema.optional(),
});

export type TelegramCallbackQuery = z.infer<
  typeof TelegramCallbackQuerySchema
>;

export const TelegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: TelegramMessageSchema.optional(),
  callback_query: TelegramCallbackQuerySchema.optional(),
});

export type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;

export const TelegramDeliveryModeSchema = z.enum([
  'ack',
  'status',
  'approval',
  'summary',
  'callback',
]);

export type TelegramDeliveryMode = z.infer<typeof TelegramDeliveryModeSchema>;

export const InternalTelegramMessageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  objectiveId: z.string().uuid().optional(),
  direction: z.enum(['inbound', 'outbound']),
  mode: TelegramDeliveryModeSchema,
  chatId: z.string().min(1),
  userId: z.string().min(1).optional(),
  updateId: z.number().int().optional(),
  messageId: z.number().int().optional(),
  callbackQueryId: z.string().min(1).optional(),
  dedupeKey: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  deliveredAt: z.string().optional(),
});

export type InternalTelegramMessage = z.infer<
  typeof InternalTelegramMessageSchema
>;

export const InternalOpenClawSessionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  objectiveId: z.string().uuid(),
  remoteSessionId: z.string().min(1),
  status: z.enum(['active', 'paused', 'completed', 'cancelled', 'failed']),
  activeAgentId: z.string().min(1),
  primaryAgentId: z.string().min(1),
  traceReference: z.record(z.string(), z.unknown()).default({}),
  lastTurnAt: z.string(),
});

export type InternalOpenClawSession = z.infer<
  typeof InternalOpenClawSessionSchema
>;

export const CapabilityBindingSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  capabilityKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  targetType: CapabilityBindingTargetSchema,
  agentInstallationId: z.string().uuid().optional(),
  workflowInstallationId: z.string().uuid().optional(),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
});

export type CapabilityBinding = z.infer<typeof CapabilityBindingSchema>;

export const OpenClawCapabilitySchema = z.object({
  capabilityKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  executionTarget: CapabilityBindingTargetSchema,
  bindingRequired: z.boolean().default(false),
});

export type OpenClawCapability = z.infer<typeof OpenClawCapabilitySchema>;

export const OpenClawOperatorMessageSchema = z.object({
  mode: TelegramDeliveryModeSchema,
  text: z.string().min(1),
  buttons: z
    .array(
      z.object({
        action: z.enum(['approve', 'reject', 'postpone', 'reformulate']),
        label: z.string().min(1),
        approvalId: z.string().uuid().optional(),
      }),
    )
    .default([]),
});

export type OpenClawOperatorMessage = z.infer<
  typeof OpenClawOperatorMessageSchema
>;

export const OpenClawPlannedDelegationSchema = z.object({
  delegationId: z.string().min(1).optional(),
  senderAgentId: z.string().min(1),
  recipientAgentId: z.string().min(1),
  kind: DelegationKindSchema,
  headline: z.string().min(1),
  summary: z.string().min(1),
  requestedAction: ProtocolEnvelopeActionSchema,
  constraints: z.array(z.string()).default([]),
  expectedArtifacts: z.array(z.string()).default([]),
  capabilityKeys: z.array(z.string()).default([]),
  executionTarget: ExecutionTargetSchema.default('native'),
  payload: z.record(z.string(), z.unknown()).default({}),
  parentDelegationId: z.string().min(1).optional(),
  depth: z.number().int().min(0).default(0),
});

export type OpenClawPlannedDelegation = z.infer<
  typeof OpenClawPlannedDelegationSchema
>;

export const OpenClawPlannedWorkOrderSchema = z.object({
  agentId: z.string().min(1),
  workType: WorkOrderKindSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  requiresApproval: z.boolean().default(false),
  executionTarget: ExecutionTargetSchema,
  capabilityKey: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  parentDelegationId: z.string().min(1).optional(),
  resumeFromWorkOrderId: z.string().uuid().optional(),
});

export type OpenClawPlannedWorkOrder = z.infer<
  typeof OpenClawPlannedWorkOrderSchema
>;

export const OpenClawTurnInputSchema = z.object({
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  objectiveId: z.string().uuid(),
  remoteSessionId: z.string().min(1).optional(),
  trigger: z.enum([
    'telegram_message',
    'approval_resolution',
    'system_resume',
  ]),
  activeAgentId: z.string().min(1),
  operatorMessage: z.string().min(1),
  approvalIntent: ApprovalIntentSchema.optional(),
  agentProfiles: z.array(AgentProfileSchema).default([]),
  capabilities: z.array(OpenClawCapabilitySchema).default([]),
  memory: z
    .array(
      z.object({
        scope: MemoryScopeSchema,
        title: z.string().min(1),
        summary: z.string().min(1),
      }),
    )
    .default([]),
  context: z.record(z.string(), z.unknown()).default({}),
});

export type OpenClawTurnInput = z.infer<typeof OpenClawTurnInputSchema>;

export const OpenClawTurnResultSchema = z.object({
  remoteSessionId: z.string().min(1),
  activeAgentId: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(['active', 'waiting_approval', 'completed', 'blocked']),
  closeObjective: z.boolean().default(false),
  delegations: z.array(OpenClawPlannedDelegationSchema).default([]),
  workOrders: z.array(OpenClawPlannedWorkOrderSchema).default([]),
  operatorMessages: z.array(OpenClawOperatorMessageSchema).default([]),
  participants: z.array(z.string()).default([]),
  contextChannels: z.array(z.string()).default([]),
  toolCalls: z.array(z.string()).default([]),
  successfulResults: z.number().int().min(0).default(0),
  retryCount: z.number().int().min(0).default(0),
  checkpointToken: z.string().min(1).optional(),
  traceReference: z.record(z.string(), z.unknown()).default({}),
});

export type OpenClawTurnResult = z.infer<typeof OpenClawTurnResultSchema>;

export const OpenClawTraceResponseSchema = z.object({
  remoteSessionId: z.string().min(1),
  traceReference: z.record(z.string(), z.unknown()).default({}),
  events: z.array(z.record(z.string(), z.unknown())).default([]),
});

export type OpenClawTraceResponse = z.infer<
  typeof OpenClawTraceResponseSchema
>;

export const InternalOpsResponseSchema = z.object({
  ok: z.boolean(),
  sessionId: z.string().uuid().optional(),
  objectiveId: z.string().uuid().optional(),
  summary: z.string().min(1),
  approvalRequired: z.boolean().default(false),
  queuedWorkOrderIds: z.array(z.string().uuid()).default([]),
});

export type InternalOpsResponse = z.infer<typeof InternalOpsResponseSchema>;
