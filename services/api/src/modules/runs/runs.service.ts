import { db, executionRuns, executionSteps } from '@agentmou/db';
import { eq, and, desc } from 'drizzle-orm';
import { getQueue, QUEUE_NAMES, type RunAgentPayload, type RunWorkflowPayload } from '@agentmou/queue';

export class RunsService {
  /**
   * Create a new execution run and enqueue the appropriate job.
   */
  async triggerRun(
    tenantId: string,
    body: {
      agentInstallationId?: string;
      workflowInstallationId?: string;
      input?: Record<string, unknown>;
    },
  ) {
    if (!body.agentInstallationId && !body.workflowInstallationId) {
      throw Object.assign(new Error('agentInstallationId or workflowInstallationId required'), { statusCode: 400 });
    }

    const [run] = await db
      .insert(executionRuns)
      .values({
        tenantId,
        agentInstallationId: body.agentInstallationId || null,
        workflowInstallationId: body.workflowInstallationId || null,
        status: 'running',
        triggeredBy: 'manual',
      })
      .returning();

    if (body.agentInstallationId) {
      const queue = getQueue(QUEUE_NAMES.RUN_AGENT);
      await queue.add('run-agent', {
        tenantId,
        agentInstallationId: body.agentInstallationId,
        runId: run.id,
        input: body.input,
        triggeredBy: 'manual',
      } satisfies RunAgentPayload);
    } else if (body.workflowInstallationId) {
      const queue = getQueue(QUEUE_NAMES.RUN_WORKFLOW);
      await queue.add('run-workflow', {
        tenantId,
        workflowInstallationId: body.workflowInstallationId,
        runId: run.id,
        input: body.input,
        triggeredBy: 'manual',
      } satisfies RunWorkflowPayload);
    }

    return run;
  }

  async listRuns(tenantId: string) {
    return db
      .select()
      .from(executionRuns)
      .where(eq(executionRuns.tenantId, tenantId))
      .orderBy(desc(executionRuns.startedAt));
  }

  async getRun(tenantId: string, runId: string) {
    const [run] = await db
      .select()
      .from(executionRuns)
      .where(
        and(
          eq(executionRuns.tenantId, tenantId),
          eq(executionRuns.id, runId)
        )
      );
    if (!run) return null;

    const steps = await db
      .select()
      .from(executionSteps)
      .where(eq(executionSteps.runId, runId))
      .orderBy(desc(executionSteps.startedAt));

    return { ...run, steps };
  }

  async getRunLogs(tenantId: string, runId: string) {
    const [run] = await db
      .select()
      .from(executionRuns)
      .where(
        and(
          eq(executionRuns.tenantId, tenantId),
          eq(executionRuns.id, runId)
        )
      );
    if (!run) return [];

    return db
      .select()
      .from(executionSteps)
      .where(eq(executionSteps.runId, runId))
      .orderBy(desc(executionSteps.startedAt));
  }
}
