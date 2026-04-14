import type {
  ChannelType,
  ClinicChannel,
  ClinicFeatureUnavailableReason,
  ClinicModuleEntitlement,
  ClinicProfile,
  ModuleKey,
  TenantPlan,
  TenantResolvedFlags,
  VerticalKey,
} from '@agentmou/contracts';
import { createServiceLogger } from '@agentmou/observability';

import { getApiConfig } from '../../config.js';
import { FEATURE_FLAG_KEYS, FEATURE_FLAG_KEYS_IN_ORDER, type FeatureFlagKey } from './catalog.js';
import { LocalFallbackProvider } from './local-fallback-provider.js';
import { ReflagProvider } from './reflag-provider.js';

export type FeatureFlagDecisionSource = 'baseline' | 'prerequisite' | 'reflag';

export interface ResolvedFeatureDecision {
  enabled: boolean;
  source: FeatureFlagDecisionSource;
  reason?: ClinicFeatureUnavailableReason;
  moduleKey?: ModuleKey;
  channelType?: ChannelType;
  featureKey?: FeatureFlagKey;
}

export interface ResolvedTenantFeatureDecisions {
  voiceInboundEnabled: ResolvedFeatureDecision;
  voiceOutboundEnabled: ResolvedFeatureDecision;
  whatsappOutboundEnabled: ResolvedFeatureDecision;
  intakeFormsEnabled: ResolvedFeatureDecision;
  appointmentConfirmationsEnabled: ResolvedFeatureDecision;
  smartGapFillEnabled: ResolvedFeatureDecision;
  reactivationEnabled: ResolvedFeatureDecision;
  advancedClinicModeEnabled: ResolvedFeatureDecision;
  internalPlatformVisible: ResolvedFeatureDecision;
  adminConsoleEnabled: ResolvedFeatureDecision;
}

export interface FeatureFlagResolution {
  flags: Pick<
    TenantResolvedFlags,
    | 'voiceInboundEnabled'
    | 'voiceOutboundEnabled'
    | 'whatsappOutboundEnabled'
    | 'intakeFormsEnabled'
    | 'appointmentConfirmationsEnabled'
    | 'smartGapFillEnabled'
    | 'reactivationEnabled'
    | 'advancedClinicModeEnabled'
    | 'internalPlatformVisible'
    | 'adminConsoleEnabled'
  >;
  decisions: ResolvedTenantFeatureDecisions;
}

export interface FeatureFlagContext {
  tenantId: string;
  activeVertical: VerticalKey;
  isPlatformAdminTenant: boolean;
  plan: TenantPlan;
  modules: ClinicModuleEntitlement[];
  channels: ClinicChannel[];
  profile: ClinicProfile | null;
}

function toModuleReason(
  reason?: ClinicModuleEntitlement['visibilityReason']
): ClinicFeatureUnavailableReason {
  return !reason || reason === 'active' ? 'not_in_plan' : reason;
}

function hasConfiguredChannel(channels: ClinicChannel[], channelType: ChannelType) {
  return channels.some((channel) => channel.channelType === channelType);
}

function hasEnabledDirection(
  channels: ClinicChannel[],
  channelType: ChannelType,
  direction: 'inbound' | 'outbound'
) {
  return channels.some((channel) => {
    if (channel.channelType !== channelType || channel.status !== 'active') {
      return false;
    }

    const policyKey = direction === 'inbound' ? 'inboundEnabled' : 'outboundEnabled';
    return channel.directionPolicy?.[policyKey] !== false;
  });
}

function createDisabledDecision(params: {
  source: FeatureFlagDecisionSource;
  reason: ClinicFeatureUnavailableReason;
  moduleKey?: ModuleKey;
  channelType?: ChannelType;
  featureKey?: FeatureFlagKey;
}): ResolvedFeatureDecision {
  return {
    enabled: false,
    source: params.source,
    reason: params.reason,
    moduleKey: params.moduleKey,
    channelType: params.channelType,
    featureKey: params.featureKey,
  };
}

function createEnabledDecision(params: {
  source: FeatureFlagDecisionSource;
  moduleKey?: ModuleKey;
  channelType?: ChannelType;
  featureKey?: FeatureFlagKey;
}): ResolvedFeatureDecision {
  return {
    enabled: true,
    source: params.source,
    moduleKey: params.moduleKey,
    channelType: params.channelType,
    featureKey: params.featureKey,
  };
}

export class FeatureFlagService {
  private readonly logger = createServiceLogger('feature-flags');
  private readonly localFallbackProvider: LocalFallbackProvider;
  private readonly reflagProvider: ReflagProvider;

  constructor(localFallbackProvider?: LocalFallbackProvider, reflagProvider?: ReflagProvider) {
    const config = getApiConfig();
    this.localFallbackProvider =
      localFallbackProvider ?? new LocalFallbackProvider(config.reflagLocalOverridesJson);
    this.reflagProvider =
      reflagProvider ??
      new ReflagProvider({
        sdkKey: config.reflagSdkKey,
        environment: config.reflagEnvironment,
        baseUrl: config.reflagBaseUrl,
      });
  }

