/** Queue name constants shared between API (publisher) and worker (consumer). */
export const QUEUE_NAMES = {
  INSTALL_PACK: 'install-pack',
  RUN_AGENT: 'run-agent',
  RUN_WORKFLOW: 'run-workflow',
  SCHEDULE_TRIGGER: 'schedule-trigger',
  APPROVAL_TIMEOUT: 'approval-timeout',
  INTERNAL_WORK_ORDER: 'internal-work-order',
} as const;

/** BullMQ job name used for persisted cron schedules. */
export const SCHEDULE_TRIGGER_JOB_NAME = 'schedule-trigger';

/** Builds the repeatable BullMQ job id for a persisted schedule row. */
export function getScheduleTriggerJobId(scheduleId: string): string {
  return `schedule-${scheduleId}`;
}

/** Typed payload for install-pack jobs. */
export interface InstallPackPayload {
  tenantId: string;
  packId: string;
  config?: Record<string, unknown>;
}

/** Typed payload for run-agent jobs. */
export interface RunAgentPayload {
  tenantId: string;
  agentInstallationId: string;
  runId: string;
  input?: Record<string, unknown>;
  triggeredBy: 'manual' | 'cron' | 'webhook' | 'api' | 'agent';
}

/** Typed payload for run-workflow jobs. */
export interface RunWorkflowPayload {
  tenantId: string;
  workflowInstallationId: string;
  runId: string;
  input?: Record<string, unknown>;
  triggeredBy: 'manual' | 'cron' | 'webhook' | 'api';
}

/** Typed payload for schedule-trigger jobs. */
export interface ScheduleTriggerPayload {
  tenantId: string;
  scheduleId: string;
  targetType: 'agent' | 'workflow';
  installationId: string;
}

/** Typed payload for internal operating-system work orders. */
export interface InternalWorkOrderPayload {
  tenantId: string;
  objectiveId: string;
  workOrderId: string;
  workType:
    | 'prepare_artifact'
    | 'run_agent_installation'
    | 'run_workflow_installation'
    | 'request_human_approval'
    | 'sync_internal_state'
    | 'notify_telegram';
}
