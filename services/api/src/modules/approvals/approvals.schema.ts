import { z } from 'zod';
import {
  ApprovalActionTypeSchema,
  ApprovalContextSchema,
  ApprovalSourceSchema,
  ApprovalStatusSchema,
} from '@agentmou/contracts';
import { RiskLevelSchema } from '@agentmou/contracts';

export const approvalListQuerySchema = z.object({
  status: ApprovalStatusSchema.optional(),
});

export const approvalDecisionBodySchema = z.object({
  reason: z.string().trim().min(1).optional(),
});

export const createApprovalBodySchema = z.object({
  runId: z.string().min(1),
  agentInstallationId: z.string().uuid().optional(),
  actionType: ApprovalActionTypeSchema,
  riskLevel: RiskLevelSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  payloadPreview: z.unknown().optional(),
  context: ApprovalContextSchema.optional(),
  source: ApprovalSourceSchema.optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
  resumeToken: z.string().min(1).optional(),
  objectiveId: z.string().uuid().optional(),
  workOrderId: z.string().uuid().optional(),
});

export type ApprovalListQuery = z.infer<typeof approvalListQuerySchema>;
export type ApprovalDecisionBody = z.infer<typeof approvalDecisionBodySchema>;
export type CreateApprovalBody = z.infer<typeof createApprovalBodySchema>;
