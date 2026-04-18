import type {
  ChannelType,
  ClinicChannel,
  ClinicModuleEntitlement,
  ClinicProfile,
  ModuleKey,
  PlanEntitlements,
  PlanFlagKey,
  TenantFeatureDecisionReason,
  TenantPlan,
  TenantResolvedFlags,
  VerticalKey,
} from '@agentmou/contracts';
import { createServiceLogger } from '@agentmou/observability';

import { getApiConfig } from '../../config.js';
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_KEYS_IN_ORDER,
  PLAN_FLAG_CATALOG,
  planSatisfies,
  type FeatureFlagKey,
} from './catalog.js';
import { LocalFallbackProvider } from './local-fallback-provider.js';
import { ReflagProvider } from './reflag-provider.js';

export type FeatureFlagDecisionSource = 'entitlement' | 'readiness' | 'rollout';

export interface ResolvedFeatureDecision {
  enabled: boolean;
  source: FeatureFlagDecisionSource;
  reason?: TenantFeatureDecisionReason;
  moduleKey?: ModuleKey;
  channelType?: ChannelType;
  rolloutKey?: FeatureFlagKey;
  detail?: string;
}

export interface ResolvedProductFeatureDecisions {
  voiceInboundEnabled: ResolvedFeatureDecision;
  voiceOutboundEnabled: ResolvedFeatureDecision;
  whatsappOutboundEnabled: ResolvedFeatureDecision;
  intakeFormsEnabled: ResolvedFeatureDecision;
  appointmentConfirmationsEnabled: ResolvedFeatureDecision;
  smartGapFillEnabled: ResolvedFeatureDecision;
  reactivationEnabled: ResolvedFeatureDecision;
  advancedClinicModeEnabled: ResolvedFeatureDecision;
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
  >;
  decisions: ResolvedProductFeatureDecisions;
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

export type PlanEntitlementDecisionSource = 'plan-baseline' | 'reflag-plan-override';

export interface PlanEntitlementDecision {
  key: PlanFlagKey;
  enabled: boolean;
  source: PlanEntitlementDecisionSource;
  minPlan: TenantPlan;
  moduleKey?: ModuleKey;
  detail?: string;
}

export interface PlanEntitlementResolution {
  entitlements: PlanEntitlements;
  decisions: PlanEntitlementDecision[];
}

export interface PlanEntitlementContext {
  tenantId: string;
  activeVertical: VerticalKey;
  isPlatformAdminTenant: boolean;
  plan: TenantPlan;
  /** Currently enabled `ModuleKey`s, used to enrich the Reflag context. */
  activeModuleKeys?: readonly ModuleKey[];
}

function toModuleReason(
  reason?: ClinicModuleEntitlement['visibilityReason']
): TenantFeatureDecisionReason {
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
  reason: TenantFeatureDecisionReason;
  moduleKey?: ModuleKey;
  channelType?: ChannelType;
  rolloutKey?: FeatureFlagKey;
  detail?: string;
}): ResolvedFeatureDecision {
  return {
    enabled: false,
    source: params.source,
    reason: params.reason,
    moduleKey: params.moduleKey,
    channelType: params.channelType,
    rolloutKey: params.rolloutKey,
    detail: params.detail,
  };
}

