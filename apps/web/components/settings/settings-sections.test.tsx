import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { SettingsRegistryContext } from '@/lib/settings-registry';

import { PlanSettingsSection } from './settings-sections';

function buildContext(): SettingsRegistryContext {
  return {
    providerMode: 'mock',
    experience: {
      tenantId: 'tenant-1',
      tenant: null,
      role: 'admin',
      normalizedRole: 'admin',
      profile: null,
      modules: [
        {
          id: 'module-core',
          tenantId: 'tenant-1',
          moduleKey: 'core_reception',
          status: 'enabled',
          visibleToClient: true,
          planLevel: 'pro',
          config: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          enabled: true,
          beta: false,
          displayName: 'Core Reception',
          description: 'Bandeja, agenda y pacientes.',
          requiresConfig: false,
          visibilityState: 'visible',
          visibilityReason: 'active',
        },
      ],
      channels: [],
      resolvedExperience: {
        tenantId: 'tenant-1',
        activeVertical: 'clinic',
        shellKey: 'clinic',
        defaultRoute: '/app/tenant-1/dashboard',
        role: 'admin',
        normalizedRole: 'admin',
        permissions: [],
        allowedNavigation: ['dashboard', 'configuration'],
        modules: [],
        flags: {
          activeVertical: 'clinic',
          isPlatformAdminTenant: false,
          adminConsoleEnabled: false,
          verticalClinicUi: true,
          clinicDentalMode: true,
          voiceInboundEnabled: true,
          voiceOutboundEnabled: false,
          whatsappOutboundEnabled: true,
          intakeFormsEnabled: true,
          appointmentConfirmationsEnabled: true,
          smartGapFillEnabled: false,
          reactivationEnabled: false,
          advancedClinicModeEnabled: false,
          internalPlatformVisible: false,
        },
        featureDecisions: {
          voiceInboundEnabled: {
            enabled: true,
            source: 'readiness',
            moduleKey: 'voice',
            channelType: 'voice',
          },
          voiceOutboundEnabled: {
            enabled: false,
            source: 'rollout',
            reason: 'disabled_by_feature_flag',
            moduleKey: 'voice',
            channelType: 'voice',
            rolloutKey: 'rollout.clinic.voice.outbound',
          },
          whatsappOutboundEnabled: {
            enabled: true,
            source: 'readiness',
            moduleKey: 'core_reception',
            channelType: 'whatsapp',
          },
          intakeFormsEnabled: {
            enabled: true,
            source: 'readiness',
            moduleKey: 'core_reception',
          },
          appointmentConfirmationsEnabled: {
            enabled: true,
            source: 'readiness',
            moduleKey: 'core_reception',
          },
          smartGapFillEnabled: {
            enabled: false,
            source: 'readiness',
            reason: 'requires_configuration',
            moduleKey: 'growth',
          },
          reactivationEnabled: {
            enabled: false,
            source: 'entitlement',
            reason: 'not_in_plan',
            moduleKey: 'growth',
          },
          advancedClinicModeEnabled: {
            enabled: false,
            source: 'entitlement',
            reason: 'not_in_plan',
            moduleKey: 'advanced_mode',
          },
          internalPlatformVisible: {
            enabled: false,
            source: 'internal_access',
            reason: 'hidden_internal_only',
            moduleKey: 'internal_platform',
          },
          adminConsoleEnabled: {
            enabled: false,
            source: 'internal_access',
            reason: 'hidden_internal_only',
          },
        },
        settingsSections: ['general', 'team', 'integrations', 'plan', 'security'],
        canAccessInternalPlatform: false,
        canAccessAdminConsole: false,
      },
      permissions: [],
      allowedNavigation: ['dashboard', 'configuration'],
      activeVertical: 'clinic',
      shellKey: 'clinic',
      defaultRoute: '/app/tenant-1/dashboard',
      searchMode: 'clinic',
      isClinicTenant: true,
      isSharedVertical: true,
      mode: 'clinic',
      canAccessInternalPlatform: false,
      canAccessAdminConsole: false,
      capabilities: {
        coreReceptionEnabled: true,
        voiceEnabled: true,
        growthEnabled: false,
        formsEnabled: true,
        confirmationsEnabled: true,
        gapsEnabled: false,
        reactivationEnabled: false,
        multiLocationEnabled: false,
        whatsappAvailable: true,
        voiceChannelAvailable: true,
        internalPlatformEnabled: false,
        canAccessInternalPlatform: false,
      },
      hasTenantAccess: true,
      fallbackTenantId: null,
      isLoading: false,
    },
    tenant: {
      id: 'tenant-1',
      name: 'Clinica Norte',
      type: 'business',
      plan: 'pro',
      createdAt: '2026-01-01T00:00:00.000Z',
      ownerId: 'owner-1',
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        settingsVersion: 2,
        verticalClinicUi: true,
        clinicDentalMode: true,
        internalPlatformVisible: true,
      },
    },
    members: [],
    integrations: [],
    billing: {
      plan: 'pro',
      monthlySpend: 420,
      agentsInstalled: 3,
      runsThisMonth: 128,
      currency: 'EUR',
      includedRuns: 500,
    },
    invoices: [],
    securityFindings: [],
    securityPolicies: [],
    auditEvents: [],
    n8nConnection: null,
  };
}

describe('PlanSettingsSection', () => {
  it('renders capability trace and legacy compatibility copy', () => {
    const html = renderToStaticMarkup(<PlanSettingsSection context={buildContext()} />);

    expect(html).toContain('Entitlements y capabilities');
    expect(html).toContain('Estado operativo por capability');
    expect(html).toContain('Voz outbound');
    expect(html).toContain('Rollout');
    expect(html).toContain('Bloqueado por rollout');
    expect(html).toContain('Compatibilidad heredada');
    expect(html).toContain('booleans heredados');
    expect(html).toContain('activeVertical');
  });
});
