/**
 * schedule-trigger job processor.
 *
 * Fired by BullMQ repeatable jobs on the cron schedule. Loads the
 * schedule from the database, creates an execution_runs row, and
 * enqueues a run-agent or run-workflow job.
 */

import { randomUUID } from 'node:crypto';
import type { Job } from 'bullmq';
import type { ScheduleTriggerPayload } from '@agentmou/queue';
import { getQueue, QUEUE_NAMES } from '@agentmou/queue';
import { db, schedules, executionRuns } from '@agentmou/db';
import { eq } from 'drizzle-orm';
import {
  logRuntimeMessage,
  warnRuntimeMessage,
} from '../shared/job-log.js';

export async function processScheduleTrigger(job: Job<ScheduleTriggerPayload>) {
  const { tenantId, scheduleId, targetType, installationId } = job.data;

  logRuntimeMessage(
    `[schedule-trigger] Firing schedule ${scheduleId} for ${targetType} ${installationId}`
  );

  // 1. Load schedule from DB and check if still enabled
  const [schedule] = await db
    .select()
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .limit(1);

  if (!schedule) {
    warnRuntimeMessage(`[schedule-trigger] Schedule ${scheduleId} not found, skipping`);
    return;
  }

  if (!schedule.enabled) {
    logRuntimeMessage(`[schedule-trigger] Schedule ${scheduleId} is disabled, skipping`);
    return;
  }

  // 2. Create an execution_runs row
  const runId = randomUUID();
  await db.insert(executionRuns).values({
    id: runId,
    tenantId,
    ...(targetType === 'agent'
      ? { agentInstallationId: installationId }
      : { workflowInstallationId: installationId }),
    status: 'running',
    triggeredBy: 'cron',
  });

  // 3. Enqueue the appropriate run job
  if (targetType === 'agent') {
    const queue = getQueue(QUEUE_NAMES.RUN_AGENT);
    await queue.add(
      'run-agent',
      {
        tenantId,
        agentInstallationId: installationId,
        runId,
        triggeredBy: 'cron',
      },
      { jobId: `schedule-${scheduleId}-${Date.now()}` }
    );
  } else {
    const queue = getQueue(QUEUE_NAMES.RUN_WORKFLOW);
    await queue.add(
      'run-workflow',
      {
        tenantId,
        workflowInstallationId: installationId,
        runId,
        triggeredBy: 'cron',
      },
      { jobId: `schedule-${scheduleId}-${Date.now()}` }
    );
  }

  // 4. Update lastTriggeredAt
  await db
    .update(schedules)
    .set({ lastTriggeredAt: new Date() })
    .where(eq(schedules.id, scheduleId));

  logRuntimeMessage(
    `[schedule-trigger] Created run ${runId} for ${targetType} ${installationId}`
  );
}
