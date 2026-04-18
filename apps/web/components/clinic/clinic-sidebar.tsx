'use client';

import * as React from 'react';
import Link from 'next/link';

import { Logo } from '@/components/brand';
import { useTenantExperience } from '@/lib/tenant-experience';
import { resolveClinicSidebarNavigation } from '@/lib/clinic-navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

function isActiveClinicItem(pathname: string, tenantId: string, href: string) {
  return href === '/dashboard'
    ? pathname === `/app/${tenantId}` || pathname === `/app/${tenantId}/dashboard`
    : pathname.startsWith(`/app/${tenantId}${href}`);
}

interface ClinicSidebarProps {
  tenantId: string;
  pathname: string;
  onNavigate?: () => void;
}

export function ClinicSidebar({ tenantId, pathname, onNavigate }: ClinicSidebarProps) {
  const experience = useTenantExperience();
  const navigation = React.useMemo(() => resolveClinicSidebarNavigation(experience), [experience]);

  return (
    <nav
      aria-label="Navegación de la clínica"
      className="bg-sidebar flex h-[100dvh] min-h-0 flex-col lg:h-full"
    >
      <div className="border-border-subtle flex h-16 items-center border-b px-4">
        <Link
          href={`/app/${tenantId}/dashboard`}
          className="flex items-center"
          onClick={onNavigate}
          aria-label="Ir al dashboard de la clínica"
        >
          <Logo variant="sidebar" />
        </Link>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-6">
        <div className="flex flex-col gap-6">
          {navigation.sections.map((section) => (
            <div key={section.key} className="flex flex-col gap-1">
              <p
                className="text-text-muted px-3 text-[11px] uppercase tracking-[0.08em]"
                aria-hidden
              >
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActiveClinicItem(pathname, tenantId, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={`/app/${tenantId}${item.href}`}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-accent/10 border-accent text-text-primary'
                          : 'text-text-muted hover:bg-card-hover hover:text-text-primary border-transparent'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'
                        )}
                        aria-hidden
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {navigation.footerItem ? (
        <div className="border-border-subtle border-t p-3">
          <Button
            asChild
            variant={
              isActiveClinicItem(pathname, tenantId, navigation.footerItem.href)
                ? 'secondary'
                : 'outline'
            }
            className="w-full justify-start gap-2 rounded-xl"
          >
            <Link href={`/app/${tenantId}${navigation.footerItem.href}`} onClick={onNavigate}>
              <navigation.footerItem.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{navigation.footerItem.label}</span>
            </Link>
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