  async resolve(context: FeatureFlagContext): Promise<FeatureFlagResolution> {
    const localOverrides = this.localFallbackProvider.getOverrides({
      tenantId: context.tenantId,
      activeVertical: context.activeVertical,
    });

    const remote = Object.keys(localOverrides).length
      ? { overrides: null, failureReason: undefined }
      : await this.reflagProvider.getOverrides({
          tenantId: context.tenantId,
          activeVertical: context.activeVertical,
          isPlatformAdminTenant: context.isPlatformAdminTenant,
          plan: context.plan,
          activeModules: context.modules
            .filter((module) => module.enabled)
            .map((module) => module.moduleKey),
          activeChannels: context.channels
            .filter((channel) => channel.status === 'active')
            .map((channel) => channel.channelType),
          hasClinicProfile: Boolean(context.profile),
        });

    const flagOverrides =
      Object.keys(localOverrides).length > 0 ? localOverrides : (remote.overrides ?? {});

    if (
      !Object.keys(localOverrides).length &&
      remote.failureReason &&
      process.env.NODE_ENV !== 'test'
    ) {
      for (const featureKey of FEATURE_FLAG_KEYS_IN_ORDER) {
        this.logger.warn(
          {
            tenantId: context.tenantId,
            vertical: context.activeVertical,
            featureKey,
            reason: remote.failureReason,
          },
          'feature flag resolver fell back to baseline'
        );
      }
    }

    const moduleByKey = Object.fromEntries(
      context.modules.map((module) => [module.moduleKey, module] as const)
    ) as Partial<Record<ModuleKey, ClinicModuleEntitlement>>;

    const resolveModuleGate = (moduleKey: ModuleKey): ResolvedFeatureDecision | null => {
      const module = moduleByKey[moduleKey];
      if (!module || !module.enabled || module.visibilityReason !== 'active') {
        return createDisabledDecision({
          source: 'baseline',
          reason: toModuleReason(module?.visibilityReason),
          moduleKey,
        });
      }

      return null;
    };

    const applyOverride = (
      decision: ResolvedFeatureDecision,
      featureKey: FeatureFlagKey
    ): ResolvedFeatureDecision => {
      if (!decision.enabled) {
        return decision;
      }

      if (flagOverrides[featureKey] === false) {
        return createDisabledDecision({
          source: 'reflag',
          reason: 'disabled_by_feature_flag',
          moduleKey: decision.moduleKey,
          channelType: decision.channelType,
          featureKey,
        });
      }

      if (flagOverrides[featureKey] === true) {
        return createEnabledDecision({
          source: 'reflag',
          moduleKey: decision.moduleKey,
          channelType: decision.channelType,
          featureKey,
        });
      }

      return decision;
    };

    const voiceBaseline = resolveModuleGate('voice');
    const coreBaseline = resolveModuleGate('core_reception');
    const growthBaseline = resolveModuleGate('growth');
    const advancedBaseline = resolveModuleGate('advanced_mode');

    const voiceInbound = applyOverride(
      voiceBaseline ??
        (hasConfiguredChannel(context.channels, 'voice')
          ? hasEnabledDirection(context.channels, 'voice', 'inbound')
            ? createEnabledDecision({
                source: 'prerequisite',
                moduleKey: 'voice',
                channelType: 'voice',
              })
            : createDisabledDecision({
                source: 'prerequisite',
                reason: 'channel_inactive',
                moduleKey: 'voice',
                channelType: 'voice',
              })
          : createDisabledDecision({
              source: 'prerequisite',
              reason: 'channel_missing',
              moduleKey: 'voice',
              channelType: 'voice',
            })),
      FEATURE_FLAG_KEYS.clinicVoiceEnabled
    );

    const voiceOutboundPrerequisite =
      voiceInbound.enabled && hasEnabledDirection(context.channels, 'voice', 'outbound')
        ? createEnabledDecision({
            source: 'prerequisite',
            moduleKey: 'voice',
            channelType: 'voice',
          })
        : voiceInbound.enabled
          ? createDisabledDecision({
              source: 'prerequisite',
              reason: hasConfiguredChannel(context.channels, 'voice')
                ? 'channel_inactive'
                : 'channel_missing',
              moduleKey: 'voice',
              channelType: 'voice',
            })
          : createDisabledDecision({
              source: voiceInbound.source,
              reason: voiceInbound.reason ?? 'not_in_plan',
              moduleKey: 'voice',
              channelType: 'voice',
              featureKey: voiceInbound.featureKey,
            });

    const voiceOutbound = applyOverride(
      voiceOutboundPrerequisite,
      FEATURE_FLAG_KEYS.clinicVoiceOutboundEnabled
    );

    const whatsappOutbound =
      coreBaseline ??
      (hasEnabledDirection(context.channels, 'whatsapp', 'outbound')
        ? createEnabledDecision({
            source: 'prerequisite',
            moduleKey: 'core_reception',
            channelType: 'whatsapp',
          })
        : createDisabledDecision({
            source: 'prerequisite',
            reason: hasConfiguredChannel(context.channels, 'whatsapp')
              ? 'channel_inactive'
              : 'channel_missing',
            moduleKey: 'core_reception',
            channelType: 'whatsapp',
          }));

    const intakeForms = applyOverride(
      coreBaseline ??
        (context.profile?.requiresNewPatientForm
          ? createEnabledDecision({
              source: 'prerequisite',
              moduleKey: 'core_reception',
            })
          : createDisabledDecision({
              source: 'prerequisite',
              reason: 'requires_configuration',
              moduleKey: 'core_reception',
            })),
      FEATURE_FLAG_KEYS.clinicFormsEnabled
    );

    const appointmentConfirmations = applyOverride(
      coreBaseline ??
        (context.profile?.confirmationPolicy.enabled !== false
          ? createEnabledDecision({
              source: 'prerequisite',
              moduleKey: 'core_reception',
            })
          : createDisabledDecision({
              source: 'prerequisite',
              reason: 'requires_configuration',
              moduleKey: 'core_reception',
            })),
      FEATURE_FLAG_KEYS.clinicConfirmationsEnabled
    );

    const smartGapFill =
      context.activeVertical === 'clinic'
        ? applyOverride(
            growthBaseline ??
              (context.profile?.gapRecoveryPolicy.enabled !== false
                ? createEnabledDecision({
                    source: 'prerequisite',
                    moduleKey: 'growth',
                  })
                : createDisabledDecision({
                    source: 'prerequisite',
                    reason: 'requires_configuration',
                    moduleKey: 'growth',
                  })),
            FEATURE_FLAG_KEYS.clinicGapsEnabled
          )
        : createDisabledDecision({
            source: 'baseline',
            reason: 'not_in_plan',
            moduleKey: 'growth',
          });

    const reactivation =
      context.activeVertical === 'clinic'
        ? applyOverride(
            growthBaseline ??
              (context.profile?.reactivationPolicy.enabled !== false
                ? createEnabledDecision({
                    source: 'prerequisite',
                    moduleKey: 'growth',
                  })
                : createDisabledDecision({
                    source: 'prerequisite',
                    reason: 'requires_configuration',
                    moduleKey: 'growth',
                  })),
            FEATURE_FLAG_KEYS.clinicReactivationEnabled
          )
        : createDisabledDecision({
            source: 'baseline',
            reason: 'not_in_plan',
            moduleKey: 'growth',
          });

    const advancedClinicMode =
      context.activeVertical === 'clinic'
        ? applyOverride(
            advancedBaseline ??
              createEnabledDecision({
                source: 'baseline',
                moduleKey: 'advanced_mode',
              }),
            FEATURE_FLAG_KEYS.clinicAdvancedSettingsEnabled
          )
        : createDisabledDecision({
            source: 'baseline',
            reason: 'not_in_plan',
            moduleKey: 'advanced_mode',
          });

    const internalPlatformVisible =
      context.activeVertical === 'internal'
        ? applyOverride(
            createEnabledDecision({
              source: 'baseline',
              moduleKey: 'internal_platform',
            }),
            FEATURE_FLAG_KEYS.internalPlatformVisible
          )
        : createDisabledDecision({
            source: 'baseline',
            reason: 'hidden_internal_only',
            moduleKey: 'internal_platform',
          });

    const adminConsoleEnabled =
      context.activeVertical === 'internal' && context.isPlatformAdminTenant
        ? applyOverride(
            createEnabledDecision({
              source: 'baseline',
              featureKey: FEATURE_FLAG_KEYS.adminConsoleEnabled,
            }),
            FEATURE_FLAG_KEYS.adminConsoleEnabled
          )
        : createDisabledDecision({
            source: 'baseline',
            reason: 'not_in_plan',
            featureKey: FEATURE_FLAG_KEYS.adminConsoleEnabled,
          });

    const decisions: ResolvedTenantFeatureDecisions = {
      voiceInboundEnabled: voiceInbound,
      voiceOutboundEnabled: voiceOutbound,
      whatsappOutboundEnabled: whatsappOutbound,
      intakeFormsEnabled: intakeForms,
      appointmentConfirmationsEnabled: appointmentConfirmations,
      smartGapFillEnabled: smartGapFill,
      reactivationEnabled: reactivation,
      advancedClinicModeEnabled: advancedClinicMode,
      internalPlatformVisible,
      adminConsoleEnabled,
    };

    return {
      flags: {
        voiceInboundEnabled: decisions.voiceInboundEnabled.enabled,
        voiceOutboundEnabled: decisions.voiceOutboundEnabled.enabled,
        whatsappOutboundEnabled: decisions.whatsappOutboundEnabled.enabled,
        intakeFormsEnabled: decisions.intakeFormsEnabled.enabled,
        appointmentConfirmationsEnabled: decisions.appointmentConfirmationsEnabled.enabled,
        smartGapFillEnabled: decisions.smartGapFillEnabled.enabled,
        reactivationEnabled: decisions.reactivationEnabled.enabled,
        advancedClinicModeEnabled: decisions.advancedClinicModeEnabled.enabled,
        internalPlatformVisible: decisions.internalPlatformVisible.enabled,
        adminConsoleEnabled: decisions.adminConsoleEnabled.enabled,
      },
      decisions,
    };
  }
}
