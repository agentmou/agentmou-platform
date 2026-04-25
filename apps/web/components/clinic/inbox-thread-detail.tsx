'use client';

import * as React from 'react';
import type { ConversationMessage, ConversationThreadDetail } from '@agentmou/contracts';
import { Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useDataProvider } from '@/lib/providers/context';
import { useTenantExperience } from '@/lib/tenant-experience';
import { cn } from '@/lib/utils';

import { PatientStatusBadge } from './patient-status-badge';

interface InboxThreadDetailProps {
  thread: ConversationThreadDetail | null;
  /**
   * Notified after a successful reply with the freshly returned thread
   * detail so callers can refresh their cached copy. If omitted, the
   * composer still appends new outbound messages locally so the operator
   * never sees a stale view.
   */
  onThreadUpdated?: (thread: ConversationThreadDetail) => void;
}

export function InboxThreadDetail({ thread, onThreadUpdated }: InboxThreadDetailProps) {
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

  return <ThreadDetailBody key={thread.id} thread={thread} onThreadUpdated={onThreadUpdated} />;
}

function ThreadDetailBody({
  thread,
  onThreadUpdated,
}: {
  thread: ConversationThreadDetail;
  onThreadUpdated?: (thread: ConversationThreadDetail) => void;
}) {
  const [appendedMessages, setAppendedMessages] = React.useState<ConversationMessage[]>([]);

  const messages = React.useMemo(() => {
    if (appendedMessages.length === 0) return thread.messages;
    const seen = new Set(thread.messages.map((message) => message.id));
    const extras = appendedMessages.filter((message) => !seen.has(message.id));
    return [...thread.messages, ...extras];
  }, [thread.messages, appendedMessages]);

  const handleAppend = React.useCallback(
    (updated: ConversationThreadDetail) => {
      const fresh = updated.messages.filter(
        (message) => !thread.messages.some((existing) => existing.id === message.id)
      );
      if (fresh.length > 0) {
        setAppendedMessages((current) => [...current, ...fresh]);
      }
      onThreadUpdated?.(updated);
    },
    [thread.messages, onThreadUpdated]
  );

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
        {messages.map((message) => {
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

      <ThreadComposer thread={thread} onSent={handleAppend} />
    </div>
  );
}

function ThreadComposer({
  thread,
  onSent,
}: {
  thread: ConversationThreadDetail;
  onSent: (updated: ConversationThreadDetail) => void;
}) {
  const provider = useDataProvider();
  const experience = useTenantExperience();
  const [draft, setDraft] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSending || !experience.tenantId) return;

    setIsSending(true);
    try {
      const updated = await provider.replyClinicConversation(experience.tenantId, thread.id, {
        body,
        channelType: thread.channelType,
        messageType: 'text',
      });
      setDraft('');
      onSent(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No hemos podido enviar el mensaje.';
      toast.error('No hemos podido enviar el mensaje', { description: message });
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
        disabled={isSending}
      />
      <button
        type="submit"
        className="btn-app btn-primary"
        disabled={!draft.trim() || isSending}
        aria-label="Enviar mensaje"
      >
        <Send size={14} aria-hidden />
        {isSending ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  );
}
