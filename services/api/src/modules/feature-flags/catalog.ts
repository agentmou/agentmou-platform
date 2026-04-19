/**
 * Feature flag catalog.
 *
 * Agentmou exposes two distinct flag namespaces in Reflag, each with a
 * different lifecycle and consumer. Never mix them:
 *
 *   `rollout.<vertical>.<feature>`
 *     Deployment strategy. Short-lived. Created on canary, flipped to 100 %
 *     when a feature ships, deleted when the rollout ends. Consumed by the
 *     `FeatureFlagService.resolve()` pipeline to gate product features that
 *     are still in staged release.
 *
 *   `plan.<vertical>.<capability>`
 *     Commercial entitlement. Long-lived — tied to the lifetime of the
 *     capability itself. Backs the pricing page and is resolved by
 *     `FeatureFlagService.resolvePlanEntitlements()`. Authorization
 *     decisions MUST flow through this namespace, never through `rollout.*`.
 *
 * Adding a new capability that a tenant can buy means adding a `plan.*` key
 * and updating the pricing mapping in
 * `apps/web/lib/marketing/clinic-site.ts`. Adding a staged rollout means
 * adding a `rollout.*` key and wiring it into the resolve pipeline.
 */
import type { ModuleKey, PlanFlagKey, TenantPlan, VerticalKey } from '@agentmou/contracts';

// ---------------------------------------------------------------------------
// Rollout flags — deployment-strategy namespace.
// ---------------------------------------------------------------------------

