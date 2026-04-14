import { describe, expect, it } from 'vitest';

import {
  matchTenantRoute,
  resolveAppRootRedirect,
  resolveTenantRouteRedirect,
} from './tenant-routing';

describe('tenant routing', () => {
  it('redirects /app to the internal workspace when the active tenant is internal', () => {
    const target = resolveAppRootRedirect({
      activeTenantId: 'tenant-internal',
      tenants: [
        {
          id: 'tenant-clinic',
          settings: { activeVertical: 'clinic' },
        },
        {
          id: 'tenant-internal',
          settings: { activeVertical: 'internal' },
        },
      ],
    });

    expect(target).toBe('/app/tenant-internal/dashboard');
  });

  it('uses the active tenant vertical when redirecting /app', () => {
    const target = resolveAppRootRedirect({
      activeTenantId: 'tenant-clinic',
      tenants: [
        {
          id: 'tenant-internal',
          settings: { activeVertical: 'internal' },
        },
        {
          id: 'tenant-clinic',
          settings: { activeVertical: 'clinic' },
        },
      ],
    });

    expect(target).toBe('/app/tenant-clinic/dashboard');
  });

  it('redirects internal platform aliases to their canonical top-level routes', () => {
    const target = resolveTenantRouteRedirect({
      pathname: '/app/tenant-1/platform/runs',
      tenantId: 'tenant-1',
      experience: {
        activeVertical: 'internal',
        allowedNavigation: ['platform_internal', 'admin_console'],
        defaultRoute: '/app/tenant-1/dashboard',
      },
    });

    expect(target).toBe('/app/tenant-1/runs');
  });

  it('sends clinic tenants back to their default route when they hit internal pages', () => {
    const target = resolveTenantRouteRedirect({
      pathname: '/app/tenant-1/runs',
      tenantId: 'tenant-1',
      experience: {
        activeVertical: 'clinic',
        allowedNavigation: ['dashboard', 'inbox', 'configuration'],
        defaultRoute: '/app/tenant-1/dashboard',
      },
    });

    expect(target).toBe('/app/tenant-1/dashboard');
  });

  it('sends internal tenants away from shared vertical pages', () => {
    const target = resolveTenantRouteRedirect({
      pathname: '/app/tenant-1/agenda',
      tenantId: 'tenant-1',
      experience: {
        activeVertical: 'internal',
        allowedNavigation: ['platform_internal', 'admin_console'],
        defaultRoute: '/app/tenant-1/dashboard',
      },
    });

    expect(target).toBe('/app/tenant-1/dashboard');
  });

  it('classifies admin pages as internal admin-console routes', () => {
    const match = matchTenantRoute('/app/tenant-1/admin/tenants', 'tenant-1');

    expect(match.kind).toBe('internal');
    expect(match.navigationKey).toBe('admin_console');
    expect(match.canonicalPath).toBe('/admin/tenants');
  });

  it('keeps fisio tenants on the shared shell but blocks routes outside their navigation', () => {
    const target = resolveTenantRouteRedirect({
      pathname: '/app/tenant-1/agenda',
      tenantId: 'tenant-1',
      experience: {
        activeVertical: 'fisio',
        allowedNavigation: ['dashboard', 'configuration'],
        defaultRoute: '/app/tenant-1/dashboard',
      },
    });

    expect(target).toBe('/app/tenant-1/dashboard');
  });

  it('redirects non-admin internal tenants away from the admin console', () => {
    const target = resolveTenantRouteRedirect({
      pathname: '/app/tenant-1/admin/tenants',
      tenantId: 'tenant-1',
      experience: {
        activeVertical: 'internal',
        allowedNavigation: ['platform_internal'],
        defaultRoute: '/app/tenant-1/dashboard',
      },
    });

    expect(target).toBe('/app/tenant-1/dashboard');
  });

  it('redirects clinic tenants away from admin routes even through the internal namespace', () => {
    const target = resolveTenantRouteRedirect({
      pathname: '/app/tenant-1/admin/tenants',
      tenantId: 'tenant-1',
      experience: {
        activeVertical: 'clinic',
        allowedNavigation: ['dashboard', 'inbox', 'configuration'],
        defaultRoute: '/app/tenant-1/dashboard',
      },
    });

    expect(target).toBe('/app/tenant-1/dashboard');
  });
});
