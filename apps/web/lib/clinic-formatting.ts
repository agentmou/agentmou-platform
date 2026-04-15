type ClinicDateValue = string | Date | number;

const CLINIC_LABEL_MAP: Record<string, string> = {
  whatsapp: 'WhatsApp',
  voice: 'Voz',
  new: 'Nueva',
  in_progress: 'En curso',
  pending_form: 'Pendiente de formulario',
  pending_human: 'Pendiente de revisión',
  escalated: 'Escalado',
  no_response: 'Sin respuesta',
  pending: 'Pendiente',
  sent: 'Enviado',
  opened: 'Abierto',
  completed: 'Completado',
  cancelled: 'Cancelada',
  confirmed: 'Confirmada',
  running: 'En curso',
  scheduled: 'Programada',
  paused: 'Pausada',
  open: 'Abierto',
  offered: 'Con propuesta',
  claimed: 'Cubierto',
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
  recall: 'Recall',
};

export function resolveClinicTimezone(params: {
  profileTimezone?: string | null;
  tenantTimezone?: string | null;
}) {
  const profileTimezone = params.profileTimezone?.trim();
  if (profileTimezone) {
    return profileTimezone;
  }

  const tenantTimezone = params.tenantTimezone?.trim();
  if (tenantTimezone) {
    return tenantTimezone;
  }

  return 'UTC';
}

export function formatClinicDate(value: ClinicDateValue, timezone: string) {
  const parts = getDateTimeParts(value, timezone);
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatClinicTime(value: ClinicDateValue, timezone: string) {
  const parts = getDateTimeParts(value, timezone);
  return `${parts.hour}:${parts.minute}`;
}

export function formatClinicDateTime(value: ClinicDateValue, timezone: string) {
  return `${formatClinicDate(value, timezone)} · ${formatClinicTime(value, timezone)}`;
}

export function formatClinicLabel(value: string | null | undefined) {
  if (!value) {
    return 'Sin dato';
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return 'Sin dato';
  }

  const mappedLabel = CLINIC_LABEL_MAP[normalizedValue];
  if (mappedLabel) {
    return mappedLabel;
  }

  return normalizedValue
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\p{L}/u, (match) => match.toUpperCase());
}

function getDateTimeParts(value: ClinicDateValue, timezone: string) {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.formatToParts(date).reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
}
