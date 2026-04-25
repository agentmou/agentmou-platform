import type { AppointmentStatus, AppointmentSummary } from '@agentmou/contracts';
import { CalendarDays } from 'lucide-react';

import { formatClinicLabel, formatClinicTime } from '@/lib/clinic-formatting';
import { cn } from '@/lib/utils';

import { PatientStatusBadge } from './patient-status-badge';

/**
 * Appointment status → status-bar tone mapping.
 *
 *   confirmed / completed → confirmed (green bar)
 *   draft / pending_form / scheduled / rescheduled → pending (amber bar)
 *   cancelled → gap (transparent bar)
 *   no_show → pending (amber bar)
 */
const APPOINTMENT_BAR_TONE: Record<AppointmentStatus, 'confirmed' | 'pending' | 'new' | 'gap'> = {
  draft: 'pending',
  pending_form: 'pending',
  scheduled: 'pending',
  rescheduled: 'pending',
  confirmed: 'confirmed',
  completed: 'confirmed',
  cancelled: 'gap',
  no_show: 'pending',
};

const APPOINTMENT_PILL: Record<AppointmentStatus, string> = {
  draft: 'pill-warning',
  pending_form: 'pill-warning',
  scheduled: 'pill-warning',
  rescheduled: 'pill-warning',
  confirmed: 'pill-success',
  completed: 'pill-success',
  cancelled: 'pill-outline',
  no_show: 'pill-destructive',
};

export function AppointmentBoard({
  appointments,
  title = 'Agenda',
  timezone,
}: {
  appointments: AppointmentSummary[];
  title?: string;
  timezone: string;
}) {
  return (
    <div className="card-app overflow-hidden">
      <div className="card-hd">
        <CalendarDays size={16} aria-hidden style={{ color: 'var(--muted-fg)' }} />
        <div>
          <div className="card-hd-title">{title}</div>
          <div className="card-hd-sub">{appointments.length} citas</div>
        </div>
      </div>
      {appointments.length === 0 ? (
        <div className="empty-state-app">
          <CalendarDays size={20} aria-hidden />
          <p className="text-text-primary text-sm font-medium">No hay citas programadas</p>
          <p className="max-w-xs text-xs">
            Cuando entren reservas o cambios para hoy, la agenda priorizada aparecerá aquí.
          </p>
        </div>
      ) : null}
      {appointments.map((appointment) => {
        const tone = APPOINTMENT_BAR_TONE[appointment.status];
        const pillClass = APPOINTMENT_PILL[appointment.status];
        return (
          <div key={appointment.id} className="agenda-row">
            <div className="agenda-time">{formatClinicTime(appointment.startsAt, timezone)}</div>
            <div className={cn('agenda-bar', tone)} aria-hidden />
            <div className="min-w-0">
              <div className="agenda-patient truncate">
                {appointment.patient?.fullName ?? 'Paciente sin asignar'}
              </div>
              <div className="agenda-meta truncate">
                {appointment.service?.name ?? 'Cita general'}
                {appointment.practitioner?.name ? ` · ${appointment.practitioner.name}` : ''}
                {appointment.location?.name ? ` · ${appointment.location.name}` : ''}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn('pill', pillClass)}>{formatClinicLabel(appointment.status)}</span>
              {appointment.patient ? (
                <PatientStatusBadge
                  status={appointment.patient.status}
                  isExisting={appointment.patient.isExisting}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
