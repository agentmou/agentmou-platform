import { describe, expect, it } from 'vitest';

import {
  hasClinicNavigationAccess,
  normalizeMemberRole,
  resolveClinicCapabilities,
} from './tenant-experience';
import { isClinicDentalMode, isClinicUiEnabled, resolveActiveVertical } from './tenant-vertical';

describe('tenant experience helpers', () => {
  const baseModule = {
    tenantId: 'tenant-1',
    planLevel: 'enterprise' as const,
    config: {},
    createdAt: '2025-01-15T09:00:00.000Z',
    updatedAt: '2025-01-15T09:00:00.000Z',
    enabled: true,
    beta: false,
    displayName: 'Module',
    description: 'Description',
    requiresConfig: false,
    visibilityState: 'visible' as const,
    visibilityReason: 'active' as const,
  };

  it('normalizes clinic ui settings flags', () => {
    expect(resolveActiveVertical({ activeVertical: 'clinic' })).toBe('clinic');
    expect(resolveActiveVertical({ verticalClinicUi: true })).toBe('clinic');
    expect(resolveActiveVertical({ verticalClinicUi: false })).toBe('internal');
    expect(isClinicUiEnabled({ activeVertical: 'clinic' })).toBe(true);
    expect(isClinicUiEnabled({ activeVertical: 'fisio' })).toBe(false);
    expect(isClinicDentalMode({ activeVertical: 'clinic', clinicDentalMode: true })).toBe(true);
    expect(isClinicDentalMode({ activeVertical: 'clinic', clinicDentalMode: false })).toBe(false);
    expect(isClinicDentalMode({ activeVertical: 'fisio', clinicDentalMode: true })).toBe(false);
  });

  it('normalizes legacy member roles to operator', () => {
    expect(normalizeMemberRole('member')).toBe('operator');
    expect(normalizeMemberRole('admin')).toBe('admin');
    expect(normalizeMemberRole(undefined)).toBeUndefined();
  });

  it('resolves clinic capabilities from modules, channels, profile and role', () => {
    const capabilities = resolveClinicCapabilities({
      role: 'owner',
      profile: {
        id: 'profile-1',
        tenantId: 'tenant-1',
        vertical: 'clinic_dental',
        specialty: 'Odontologia',
        displayName: 'Clinica Sonrisa',
        timezone: 'Europe/Madrid',
        businessHours: {},
        defaultInboundChannel: 'whatsapp',
        requiresNewPatientForm: true,
        confirmationPolicy: {
          enabled: true,
          leadHours: 24,
          escalationDelayHours: 4,
          autoCancelOnDecline: false,
        },
        gapRecoveryPolicy: {
          enabled: true,
          lookaheadHours: 72,
          maxOffersPerGap: 6,
          prioritizeWaitlist: true,
        },
        reactivationPolicy: {
          enabled: true,
          inactivityThresholdDays: 180,
          cooldownDays: 30,
          defaultCampaignType: 'recall',
        },
        createdAt: '2025-01-15T09:00:00.000Z',
        updatedAt: '2025-01-15T09:00:00.000Z',
      },
      modules: [
        {
          ...baseModule,
          id: 'module-core',
          moduleKey: 'core_reception',
          status: 'enabled',
          visibleToClient: true,
          displayName: 'Core Reception',
        },
        {
          ...baseModule,
          id: 'module-voice',
          moduleKey: 'voice',
          status: 'enabled',
          visibleToClient: true,
          displayName: 'Voice',
        },
        {
          ...baseModule,
          id: 'module-growth',
          moduleKey: 'growth',
          status: 'enabled',
          visibleToClient: true,
          displayName: 'Growth',
        },
        {
          ...baseModule,
          id: 'module-internal',
          moduleKey: 'internal_platform',
          status: 'enabled',
          visibleToClient: false,
          displayName: 'Internal Platform',
          visibilityState: 'internal_only',
          visibilityReason: 'hidden_internal_only',
        },
      ],
      channels: [
        {
          id: 'channel-wa',
          tenantId: 'tenant-1',
          channelType: 'whatsapp',
          provider: 'twilio_whatsapp',
          status: 'active',
          directionPolicy: {
            inboundEnabled: true,
            outboundEnabled: true,
            fallbackToHuman: true,
          },
          phoneNumber: '+34910000001',
          connectorAccountId: null,
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
        {
          id: 'channel-voice',
          tenantId: 'tenant-1',
          channelType: 'voice',
          provider: 'twilio_voice',
          status: 'active',
          directionPolicy: {
            inboundEnabled: true,
            outboundEnabled: true,
            fallbackToHuman: true,
          },
          phoneNumber: '+34910000002',
          connectorAccountId: null,
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
      ],
    });

    expect(capabilities.coreReceptionEnabled).toBe(true);
    expect(capabilities.voiceEnabled).toBe(true);
    expect(capabilities.growthEnabled).toBe(true);
    expect(capabilities.formsEnabled).toBe(true);
    expect(capabilities.confirmationsEnabled).toBe(true);
    expect(capabilities.gapsEnabled).toBe(true);
    expect(capabilities.reactivationEnabled).toBe(true);
    expect(capabilities.whatsappAvailable).toBe(true);
    expect(capabilities.voiceChannelAvailable).toBe(true);
    expect(capabilities.canAccessInternalPlatform).toBe(true);
  });

  it('prefers resolved navigation over fallback capabilities when available', () => {
    expect(
      hasClinicNavigationAccess(
        {
          allowedNavigation: ['dashboard', 'patients'],
          capabilities: {
            coreReceptionEnabled: true,
            voiceEnabled: true,
            growthEnabled: true,
            formsEnabled: true,
            confirmationsEnabled: true,
            gapsEnabled: true,
            reactivationEnabled: true,
            multiLocationEnabled: false,
            whatsappAvailable: true,
            voiceChannelAvailable: true,
            internalPlatformEnabled: true,
            canAccessInternalPlatform: true,
          },
        },
        'configuration'
      )
    ).toBe(false);
  });
});