export const FEATURE_FLAG_KEYS = {
  clinicVoiceInboundRollout: 'rollout.clinic.voice.inbound',
  clinicVoiceOutboundRollout: 'rollout.clinic.voice.outbound',
  clinicFormsRollout: 'rollout.clinic.forms',
  clinicConfirmationsRollout: 'rollout.clinic.confirmations',
  clinicGapRecoveryRollout: 'rollout.clinic.gap_recovery',
  clinicReactivationRollout: 'rollout.clinic.reactivation',
  clinicAdvancedSettingsRollout: 'rollout.clinic.advanced_settings',
  clinicAiReceptionistRollout: 'rollout.clinic.ai.receptionist',
  clinicAiVoiceReceptionistRollout: 'rollout.clinic.ai.voice_receptionist',
  clinicAiOutboundRollout: 'rollout.clinic.ai.outbound',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[keyof typeof FEATURE_FLAG_KEYS];

export interface FeatureFlagCatalogEntry {
  key: FeatureFlagKey;
  moduleKey?: ModuleKey;
  prerequisite: string;
  supportedVerticals: VerticalKey[];
}

export const FEATURE_FLAG_CATALOG: readonly FeatureFlagCatalogEntry[] = [
  {
    key: FEATURE_FLAG_KEYS.clinicVoiceInboundRollout,
    moduleKey: 'voice',
    prerequisite: 'active voice inbound channel',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicVoiceOutboundRollout,
    moduleKey: 'voice',
    prerequisite: 'voice inbound available plus active voice outbound channel',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicFormsRollout,
    moduleKey: 'core_reception',
    prerequisite: 'new patient form policy/config enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicConfirmationsRollout,
    moduleKey: 'core_reception',
    prerequisite: 'appointment confirmation policy enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicGapRecoveryRollout,
    moduleKey: 'growth',
    prerequisite: 'gap recovery policy enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicReactivationRollout,
    moduleKey: 'growth',
    prerequisite: 'reactivation policy enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicAdvancedSettingsRollout,
    moduleKey: 'advanced_mode',
    prerequisite: 'advanced mode module enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicAiReceptionistRollout,
    moduleKey: 'core_reception',
    prerequisite: 'active WhatsApp channel plus tenant AI config enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicAiVoiceReceptionistRollout,
    moduleKey: 'voice',
    prerequisite: 'active retell_voice channel plus tenant AI config enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicAiOutboundRollout,
    moduleKey: 'growth',
    prerequisite: 'AI receptionist enabled plus growth module',
    supportedVerticals: ['clinic'],
  },
] as const;

export const FEATURE_FLAG_KEYS_IN_ORDER = FEATURE_FLAG_CATALOG.map((entry) => entry.key);

// ---------------------------------------------------------------------------
// Plan flags — commercial-entitlement namespace.
// ---------------------------------------------------------------------------

export const PLAN_FLAG_KEYS = {
  clinicCoreReception: 'plan.clinic.core_reception',
  clinicVoiceInbound: 'plan.clinic.voice.inbound',
  clinicVoiceOutbound: 'plan.clinic.voice.outbound',
  clinicForms: 'plan.clinic.forms',
  clinicConfirmations: 'plan.clinic.confirmations',
  clinicGapRecovery: 'plan.clinic.gap_recovery',
  clinicReactivation: 'plan.clinic.reactivation',
  clinicWaitlist: 'plan.clinic.waitlist',
  clinicMultiLocation: 'plan.clinic.multi_location',
  clinicAdvancedSettings: 'plan.clinic.advanced_settings',
  clinicPrioritySupport: 'plan.clinic.priority_support',
} as const satisfies Record<string, PlanFlagKey>;

export interface PlanFlagCatalogEntry {
  key: PlanFlagKey;
  moduleKey?: ModuleKey;
  /** Lowest `tenant.plan` that includes this capability without overrides. */
  minPlan: TenantPlan;
  supportedVerticals: VerticalKey[];
  /** Short human-readable label, used by admin tooling. */
  label: string;
}

/**
 * The commercial baseline per plan. The admin feature-resolution endpoint
 * (PR-04) and the pricing mapping (below) are the only consumers — the
 * product runtime reads the resolved `Record<PlanFlagKey, boolean>`.
 */
export const PLAN_FLAG_CATALOG: readonly PlanFlagCatalogEntry[] = [
  {
    key: PLAN_FLAG_KEYS.clinicCoreReception,
    moduleKey: 'core_reception',
    minPlan: 'starter',
    supportedVerticals: ['clinic'],
    label: 'Core reception (inbox, agenda, patients)',
  },
  {
    key: PLAN_FLAG_KEYS.clinicForms,
    moduleKey: 'core_reception',
    minPlan: 'starter',
    supportedVerticals: ['clinic'],
    label: 'Intake forms',
  },
  {
    key: PLAN_FLAG_KEYS.clinicConfirmations,
    moduleKey: 'core_reception',
    minPlan: 'starter',
    supportedVerticals: ['clinic'],
    label: 'Appointment confirmations',
  },
  {
    key: PLAN_FLAG_KEYS.clinicVoiceInbound,
    moduleKey: 'voice',
    minPlan: 'pro',
    supportedVerticals: ['clinic'],
    label: 'Voice — inbound calls',
  },
  {
    key: PLAN_FLAG_KEYS.clinicVoiceOutbound,
    moduleKey: 'voice',
    minPlan: 'pro',
    supportedVerticals: ['clinic'],
    label: 'Voice — outbound callbacks',
  },
  {
    key: PLAN_FLAG_KEYS.clinicGapRecovery,
    moduleKey: 'growth',
    minPlan: 'scale',
    supportedVerticals: ['clinic'],
    label: 'Gap recovery',
  },
  {
    key: PLAN_FLAG_KEYS.clinicReactivation,
    moduleKey: 'growth',
    minPlan: 'scale',
    supportedVerticals: ['clinic'],
    label: 'Patient reactivation',
  },
  {
    key: PLAN_FLAG_KEYS.clinicWaitlist,
    moduleKey: 'growth',
    minPlan: 'scale',
    supportedVerticals: ['clinic'],
    label: 'Waitlist automation',
  },
  {
    key: PLAN_FLAG_KEYS.clinicMultiLocation,
    minPlan: 'enterprise',
    supportedVerticals: ['clinic'],
    label: 'Multi-location deployment',
  },
  {
    key: PLAN_FLAG_KEYS.clinicAdvancedSettings,
    moduleKey: 'advanced_mode',
    minPlan: 'enterprise',
    supportedVerticals: ['clinic'],
    label: 'Advanced settings / expert filters',
  },
  {
    key: PLAN_FLAG_KEYS.clinicPrioritySupport,
    minPlan: 'enterprise',
    supportedVerticals: ['clinic'],
    label: 'Priority support',
  },
] as const;

export const PLAN_FLAG_KEYS_IN_ORDER = PLAN_FLAG_CATALOG.map((entry) => entry.key);

/** Rank used to decide whether a tenant's plan satisfies a flag's `minPlan`. */
const PLAN_RANK: Record<TenantPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  scale: 3,
  enterprise: 4,
};

export function planSatisfies(tenantPlan: TenantPlan, minPlan: TenantPlan): boolean {
  return PLAN_RANK[tenantPlan] >= PLAN_RANK[minPlan];
}
