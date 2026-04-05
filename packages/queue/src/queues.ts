/** Queue name constants shared between API (publisher) and worker (consumer). */
export const QUEUE_NAMES = {
  INSTALL_PACK: 'install-pack',
  RUN_AGENT: 'run-agent',
  RUN_WORKFLOW: 'run-workflow',
  SCHEDULE_TRIGGER: 'schedule-trigger',
  APPROVAL_TIMEOUT: 'approval-timeout',
  CLINIC_CHANNEL_EVENT: 'clinic-channel-event',
  CLINIC_SEND_MESSAGE: 'clinic-send-message',
  CLINIC_REMINDER: 'clinic-reminder',
  CLINIC_FORM_FOLLOW_UP: 'clinic-form-follow-up',
  CLINIC_GAP_OUTREACH: 'clinic-gap-outreach',
  CLINIC_REACTIVATION_CAMPAIGN: 'clinic-reactivation-campaign',
  CLINIC_VOICE_CALLBACK: 'clinic-voice-callback',
} as const;

/** BullMQ job name used for persisted cron schedules. */
export const SCHEDULE_TRIGGER_JOB_NAME = 'schedule-trigger';

/** Builds the repeatable BullMQ job id for a persisted schedule row. */
export function getScheduleTriggerJobId(scheduleId: string): string {
  return `schedule-${scheduleId}`;
}

export function getClinicChannelEventJobId(webhookEventId: string): string {
  return `clinic-channel-event-${webhookEventId}`;
}

export function getClinicSendMessageJobId(messageId: string): string {
  return `clinic-send-message-${messageId}`;
}

export function getClinicReminderJobId(reminderId: string): string {
  return `clinic-reminder-${reminderId}`;
}

export function getClinicFormFollowUpJobId(submissionId: string): string {
  return `clinic-form-follow-up-${submissionId}`;
}

export function getClinicGapOutreachJobId(attemptId: string): string {
  return `clinic-gap-outreach-${attemptId}`;
}

export function getClinicReactivationCampaignJobId(
  campaignId: string,
  recipientId?: string | null
): string {
  return recipientId
    ? `clinic-reactivation-campaign-${campaignId}-${recipientId}`
    : `clinic-reactivation-campaign-${campaignId}`;
}

export function getClinicVoiceCallbackJobId(callId: string): string {
  return `clinic-voice-callback-${callId}`;
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
  targetType: 'agent' | 'workflow' | 'clinic_reactivation_campaign';
  installationId: string;
}

/** Typed payload for inbound clinic webhook processing jobs. */
export interface ClinicChannelEventPayload {
  webhookEventId: string;
}

/** Typed payload for outbound clinic message delivery jobs. */
export interface ClinicSendMessagePayload {
  tenantId: string;
  messageId: string;
  automationKind?:
    | 'conversation_reply'
    | 'form_submission'
    | 'confirmation_reminder'
    | 'gap_outreach'
    | 'reactivation_campaign';
}

/** Typed payload for clinic reminder execution jobs. */
export interface ClinicReminderPayload {
  tenantId: string;
  reminderId: string;
}

/** Typed payload for clinic form follow-up jobs. */
export interface ClinicFormFollowUpPayload {
  tenantId: string;
  submissionId: string;
  channelType: 'whatsapp' | 'voice';
  messageTemplateKey?: string;
}

/** Typed payload for clinic gap outreach jobs. */
export interface ClinicGapOutreachPayload {
  tenantId: string;
  attemptId: string;
}

/** Typed payload for clinic reactivation campaign jobs. */
export interface ClinicReactivationCampaignPayload {
  tenantId: string;
  campaignId: string;
  recipientId?: string;
  triggeredBy: 'manual' | 'scheduled' | 'api' | 'webhook';
}

/** Typed payload for scheduled or on-demand voice callback jobs. */
export interface ClinicVoiceCallbackPayload {
  tenantId: string;
  callId: string;
  scheduledAt: string;
}
