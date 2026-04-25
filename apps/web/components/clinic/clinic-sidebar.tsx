'use client';

import * as React from 'react';
import Link from 'next/link';

import { useAuthStore } from '@/lib/auth/store';
import { useTenantExperience } from '@/lib/tenant-experience';
import { resolveClinicSidebarNavigation } from '@/lib/clinic-navigation';
import { cn } from '@/lib/utils';

function isActiveClinicItem(pathname: string, tenantId: string, href: string) {
  return href === '/dashboard'
    ? pathname === `/app/${tenantId}` || pathname === `/app/${tenantId}/dashboard`
    : pathname.startsWith(`/app/${tenantId}${href}`);
}

function getInitials(name?: string | null) {
  if (!name) return 'AG';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface ClinicSidebarProps {
  tenantId: string;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function ClinicSidebar({
  tenantId,
  pathname,
  onNavigate,
  collapsed = false,
}: ClinicSidebarProps) {
  const experience = useTenantExperience();
  const navigation = React.useMemo(() => resolveClinicSidebarNavigation(experience), [experience]);
  const user = useAuthStore((state) => state.user);

  const initials = getInitials(user?.name ?? user?.email);
  const clinicName = experience.tenant?.name ?? '—';

  return (
    <nav aria-label="Navegación de la clínica" className="flex h-full w-full flex-col">
      <Link
        href={`/app/${tenantId}/dashboard`}
        className="sb-logo"
        onClick={onNavigate}
        aria-label="Ir al dashboard de la clínica"
      >
        <img src="/isotipo_agentmou_32x32.png" alt="" aria-hidden />
        {collapsed ? null : <span className="sb-wordmark">Agentmou</span>}
      </Link>

      <div className="sb-body">
        {navigation.sections.map((section) => (
          <React.Fragment key={section.key}>
            <div className="sb-section">{collapsed ? '' : section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActiveClinicItem(pathname, tenantId, item.href);
              return (
                <Link
                  key={item.href}
                  href={`/app/${tenantId}${item.href}`}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn('sb-item', active && 'active')}
                >
                  <Icon size={16} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {navigation.footerItem ? (
        <Link
          href={`/app/${tenantId}${navigation.footerItem.href}`}
          onClick={onNavigate}
          title={collapsed ? navigation.footerItem.label : undefined}
          aria-current={
            isActiveClinicItem(pathname, tenantId, navigation.footerItem.href) ? 'page' : undefined
          }
          className={cn(
            'sb-item mx-2 mb-2',
            isActiveClinicItem(pathname, tenantId, navigation.footerItem.href) && 'active'
          )}
        >
          <navigation.footerItem.icon size={16} aria-hidden />
          <span>{navigation.footerItem.label}</span>
        </Link>
      ) : null}

      <div className="sb-footer">
        <div className="avatar" aria-hidden>
          {initials}
        </div>
        <div className="avatar-text">
          <div className="avatar-name">{user?.name ?? 'Operador'}</div>
          <div className="avatar-clinic">{clinicName}</div>
        </div>
      </div>
    </nav>
  );
}
