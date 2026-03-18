import { db, executionRuns, executionSteps } from '@agentmou/db';
import { eq } from 'drizzle-orm';

/**
 * Single log entry emitted during a run.
 */
export interface LogEntry {
  id: string;
  runId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated metrics tracked for an execution run.
 */
export interface RunMetrics {
  runId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'success' | 'failed';
  steps: RunStep[];
  totalDuration?: number;
  cost?: number;
  tokensUsed?: { input: number; output: number; total: number };
}

/**
 * Per-step execution data captured while a run is in progress.
 */
export interface RunStep {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  output?: unknown;
  tokenUsage?: number;
  cost?: number;
}

/**
 * Logs execution steps and run metrics to the database.
 *
 * Each step is persisted as an `execution_steps` row and the overall
 * run metrics are updated on `execution_runs` when the run finishes.
 */
export class RunLogger {
  private steps: Map<string, RunStep[]> = new Map();

  async startRun(
    runId: string,
    metadata?: Record<string, unknown>
  ): Promise<RunMetrics> {
    this.steps.set(runId, []);

    return {
      runId,
      startTime: new Date(),
      status: 'running',
      steps: [],
    };
  }

  /**
   * Records a step starting — persists to the `execution_steps` table.
   */
  async startStep(
    runId: string,
    step: Omit<RunStep, 'status' | 'startedAt'>
  ): Promise<RunStep> {
    const newStep: RunStep = {
      ...step,
      status: 'running',
      startedAt: new Date(),
    };

    // Persist to DB
    await db.insert(executionSteps).values({
      id: step.id,
      runId,
      type: step.type,
      name: step.name,
      status: 'running',
      input: (step as Record<string, unknown>).input ?? null,
      startedAt: new Date(),
    });

    const runSteps = this.steps.get(runId) ?? [];
    runSteps.push(newStep);
    this.steps.set(runId, runSteps);

    return newStep;
  }

  /**
   * Marks a step as completed and persists output/duration to the DB.
   */
  async completeStep(
    runId: string,
    stepId: string,
    output?: unknown,
    tokenUsage?: number,
    cost?: number
  ): Promise<RunStep | undefined> {
    const runSteps = this.steps.get(runId);
    const step = runSteps?.find((s) => s.id === stepId);
    if (!step) return;

    const now = new Date();
    step.status = 'success';
    step.completedAt = now;
    step.duration = now.getTime() - (step.startedAt?.getTime() ?? now.getTime());
    step.output = output;
    step.tokenUsage = tokenUsage;
    step.cost = cost;

    await db
      .update(executionSteps)
      .set({
        status: 'success',
        output: output as Record<string, unknown>,
        durationMs: step.duration,
        tokenUsage: tokenUsage ?? null,
        cost: cost ?? null,
        completedAt: now,
      })
      .where(eq(executionSteps.id, stepId));

    return step;
  }

  /**
   * Marks a step as failed and persists the error to the DB.
   */
  async failStep(
    runId: string,
    stepId: string,
    error: string
  ): Promise<RunStep | undefined> {
    const runSteps = this.steps.get(runId);
    const step = runSteps?.find((s) => s.id === stepId);
    if (!step) return;

    const now = new Date();
    step.status = 'failed';
    step.completedAt = now;
    step.duration = now.getTime() - (step.startedAt?.getTime() ?? now.getTime());
    step.error = error;

    await db
      .update(executionSteps)
      .set({
        status: 'failed',
        error,
        durationMs: step.duration,
        completedAt: now,
      })
      .where(eq(executionSteps.id, stepId));

    return step;
  }

  /**
   * Finishes a run — updates `execution_runs` with final metrics.
   */
  async completeRun(
    runId: string,
    status: 'success' | 'failed',
    metrics?: {
      tokensUsed?: number;
      costEstimate?: number;
    }
  ): Promise<RunMetrics> {
    const now = new Date();
    const runSteps = this.steps.get(runId) ?? [];
    const totalDuration = runSteps.reduce((sum, s) => sum + (s.duration ?? 0), 0);

    await db
      .update(executionRuns)
      .set({
        status,
        completedAt: now,
        durationMs: totalDuration,
        tokensUsed: metrics?.tokensUsed ?? null,
        costEstimate: metrics?.costEstimate ?? null,
      })
      .where(eq(executionRuns.id, runId));

    return {
      runId,
      startTime: new Date(),
      endTime: now,
      status,
      steps: runSteps,
      totalDuration,
      cost: metrics?.costEstimate,
      tokensUsed: metrics?.tokensUsed
        ? { input: 0, output: 0, total: metrics.tokensUsed }
        : undefined,
    };
  }

  async log(
    runId: string,
    level: LogEntry['level'],
    message: string,
    _metadata?: Record<string, unknown>
  ): Promise<LogEntry> {
    return {
      id: `log_${Date.now()}`,
      runId,
      timestamp: new Date(),
      level,
      message,
      metadata: _metadata,
    };
  }

  getSteps(runId: string): RunStep[] {
    return this.steps.get(runId) ?? [];
  }

  async getMetrics(runId: string): Promise<RunMetrics | undefined> {
    const steps = this.steps.get(runId);
    if (!steps) return;
    return {
      runId,
      startTime: new Date(),
      status: 'running',
      steps,
    };
  }

  async getActiveRuns(): Promise<RunMetrics[]> {
    return [];
  }

  async getLogs(
    runId: string,
    _filters?: { level?: LogEntry['level'] }
  ): Promise<LogEntry[]> {
    return [];
  }
}
