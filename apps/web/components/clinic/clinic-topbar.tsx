'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Building2, ChevronDown, Command, Menu, Search, User } from 'lucide-react';

import { useAuthStore } from '@/lib/auth/store';
import { InternalModeSwitch } from '@/components/clinic/internal-mode-switch';
import { Kbd } from '@/components/ui/kbd';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { useTenantExperience } from '@/lib/tenant-experience';
import { cn } from '@/lib/utils';
import { getTenantDefaultHref } from '@/lib/vertical-registry';
import { ClinicSidebar } from './clinic-sidebar';

export function ClinicTopbar({
  onCommandOpenChange,
}: {
  onCommandOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const tenants = useAuthStore((state) => state.tenants);
  const isImpersonation = useAuthStore((state) => Boolean(state.session?.isImpersonation));
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const experience = useTenantExperience();

  const pendingCount =
    (experience.capabilities.formsEnabled ? 1 : 0) +
    (experience.capabilities.confirmationsEnabled ? 1 : 0) +
    (experience.capabilities.gapsEnabled ? 1 : 0);

  return (
    <>
      <header
        className={cn(
          'sticky z-40 flex h-16 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur lg:px-6',
          isImpersonation ? 'top-11' : 'top-0'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">{experience.tenant?.name ?? 'Clinica'}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Cambiar clinica</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tenants.map((tenant) => (
              <DropdownMenuItem key={tenant.id} asChild>
                <Link href={getTenantDefaultHref(tenant.id, tenant.settings)}>{tenant.name}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => onCommandOpenChange(true)}
          className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar pacientes, citas o tareas...</span>
          <Kbd>
            <Command className="h-3 w-3" />K
          </Kbd>
        </button>

        {experience.canAccessInternalPlatform ? (
          <InternalModeSwitch
            href={`/app/${experience.tenantId}/platform/dashboard`}
            label="Modo interno"
          />
        ) : null}

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {pendingCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
              {pendingCount}
            </span>
          ) : null}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.name ?? 'Admin User'}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email ?? 'admin@agentmou.dev'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout();
                router.push('/login');
              }}
            >
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex h-[100dvh] w-72 max-w-[85vw] flex-col border-r border-border/60 bg-sidebar p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navegacion clinica</SheetTitle>
          </SheetHeader>
          <ClinicSidebar
            tenantId={experience.tenantId}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
