import type { ConversationThreadListItem } from '@agentmou/contracts';
import { Inbox, MessageCircleMore, Phone, TriangleAlert, UserRound } from 'lucide-react';

import { formatClinicLabel } from '@/lib/clinic-formatting';
import { cn } from '@/lib/utils';

import { PatientStatusBadge } from './patient-status-badge';

function channelIcon(channelType: ConversationThreadListItem['channelType']) {
  return channelType === 'voice' ? Phone : MessageCircleMore;
}

function getInitials(name?: string | null) {
  if (!name) return '··';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function InboxThreadList({
  threads,
  selectedThreadId,
  onSelect,
  emptyTitle = 'No hay conversaciones en esta cola',
  emptyDescription = 'Cuando entren mensajes o llamadas nuevas, aparecerán aquí con su contexto y prioridad.',
}: {
  threads: ConversationThreadListItem[];
  selectedThreadId?: string;
  onSelect?: (thread: ConversationThreadListItem) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (threads.length === 0) {
    return (
      <div className="thread-list flex flex-1 flex-col">
        <div className="empty-state-app">
          <Inbox size={20} aria-hidden />
          <p className="text-text-primary text-sm font-medium">{emptyTitle}</p>
          <p className="max-w-xs text-xs">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="thread-list">
      {threads.map((thread) => {
        const Icon = channelIcon(thread.channelType);
        const isActive = thread.id === selectedThreadId;
        const initials = getInitials(thread.patient?.fullName);

        return (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelect?.(thread)}
            aria-pressed={isActive}
            className={cn('thread-item', isActive && 'active')}
          >
            <div className="thread-avatar" aria-hidden>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="thread-name truncate">
                  {thread.patient?.fullName ?? 'Paciente por identificar'}
                </div>
                <span className="thread-time">{formatClinicLabel(thread.priority)}</span>
              </div>
              <div className="thread-preview">
                <Icon size={11} aria-hidden className="-mt-0.5 mr-1 inline-block align-middle" />
                {thread.lastMessagePreview ?? 'Sin mensaje reciente'}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {thread.patient ? (
                  <PatientStatusBadge
                    status={thread.patient.status}
                    isExisting={thread.patient.isExisting}
                  />
                ) : (
                  <span className="pill pill-outline">
                    <UserRound size={11} aria-hidden />
                    Sin identificar
                  </span>
                )}
                {thread.requiresHumanReview ? (
                  <span className="pill pill-warning">
                    <TriangleAlert size={11} aria-hidden />
                    Escalado
                  </span>
                ) : null}
                {(thread.unreadCount ?? 0) > 0 ? (
                  <span className="unread-badge" aria-label={`${thread.unreadCount} sin leer`}>
                    {thread.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
