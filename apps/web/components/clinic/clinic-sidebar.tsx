'use client';

import Link from 'next/link';
import type { ClinicNavigationKey } from '@agentmou/contracts';
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

import { hasClinicNavigationAccess, useTenantExperience } from '@/lib/tenant-experience';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const clinicNavItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  navKey: ClinicNavigationKey;
}> = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard, navKey: 'dashboard' },
  { href: '/bandeja', label: 'Bandeja', icon: Inbox, navKey: 'inbox' },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays, navKey: 'appointments' },
  { href: '/pacientes', label: 'Pacientes', icon: Users, navKey: 'patients' },
  { href: '/seguimiento', label: 'Seguimiento', icon: ClipboardList, navKey: 'follow_up' },
  { href: '/reactivacion', label: 'Reactivacion', icon: RefreshCw, navKey: 'reactivation' },
  { href: '/rendimiento', label: 'Rendimiento', icon: ChartColumn, navKey: 'reports' },
  { href: '/configuracion', label: 'Configuracion', icon: Settings, navKey: 'configuration' },
];

export function ClinicSidebar({
  tenantId,
  pathname,
}: {
  tenantId: string;
  pathname: string;
}) {
  const experience = useTenantExperience();

  return (
    <ScrollArea className="flex-1 px-3 py-6">
      <nav className="flex flex-col gap-1">
        {clinicNavItems
          .filter((item) => hasClinicNavigationAccess(experience, item.navKey))
          .map((item) => {
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
