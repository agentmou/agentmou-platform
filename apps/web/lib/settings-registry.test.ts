import { describe, expect, it } from 'vitest';

import {
  getSettingsGroupTitle,
  getVisibleSettingsSections,
  resolveActiveSettingsSection,
  type SettingsRegistryContext,
} from './settings-registry';

function buildContext(
  overrides: Partial<SettingsRegistryContext['experience']['resolvedExperience']> & {
    activeVertical: SettingsRegistryContext['experience']['activeVertical'];
    settingsSections: NonNullable<
      SettingsRegistryContext['experience']['resolvedExperience']
    >['settingsSections'];
    capabilities?: Partial<SettingsRegistryContext['experience']['capabilities']>;
  }
): SettingsRegistryContext {
  const { activeVertical, settingsSections, capabilities, ...experienceOverrides } = overrides;

  return {
    providerMode: 'mock',
    experience: {
      tenantId: 'tenant-1',
      tenant: null,
      role: 'admin',
      normalizedRole: 'admin',
      profile: null,
      modules: [],
      channels: [],
      resolvedExperience: {
        tenantId: 'tenant-1',
        activeVertical,
        shellKey:
          activeVertical === 'internal'
            ? 'platform_internal'
            : activeVertical === 'fisio'
              ? 'fisio'
              : 'clinic',
        defaultRoute: '/app/tenant-1/dashboard',
        permissions: [],
        allowedNavigation: ['dashboard', 'configuration'],
        modules: [],
        flags: {
          activeVertical,
          isPlatformAdminTenant: activeVertical === 'internal',
          adminConsoleEnabled: activeVertical === 'internal',
          verticalClinicUi: activeVertical === 'clinic',
          clinicDentalMode: activeVertical === 'clinic',
          voiceInboundEnabled: false,
          voiceOutboundEnabled: false,
          whatsappOutboundEnabled: true,
          intakeFormsEnabled: true,
          appointmentConfirmationsEnabled: true,
          smartGapFillEnabled: true,
          reactivationEnabled: true,
          advancedClinicModeEnabled: false,
          internalPlatformVisible: activeVertical === 'internal',
        },
        settingsSections,
        canAccessInternalPlatform: activeVertical === 'internal',
        canAccessAdminConsole: activeVertical === 'internal',
        ...experienceOverrides,
      },
      permissions: [],
      allowedNavigation: ['dashboard', 'configuration'],
      activeVertical,
      shellKey:
        activeVertical === 'internal'
          ? 'platform_internal'
          : activeVertical === 'fisio'
            ? 'fisio'
            : 'clinic',
      defaultRoute: '/app/tenant-1/dashboard',
      searchMode: activeVertical === 'internal' ? 'platform_internal' : 'clinic',
      isClinicTenant: activeVertical === 'clinic',
      isSharedVertical: activeVertical !== 'internal',
      mode:
        activeVertical === 'internal'
          ? 'platform_internal'
          : activeVertical === 'fisio'
            ? 'fisio'
            : 'clinic',
      canAccessInternalPlatform: activeVertical === 'internal',
      canAccessAdminConsole: activeVertical === 'internal',
      capabilities: {
        coreReceptionEnabled: true,
        voiceEnabled: false,
        growthEnabled: true,
        formsEnabled: true,
        confirmationsEnabled: true,
        gapsEnabled: true,
        reactivationEnabled: true,
        multiLocationEnabled: false,
        whatsappAvailable: true,
        voiceChannelAvailable: false,
        internalPlatformEnabled: activeVertical === 'internal',
        canAccessInternalPlatform: activeVertical === 'internal',
        ...capabilities,
      },
      hasTenantAccess: true,
      fallbackTenantId: 'tenant-1',
      isLoading: false,
    },
    tenant: {
      id: 'tenant-1',
      name: 'Tenant 1',
      type: 'business',
      plan: 'pro',
      createdAt: '2026-01-01T00:00:00.000Z',
      ownerId: 'owner-1',
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        activeVertical,
        isPlatformAdminTenant: activeVertical === 'internal',
        settingsVersion: 2,
        verticalClinicUi: activeVertical === 'clinic',
        clinicDentalMode: activeVertical === 'clinic',
        internalPlatformVisible: activeVertical === 'internal',
      },
    },
    members: [],
    integrations: [],
    billing: {
      plan: 'pro',
      monthlySpend: 0,
      agentsInstalled: 0,
      runsThisMonth: 0,
    },
    invoices: [],
    securityFindings: [],
    securityPolicies: [],
    auditEvents: [],
    n8nConnection: null,
  };
}

