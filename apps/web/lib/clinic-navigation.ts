'use client';

import type { ClinicNavigationKey } from '@agentmou/contracts';
import type { LucideIcon } from 'lucide-react';
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

import { hasClinicNavigationAccess, type TenantExperienceState } from './tenant-experience';

export interface ClinicSidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  navKey: ClinicNavigationKey;
}

export interface ClinicSidebarSection {
  key: string;
  label: string;
  items: ClinicSidebarItem[];
}

export interface ClinicSidebarNavigation {
  sections: ClinicSidebarSection[];
  footerItem: ClinicSidebarItem | null;
}

type ClinicSidebarAccessContext = Pick<TenantExperienceState, 'allowedNavigation' | 'capabilities'>;

const DASHBOARD_ITEM: ClinicSidebarItem = {
  href: '/dashboard',
  label: 'Resumen',
  icon: LayoutDashboard,
  navKey: 'dashboard',
};

const INBOX_ITEM: ClinicSidebarItem = {
  href: '/bandeja',
  label: 'Bandeja',
  icon: Inbox,
  navKey: 'inbox',
};

const APPOINTMENTS_ITEM: ClinicSidebarItem = {
  href: '/agenda',
  label: 'Agenda',
  icon: CalendarDays,
  navKey: 'appointments',
};

const PATIENTS_ITEM: ClinicSidebarItem = {
  href: '/pacientes',
  label: 'Pacientes',
  icon: Users,
  navKey: 'patients',
};

const FOLLOW_UP_ITEM: ClinicSidebarItem = {
  href: '/seguimiento',
  label: 'Seguimiento',
  icon: ClipboardList,
  navKey: 'follow_up',
};

const REACTIVATION_ITEM: ClinicSidebarItem = {
  href: '/reactivacion',
  label: 'Reactivación',
  icon: RefreshCw,
  navKey: 'reactivation',
};

const REPORTS_ITEM: ClinicSidebarItem = {
  href: '/rendimiento',
  label: 'Rendimiento',
  icon: ChartColumn,
  navKey: 'reports',
};

const CONFIGURATION_ITEM: ClinicSidebarItem = {
  href: '/configuracion',
  label: 'Configuración',
  icon: Settings,
  navKey: 'configuration',
};

const CLINIC_NAVIGATION_SECTIONS: Array<{
  key: string;
  label: string;
  items: ClinicSidebarItem[];
}> = [
  { key: 'overview', label: 'Inicio', items: [DASHBOARD_ITEM] },
  {
    key: 'operations',
    label: 'Operación',
    items: [INBOX_ITEM, APPOINTMENTS_ITEM, PATIENTS_ITEM],
  },
  {
    key: 'follow-up',
    label: 'Seguimiento',
    items: [FOLLOW_UP_ITEM, REACTIVATION_ITEM],
  },
  { key: 'analytics', label: 'Análisis', items: [REPORTS_ITEM] },
];

export function resolveClinicSidebarNavigation(
  experience: ClinicSidebarAccessContext
): ClinicSidebarNavigation {
  const sections = CLINIC_NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasClinicNavigationAccess(experience, item.navKey)),
  })).filter((section) => section.items.length > 0);

  return {
    sections,
    footerItem: hasClinicNavigationAccess(experience, CONFIGURATION_ITEM.navKey)
      ? CONFIGURATION_ITEM
      : null,
  };
}
