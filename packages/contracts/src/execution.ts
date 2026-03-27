import { z } from 'zod';

// ---------------------------------------------------------------------------
// Execution status
// ---------------------------------------------------------------------------

/** Canonical execution statuses used across runs and steps. */
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

/** TypeScript view of canonical execution statuses. */
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

const LegacyExecutionStatusSchema = z.enum(['completed']);

const RawExecutionStatusSchema = z.union([
  ExecutionStatusSchema,
  LegacyExecutionStatusSchema,
]);

// ---------------------------------------------------------------------------
// Execution step
// ---------------------------------------------------------------------------

/** Supported execution step kinds recorded in run timelines. */
export const ExecutionStepTypeSchema = z.enum([
  'tool_call',
  'agent_invoke',
  'condition',
  'loop',
  'approval',
  'n8n_execution',
]);

/** TypeScript view of supported execution step kinds. */
export type ExecutionStepType = z.infer<typeof ExecutionStepTypeSchema>;

const LegacyExecutionStepTypeSchema = z.enum(['n8n-execution']);

const RawExecutionStepTypeSchema = z.union([
  ExecutionStepTypeSchema,
  LegacyExecutionStepTypeSchema,
]);

/** Timeline entry emitted for a single execution step. */
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

/** TypeScript shape for an execution step. */
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

// ---------------------------------------------------------------------------
// Execution run
// ---------------------------------------------------------------------------

/** Supported trigger origins for an execution run. */
export const TriggerTypeSchema = z.enum(['webhook', 'cron', 'manual', 'api', 'agent']);

/** Full execution run payload returned by the API. */
export const ExecutionRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  agentInstallationId: z.string().uuid().nullable().optional(),
  workflowInstallationId: z.string().uuid().nullable().optional(),
  // Template ids stay available for UI lookup, but installation ids are canonical.
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

/** TypeScript shape for an execution run. */
export type ExecutionRun = z.infer<typeof ExecutionRunSchema>;

/** Response payload for listing execution runs. */
export const ExecutionRunsResponseSchema = z.object({
  runs: z.array(ExecutionRunSchema),
});

/** TypeScript shape for the execution run list response. */
export type ExecutionRunsResponse = z.infer<typeof ExecutionRunsResponseSchema>;

/** Response payload for a single execution run lookup. */
export const ExecutionRunResponseSchema = z.object({
  run: ExecutionRunSchema,
});

/** TypeScript shape for a single execution run response. */
export type ExecutionRunResponse = z.infer<typeof ExecutionRunResponseSchema>;

/** Response payload for retrieving execution log lines. */
export const ExecutionRunLogsResponseSchema = z.object({
  logs: z.array(z.string()),
});

/** TypeScript shape for the execution log response. */
export type ExecutionRunLogsResponse = z.infer<
  typeof ExecutionRunLogsResponseSchema
>;
