import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadContextMock } = vi.hoisted(() => ({
  loadContextMock: vi.fn(),
}));

vi.mock('./clinic-experience.repository.js', () => ({
  ClinicExperienceRepository: vi.fn().mockImplementation(() => ({
    loadContext: loadContextMock,
  })),
}));

function buildContext() {
  return {
    tenantId: 'tenant-1',
    plan: 'enterprise' as const,
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
      internalPlatformVisible: false,
    },
    profile: {
      id: 'profile-1',
      tenantId: 'tenant-1',
      vertical: 'clinic_dental' as const,
      specialty: 'implantology',
      displayName: 'Clinica Norte',
      timezone: 'Europe/Madrid',
      businessHours: {},
      defaultInboundChannel: 'whatsapp' as const,
      requiresNewPatientForm: true,
      confirmationPolicy: { enabled: true },
      gapRecoveryPolicy: { enabled: true },
      reactivationPolicy: { enabled: true },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    modules: [
      {
        id: 'module-core',
        tenantId: 'tenant-1',
        moduleKey: 'core_reception' as const,
        status: 'enabled' as const,
        visibleToClient: true,
        planLevel: 'enterprise' as const,
        config: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'module-voice',
        tenantId: 'tenant-1',
        moduleKey: 'voice' as const,
        status: 'enabled' as const,
        visibleToClient: true,
        planLevel: 'enterprise' as const,
        config: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'module-growth',
        tenantId: 'tenant-1',
        moduleKey: 'growth' as const,
        status: 'enabled' as const,
        visibleToClient: true,
        planLevel: 'enterprise' as const,
        config: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    channels: [
      {
        id: 'channel-wa',
        tenantId: 'tenant-1',
        channelType: 'whatsapp' as const,
        directionPolicy: { inboundEnabled: true, outboundEnabled: true },
        provider: 'twilio_whatsapp' as const,
        connectorAccountId: null,
        status: 'active' as const,
        phoneNumber: '+34111111111',
        config: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'channel-voice',
        tenantId: 'tenant-1',
        channelType: 'voice' as const,
        directionPolicy: { inboundEnabled: true, outboundEnabled: true },
        provider: 'twilio_voice' as const,
        connectorAccountId: null,
        status: 'active' as const,
        phoneNumber: '+34122222222',
        config: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };
}

describe('clinic feature access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.REFLAG_LOCAL_OVERRIDES_JSON;
  });

  it('returns disabled_by_feature_flag when reactivation is turned off by local overrides', async () => {
    process.env.REFLAG_LOCAL_OVERRIDES_JSON = JSON.stringify({
      'clinic.reactivation.enabled': false,
    });
    loadContextMock.mockResolvedValue(buildContext());

    const { assertClinicFeatureAvailable } = await import('./clinic-access.js');

    await expect(
      assertClinicFeatureAvailable('tenant-1', 'reactivation', 'admin')
    ).rejects.toMatchObject({
      statusCode: 409,
      body: {
        reason: 'disabled_by_feature_flag',
        moduleKey: 'growth',
      },
    });
  }, 10_000);

  it('keeps channel reasons ahead of feature flag overrides for voice outbound', async () => {
    process.env.REFLAG_LOCAL_OVERRIDES_JSON = JSON.stringify({
      'clinic.voice.outbound.enabled': false,
    });
    loadContextMock.mockResolvedValue({
      ...buildContext(),
      channels: [
        {
          id: 'channel-voice',
          tenantId: 'tenant-1',
          channelType: 'voice',
          directionPolicy: { inboundEnabled: true, outboundEnabled: false },
          provider: 'twilio_voice',
          connectorAccountId: null,
          status: 'active',
          phoneNumber: '+34122222222',
          config: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const { assertClinicFeatureAvailable } = await import('./clinic-access.js');

    await expect(
      assertClinicFeatureAvailable('tenant-1', 'voice_outbound', 'admin')
    ).rejects.toMatchObject({
      statusCode: 409,
      body: {
        reason: 'channel_inactive',
        moduleKey: 'voice',
        channelType: 'voice',
      },
    });
  });
});
