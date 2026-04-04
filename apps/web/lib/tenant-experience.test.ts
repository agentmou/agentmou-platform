import { describe, expect, it } from 'vitest';

import {
  getPlatformPath,
  isClinicDentalMode,
  isClinicUiEnabled,
  isPlatformPath,
  normalizeMemberRole,
  resolveClinicCapabilities,
} from './tenant-experience';

describe('tenant experience helpers', () => {
  it('normalizes clinic ui settings flags', () => {
    expect(isClinicUiEnabled({ verticalClinicUi: true })).toBe(true);
    expect(isClinicUiEnabled({ verticalClinicUi: false })).toBe(false);
    expect(isClinicDentalMode({ clinicDentalMode: true })).toBe(true);
    expect(isClinicDentalMode({ clinicDentalMode: false })).toBe(false);
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
          id: 'module-core',
          tenantId: 'tenant-1',
          moduleKey: 'core_reception',
          status: 'enabled',
          visibleToClient: true,
          planLevel: 'enterprise',
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
        {
          id: 'module-voice',
          tenantId: 'tenant-1',
          moduleKey: 'voice',
          status: 'enabled',
          visibleToClient: true,
          planLevel: 'enterprise',
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
        {
          id: 'module-growth',
          tenantId: 'tenant-1',
          moduleKey: 'growth',
          status: 'enabled',
          visibleToClient: true,
          planLevel: 'enterprise',
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
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

  it('builds and recognizes platform paths for clinic tenants', () => {
    expect(getPlatformPath('tenant-1', '/runs')).toBe('/app/tenant-1/platform/runs');
    expect(isPlatformPath('/app/tenant-1/platform/runs', 'tenant-1')).toBe(true);
    expect(isPlatformPath('/app/tenant-1/runs', 'tenant-1')).toBe(true);
    expect(isPlatformPath('/app/tenant-1/bandeja', 'tenant-1')).toBe(false);
  });
});
