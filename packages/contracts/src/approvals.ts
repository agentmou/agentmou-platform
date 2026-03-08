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
  inputs: z.record(z.unknown()),
  sources: z.array(z.string()),
  previousMessages: z.array(z.string()).optional(),
});

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  runId: z.string(),
  agentId: z.string(),
  actionType: ApprovalActionTypeSchema,
  riskLevel: RiskLevelSchema,
  title: z.string(),
  description: z.string(),
  payloadPreview: z.record(z.unknown()),
  context: ApprovalContextSchema,
  status: ApprovalStatusSchema,
  requestedAt: z.string(),
  decidedAt: z.string().optional(),
  decidedBy: z.string().optional(),
  decisionReason: z.string().optional(),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
