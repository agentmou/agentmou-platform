import type { ConversationThreadDetail } from '@agentmou/contracts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PatientStatusBadge } from './patient-status-badge';

export function InboxThreadDetail({ thread }: { thread: ConversationThreadDetail | null }) {
  if (!thread) {
    return (
      <Card variant="raised">
        <CardHeader>
          <CardTitle className="text-base">Detalle de la conversación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-muted text-sm">
            Selecciona una conversación para ver el contexto del paciente y el historial reciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="raised">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">
            {thread.patient?.fullName ?? 'Paciente por identificar'}
          </CardTitle>
          {thread.patient ? (
            <PatientStatusBadge
              status={thread.patient.status}
              isExisting={thread.patient.isExisting}
            />
          ) : null}
        </div>
        <p className="text-text-muted text-sm">
          {thread.channelType === 'voice' ? 'Llamada' : 'WhatsApp'} · prioridad {thread.priority}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {thread.patient?.notes ? (
          <div className="bg-surface-subtle border-border-subtle text-text-secondary rounded-lg border p-3 text-sm">
            {thread.patient.notes}
          </div>
        ) : null}
        <Separator />
        <div className="space-y-3">
          {thread.messages.map((message) => {
            const isOutbound = message.direction === 'outbound';
            return (
              <div key={message.id} className={isOutbound ? 'text-right' : 'text-left'}>
                <div
                  className={cn(
                    'text-text-primary inline-block max-w-full rounded-2xl px-3 py-2 text-sm',
                    isOutbound ? 'bg-primary/10 text-primary' : 'bg-muted'
                  )}
                >
                  {message.body}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
