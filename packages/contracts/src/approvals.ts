import { z } from 'zod';
import { RiskLevelSchema } from './catalog';

// ---------------------------------------------------------------------------
// Approval action types
// ---------------------------------------------------------------------------

/** Actions that require human approval before execution can continue. */
export const ApprovalActionTypeSchema = z.enum([
  'send_email',
  'create_ticket',
  'update_crm',
  'update_calendar',
  'post_message',
  'transfer_funds',
  'delete_data',
  'dispatch_workflow',
  'publish_campaign',
  'adjust_budget',
  'change_strategy',
  'run_agent_installation',
  'run_workflow_installation',
  'sync_internal_state',
  'notify_operator',
]);

/** TypeScript view of approval-gated action types. */
export type ApprovalActionType = z.infer<typeof ApprovalActionTypeSchema>;

// ---------------------------------------------------------------------------
// Approval request (HITL)
// ---------------------------------------------------------------------------

/** Status values for a human-in-the-loop approval request. */
export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);

/** Channel or subsystem that originated the approval request. */
export const ApprovalSourceSchema = z.enum([
  'web',
  'telegram',
  'internal_orchestrator',
]);

/** Structured context captured alongside an approval request. */
export const ApprovalContextSchema = z.object({
  inputs: z.record(z.string(), z.unknown()).optional(),
  sources: z.array(z.string()).optional(),
  previousMessages: z.array(z.string()).optional(),
}).catchall(z.unknown());

/** Full approval request contract shared across API, web, and worker. */
export const ApprovalRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  runId: z.string(),
  agentId: z.string(),
  actionType: ApprovalActionTypeSchema,
  riskLevel: RiskLevelSchema,
  title: z.string(),
  description: z.string().default(''),
  payloadPreview: z.unknown(),
  context: ApprovalContextSchema,
  status: ApprovalStatusSchema,
  source: ApprovalSourceSchema.optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
  resumeToken: z.string().optional(),
  objectiveId: z.string().uuid().optional(),
  workOrderId: z.string().uuid().optional(),
  requestedAt: z.string(),
  decidedAt: z.string().optional(),
  decidedBy: z.string().optional(),
  decisionReason: z.string().optional(),
});

/** TypeScript shape for an approval request. */
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

/** Collection response returned by approval list endpoints. */
export const ApprovalRequestsResponseSchema = z.object({
  approvals: z.array(ApprovalRequestSchema),
});

/** TypeScript shape for an approval list response. */
export type ApprovalRequestsResponse = z.infer<
  typeof ApprovalRequestsResponseSchema
>;

/** Single-item response returned by approval detail endpoints. */
export const ApprovalResponseSchema = z.object({
  approval: ApprovalRequestSchema,
});

/** TypeScript shape for a single approval response. */
export type ApprovalResponse = z.infer<typeof ApprovalResponseSchema>;
