import { z } from 'zod';
import { RiskLevelSchema } from './catalog';

// ---------------------------------------------------------------------------
// Approval action types
// ---------------------------------------------------------------------------

export const ApprovalActionTypeSchema = z.enum([
  'send_email',
  'create_ticket',
  'update_crm',
  'update_calendar',
  'post_message',
  'transfer_funds',
  'delete_data',
]);

export type ApprovalActionType = z.infer<typeof ApprovalActionTypeSchema>;

// ---------------------------------------------------------------------------
// Approval request (HITL)
// ---------------------------------------------------------------------------

export const ApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const ApprovalContextSchema = z.object({
  inputs: z.record(z.string(), z.unknown()).optional(),
  sources: z.array(z.string()).optional(),
  previousMessages: z.array(z.string()).optional(),
}).catchall(z.unknown());

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
  requestedAt: z.string(),
  decidedAt: z.string().optional(),
  decidedBy: z.string().optional(),
  decisionReason: z.string().optional(),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const ApprovalRequestsResponseSchema = z.object({
  approvals: z.array(ApprovalRequestSchema),
});

export type ApprovalRequestsResponse = z.infer<
  typeof ApprovalRequestsResponseSchema
>;

export const ApprovalResponseSchema = z.object({
  approval: ApprovalRequestSchema,
});

export type ApprovalResponse = z.infer<typeof ApprovalResponseSchema>;
