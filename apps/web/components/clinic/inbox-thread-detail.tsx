'use client';

import * as React from 'react';
import type { ConversationThreadDetail } from '@agentmou/contracts';
import { Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

import { PatientStatusBadge } from './patient-status-badge';

interface InboxThreadDetailProps {
  thread: ConversationThreadDetail | null;
  onSendMessage?: (threadId: string, body: string) => Promise<void> | void;
}

export function InboxThreadDetail({ thread, onSendMessage }: InboxThreadDetailProps) {
  if (!thread) {
    return (
      <div className="thread-detail">
        <div className="card-hd">
          <div className="card-hd-title">Detalle de la conversación</div>
        </div>
        <div className="empty-state-app">
          <p className="text-text-primary text-sm font-medium">Selecciona una conversación</p>
          <p className="max-w-xs text-xs">
            Verás el contexto del paciente y el historial reciente para responder con un clic.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="thread-detail">
      <div className="card-hd flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="card-hd-title">
            {thread.patient?.fullName ?? 'Paciente por identificar'}
          </div>
          <div className="card-hd-sub">
            {thread.channelType === 'voice' ? 'Llamada' : 'WhatsApp'} · prioridad {thread.priority}
          </div>
        </div>
        {thread.patient ? (
          <div className="ml-auto">
            <PatientStatusBadge
              status={thread.patient.status}
              isExisting={thread.patient.isExisting}
            />
          </div>
        ) : null}
      </div>

      <div className="msg-area">
        {thread.patient?.notes ? (
          <div
            className="rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface)',
              color: 'var(--muted-fg)',
            }}
          >
            <div className="msg-label">Nota</div>
            {thread.patient.notes}
          </div>
        ) : null}
        {thread.messages.map((message) => {
          const isOutbound = message.direction === 'outbound';
          return (
            <div key={message.id} className={cn('msg-group', isOutbound && 'right')}>
              {isOutbound ? (
                <div className="msg-label inline-flex items-center gap-1">
                  <Sparkles size={11} aria-hidden />
                  Asistente
                </div>
              ) : null}
              <div className={cn('msg-bubble', isOutbound ? 'msg-out' : 'msg-in')}>
                {message.body}
              </div>
            </div>
          );
        })}
      </div>

      <ThreadComposer threadId={thread.id} onSend={onSendMessage} />
    </div>
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
    <form onSubmit={handleSubmit} className="composer">
      <textarea
        rows={1}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Escribe tu mensaje al paciente..."
        aria-label="Redactar mensaje"
        className="composer-input"
      />
      <button
        type="submit"
        className="btn-app btn-primary"
        disabled={!draft.trim() || isSending}
        aria-label="Enviar mensaje"
      >
        <Send size={14} aria-hidden />
        Enviar
      </button>
    </form>
  );
}
