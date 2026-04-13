import { describe, expect, it } from 'vitest';

import {
  getTenantDefaultHref,
  getVerticalRegistryEntry,
  resolveRegistryVertical,
} from './vertical-registry';

describe('vertical registry', () => {
  it('resolves internal tenants to the control-plane shell', () => {
    const entry = getVerticalRegistryEntry('internal');

    expect(entry.shellKey).toBe('platform_internal');
    expect(entry.allowedRouteKinds).toEqual(['shared', 'internal']);
    expect(entry.settingsExtensions).toEqual(['internal_defaults', 'internal_approvals']);
    expect(entry.searchMode).toBe('platform_internal');
    expect(getTenantDefaultHref('tenant-internal', 'internal')).toBe(
      '/app/tenant-internal/dashboard'
    );
  });

  it('resolves clinic and fisio tenants through the shared vertical shell family', () => {
    const clinicEntry = getVerticalRegistryEntry({ activeVertical: 'clinic' });
    const fisioEntry = getVerticalRegistryEntry({ activeVertical: 'fisio' });

    expect(clinicEntry.shellKey).toBe('clinic');
    expect(clinicEntry.allowedRouteKinds).toEqual(['shared', 'vertical_shared']);
    expect(clinicEntry.settingsExtensions).toContain('care_profile');
    expect(fisioEntry.shellKey).toBe('fisio');
    expect(fisioEntry.allowedRouteKinds).toEqual(['shared', 'vertical_shared']);
    expect(fisioEntry.settingsExtensions).toEqual(['care_profile', 'care_schedule']);
    expect(fisioEntry.searchMode).toBe('clinic');
  });

  it('falls back to legacy settings when activeVertical is missing', () => {
    expect(resolveRegistryVertical({ verticalClinicUi: true })).toBe('clinic');
    expect(resolveRegistryVertical({ verticalClinicUi: false })).toBe('internal');
  });
});
