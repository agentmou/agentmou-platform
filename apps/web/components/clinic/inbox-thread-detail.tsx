'use client';

import * as React from 'react';
import type { ConversationThreadDetail } from '@agentmou/contracts';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PatientStatusBadge } from './patient-status-badge';

interface InboxThreadDetailProps {
  thread: ConversationThreadDetail | null;
  onSendMessage?: (threadId: string, body: string) => Promise<void> | void;
}

export function InboxThreadDetail({ thread, onSendMessage }: InboxThreadDetailProps) {
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
      <CardFooter className="border-border-subtle border-t pt-4">
        <ThreadComposer threadId={thread.id} onSend={onSendMessage} />
      </CardFooter>
    </Card>
  );
}

function ThreadComposer({
  threadId,
  onSend,
}: {
  threadId: string;
  onSend?: (threadId: string, body: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;

    setIsSending(true);
    try {
      if (onSend) {
        await onSend(threadId, body);
      } else {
        toast.success('Mensaje enviado', {
          description: 'La integración real aún no está conectada; este envío es un eco visual.',
        });
      }
      setDraft('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Escribe tu mensaje al paciente..."
        aria-label="Redactar mensaje"
        className="flex-1"
        autoComplete="off"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!draft.trim() || isSending}
        aria-label="Enviar mensaje"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
