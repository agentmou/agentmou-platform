import {
  ExecutionRunSchema,
  ExecutionStepSchema,
  type ExecutionRun,
  type ExecutionStep,
} from '@agentmou/contracts';
import { executionRuns, executionSteps } from '@agentmou/db';

type ExecutionRunRow = typeof executionRuns.$inferSelect;
type ExecutionStepRow = typeof executionSteps.$inferSelect;

export function mapExecutionStep(step: ExecutionStepRow): ExecutionStep {
  return ExecutionStepSchema.parse({
    id: step.id,
    type: normalizeStepType(step.type),
    name: step.name,
    status: normalizeStatus(step.status),
    startedAt: step.startedAt.toISOString(),
    completedAt: step.completedAt?.toISOString(),
    durationMs: step.durationMs ?? undefined,
    input: step.input ?? undefined,
    output: step.output ?? undefined,
    error: step.error ?? undefined,
    tokenUsage: step.tokenUsage ?? undefined,
    cost: step.cost ?? undefined,
  });
}

export function mapExecutionRun(
  run: ExecutionRunRow,
  resolved: {
    agentId?: string;
    workflowId?: string;
    steps?: ExecutionStepRow[];
    logs?: string[];
  } = {}
): ExecutionRun {
  const timeline = (resolved.steps ?? []).map(mapExecutionStep);

  return ExecutionRunSchema.parse({
    id: run.id,
    tenantId: run.tenantId,
    agentInstallationId: run.agentInstallationId ?? null,
    workflowInstallationId: run.workflowInstallationId ?? null,
    agentId: resolved.agentId,
    workflowId: resolved.workflowId,
    status: normalizeStatus(run.status),
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    durationMs: run.durationMs ?? undefined,
    costEstimate: run.costEstimate ?? 0,
    tokensUsed: run.tokensUsed ?? 0,
    logs: resolved.logs ?? buildExecutionLogs(timeline),
    timeline,
    triggeredBy: run.triggeredBy,
    tags: normalizeTags(run.tags),
  });
}

export function buildExecutionLogs(steps: ExecutionStep[]): string[] {
  return steps.map((step) => {
    const prefix = `[${step.startedAt}] ${step.status.toUpperCase()} ${step.type.toUpperCase()}`;
    if (step.error) {
      return `${prefix} ${step.name} - ${step.error}`;
    }
    if (step.durationMs !== undefined) {
      return `${prefix} ${step.name} (${step.durationMs}ms)`;
    }
    return `${prefix} ${step.name}`;
  });
}

function normalizeStepType(type: string): string {
  return type === 'n8n-execution' ? 'n8n_execution' : type;
}

function normalizeStatus(status: string): string {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'cancelled') {
    return 'error';
  }

  return status;
}

function normalizeTags(tags: unknown): string[] {
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
}
