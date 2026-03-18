import {
  db,
  executionRuns,
  executionSteps,
  agentInstallations,
  workflowInstallations,
} from '@agentmou/db';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { getQueue, QUEUE_NAMES, type RunAgentPayload, type RunWorkflowPayload } from '@agentmou/queue';
import { buildExecutionLogs, mapExecutionRun, mapExecutionStep } from './runs.mapper.js';

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

    const templates = await resolveInstallationTemplates([run]);
    return mapExecutionRun(run, {
      agentId: run.agentInstallationId
        ? templates.agentTemplateIds.get(run.agentInstallationId)
        : undefined,
      workflowId: run.workflowInstallationId
        ? templates.workflowTemplateIds.get(run.workflowInstallationId)
        : undefined,
      steps: [],
      logs: [],
    });
  }

  async listRuns(tenantId: string) {
    const runs = await db
      .select()
      .from(executionRuns)
      .where(eq(executionRuns.tenantId, tenantId))
      .orderBy(desc(executionRuns.startedAt));

    const templates = await resolveInstallationTemplates(runs);

    return runs.map((run) =>
      mapExecutionRun(run, {
        agentId: run.agentInstallationId
          ? templates.agentTemplateIds.get(run.agentInstallationId)
          : undefined,
        workflowId: run.workflowInstallationId
          ? templates.workflowTemplateIds.get(run.workflowInstallationId)
          : undefined,
        steps: [],
        logs: [],
      }),
    );
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
      .orderBy(asc(executionSteps.startedAt));

    const templates = await resolveInstallationTemplates([run]);

    return mapExecutionRun(run, {
      agentId: run.agentInstallationId
        ? templates.agentTemplateIds.get(run.agentInstallationId)
        : undefined,
      workflowId: run.workflowInstallationId
        ? templates.workflowTemplateIds.get(run.workflowInstallationId)
        : undefined,
      steps,
    });
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
      .orderBy(asc(executionSteps.startedAt))
      .then((steps) => buildExecutionLogs(steps.map(mapExecutionStep)));
  }
}

async function resolveInstallationTemplates(
  runs: Array<typeof executionRuns.$inferSelect>,
) {
  const agentInstallationIds = [...new Set(
    runs
      .map((run) => run.agentInstallationId)
      .filter((id): id is string => Boolean(id)),
  )];
  const workflowInstallationIds = [...new Set(
    runs
      .map((run) => run.workflowInstallationId)
      .filter((id): id is string => Boolean(id)),
  )];

  const [agents, workflows] = await Promise.all([
    agentInstallationIds.length > 0
      ? db
          .select({
            id: agentInstallations.id,
            templateId: agentInstallations.templateId,
          })
          .from(agentInstallations)
          .where(inArray(agentInstallations.id, agentInstallationIds))
      : Promise.resolve([]),
    workflowInstallationIds.length > 0
      ? db
          .select({
            id: workflowInstallations.id,
            templateId: workflowInstallations.templateId,
          })
          .from(workflowInstallations)
          .where(inArray(workflowInstallations.id, workflowInstallationIds))
      : Promise.resolve([]),
  ]);

  return {
    agentTemplateIds: new Map(
      agents.map((installation) => [installation.id, installation.templateId]),
    ),
    workflowTemplateIds: new Map(
      workflows.map((installation) => [installation.id, installation.templateId]),
    ),
  };
}
