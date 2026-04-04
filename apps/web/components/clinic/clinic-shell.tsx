'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/brand';
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
      <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border/60 px-4">
          <Link href={`/app/${experience.tenantId}/dashboard`} className="flex items-center">
            <Logo variant="sidebar" />
          </Link>
        </div>
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
