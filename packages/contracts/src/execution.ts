import { z } from 'zod';

// ---------------------------------------------------------------------------
// Execution status
// ---------------------------------------------------------------------------

export const ExecutionStatusSchema = z.enum([
  'running',
  'success',
  'failed',
  'pending_approval',
  'rejected',
  'timeout',
  'error',
]);

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

// ---------------------------------------------------------------------------
// Execution step
// ---------------------------------------------------------------------------

export const ExecutionStepTypeSchema = z.enum([
  'trigger',
  'transform',
  'llm',
  'action',
  'output',
  'approval',
  'fetch',
  'extract',
]);

export const ExecutionStepSchema = z.object({
  id: z.string(),
  type: ExecutionStepTypeSchema,
  name: z.string(),
  status: ExecutionStatusSchema,
  startedAt: z.string(),
  durationMs: z.number().optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  tokenUsage: z.number().optional(),
  cost: z.number().optional(),
});

export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

// ---------------------------------------------------------------------------
// Execution run
// ---------------------------------------------------------------------------

export const TriggerTypeSchema = z.enum(['webhook', 'cron', 'manual', 'api', 'agent']);

export const ExecutionRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  agentId: z.string().optional(),
  workflowId: z.string().optional(),
  status: ExecutionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  durationMs: z.number(),
  costEstimate: z.number(),
  tokensUsed: z.number(),
  logs: z.array(z.string()),
  timeline: z.array(ExecutionStepSchema),
  triggeredBy: TriggerTypeSchema,
  tags: z.array(z.string()),
});

export type ExecutionRun = z.infer<typeof ExecutionRunSchema>;
