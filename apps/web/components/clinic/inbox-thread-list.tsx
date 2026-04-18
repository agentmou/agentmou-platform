import type { ConversationThreadListItem } from '@agentmou/contracts';
import { Inbox, MessageCircleMore, Phone, TriangleAlert, UserRound } from 'lucide-react';

import { EmptyState } from '@/components/control-plane/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatClinicLabel } from '@/lib/clinic-formatting';
import { cn } from '@/lib/utils';

import { PatientStatusBadge } from './patient-status-badge';

function channelIcon(channelType: ConversationThreadListItem['channelType']) {
  return channelType === 'voice' ? Phone : MessageCircleMore;
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
  return (
    <Card variant="raised">
      <CardHeader>
        <CardTitle className="text-base">Bandeja priorizada</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {threads.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
          </div>
        ) : null}
        <ScrollArea className="h-[420px]">
          <div className="divide-border-subtle divide-y">
            {threads.map((thread) => {
              const Icon = channelIcon(thread.channelType);
              const isActive = thread.id === selectedThreadId;

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelect?.(thread)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex w-full flex-col gap-3 border-l-2 p-4 text-left transition-colors',
                    isActive
                      ? 'border-accent bg-accent/10'
                      : 'hover:bg-card-hover border-transparent'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="bg-muted flex h-8 w-8 items-center justify-center rounded-full"
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-text-primary font-medium">
                          {thread.patient?.fullName ?? 'Paciente por identificar'}
                        </p>
                        <p className="text-text-muted text-xs">
                          {thread.channelType === 'voice' ? 'Llamada' : 'WhatsApp'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {thread.requiresHumanReview ? (
                        <Badge tone="warning" className="gap-1">
                          <TriangleAlert className="h-3 w-3" aria-hidden />
                          Escalado
                        </Badge>
                      ) : null}
                      {(thread.unreadCount ?? 0) > 0 ? (
                        <Badge
                          className="bg-accent text-accent-foreground border-transparent"
                          aria-label={`${thread.unreadCount} mensajes sin leer`}
                        >
                          {thread.unreadCount}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.patient ? (
                      <PatientStatusBadge
                        status={thread.patient.status}
                        isExisting={thread.patient.isExisting}
                      />
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <UserRound className="h-3 w-3" aria-hidden />
                        Sin identificar
                      </Badge>
                    )}
                    <Badge variant="outline">{formatClinicLabel(thread.priority)}</Badge>
                    <Badge variant="outline">{formatClinicLabel(thread.status)}</Badge>
                  </div>
                  <p className="text-text-muted text-sm">
                    {thread.lastMessagePreview ?? 'Sin mensaje reciente'}
                  </p>
                  {thread.nextSuggestedAction ? (
                    <p className="text-text-primary text-sm font-medium">
                      {thread.nextSuggestedAction}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
