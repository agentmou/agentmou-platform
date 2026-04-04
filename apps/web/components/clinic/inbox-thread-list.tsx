import type { ConversationThreadListItem } from '@agentmou/contracts';
import { MessageCircleMore, Phone, TriangleAlert, UserRound } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { PatientStatusBadge } from './patient-status-badge';

function channelIcon(channelType: ConversationThreadListItem['channelType']) {
  return channelType === 'voice' ? Phone : MessageCircleMore;
}

export function InboxThreadList({
  threads,
  selectedThreadId,
  onSelect,
}: {
  threads: ConversationThreadListItem[];
  selectedThreadId?: string;
  onSelect?: (thread: ConversationThreadListItem) => void;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Bandeja priorizada</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <div className="divide-y divide-border/50">
            {threads.map((thread) => {
              const Icon = channelIcon(thread.channelType);
              const isActive = thread.id === selectedThreadId;

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelect?.(thread)}
                  className={cn(
                    'flex w-full flex-col gap-3 p-4 text-left transition-colors',
                    isActive ? 'bg-accent/10' : 'hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium">{thread.patient?.fullName ?? 'Paciente por identificar'}</p>
                        <p className="text-sm text-muted-foreground">
                          {thread.channelType === 'voice' ? 'Llamada' : 'WhatsApp'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {thread.requiresHumanReview ? (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                          <TriangleAlert className="h-3 w-3" />
                          Escalado
                        </span>
                      ) : null}
                      {(thread.unreadCount ?? 0) > 0 ? (
                        <span className="rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                          {thread.unreadCount}
                        </span>
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        <UserRound className="h-3 w-3" />
                        Sin identificar
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {thread.priority}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {thread.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {thread.lastMessagePreview ?? 'Sin mensaje reciente'}
                  </p>
                  {thread.nextSuggestedAction ? (
                    <p className="text-sm font-medium text-foreground">{thread.nextSuggestedAction}</p>
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
