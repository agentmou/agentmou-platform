import type { ConversationThreadDetail } from '@agentmou/contracts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PatientStatusBadge } from './patient-status-badge';

export function InboxThreadDetail({ thread }: { thread: ConversationThreadDetail | null }) {
  if (!thread) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Detalle de la conversacion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Selecciona una conversacion para ver el contexto del paciente y el historial reciente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
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
        <p className="text-sm text-muted-foreground">
          {thread.channelType === 'voice' ? 'Llamada' : 'WhatsApp'} · prioridad {thread.priority}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {thread.patient?.notes ? (
          <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            {thread.patient.notes}
          </div>
        ) : null}
        <Separator />
        <div className="space-y-3">
          {thread.messages.map((message) => (
            <div
              key={message.id}
              className={message.direction === 'outbound' ? 'text-right' : 'text-left'}
            >
              <div className="inline-block max-w-full rounded-2xl bg-muted px-3 py-2 text-sm">
                {message.body}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
