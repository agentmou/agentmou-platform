import { describe, expect, it, vi } from 'vitest';

import { mockProvider } from '@/lib/data/mock-provider';

import { buildSearchIndex } from './search-index';

describe('clinic search index', () => {
  it('builds clinic navigation and records without platform-only entries', async () => {
    const items = await buildSearchIndex('demo-workspace', mockProvider, 'clinic');

    expect(items.some((item) => item.label === 'Resumen')).toBe(true);
    expect(items.some((item) => item.label === 'Bandeja')).toBe(true);
    expect(items.some((item) => item.label === 'Marketplace')).toBe(false);
    expect(items.some((item) => item.label === 'Ana Garcia')).toBe(true);
    expect(items.some((item) => item.label.includes('higiene'))).toBe(true);
  });

  it('keeps platform search entries in platform_internal mode', async () => {
    const provider = {
      ...mockProvider,
      getTenantExperience: vi.fn().mockResolvedValue({
        tenantId: 'tenant-internal',
        activeVertical: 'internal',
        shellKey: 'platform_internal',
        defaultRoute: '/app/tenant-internal/dashboard',
        role: 'owner',
        normalizedRole: 'owner',
        permissions: ['view_internal_platform'],
        allowedNavigation: ['platform_internal'],
        modules: [],
        flags: {
          activeVertical: 'internal',
          isPlatformAdminTenant: false,
          verticalClinicUi: false,
          clinicDentalMode: false,
          voiceInboundEnabled: false,
          voiceOutboundEnabled: false,
          whatsappOutboundEnabled: false,
          intakeFormsEnabled: false,
          appointmentConfirmationsEnabled: false,
          smartGapFillEnabled: false,
          reactivationEnabled: false,
          advancedClinicModeEnabled: false,
          internalPlatformVisible: true,
        },
        settingsSections: ['general', 'team', 'integrations', 'plan', 'security'],
        canAccessInternalPlatform: true,
        canAccessAdminConsole: false,
      }),
    };

    const items = await buildSearchIndex('tenant-internal', provider, 'platform_internal');

    expect(items.some((item) => item.label === 'Marketplace')).toBe(true);
    expect(items.some((item) => item.label === 'Runs')).toBe(true);
    expect(items.some((item) => item.href.startsWith('/app/tenant-internal/platform'))).toBe(false);
    expect(items.some((item) => item.href.startsWith('/app/tenant-internal/runs'))).toBe(true);
  });

  it('adds admin console navigation only for tenants that can access it', async () => {
    const provider = {
      ...mockProvider,
      getTenantExperience: vi.fn().mockResolvedValue({
        tenantId: 'tenant-admin',
        activeVertical: 'internal',
        shellKey: 'platform_internal',
        defaultRoute: '/app/tenant-admin/dashboard',
        role: 'owner',
        normalizedRole: 'owner',
        permissions: ['view_internal_platform', 'view_admin_console'],
        allowedNavigation: ['platform_internal', 'admin_console'],
        modules: [],
        flags: {
          activeVertical: 'internal',
          isPlatformAdminTenant: true,
          verticalClinicUi: false,
          clinicDentalMode: false,
          voiceInboundEnabled: false,
          voiceOutboundEnabled: false,
          whatsappOutboundEnabled: false,
          intakeFormsEnabled: false,
          appointmentConfirmationsEnabled: false,
          smartGapFillEnabled: false,
          reactivationEnabled: false,
          advancedClinicModeEnabled: false,
          internalPlatformVisible: true,
        },
        settingsSections: ['general', 'team', 'integrations', 'plan', 'security'],
        canAccessInternalPlatform: true,
        canAccessAdminConsole: true,
      }),
    };

    const items = await buildSearchIndex('tenant-admin', provider, 'platform_internal');

    expect(items.some((item) => item.label === 'Tenants')).toBe(true);
    expect(items.find((item) => item.label === 'Tenants')?.href).toBe(
      '/app/tenant-admin/admin/tenants'
    );
  });
});
