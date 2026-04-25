import type {
  ClinicDashboard,
  ConfirmationRequest,
  ConversationThreadListItem,
  GapOpportunityDetail,
  IntakeFormSubmission,
} from '@agentmou/contracts';

import type { ClinicNotification } from '@/components/clinic/notifications-popover';

/**
 * The clinic surface does not (yet) have a dedicated notifications backend
 * table. To avoid blocking the operator UI on infrastructure work, we
 * derive a unified "what needs my attention" feed from the dashboard
 * payload that the topbar already has access to via the data provider.
 *
 * Each kind of operational item maps to a `ClinicNotification` with a
 * distinctive title and a short body that helps the operator choose what
 * to open next. `read` is omitted today (everything is treated as unread)
 * because the dashboard payload does not carry a per-item "seen" flag yet
 * — once it does, the same transform can flip the `read` field instead
 * of changing this contract.
 */
export interface DeriveNotificationsOptions {
  /**
   * Optional formatter so consumers can localise the timestamp, e.g.
   * `formatRelativeTime` from `clinic-formatting`. Defaults to ISO.
   */
  formatTimestamp?: (iso: string) => string;
  /** Maximum number of items returned. Defaults to 12. */
  limit?: number;
}

const DEFAULT_LIMIT = 12;

function defaultFormat(iso: string) {
  return iso;
}

function escalatedThreadNotification(
  thread: ConversationThreadListItem,
  format: (iso: string) => string
): ClinicNotification {
  const patientName = thread.patient?.fullName ?? 'Paciente sin identificar';
  const channelLabel = thread.channelType === 'voice' ? 'Llamada' : 'WhatsApp';
  return {
    id: `thread:${thread.id}`,
    title: `Revisión humana — ${patientName}`,
    body: `${channelLabel} · ${thread.lastMessagePreview ?? 'Necesita atención'}`,
    timestamp: format(thread.updatedAt ?? thread.createdAt ?? new Date().toISOString()),
  };
}

function pendingConfirmationNotification(
  confirmation: ConfirmationRequest,
  format: (iso: string) => string
): ClinicNotification {
  return {
    id: `confirmation:${confirmation.id}`,
    title: 'Confirmación pendiente',
    body: `Vence el ${format(confirmation.dueAt)} · ${confirmation.channelType === 'voice' ? 'Llamada' : 'WhatsApp'}`,
    timestamp: format(confirmation.requestedAt),
  };
}

function pendingFormNotification(
  submission: IntakeFormSubmission,
  format: (iso: string) => string
): ClinicNotification {
  const due = submission.expiresAt ?? submission.sentAt ?? submission.createdAt;
  const required = submission.requiredForBooking ? 'requerido para reservar' : 'opcional';
  return {
    id: `form:${submission.id}`,
    title: 'Formulario sin completar',
    body: `${required} · vence ${format(due)}`,
    timestamp: format(submission.sentAt ?? submission.createdAt),
  };
}

function activeGapNotification(
  gap: GapOpportunityDetail,
  format: (iso: string) => string
): ClinicNotification {
  return {
    id: `gap:${gap.id}`,
    title: 'Hueco abierto',
    body: `${format(gap.startsAt)} → ${format(gap.endsAt)}`,
    timestamp: format(gap.updatedAt ?? gap.createdAt),
  };
}

/**
 * Map a `ClinicDashboard` payload onto a single, capped, deterministic
 * list of `ClinicNotification` rows the topbar popover renders.
 *
 * The order is fixed so the most action-blocking items (escalated
 * threads → pending confirmations → pending forms → active gaps) win
 * over the limit when one bucket is large.
 */
export function deriveClinicNotifications(
  dashboard: ClinicDashboard,
  options: DeriveNotificationsOptions = {}
): ClinicNotification[] {
  const format = options.formatTimestamp ?? defaultFormat;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const escalated = dashboard.prioritizedInbox
    .filter((thread) => thread.requiresHumanReview)
    .map((thread) => escalatedThreadNotification(thread, format));

  const confirmations = dashboard.pendingConfirmations.map((entry) =>
    pendingConfirmationNotification(entry, format)
  );

  const forms = dashboard.pendingForms.map((submission) =>
    pendingFormNotification(submission, format)
  );

  const gaps = dashboard.activeGaps.map((gap) => activeGapNotification(gap, format));

  return [...escalated, ...confirmations, ...forms, ...gaps].slice(0, limit);
}
