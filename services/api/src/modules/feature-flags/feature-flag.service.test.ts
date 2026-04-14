import type { ClinicChannel, ClinicModuleEntitlement, ClinicProfile } from '@agentmou/contracts';
import { describe, expect, it } from 'vitest';

import { FEATURE_FLAG_KEYS } from './catalog.js';
import { FeatureFlagService, type FeatureFlagContext } from './feature-flag.service.js';
import { LocalFallbackProvider } from './local-fallback-provider.js';
import { ReflagProvider, type ReflagOverrideResult } from './reflag-provider.js';

function buildModule(
  moduleKey: ClinicModuleEntitlement['moduleKey'],
  overrides: Partial<ClinicModuleEntitlement> = {}
): ClinicModuleEntitlement {
  return {
    id: `module-${moduleKey}`,
    tenantId: 'tenant-1',
    moduleKey,
    status: 'enabled',
    visibleToClient: true,
    planLevel: 'enterprise',
    config: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    enabled: true,
    beta: false,
    displayName: moduleKey,
    description: `${moduleKey} description`,
    requiresConfig: false,
    visibilityState: 'visible',
    visibilityReason: 'active',
    ...overrides,
  };
}

function buildChannel(
  channelType: ClinicChannel['channelType'],
  overrides: Partial<ClinicChannel> = {}
): ClinicChannel {
  return {
    id: `channel-${channelType}`,
    tenantId: 'tenant-1',
    channelType,
    directionPolicy: {
      inboundEnabled: true,
      outboundEnabled: true,
    },
    provider: channelType === 'voice' ? 'twilio_voice' : 'twilio_whatsapp',
    connectorAccountId: null,
    status: 'active',
    phoneNumber: '+34111111111',
    config: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildProfile(overrides: Partial<ClinicProfile> = {}): ClinicProfile {
  return {
    id: 'profile-1',
    tenantId: 'tenant-1',
    vertical: 'clinic_dental',
    specialty: 'implantology',
    displayName: 'Clinica Norte',
    timezone: 'Europe/Madrid',
    businessHours: {},
    defaultInboundChannel: 'whatsapp',
    requiresNewPatientForm: true,
    confirmationPolicy: { enabled: true },
    gapRecoveryPolicy: { enabled: true },
    reactivationPolicy: { enabled: true },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

class StubReflagProvider extends ReflagProvider {
  constructor(private readonly result: ReflagOverrideResult) {
    super({ environment: 'test' });
  }

  override async getOverrides() {
    return this.result;
  }
}

function buildContext(overrides: Partial<FeatureFlagContext> = {}): FeatureFlagContext {
  return {
    tenantId: 'tenant-1',
    activeVertical: 'clinic',
    isPlatformAdminTenant: false,
    plan: 'enterprise',
    modules: [
      buildModule('core_reception'),
      buildModule('voice'),
      buildModule('growth'),
      buildModule('advanced_mode'),
    ],
    channels: [buildChannel('voice'), buildChannel('whatsapp')],
    profile: buildProfile(),
    ...overrides,
  };
}

function createService(params: { localOverrides?: string; reflagResult?: ReflagOverrideResult }) {
  return new FeatureFlagService(
    new LocalFallbackProvider(params.localOverrides),
    new StubReflagProvider(params.reflagResult ?? { overrides: {} })
  );
}

describe('FeatureFlagService', () => {
  it('resolves the baseline product truth when no remote override is present', async () => {
    const service = createService({});
    const result = await service.resolve(buildContext());

    expect(result.flags.voiceInboundEnabled).toBe(true);
    expect(result.flags.voiceOutboundEnabled).toBe(true);
    expect(result.flags.intakeFormsEnabled).toBe(true);
    expect(result.flags.reactivationEnabled).toBe(true);
    expect(result.flags.adminConsoleEnabled).toBe(false);
  });

  it('disables reactivation with a reflag override while keeping baseline modules intact', async () => {
    const service = createService({
      reflagResult: {
        overrides: {
          [FEATURE_FLAG_KEYS.clinicReactivationEnabled]: false,
        },
      },
    });

    const result = await service.resolve(buildContext());

    expect(result.flags.reactivationEnabled).toBe(false);
    expect(result.decisions.reactivationEnabled).toMatchObject({
      enabled: false,
      source: 'reflag',
      reason: 'disabled_by_feature_flag',
      moduleKey: 'growth',
      featureKey: FEATURE_FLAG_KEYS.clinicReactivationEnabled,
    });
  });

  it('keeps outbound voice off without breaking inbound voice when only the outbound flag is disabled', async () => {
    const service = createService({
      reflagResult: {
        overrides: {
          [FEATURE_FLAG_KEYS.clinicVoiceOutboundEnabled]: false,
        },
      },
    });

    const result = await service.resolve(buildContext());

    expect(result.flags.voiceInboundEnabled).toBe(true);
    expect(result.flags.voiceOutboundEnabled).toBe(false);
    expect(result.decisions.voiceOutboundEnabled.reason).toBe('disabled_by_feature_flag');
  });

  it('falls back to the DB baseline when the reflag provider fails', async () => {
    const service = createService({
      reflagResult: {
        overrides: null,
        failureReason: 'reflag_timeout',
      },
    });

    const result = await service.resolve(buildContext());

    expect(result.flags.voiceInboundEnabled).toBe(true);
    expect(result.flags.smartGapFillEnabled).toBe(true);
  });

  it('keeps unsupported fisio features off even when local overrides try to enable them', async () => {
    const service = createService({
      localOverrides: JSON.stringify({
        [FEATURE_FLAG_KEYS.clinicReactivationEnabled]: true,
        [FEATURE_FLAG_KEYS.clinicGapsEnabled]: true,
      }),
    });

    const result = await service.resolve(
      buildContext({
        activeVertical: 'fisio',
        modules: [buildModule('core_reception'), buildModule('growth')],
      })
    );

    expect(result.flags.reactivationEnabled).toBe(false);
    expect(result.flags.smartGapFillEnabled).toBe(false);
  });

  it('disables the admin console for internal tenants when the admin flag is off', async () => {
    const service = createService({
      reflagResult: {
        overrides: {
          [FEATURE_FLAG_KEYS.adminConsoleEnabled]: false,
        },
      },
    });

    const result = await service.resolve(
      buildContext({
        activeVertical: 'internal',
        isPlatformAdminTenant: true,
        modules: [],
        channels: [],
        profile: null,
      })
    );

    expect(result.flags.internalPlatformVisible).toBe(true);
    expect(result.flags.adminConsoleEnabled).toBe(false);
    expect(result.decisions.adminConsoleEnabled.reason).toBe('disabled_by_feature_flag');
  });
});
