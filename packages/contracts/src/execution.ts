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
  'skipped',
]);

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

const LegacyExecutionStatusSchema = z.enum(['completed']);

const RawExecutionStatusSchema = z.union([
  ExecutionStatusSchema,
  LegacyExecutionStatusSchema,
]);

// ---------------------------------------------------------------------------
// Execution step
// ---------------------------------------------------------------------------

export const ExecutionStepTypeSchema = z.enum([
  'tool_call',
  'agent_invoke',
  'condition',
  'loop',
  'approval',
  'n8n_execution',
]);

export type ExecutionStepType = z.infer<typeof ExecutionStepTypeSchema>;

const LegacyExecutionStepTypeSchema = z.enum(['n8n-execution']);

const RawExecutionStepTypeSchema = z.union([
  ExecutionStepTypeSchema,
  LegacyExecutionStepTypeSchema,
]);

export const ExecutionStepSchema = z.object({
  id: z.string(),
  type: RawExecutionStepTypeSchema.transform((type) =>
    type === 'n8n-execution' ? 'n8n_execution' : type,
  ),
  name: z.string(),
  status: RawExecutionStatusSchema.transform((status) =>
    status === 'completed' ? 'success' : status,
  ),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  durationMs: z.number().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
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
  status: RawExecutionStatusSchema.transform((status) =>
    status === 'completed' ? 'success' : status,
  ),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  durationMs: z.number().optional(),
  costEstimate: z.number(),
  tokensUsed: z.number(),
  logs: z.array(z.string()),
  timeline: z.array(ExecutionStepSchema),
  triggeredBy: TriggerTypeSchema,
  tags: z.array(z.string()),
});

export type ExecutionRun = z.infer<typeof ExecutionRunSchema>;

export const ExecutionRunsResponseSchema = z.object({
  runs: z.array(ExecutionRunSchema),
});

export type ExecutionRunsResponse = z.infer<typeof ExecutionRunsResponseSchema>;

export const ExecutionRunResponseSchema = z.object({
  run: ExecutionRunSchema,
});

export type ExecutionRunResponse = z.infer<typeof ExecutionRunResponseSchema>;

export const ExecutionRunLogsResponseSchema = z.object({
  logs: z.array(z.string()),
});

export type ExecutionRunLogsResponse = z.infer<
  typeof ExecutionRunLogsResponseSchema
>;
