'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTenantExperience } from '@/lib/tenant-experience';
import { cn } from '@/lib/utils';

import { ClinicCommandSurface } from './clinic-command-surface';
import { ClinicSidebar } from './clinic-sidebar';
import { ClinicTopbar } from './clinic-topbar';

export function ClinicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const experience = useTenantExperience();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      data-surface="app"
      className="surface-app flex h-screen w-screen flex-col overflow-hidden bg-background"
    >
      <ImpersonationBanner />

      <div className="flex min-h-0 flex-1">
        <aside className={cn('sidebar hidden lg:flex', collapsed && 'collapsed')}>
          <ClinicSidebar tenantId={experience.tenantId} pathname={pathname} collapsed={collapsed} />
        </aside>

        <div className="main">
          <ClinicTopbar
            onCommandOpenChange={setCommandOpen}
            onToggleSidebar={() => setCollapsed((value) => !value)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="content">{children}</main>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] border-r border-border/60 bg-sidebar p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navegación clínica</SheetTitle>
          </SheetHeader>
          <div className="sidebar flex h-[100dvh]">
            <ClinicSidebar
              tenantId={experience.tenantId}
              pathname={pathname}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ClinicCommandSurface open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
