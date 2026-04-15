import type { ModuleKey, VerticalKey } from '@agentmou/contracts';

export const FEATURE_FLAG_KEYS = {
  clinicVoiceInboundRollout: 'rollout.clinic.voice.inbound',
  clinicVoiceOutboundRollout: 'rollout.clinic.voice.outbound',
  clinicFormsRollout: 'rollout.clinic.forms',
  clinicConfirmationsRollout: 'rollout.clinic.confirmations',
  clinicGapRecoveryRollout: 'rollout.clinic.gap_recovery',
  clinicReactivationRollout: 'rollout.clinic.reactivation',
  clinicAdvancedSettingsRollout: 'rollout.clinic.advanced_settings',
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
] as const;

export const FEATURE_FLAG_KEYS_IN_ORDER = FEATURE_FLAG_CATALOG.map((entry) => entry.key);
