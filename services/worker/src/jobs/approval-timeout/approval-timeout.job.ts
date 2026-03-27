/**
 * approval-timeout job processor.
 *
 * Fired as a delayed BullMQ job when an approval request is created
 * with a timeout. If the approval is still pending when the job fires,
 * it auto-resolves based on the configured action.
 */

import type { Job } from 'bullmq';
import { db, approvalRequests, executionRuns, auditEvents } from '@agentmou/db';
import { eq } from 'drizzle-orm';
import { getQueue, QUEUE_NAMES } from '@agentmou/queue';
import {
  logRuntimeMessage,
  warnRuntimeMessage,
} from '../runtime-support/job-log.js';

export interface ApprovalTimeoutPayload {
  tenantId: string;
  approvalId: string;
  runId: string;
  actionOnTimeout: 'auto_approve' | 'auto_reject' | 'escalate';
  escalationNote?: string;
}

export async function processApprovalTimeout(job: Job<ApprovalTimeoutPayload>) {
  const { tenantId, approvalId, runId, actionOnTimeout, escalationNote } = job.data;

  logRuntimeMessage(
    `[approval-timeout] Processing timeout for approval ${approvalId} (action: ${actionOnTimeout})`
  );

  // 1. Load the approval request
  const [approval] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, approvalId))
    .limit(1);

  if (!approval) {
    warnRuntimeMessage(`[approval-timeout] Approval ${approvalId} not found`);
    return;
  }

  // 2. Skip if already resolved
  if (approval.status !== 'pending') {
    logRuntimeMessage(
      `[approval-timeout] Approval ${approvalId} already ${approval.status}, skipping`
    );
    return;
  }

  const now = new Date();

  // 3. Apply the configured timeout action
  if (actionOnTimeout === 'auto_approve') {
    await db
      .update(approvalRequests)
      .set({
        status: 'approved',
        decidedAt: now,
        decisionReason: 'Auto-approved: timeout exceeded',
      })
      .where(eq(approvalRequests.id, approvalId));

    // Resume the paused run
    await db
      .update(executionRuns)
      .set({ status: 'running' })
      .where(eq(executionRuns.id, runId));

    // Re-enqueue the run-agent job to continue execution
    if (approval.agentInstallationId) {
      const queue = getQueue(QUEUE_NAMES.RUN_AGENT);
      await queue.add('run-agent', {
        tenantId,
        agentInstallationId: approval.agentInstallationId,
        runId,
        triggeredBy: 'agent',
      });
    }
  } else if (actionOnTimeout === 'auto_reject') {
    await db
      .update(approvalRequests)
      .set({
        status: 'rejected',
        decidedAt: now,
        decisionReason: 'Auto-rejected: timeout exceeded',
      })
      .where(eq(approvalRequests.id, approvalId));

    await db
      .update(executionRuns)
      .set({ status: 'failed', completedAt: now })
      .where(eq(executionRuns.id, runId));
  } else if (actionOnTimeout === 'escalate') {
    await db
      .update(approvalRequests)
      .set({
        status: 'pending',
        decisionReason: `Escalated: ${escalationNote ?? 'timeout exceeded'}`,
      })
      .where(eq(approvalRequests.id, approvalId));
  }

  // 4. Write audit event
  await db.insert(auditEvents).values({
    tenantId,
    action: `approval.${actionOnTimeout}`,
    category: 'approval',
    details: {
      approvalId,
      runId,
      actionOnTimeout,
      reason: 'timeout',
    },
  });

  logRuntimeMessage(
    `[approval-timeout] Applied ${actionOnTimeout} to approval ${approvalId}`
  );
}
