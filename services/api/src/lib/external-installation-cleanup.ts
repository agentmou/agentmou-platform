import {
  getQueue,
  getScheduleTriggerJobId,
  QUEUE_NAMES,
  SCHEDULE_TRIGGER_JOB_NAME,
} from '@agentmou/queue';

import { N8nService } from '../modules/n8n/n8n.service.js';

export interface ExternalWorkflowCleanupTarget {
  installationId: string;
  templateId: string;
  n8nWorkflowId: string | null;
}

export interface ExternalScheduleCleanupTarget {
  id: string;
  installationId: string;
  targetType: string;
  cron: string;
}

export interface ExternalInstallationCleanupPlan {
  workflows: ExternalWorkflowCleanupTarget[];
  schedules: ExternalScheduleCleanupTarget[];
}

export class ExternalInstallationCleanupError extends Error {
  constructor(
    message: string,
    readonly resourceType: 'n8n_workflow' | 'schedule_repeatable',
    readonly resourceId: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'ExternalInstallationCleanupError';
  }
}

/**
 * Removes side effects that live outside PostgreSQL for installations.
 *
 * The cleanup is intentionally fail-closed: any non-idempotent external error
 * aborts before the caller deletes local rows.
 */
export async function cleanupInstallationExternalResources(plan: ExternalInstallationCleanupPlan) {
  if (plan.workflows.length === 0 && plan.schedules.length === 0) {
    return;
  }

  const n8n = plan.workflows.some((workflow) => Boolean(workflow.n8nWorkflowId))
    ? new N8nService()
    : null;
  const queue = plan.schedules.length > 0 ? getQueue(QUEUE_NAMES.SCHEDULE_TRIGGER) : null;

  for (const workflow of plan.workflows) {
    if (!workflow.n8nWorkflowId) {
      continue;
    }

    try {
      await n8n!.deleteWorkflow(workflow.n8nWorkflowId);
    } catch (error) {
      if (isIdempotentNotFound(error)) {
        continue;
      }

      throw new ExternalInstallationCleanupError(
        `Failed to delete n8n workflow ${workflow.n8nWorkflowId} for installation ${workflow.installationId}.`,
        'n8n_workflow',
        workflow.n8nWorkflowId,
        { cause: error }
      );
    }
  }

  for (const schedule of plan.schedules) {
    try {
      await queue!.removeRepeatable(
        SCHEDULE_TRIGGER_JOB_NAME,
        { pattern: schedule.cron },
        getScheduleTriggerJobId(schedule.id)
      );
    } catch (error) {
      throw new ExternalInstallationCleanupError(
        `Failed to remove BullMQ repeatable for schedule ${schedule.id} on installation ${schedule.installationId}.`,
        'schedule_repeatable',
        schedule.id,
        { cause: error }
      );
    }
  }
}

function isIdempotentNotFound(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response;
    return response?.status === 404;
  }

  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' && statusCode === 404;
  }

  return false;
}
