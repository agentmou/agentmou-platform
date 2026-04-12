'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { ClinicCommandSurface } from './clinic-command-surface';
import { ClinicSidebar } from './clinic-sidebar';
import { ClinicTopbar } from './clinic-topbar';
import { useTenantExperience } from '@/lib/tenant-experience';

export function ClinicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const experience = useTenantExperience();
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
    <div data-surface="app" className="surface-app flex min-h-screen bg-background">
      <aside className="hidden w-72 shrink-0 self-start border-r border-border/60 bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <ClinicSidebar tenantId={experience.tenantId} pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ClinicTopbar onCommandOpenChange={setCommandOpen} />
        <main className="flex-1">{children}</main>
      </div>

      <ClinicCommandSurface open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
