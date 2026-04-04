import type { ConfirmationRequest } from '@agentmou/contracts';

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
}: {
  confirmations: ConfirmationRequest[];
}) {
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
              <TableCell>{confirmation.channelType}</TableCell>
              <TableCell>{confirmation.status}</TableCell>
              <TableCell>{new Date(confirmation.dueAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