function createEnabledDecision(params: {
  source: FeatureFlagDecisionSource;
  moduleKey?: ModuleKey;
  channelType?: ChannelType;
  rolloutKey?: FeatureFlagKey;
  detail?: string;
}): ResolvedFeatureDecision {
  return {
    enabled: true,
    source: params.source,
    moduleKey: params.moduleKey,
    channelType: params.channelType,
    rolloutKey: params.rolloutKey,
    detail: params.detail,
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
          source: 'entitlement',
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
          source: 'rollout',
          reason: 'disabled_by_feature_flag',
          moduleKey: decision.moduleKey,
          channelType: decision.channelType,
          rolloutKey: featureKey,
        });
      }

      if (flagOverrides[featureKey] === true) {
        return createEnabledDecision({
          source: 'rollout',
          moduleKey: decision.moduleKey,
          channelType: decision.channelType,
          rolloutKey: featureKey,
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
                source: 'readiness',
                moduleKey: 'voice',
                channelType: 'voice',
              })
            : createDisabledDecision({
                source: 'readiness',
                reason: 'channel_inactive',
                moduleKey: 'voice',
                channelType: 'voice',
              })
          : createDisabledDecision({
              source: 'readiness',
              reason: 'channel_missing',
              moduleKey: 'voice',
              channelType: 'voice',
            })),
      FEATURE_FLAG_KEYS.clinicVoiceInboundRollout
    );

    const voiceOutboundPrerequisite =
      voiceInbound.enabled && hasEnabledDirection(context.channels, 'voice', 'outbound')
        ? createEnabledDecision({
            source: 'readiness',
            moduleKey: 'voice',
            channelType: 'voice',
          })
        : voiceInbound.enabled
          ? createDisabledDecision({
              source: 'readiness',
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
              rolloutKey: voiceInbound.rolloutKey,
            });

    const voiceOutbound = applyOverride(
      voiceOutboundPrerequisite,
      FEATURE_FLAG_KEYS.clinicVoiceOutboundRollout
    );

    const whatsappOutbound =
      coreBaseline ??
      (hasEnabledDirection(context.channels, 'whatsapp', 'outbound')
        ? createEnabledDecision({
            source: 'readiness',
            moduleKey: 'core_reception',
            channelType: 'whatsapp',
          })
        : createDisabledDecision({
            source: 'readiness',
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
              source: 'readiness',
              moduleKey: 'core_reception',
            })
          : createDisabledDecision({
              source: 'readiness',
              reason: 'requires_configuration',
              moduleKey: 'core_reception',
            })),
      FEATURE_FLAG_KEYS.clinicFormsRollout
    );

    const appointmentConfirmations = applyOverride(
      coreBaseline ??
        (context.profile?.confirmationPolicy.enabled !== false
          ? createEnabledDecision({
              source: 'readiness',
              moduleKey: 'core_reception',
            })
          : createDisabledDecision({
              source: 'readiness',
              reason: 'requires_configuration',
              moduleKey: 'core_reception',
            })),
      FEATURE_FLAG_KEYS.clinicConfirmationsRollout
    );

    const smartGapFill =
      context.activeVertical === 'clinic'
        ? applyOverride(
            growthBaseline ??
              (context.profile?.gapRecoveryPolicy.enabled !== false
                ? createEnabledDecision({
                    source: 'readiness',
                    moduleKey: 'growth',
                  })
                : createDisabledDecision({
                    source: 'readiness',
                    reason: 'requires_configuration',
                    moduleKey: 'growth',
                  })),
            FEATURE_FLAG_KEYS.clinicGapRecoveryRollout
          )
        : createDisabledDecision({
            source: 'entitlement',
            reason: 'not_in_plan',
            moduleKey: 'growth',
          });

    const reactivation =
      context.activeVertical === 'clinic'
        ? applyOverride(
            growthBaseline ??
              (context.profile?.reactivationPolicy.enabled !== false
                ? createEnabledDecision({
                    source: 'readiness',
                    moduleKey: 'growth',
                  })
                : createDisabledDecision({
                    source: 'readiness',
                    reason: 'requires_configuration',
                    moduleKey: 'growth',
                  })),
            FEATURE_FLAG_KEYS.clinicReactivationRollout
          )
        : createDisabledDecision({
            source: 'entitlement',
            reason: 'not_in_plan',
            moduleKey: 'growth',
          });

    const advancedClinicMode =
      context.activeVertical === 'clinic'
        ? applyOverride(
            advancedBaseline ??
              createEnabledDecision({
                source: 'entitlement',
                moduleKey: 'advanced_mode',
              }),
            FEATURE_FLAG_KEYS.clinicAdvancedSettingsRollout
          )
        : createDisabledDecision({
            source: 'entitlement',
            reason: 'not_in_plan',
            moduleKey: 'advanced_mode',
          });

    const decisions: ResolvedProductFeatureDecisions = {
      voiceInboundEnabled: voiceInbound,
      voiceOutboundEnabled: voiceOutbound,
      whatsappOutboundEnabled: whatsappOutbound,
      intakeFormsEnabled: intakeForms,
      appointmentConfirmationsEnabled: appointmentConfirmations,
      smartGapFillEnabled: smartGapFill,
      reactivationEnabled: reactivation,
      advancedClinicModeEnabled: advancedClinicMode,
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
      },
      decisions,
    };
  }

  /**
   * Resolve the **commercial entitlements** (`plan.*` namespace) for a tenant.
   *
   * Resolution order per flag:
   *   1. Plan baseline — `tenant.plan >= minPlan` and the vertical is supported.
   *   2. Reflag override — if Reflag returns a boolean for the `plan.*` key,
   *      it wins (used for per-tenant overrides like "enable Voice for this
   *      clinic even though they are on Starter").
   *
   * The returned `decisions` array is a trace for the admin UI; the product
   * runtime consumes only `entitlements`.
   *
   * This method is the **only** authorized consumer of `plan.*` keys.
   * `rollout.*` keys remain the job of `resolve()`.
   */
  async resolvePlanEntitlements(
    context: PlanEntitlementContext
  ): Promise<PlanEntitlementResolution> {
    const localOverrides = this.localFallbackProvider.getOverrides({
      tenantId: context.tenantId,
      activeVertical: context.activeVertical,
    }) as Partial<Record<FeatureFlagKey | PlanFlagKey, boolean>>;

    const hasLocalOverrides = Object.keys(localOverrides).length > 0;
    const remote = hasLocalOverrides
      ? { overrides: null as Partial<Record<string, boolean>> | null, failureReason: undefined }
      : await this.reflagProvider.getOverrides({
          tenantId: context.tenantId,
          activeVertical: context.activeVertical,
          isPlatformAdminTenant: context.isPlatformAdminTenant,
          plan: context.plan,
          activeModules: [...(context.activeModuleKeys ?? [])],
          activeChannels: [],
          hasClinicProfile: false,
        });

    const overrides: Partial<Record<string, boolean>> = hasLocalOverrides
      ? localOverrides
      : (remote.overrides ?? {});

    const entitlements: Partial<PlanEntitlements> = {};
    const decisions: PlanEntitlementDecision[] = [];

    for (const entry of PLAN_FLAG_CATALOG) {
      const baseline =
        entry.supportedVerticals.includes(context.activeVertical) &&
        planSatisfies(context.plan, entry.minPlan);
      const override = overrides[entry.key];

      if (typeof override === 'boolean') {
        entitlements[entry.key] = override;
        decisions.push({
          key: entry.key,
          enabled: override,
          source: 'reflag-plan-override',
          minPlan: entry.minPlan,
          moduleKey: entry.moduleKey,
          detail: override
            ? 'Granted by tenant-scoped Reflag override.'
            : 'Denied by tenant-scoped Reflag override.',
        });
        continue;
      }

      entitlements[entry.key] = baseline;
      decisions.push({
        key: entry.key,
        enabled: baseline,
        source: 'plan-baseline',
        minPlan: entry.minPlan,
        moduleKey: entry.moduleKey,
        detail: baseline
          ? `Included in plan "${context.plan}" baseline.`
          : `Requires plan "${entry.minPlan}" or above on a supported vertical.`,
      });
    }

    if (!hasLocalOverrides && remote.failureReason && process.env.NODE_ENV !== 'test') {
      this.logger.warn(
        {
          tenantId: context.tenantId,
          vertical: context.activeVertical,
          reason: remote.failureReason,
        },
        'plan entitlements fell back to baseline'
      );
    }

    return {
      entitlements: entitlements as PlanEntitlements,
      decisions,
    };
  }
}
