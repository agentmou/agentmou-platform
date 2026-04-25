import type { AppointmentStatus, AppointmentSummary } from '@agentmou/contracts';
import { CalendarDays } from 'lucide-react';

import { EmptyState } from '@/components/control-plane/empty-state';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatClinicLabel, formatClinicTime } from '@/lib/clinic-formatting';

import { NewAppointmentDialog, type NewAppointmentInput } from './new-appointment-dialog';
import { PatientStatusBadge } from './patient-status-badge';

/**
 * Appointment status → tone mapping (Q5-A).
 *
 *   draft / pending_form / scheduled / rescheduled → info
 *     Booking is on the books but still needs confirmation.
 *   confirmed / completed → success
 *     Patient agreed or already came in; no reviewer action needed.
 *   cancelled → neutral
 *     Cancelled cleanly; the slot was freed.
 *   no_show → warning
 *     Patient did not show up; recepción must triage.
 */
const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  draft: 'info',
  pending_form: 'info',
  scheduled: 'info',
  rescheduled: 'info',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'warning',
};

export function AppointmentBoard({
  appointments,
  title = 'Agenda',
  timezone,
  onCreateAppointment,
  showCreateAction = true,
}: {
  appointments: AppointmentSummary[];
  title?: string;
  timezone: string;
  onCreateAppointment?: (input: NewAppointmentInput) => Promise<void> | void;
  showCreateAction?: boolean;
}) {
  return (
    <Card variant="raised">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {showCreateAction ? <NewAppointmentDialog onCreate={onCreateAppointment} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No hay citas programadas"
            description="Cuando entren reservas o cambios para hoy, la agenda priorizada aparecerá aquí."
          />
        ) : null}
        {appointments.map((appointment) => {
          const statusTone = APPOINTMENT_STATUS_TONE[appointment.status];
          return (
            <Card
              key={appointment.id}
              variant="subtle"
              padding="none"
              className="flex flex-col gap-2 rounded-xl px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-text-primary font-medium">
                    {appointment.patient?.fullName ?? 'Paciente sin asignar'}
                  </p>
                  <p className="text-text-muted text-sm">
                    {formatClinicTime(appointment.startsAt, timezone)}
                    {' · '}
                    {appointment.service?.name ?? 'Cita general'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {statusTone === 'neutral' ? (
                    <Badge variant="outline">{formatClinicLabel(appointment.status)}</Badge>
                  ) : (
                    <Badge tone={statusTone}>{formatClinicLabel(appointment.status)}</Badge>
                  )}
                  {appointment.patient ? (
                    <PatientStatusBadge
                      status={appointment.patient.status}
                      isExisting={appointment.patient.isExisting}
                    />
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {appointment.practitioner ? (
                  <Badge variant="outline">{appointment.practitioner.name}</Badge>
                ) : null}
                {appointment.location ? (
                  <Badge variant="outline">{appointment.location.name}</Badge>
                ) : null}
                <Badge variant="outline" className="text-text-muted">
                  {formatClinicLabel(appointment.confirmationStatus)}
                </Badge>
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