describe('settings registry', () => {
  it('keeps the clinic surface on the shared base plus care extensions', () => {
    const sections = getVisibleSettingsSections(
      buildContext({
        activeVertical: 'clinic',
        settingsSections: [
          'general',
          'team',
          'integrations',
          'plan',
          'security',
          'care_profile',
          'care_schedule',
          'care_services',
          'care_forms',
          'care_confirmations',
          'care_gap_recovery',
          'care_reactivation',
        ],
      })
    );

    expect(sections.map((section) => section.key)).toEqual([
      'general',
      'team',
      'integrations',
      'plan',
      'security',
      'care_profile',
      'care_schedule',
      'care_services',
      'care_forms',
      'care_confirmations',
      'care_gap_recovery',
      'care_reactivation',
    ]);
  });

  it('keeps fisio limited to the shared base plus the prepared care subset', () => {
    const sections = getVisibleSettingsSections(
      buildContext({
        activeVertical: 'fisio',
        settingsSections: [
          'general',
          'team',
          'integrations',
          'plan',
          'security',
          'care_profile',
          'care_schedule',
        ],
      })
    );

    expect(sections.map((section) => section.key)).toEqual([
      'general',
      'team',
      'integrations',
      'plan',
      'security',
      'care_profile',
      'care_schedule',
    ]);
  });

  it('routes internal tenants through the shared base and internal extensions', () => {
    const sections = getVisibleSettingsSections(
      buildContext({
        activeVertical: 'internal',
        settingsSections: [
          'general',
          'team',
          'integrations',
          'plan',
          'security',
          'internal_defaults',
          'internal_approvals',
        ],
      })
    );

    expect(sections.map((section) => section.key)).toEqual([
      'general',
      'team',
      'integrations',
      'plan',
      'security',
      'internal_defaults',
      'internal_approvals',
    ]);
  });

  it('falls back to the first visible section when the requested query is invalid', () => {
    const sections = getVisibleSettingsSections(
      buildContext({
        activeVertical: 'clinic',
        settingsSections: ['general', 'team', 'integrations', 'plan', 'security'],
      })
    );

    expect(resolveActiveSettingsSection(sections, 'care_forms')?.key).toBe('general');
    expect(resolveActiveSettingsSection(sections, 'plan')?.key).toBe('plan');
  });

  it('uses shared-care copy tokens for clinic settings groups', () => {
    expect(getSettingsGroupTitle('base', 'clinic')).toBe('Base común');
    expect(getSettingsGroupTitle('care', 'clinic')).toBe('Operación asistencial');
    expect(getSettingsGroupTitle('internal', 'internal')).toBe('Operación interna');

    const sections = getVisibleSettingsSections(
      buildContext({
        activeVertical: 'clinic',
        settingsSections: ['general', 'care_schedule', 'care_reactivation'],
      })
    );

    expect(sections.map((section) => section.title)).toEqual([
      'General',
      'Agenda y reglas',
      'Reactivación',
    ]);
  });

  it('hides capability-gated care sections even when the experience lists them', () => {
    const sections = getVisibleSettingsSections(
      buildContext({
        activeVertical: 'clinic',
        settingsSections: [
          'general',
          'team',
          'integrations',
          'plan',
          'security',
          'care_forms',
          'care_confirmations',
          'care_gap_recovery',
          'care_reactivation',
        ],
        capabilities: {
          coreReceptionEnabled: true,
          voiceEnabled: false,
          growthEnabled: true,
          formsEnabled: false,
          confirmationsEnabled: false,
          gapsEnabled: false,
          reactivationEnabled: false,
          multiLocationEnabled: false,
          whatsappAvailable: true,
          voiceChannelAvailable: false,
          internalPlatformEnabled: false,
          canAccessInternalPlatform: false,
        },
      })
    );

    expect(sections.map((section) => section.key)).toEqual([
      'general',
      'team',
      'integrations',
      'plan',
      'security',
    ]);
  });
});
