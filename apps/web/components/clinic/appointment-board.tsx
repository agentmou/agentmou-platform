import type { AppointmentSummary } from '@agentmou/contracts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientStatusBadge } from './patient-status-badge';

export function AppointmentBoard({
  appointments,
  title = 'Agenda',
}: {
  appointments: AppointmentSummary[];
  title?: string;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex flex-col gap-2 rounded-xl border border-border/60 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {appointment.patient?.fullName ?? 'Paciente sin asignar'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(appointment.startsAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {appointment.service?.name ?? 'Cita general'}
                </p>
              </div>
              {appointment.patient ? (
                <PatientStatusBadge
                  status={appointment.patient.status}
                  isExisting={appointment.patient.isExisting}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {appointment.practitioner ? (
                <span className="rounded-full bg-muted px-2 py-1">
                  {appointment.practitioner.name}
                </span>
              ) : null}
              {appointment.location ? (
                <span className="rounded-full bg-muted px-2 py-1">{appointment.location.name}</span>
              ) : null}
              <span className="rounded-full bg-muted px-2 py-1">
                {appointment.confirmationStatus}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
