'use client';

import Link from 'next/link';
import {
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const clinicNavItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/bandeja', label: 'Bandeja', icon: Inbox },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/seguimiento', label: 'Seguimiento', icon: ClipboardList },
  { href: '/reactivacion', label: 'Reactivacion', icon: RefreshCw },
  { href: '/rendimiento', label: 'Rendimiento', icon: ChartColumn },
  { href: '/configuracion', label: 'Configuracion', icon: Settings },
];

export function ClinicSidebar({
  tenantId,
  pathname,
}: {
  tenantId: string;
  pathname: string;
}) {
  return (
    <ScrollArea className="flex-1 px-3 py-6">
      <nav className="flex flex-col gap-1">
        {clinicNavItems.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === `/app/${tenantId}` || pathname === `/app/${tenantId}/dashboard`
              : pathname.startsWith(`/app/${tenantId}${item.href}`);

          return (
            <Link
              key={item.href}
              href={`/app/${tenantId}${item.href}`}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-4 w-4', active ? 'text-accent' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
