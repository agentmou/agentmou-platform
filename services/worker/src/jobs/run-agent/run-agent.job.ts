/**
 * run-agent job processor.
 *
 * Loads the agent installation, calls the Python agents API,
 * and records execution steps in the database.
 */

import type { Job } from 'bullmq';
import type { RunAgentPayload } from '@agentmou/queue';
import { db, executionRuns, executionSteps, agentInstallations } from '@agentmou/db';
import { eq } from 'drizzle-orm';

const AGENTS_API_URL = process.env.AGENTS_API_URL || 'http://agents:8000';
const AGENTS_API_KEY = process.env.AGENTS_API_KEY || '';

export async function processRunAgent(job: Job<RunAgentPayload>) {
  const { tenantId, agentInstallationId, runId, input } = job.data;

  console.log(`[run-agent] Running agent installation ${agentInstallationId} for tenant ${tenantId} [${runId}]`);

  const startedAt = new Date();

  try {
    await job.updateProgress(10);

    const [installation] = await db
      .select()
      .from(agentInstallations)
      .where(eq(agentInstallations.id, agentInstallationId));

    if (!installation) {
      throw new Error(`Agent installation ${agentInstallationId} not found`);
    }

    await db.insert(executionSteps).values({
      runId,
      type: 'agent-call',
      name: `Call agent ${installation.templateId}`,
      status: 'running',
      input: input || {},
      startedAt: new Date(),
    });

    await job.updateProgress(30);

    const response = await fetch(`${AGENTS_API_URL}/analyze-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AGENTS_API_KEY,
      },
      body: JSON.stringify(input || { subject: 'test', content: 'test' }),
    });

    const result = await response.json();
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await job.updateProgress(70);

    await db
      .update(executionSteps)
      .set({
        status: response.ok ? 'completed' : 'failed',
        output: result,
        error: response.ok ? null : JSON.stringify(result),
        durationMs,
        completedAt,
      })
      .where(eq(executionSteps.runId, runId));

    await db
      .update(executionRuns)
      .set({
        status: response.ok ? 'success' : 'failed',
        durationMs,
        completedAt,
      })
      .where(eq(executionRuns.id, runId));

    await job.updateProgress(100);

    console.log(`[run-agent] Completed run ${runId} in ${durationMs}ms`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[run-agent] Failed run ${runId}:`, msg);

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
