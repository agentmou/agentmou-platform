import type { ModuleKey, VerticalKey } from '@agentmou/contracts';

export const FEATURE_FLAG_KEYS = {
  clinicVoiceEnabled: 'clinic.voice.enabled',
  clinicVoiceOutboundEnabled: 'clinic.voice.outbound.enabled',
  clinicFormsEnabled: 'clinic.forms.enabled',
  clinicConfirmationsEnabled: 'clinic.confirmations.enabled',
  clinicGapsEnabled: 'clinic.gaps.enabled',
  clinicReactivationEnabled: 'clinic.reactivation.enabled',
  clinicAdvancedSettingsEnabled: 'clinic.advanced_settings.enabled',
  internalPlatformVisible: 'internal.platform.visible',
  adminConsoleEnabled: 'admin.console.enabled',
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
    key: FEATURE_FLAG_KEYS.clinicVoiceEnabled,
    moduleKey: 'voice',
    prerequisite: 'active voice inbound channel',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicVoiceOutboundEnabled,
    moduleKey: 'voice',
    prerequisite: 'voice inbound available plus active voice outbound channel',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicFormsEnabled,
    moduleKey: 'core_reception',
    prerequisite: 'new patient form policy/config enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicConfirmationsEnabled,
    moduleKey: 'core_reception',
    prerequisite: 'appointment confirmation policy enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicGapsEnabled,
    moduleKey: 'growth',
    prerequisite: 'gap recovery policy enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicReactivationEnabled,
    moduleKey: 'growth',
    prerequisite: 'reactivation policy enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.clinicAdvancedSettingsEnabled,
    moduleKey: 'advanced_mode',
    prerequisite: 'advanced mode module enabled',
    supportedVerticals: ['clinic'],
  },
  {
    key: FEATURE_FLAG_KEYS.internalPlatformVisible,
    moduleKey: 'internal_platform',
    prerequisite: 'tenant vertical is internal',
    supportedVerticals: ['internal'],
  },
  {
    key: FEATURE_FLAG_KEYS.adminConsoleEnabled,
    prerequisite: 'tenant marked as platform admin',
    supportedVerticals: ['internal'],
  },
] as const;

export const FEATURE_FLAG_KEYS_IN_ORDER = FEATURE_FLAG_CATALOG.map((entry) => entry.key);
