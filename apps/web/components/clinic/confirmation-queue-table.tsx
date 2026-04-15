import type { ConfirmationRequest } from '@agentmou/contracts';
import { CalendarClock } from 'lucide-react';

import { EmptyState } from '@/components/control-plane/empty-state';
import { formatClinicDateTime, formatClinicLabel } from '@/lib/clinic-formatting';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ConfirmationQueueTable({
  confirmations,
  timezone,
}: {
  confirmations: ConfirmationRequest[];
  timezone: string;
}) {
  if (confirmations.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No hay confirmaciones pendientes"
        description="Cuando una cita necesite seguimiento, verás aquí el canal, el estado y su vencimiento."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cita</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Vence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {confirmations.map((confirmation) => (
            <TableRow key={confirmation.id}>
              <TableCell className="font-medium">{confirmation.appointmentId}</TableCell>
              <TableCell>{formatClinicLabel(confirmation.channelType)}</TableCell>
              <TableCell>{formatClinicLabel(confirmation.status)}</TableCell>
              <TableCell>{formatClinicDateTime(confirmation.dueAt, timezone)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
