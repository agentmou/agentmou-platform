'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
import { ClinicCommandSurface } from './clinic-command-surface';
import { ClinicSidebar } from './clinic-sidebar';
import { ClinicTopbar } from './clinic-topbar';
import { useAuthStore } from '@/lib/auth/store';
import { useTenantExperience } from '@/lib/tenant-experience';

export function ClinicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const experience = useTenantExperience();
  const isImpersonation = useAuthStore((state) => Boolean(state.session?.isImpersonation));
  const [commandOpen, setCommandOpen] = React.useState(false);

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
    <div data-surface="app" className="surface-app flex min-h-screen flex-col bg-background">
      <ImpersonationBanner />

      <div className="flex flex-1">
        <aside
          className={cn(
            'hidden w-72 shrink-0 self-start border-r border-border/60 bg-sidebar lg:flex lg:flex-col lg:sticky',
            isImpersonation ? 'lg:top-11 lg:h-[calc(100vh-2.75rem)]' : 'lg:top-0 lg:h-screen'
          )}
        >
          <ClinicSidebar tenantId={experience.tenantId} pathname={pathname} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <ClinicTopbar onCommandOpenChange={setCommandOpen} />
          <main className="flex-1">{children}</main>
        </div>
      </div>

      <ClinicCommandSurface open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
