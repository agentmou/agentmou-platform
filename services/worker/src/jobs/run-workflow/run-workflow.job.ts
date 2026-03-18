/**
 * run-workflow job processor.
 *
 * Loads the workflow installation (which holds the n8nWorkflowId),
 * triggers execution via the N8nClient, and records results.
 */

import type { Job } from 'bullmq';
import type { RunWorkflowPayload } from '@agentmou/queue';
import { db, executionRuns, executionSteps, workflowInstallations } from '@agentmou/db';
import { eq } from 'drizzle-orm';
import { N8nClient } from '@agentmou/n8n-client';

const N8N_API_URL = process.env.N8N_API_URL || 'http://n8n:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

function getClient(): N8nClient {
  return new N8nClient(N8N_API_URL, N8N_API_KEY);
}

export async function processRunWorkflow(job: Job<RunWorkflowPayload>) {
  const { tenantId, workflowInstallationId, runId, input } = job.data;

  console.log(`[run-workflow] Running workflow installation ${workflowInstallationId} for tenant ${tenantId} [${runId}]`);

  const startedAt = new Date();

  try {
    await job.updateProgress(10);

    const [installation] = await db
      .select()
      .from(workflowInstallations)
      .where(eq(workflowInstallations.id, workflowInstallationId));

    if (!installation) {
      throw new Error(`Workflow installation ${workflowInstallationId} not found`);
    }

    if (!installation.n8nWorkflowId) {
      throw new Error(`Workflow installation ${workflowInstallationId} has no n8nWorkflowId — was it provisioned?`);
    }

    await db.insert(executionSteps).values({
      runId,
      type: 'n8n_execution',
      name: `Execute workflow ${installation.templateId}`,
      status: 'running',
      input: input || {},
      startedAt: new Date(),
    });

    await job.updateProgress(30);

    const client = getClient();
    const result = await client.executeWorkflow(installation.n8nWorkflowId, input);

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await job.updateProgress(70);

    await db
      .update(executionSteps)
      .set({
        status: result.finished ? 'success' : 'running',
        output: result.data || {},
        durationMs,
        completedAt: result.finished ? completedAt : undefined,
      })
      .where(eq(executionSteps.runId, runId));

    await db
      .update(executionRuns)
      .set({
        status: result.finished ? 'success' : 'running',
        durationMs,
        completedAt: result.finished ? completedAt : undefined,
      })
      .where(eq(executionRuns.id, runId));

    await db
      .update(workflowInstallations)
      .set({ lastRunAt: completedAt, runsTotal: (installation.runsTotal || 0) + 1 })
      .where(eq(workflowInstallations.id, workflowInstallationId));

    await job.updateProgress(100);

    console.log(`[run-workflow] Completed run ${runId} in ${durationMs}ms`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[run-workflow] Failed run ${runId}:`, msg);

    await db
      .update(executionRuns)
      .set({
        status: 'failed',
        durationMs: Date.now() - startedAt.getTime(),
        completedAt: new Date(),
      })
      .where(eq(executionRuns.id, runId));

    throw error;
  }
}
