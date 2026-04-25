'use client';

import * as React from 'react';
import { Bell, BellOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ClinicNotification {
  id: string;
  title: string;
  body?: string;
  timestamp: string;
  read?: boolean;
}

interface NotificationsPopoverProps {
  notifications?: ClinicNotification[];
  className?: string;
}

export function NotificationsPopover({ notifications = [], className }: NotificationsPopoverProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Notificaciones'}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border-subtle flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notificaciones</h3>
          {unreadCount > 0 ? (
            <span className="text-text-muted text-xs">{unreadCount} sin leer</span>
          ) : null}
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <BellOff className="text-muted-foreground h-5 w-5" aria-hidden />
            </div>
            <p className="text-text-primary text-sm font-medium">Sin notificaciones</p>
            <p className="text-text-muted text-xs">
              Te avisaremos aquí cuando haya actividad nueva que requiera tu atención.
            </p>
          </div>
        ) : (
          <ul className="divide-border-subtle max-h-80 divide-y overflow-y-auto">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  'flex flex-col gap-1 px-4 py-3 text-sm',
                  notification.read ? 'bg-transparent' : 'bg-primary/5'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-text-primary font-medium">{notification.title}</span>
                  <span className="text-text-muted shrink-0 text-xs">{notification.timestamp}</span>
                </div>
                {notification.body ? (
                  <p className="text-text-secondary text-xs">{notification.body}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
