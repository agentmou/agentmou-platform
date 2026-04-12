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
    <div className="flex h-[100dvh] min-h-0 flex-col bg-sidebar lg:h-full">
      <div className="flex h-16 items-center border-b border-border/60 px-4">
        <Link
          href={`/app/${tenantId}/dashboard`}
          className="flex items-center"
          onClick={onNavigate}
        >
          <Logo variant="sidebar" />
        </Link>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-6">
        <nav className="flex flex-col gap-6">
          {navigation.sections.map((section) => (
            <div key={section.key} className="flex flex-col gap-1">
              <p className="px-3 text-editorial-tiny uppercase tracking-[0.05em] text-muted-foreground">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = isActiveClinicItem(pathname, tenantId, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={`/app/${tenantId}${item.href}`}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                        active
                          ? 'bg-accent/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-accent' : 'text-muted-foreground'
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {navigation.footerItem ? (
        <div className="border-t border-border/60 p-3">
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
              <navigation.footerItem.icon className="h-4 w-4 shrink-0" />
              <span>{navigation.footerItem.label}</span>
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
