'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, Command, LogOut, Menu, Search, User } from 'lucide-react';

import { useAuthStore } from '@/lib/auth/store';
import { InternalModeSwitch } from '@/components/clinic/internal-mode-switch';
import { NotificationsPopover } from '@/components/clinic/notifications-popover';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenantExperience } from '@/lib/tenant-experience';
import { getTenantDefaultHref } from '@/lib/vertical-registry';

interface ClinicTopbarProps {
  onCommandOpenChange: (open: boolean) => void;
  onToggleSidebar?: () => void;
  onOpenMobileNav?: () => void;
}

export function ClinicTopbar({
  onCommandOpenChange,
  onToggleSidebar,
  onOpenMobileNav,
}: ClinicTopbarProps) {
  const user = useAuthStore((state) => state.user);
  const tenants = useAuthStore((state) => state.tenants);
  const experience = useTenantExperience();

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-btn lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir menú"
      >
        <Menu size={16} />
      </button>
      <button
        type="button"
        className="topbar-btn hidden lg:flex"
        onClick={onToggleSidebar}
        aria-label="Mostrar/ocultar menú"
      >
        <Menu size={16} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="topbar-clinic" aria-label="Cambiar clínica">
            <Building2 size={16} aria-hidden />
            <span>{experience.tenant?.name ?? 'Clínica'}</span>
            <ChevronDown size={12} aria-hidden style={{ color: 'var(--muted-fg)' }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Cambiar centro</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.map((tenant) => (
            <DropdownMenuItem key={tenant.id} asChild>
              <Link href={getTenantDefaultHref(tenant.id, tenant.settings)}>{tenant.name}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => onCommandOpenChange(true)}
        className="topbar-search"
        aria-label="Buscar (Cmd/Ctrl + K)"
      >
        <Search size={16} aria-hidden />
        <span className="flex-1 text-left">Buscar pacientes, citas o tareas...</span>
        <span className="kbd-tag inline-flex items-center gap-1">
          <Command size={10} aria-hidden />K
        </span>
      </button>

      {experience.canAccessInternalPlatform ? (
        <InternalModeSwitch href={`/app/${experience.tenantId}/dashboard`} label="Modo interno" />
      ) : null}

      <ThemeToggle className="topbar-btn !size-[34px]" />
      <NotificationsPopover />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="topbar-btn" aria-label="Menú de usuario">
            <User size={16} aria-hidden />
          </button>
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
          <DropdownMenuItem asChild>
            <form action="/logout" method="post" className="w-full">
              <button type="submit" className="flex w-full items-center gap-2 px-2 py-1.5 text-sm">
                <LogOut size={16} aria-hidden />
                Cerrar sesión
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
