import { describe, expect, it } from 'vitest';

import {
  ADMIN_TENANTS_DEFAULT_STATE,
  buildAdminTenantsHref,
  hasActiveAdminTenantsFilters,
  parseAdminTenantsSearchParams,
  serializeAdminTenantsState,
  toAdminTenantsRequestFilters,
} from './tenants-url-state';

describe('admin tenants URL state', () => {
  it('parses an empty querystring to the canonical default state', () => {
    expect(parseAdminTenantsSearchParams(new URLSearchParams())).toEqual(
      ADMIN_TENANTS_DEFAULT_STATE
    );
  });

  it('serializes a fully-populated state and round-trips', () => {
    const state = {
      q: 'acme',
      plan: 'pro' as const,
      vertical: 'clinic' as const,
      type: 'admin' as const,
      sortBy: 'name' as const,
      sortDir: 'asc' as const,
    };

    const serialized = serializeAdminTenantsState(state);
    expect(serialized.toString()).toBe(
      'q=acme&plan=pro&vertical=clinic&type=admin&sortBy=name&sortDir=asc'
    );

    expect(parseAdminTenantsSearchParams(new URLSearchParams(serialized.toString()))).toEqual(
      state
    );
  });

  it('drops default and unrecognised filter values when serializing', () => {
    const state = {
      q: '   ',
      plan: 'all' as const,
      vertical: 'all' as const,
      type: 'all' as const,
    };

    expect(serializeAdminTenantsState(state).toString()).toBe('');
  });

  it('rejects garbage filter values during parsing', () => {
    const params = new URLSearchParams('plan=cafe&vertical=spaceship&type=ufo&sortBy=qty');
    const parsed = parseAdminTenantsSearchParams(params);

    expect(parsed.plan).toBe('all');
    expect(parsed.vertical).toBe('all');
    expect(parsed.type).toBe('all');
    expect(parsed.sortBy).toBeUndefined();
  });

  it('maps the URL state to provider request filters', () => {
    const filters = toAdminTenantsRequestFilters(
      {
        q: 'acme',
        plan: 'pro',
        vertical: 'clinic',
        type: 'client',
        sortBy: 'plan',
        sortDir: 'desc',
      },
      { limit: 50 }
    );

    expect(filters).toEqual({
      q: 'acme',
      plan: 'pro',
      vertical: 'clinic',
      isPlatformAdminTenant: false,
      sortBy: 'plan',
      sortDir: 'desc',
      limit: 50,
    });
  });

  it('produces a path with no querystring when no filters are active', () => {
    expect(buildAdminTenantsHref('/admin/tenants', ADMIN_TENANTS_DEFAULT_STATE)).toBe(
      '/admin/tenants'
    );
  });

  it('detects active filters', () => {
    expect(hasActiveAdminTenantsFilters(ADMIN_TENANTS_DEFAULT_STATE)).toBe(false);
    expect(hasActiveAdminTenantsFilters({ ...ADMIN_TENANTS_DEFAULT_STATE, q: 'a' })).toBe(true);
    expect(hasActiveAdminTenantsFilters({ ...ADMIN_TENANTS_DEFAULT_STATE, plan: 'pro' })).toBe(
      true
    );
  });
});
