'use client';

import type { TenantExperience, TenantNavigationKey } from '@agentmou/contracts';

import {
  getTenantDefaultHref,
  getVerticalRegistryEntry,
  type TenantRouteKind,
} from './vertical-registry';

export interface RoutePatternMatch {
  kind: TenantRouteKind | 'platform_alias' | 'unknown';
  relativePath: string | null;
  canonicalPath: string | null;
  navigationKey?: TenantNavigationKey;
}

const INTERNAL_ROUTE_PATTERNS: Array<{
  prefix: string;
  navigationKey: TenantNavigationKey;
}> = [
  { prefix: '/admin', navigationKey: 'admin_console' },
  { prefix: '/approvals', navigationKey: 'platform_internal' },
  { prefix: '/marketplace', navigationKey: 'platform_internal' },
  { prefix: '/installer', navigationKey: 'platform_internal' },
  { prefix: '/fleet', navigationKey: 'platform_internal' },
  { prefix: '/runs', navigationKey: 'platform_internal' },
  { prefix: '/observability', navigationKey: 'platform_internal' },
  { prefix: '/security', navigationKey: 'platform_internal' },
  { prefix: '/settings', navigationKey: 'platform_internal' },
];

const VERTICAL_ROUTE_PATTERNS: Array<{
  prefix: string;
  navigationKey: TenantNavigationKey;
}> = [
  { prefix: '/seguimiento/formularios', navigationKey: 'forms' },
  { prefix: '/seguimiento/confirmaciones', navigationKey: 'confirmations' },
  { prefix: '/seguimiento/huecos', navigationKey: 'gaps' },
  { prefix: '/bandeja', navigationKey: 'inbox' },
  { prefix: '/agenda', navigationKey: 'appointments' },
  { prefix: '/pacientes', navigationKey: 'patients' },
  { prefix: '/seguimiento', navigationKey: 'follow_up' },
  { prefix: '/reactivacion', navigationKey: 'reactivation' },
  { prefix: '/rendimiento', navigationKey: 'reports' },
  { prefix: '/configuracion', navigationKey: 'configuration' },
];

function matchesRoutePrefix(relativePath: string, prefix: string) {
  return relativePath === prefix || relativePath.startsWith(`${prefix}/`);
}

function toRelativeTenantPath(pathname: string, tenantId: string) {
  const basePath = `/app/${tenantId}`;
  if (!pathname.startsWith(basePath)) {
    return null;
  }

  const relativePath = pathname.slice(basePath.length);
  if (!relativePath || relativePath === '/') {
    return '/dashboard';
  }

  return relativePath;
}

export function matchTenantRoute(pathname: string, tenantId: string): RoutePatternMatch {
  const relativePath = toRelativeTenantPath(pathname, tenantId);

  if (!relativePath) {
    return {
      kind: 'unknown',
      relativePath: null,
      canonicalPath: null,
    };
  }

  if (relativePath === '/dashboard') {
    return {
      kind: 'shared',
      relativePath,
      canonicalPath: '/dashboard',
    };
  }

  if (relativePath === '/platform' || matchesRoutePrefix(relativePath, '/platform')) {
    // Keep the legacy `/platform/*` namespace only as a compatibility layer for
    // old deep links. New navigation should target the canonical top-level
    // internal routes directly.
    const canonicalPath =
      relativePath === '/platform'
        ? '/dashboard'
        : relativePath.slice('/platform'.length) || '/dashboard';

    const navigationKey = canonicalPath.startsWith('/admin')
      ? 'admin_console'
      : canonicalPath === '/dashboard'
        ? undefined
        : 'platform_internal';

    return {
      kind: 'platform_alias',
      relativePath,
      canonicalPath,
      navigationKey,
    };
  }

  for (const route of INTERNAL_ROUTE_PATTERNS) {
    if (matchesRoutePrefix(relativePath, route.prefix)) {
      return {
        kind: 'internal',
        relativePath,
        canonicalPath: relativePath,
        navigationKey: route.navigationKey,
      };
    }
  }

  for (const route of VERTICAL_ROUTE_PATTERNS) {
    if (matchesRoutePrefix(relativePath, route.prefix)) {
      return {
        kind: 'vertical_shared',
        relativePath,
        canonicalPath: relativePath,
        navigationKey: route.navigationKey,
      };
    }
  }

  return {
    kind: 'unknown',
    relativePath,
    canonicalPath: relativePath,
  };
}

interface ResolveTenantRouteRedirectParams {
  pathname: string;
  tenantId: string;
  experience: Pick<TenantExperience, 'activeVertical' | 'allowedNavigation' | 'defaultRoute'>;
}

export function resolveTenantRouteRedirect({
  pathname,
  tenantId,
  experience,
}: ResolveTenantRouteRedirectParams) {
  const match = matchTenantRoute(pathname, tenantId);
  const registry = getVerticalRegistryEntry(experience);
  const defaultHref = experience.defaultRoute.startsWith('/app/')
    ? experience.defaultRoute
    : getTenantDefaultHref(tenantId, experience);

  if (match.kind === 'platform_alias') {
    if (experience.activeVertical === 'internal' && match.canonicalPath) {
      return `/app/${tenantId}${match.canonicalPath}`;
    }

    return defaultHref;
  }

  if (
    match.kind !== 'unknown' &&
    !registry.allowedRouteKinds.includes(match.kind as TenantRouteKind)
  ) {
    return defaultHref;
  }

  if (
    match.navigationKey &&
    experience.allowedNavigation.length > 0 &&
    !experience.allowedNavigation.includes(match.navigationKey)
  ) {
    return defaultHref;
  }

  return null;
}

interface AppRootTenantLike {
  id: string;
  settings?: {
    activeVertical?: 'internal' | 'clinic' | 'fisio';
    verticalClinicUi?: boolean;
  } | null;
}

export function resolveAppRootRedirect(params: {
  tenants: AppRootTenantLike[];
  activeTenantId?: string | null;
}) {
  const activeTenant =
    params.tenants.find((tenant) => tenant.id === params.activeTenantId) ?? params.tenants[0];

  if (!activeTenant) {
    return getTenantDefaultHref('demo-workspace', 'clinic');
  }

  return getTenantDefaultHref(activeTenant.id, activeTenant.settings);
}
