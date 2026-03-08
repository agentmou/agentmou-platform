/** Queue name constants shared between API (publisher) and worker (consumer). */
export const QUEUE_NAMES = {
  INSTALL_PACK: 'install-pack',
  INSTALL_AGENT: 'install-agent',
  RUN_AGENT: 'run-agent',
  RUN_WORKFLOW: 'run-workflow',
  SCHEDULE_TRIGGER: 'schedule-trigger',
  APPROVAL_TIMEOUT: 'approval-timeout',
  INGEST_DOCUMENT: 'ingest-document',
  REBUILD_EMBEDDINGS: 'rebuild-embeddings',
  DAILY_DIGEST: 'daily-digest',
} as const;

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
  input?: Record<string, unknown>;
  triggeredBy: 'manual' | 'cron' | 'webhook' | 'api' | 'agent';
}
