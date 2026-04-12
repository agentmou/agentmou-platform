import { describe, expect, it } from 'vitest';

import {
  resolveClinicExperience,
  resolveClinicModuleEntitlements,
  resolveClinicPermissions,
  resolveTenantExperience,
} from './clinic-entitlements.js';

const baseContext = {
  tenantId: 'tenant-1',
  plan: 'starter' as const,
  settings: {
    timezone: 'Europe/Madrid',
    defaultHITL: false,
    logRetentionDays: 30,
    memoryRetentionDays: 7,
    activeVertical: 'clinic' as const,
    isPlatformAdminTenant: false,
    settingsVersion: 2,
    verticalClinicUi: true,
    clinicDentalMode: true,
    internalPlatformVisible: true,
  },
  profile: {
    id: 'profile-1',
    tenantId: 'tenant-1',
    vertical: 'clinic_dental' as const,
    specialty: 'odontologia',
    displayName: 'Clinica Sonrisa',
    timezone: 'Europe/Madrid',
    businessHours: {},
    defaultInboundChannel: 'whatsapp' as const,
    requiresNewPatientForm: true,
    confirmationPolicy: { enabled: true },
    gapRecoveryPolicy: { enabled: true },
    reactivationPolicy: { enabled: true },
    createdAt: '2025-01-15T09:00:00.000Z',
    updatedAt: '2025-01-15T09:00:00.000Z',
  },
  modules: [],
  channels: [
    {
      id: 'channel-wa',
      tenantId: 'tenant-1',
      channelType: 'whatsapp' as const,
      directionPolicy: { inboundEnabled: true, outboundEnabled: true },
      provider: 'twilio_whatsapp',
      connectorAccountId: null,
      status: 'active' as const,
      phoneNumber: '+34123456789',
      config: {},
      createdAt: '2025-01-15T09:00:00.000Z',
      updatedAt: '2025-01-15T09:00:00.000Z',
    },
  ],
};

describe('clinic entitlements', () => {
  it('derives plan baselines and visibility reasons for modules not in plan', () => {
    const modules = resolveClinicModuleEntitlements(baseContext);

    expect(modules.find((module) => module.moduleKey === 'core_reception')).toMatchObject({
      status: 'enabled',
      visibilityReason: 'active',
    });
    expect(modules.find((module) => module.moduleKey === 'voice')).toMatchObject({
      status: 'disabled',
      visibilityReason: 'not_in_plan',
    });
    expect(modules.find((module) => module.moduleKey === 'internal_platform')).toMatchObject({
      visibilityReason: 'hidden_internal_only',
      visibilityState: 'internal_only',
    });
  });

  it('keeps clinic tenants out of the internal platform even when the module is enabled', () => {
    const experience = resolveClinicExperience({
      ...baseContext,
      tenantRole: 'admin',
      modules: [
        {
          id: 'module-internal',
          tenantId: 'tenant-1',
          moduleKey: 'internal_platform',
          status: 'enabled',
          visibleToClient: false,
          planLevel: 'enterprise',
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
      ],
    });

    expect(experience.permissions).not.toContain('view_internal_platform');
    expect(experience.allowedNavigation).not.toContain('platform_internal');
    expect(experience.isInternalUser).toBe(false);
    expect(experience.flags.internalPlatformVisible).toBe(false);
  });

  it('keeps operators out of the internal platform permission set', () => {
    const permissions = resolveClinicPermissions({
      tenantRole: 'operator',
      canAccessInternalPlatform: true,
    });

    expect(permissions).not.toContain('view_internal_platform');
    expect(permissions).toContain('manage_inbox');
  });

  it('resolves a generic internal tenant experience for platform admin workspaces', () => {
    const experience = resolveTenantExperience({
      ...baseContext,
      tenantRole: 'owner',
      profile: null,
      modules: [],
      channels: [],
      settings: {
        ...baseContext.settings,
        activeVertical: 'internal',
        isPlatformAdminTenant: true,
        verticalClinicUi: false,
        clinicDentalMode: false,
        internalPlatformVisible: false,
      },
    });

    expect(experience.shellKey).toBe('platform_internal');
    expect(experience.permissions).toContain('view_internal_platform');
    expect(experience.permissions).toContain('view_admin_console');
    expect(experience.canAccessAdminConsole).toBe(true);
  });

  it('returns a minimal fisio tenant experience without clinic shell flags', () => {
    const experience = resolveTenantExperience({
      ...baseContext,
      tenantRole: 'admin',
      profile: null,
      modules: [],
      channels: [],
      settings: {
        ...baseContext.settings,
        activeVertical: 'fisio',
        verticalClinicUi: false,
        clinicDentalMode: false,
        internalPlatformVisible: false,
      },
    });

    expect(experience.activeVertical).toBe('fisio');
    expect(experience.shellKey).toBe('fisio');
    expect(experience.allowedNavigation).toEqual(['dashboard', 'configuration']);
    expect(experience.flags.verticalClinicUi).toBe(false);
  });
});
