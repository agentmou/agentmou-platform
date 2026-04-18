import type { Patient } from '@agentmou/contracts';

import { Badge, type BadgeTone } from '@/components/ui/badge';

const STATUS_LABELS: Record<Patient['status'], string> = {
  new_lead: 'Nuevo paciente',
  intake_pending: 'Intake pendiente',
  existing: 'Paciente existente',
  waiting: 'En espera',
  inactive: 'Para reactivar',
  reactivated: 'Reactivado',
  do_not_contact: 'No contactar',
};

/**
 * Per-status tone mapping for the patient lifecycle.
 *
 * - `success` tones (filled green) signal a positive state worth noticing
 *   (new lead, reactivated patient).
 * - `info` tones (filled blue) signal "something is in progress" states
 *   where the next operational step is clear (intake pending).
 * - `warning` tones (filled amber) signal states that need operator attention
 *   (waiting on clinic response, inactive patients that may need a nudge).
 * - Neutral outline covers the steady-state "existing patient" and the
 *   compliance-sensitive "do not contact" label.
 */
const STATUS_TONE: Record<Patient['status'], BadgeTone> = {
  new_lead: 'success',
  intake_pending: 'info',
  existing: 'neutral',
  waiting: 'warning',
  inactive: 'warning',
  reactivated: 'success',
  do_not_contact: 'neutral',
};

export function PatientStatusBadge({
  status,
  isExisting,
}: {
  status: Patient['status'];
  isExisting: boolean;
}) {
  // Existing patients stay in a neutral outline regardless of lifecycle
  // stage — the "existing vs new" distinction is the primary read, and
  // overlaying a warm tone on an existing patient would be misleading.
  const tone = isExisting ? 'neutral' : STATUS_TONE[status];

  // Neutral tones render as an outlined chip; coloured tones use the
  // default filled style from PR-05's Badge variants.
  if (tone === 'neutral') {
    return <Badge variant="outline">{STATUS_LABELS[status]}</Badge>;
  }

  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>;
}
