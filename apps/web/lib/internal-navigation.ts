import type { TenantNavigationKey } from '@agentmou/contracts';

export type InternalNavigationSectionKey =
  | 'overview'
  | 'agents'
  | 'operations'
  | 'security'
  | 'admin';

export type InternalNavigationItemIcon =
  | 'layout-dashboard'
  | 'check-circle'
  | 'store'
  | 'download'
  | 'package'
  | 'activity'
  | 'eye'
  | 'shield'
  | 'building2'
  | 'settings';

export interface InternalNavigationItem {
  key: string;
  label: string;
  href: string;
  icon: InternalNavigationItemIcon;
  navigationKey?: TenantNavigationKey;
  badge?: 'pending_approvals';
}

export interface InternalNavigationSection {
  key: InternalNavigationSectionKey;
  label: string;
  items: InternalNavigationItem[];
}

export interface ResolvedInternalNavigation {
  sections: InternalNavigationSection[];
  footerItem: InternalNavigationItem | null;
}

const INTERNAL_NAVIGATION_TEMPLATE: Array<
  Omit<InternalNavigationSection, 'items'> & {
    items: InternalNavigationItem[];
  }
> = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      {
        key: 'approvals',
        href: '/approvals',
        label: 'Approvals',
        icon: 'check-circle',
        navigationKey: 'platform_internal',
        badge: 'pending_approvals',
      },
    ],
  },
  {
    key: 'agents',
    label: 'Agents',
    items: [
      {
        key: 'marketplace',
        href: '/marketplace',
        label: 'Marketplace',
        icon: 'store',
        navigationKey: 'platform_internal',
      },
      {
        key: 'installer',
        href: '/installer/new',
        label: 'Installer',
        icon: 'download',
        navigationKey: 'platform_internal',
      },
      {
        key: 'fleet',
        href: '/fleet',
        label: 'Fleet',
        icon: 'package',
        navigationKey: 'platform_internal',
      },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    items: [
      {
        key: 'runs',
        href: '/runs',
        label: 'Runs',
        icon: 'activity',
        navigationKey: 'platform_internal',
      },
      {
        key: 'observability',
        href: '/observability',
        label: 'Observability',
        icon: 'eye',
        navigationKey: 'platform_internal',
      },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    items: [
      {
        key: 'security',
        href: '/security',
        label: 'Security',
        icon: 'shield',
        navigationKey: 'platform_internal',
      },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    items: [
      {
        key: 'admin-console',
        href: '/admin/tenants',
        label: 'Tenants',
        icon: 'building2',
        navigationKey: 'admin_console',
      },
    ],
  },
];

const INTERNAL_FOOTER_ITEM: InternalNavigationItem = {
  key: 'settings',
  href: '/settings',
  label: 'Settings',
  icon: 'settings',
};

function hasNavigationAccess(
  allowedNavigation: TenantNavigationKey[],
  navigationKey?: TenantNavigationKey
) {
  if (!navigationKey) {
    return true;
  }

  if (allowedNavigation.length === 0) {
    return true;
  }

  return allowedNavigation.includes(navigationKey);
}

export function resolveInternalNavigation(params: {
  allowedNavigation: TenantNavigationKey[];
  canAccessAdminConsole: boolean;
}): ResolvedInternalNavigation {
  const sections = INTERNAL_NAVIGATION_TEMPLATE.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.navigationKey === 'admin_console' && !params.canAccessAdminConsole) {
        return false;
      }

      return hasNavigationAccess(params.allowedNavigation, item.navigationKey);
    }),
  })).filter((section) => section.items.length > 0);

  return {
    sections,
    footerItem: INTERNAL_FOOTER_ITEM,
  };
}
