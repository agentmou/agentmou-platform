import { db, executionRuns, executionSteps } from '@agentmou/db';
import { eq, and, desc } from 'drizzle-orm';

export class RunsService {
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
