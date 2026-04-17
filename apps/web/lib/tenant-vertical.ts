'use client';

import type {
  TenantExperience,
  TenantSettings,
  TenantVerticalConfig,
  VerticalKey,
} from '@agentmou/contracts';

export function resolveActiveVertical(settings?: Partial<TenantSettings> | null): VerticalKey {
  if (
    settings?.activeVertical === 'internal' ||
    settings?.activeVertical === 'clinic' ||
    settings?.activeVertical === 'fisio'
  ) {
    return settings.activeVertical;
  }

  if (typeof settings?.verticalClinicUi === 'boolean') {
    return settings.verticalClinicUi ? 'clinic' : 'internal';
  }

  return 'internal';
}

/**
 * Derive the vertical identity (`active` + `enabled`) consumed by the shell.
 *
 * Prefers the server-resolved `experience.verticalConfig` when present; falls
 * back to `[resolveActiveVertical(settings)]` for legacy payloads. Today the
 * frontend only renders `active`; the `enabled` array is exposed so the shell
 * can evolve into a multi-vertical selector without another contract change.
 */
export function resolveTenantVerticalConfig(source: {
  experience?: Pick<TenantExperience, 'verticalConfig' | 'activeVertical'> | null;
  settings?: Partial<TenantSettings> | null;
}): TenantVerticalConfig {
  if (source.experience?.verticalConfig) {
    return source.experience.verticalConfig;
  }

  const active = source.experience?.activeVertical ?? resolveActiveVertical(source.settings);
  return { active, enabled: [active] };
}

export function resolveEnabledVerticals(source: {
  experience?: Pick<TenantExperience, 'verticalConfig' | 'activeVertical'> | null;
  settings?: Partial<TenantSettings> | null;
}): VerticalKey[] {
  return [...resolveTenantVerticalConfig(source).enabled];
}

export function isClinicUiEnabled(settings?: Partial<TenantSettings> | null) {
  return resolveActiveVertical(settings) === 'clinic';
}

export function isClinicDentalMode(settings?: Partial<TenantSettings> | null) {
  return isClinicUiEnabled(settings) && Boolean(settings?.clinicDentalMode);
}

export function isSharedVertical(activeVertical: VerticalKey) {
  return activeVertical === 'clinic' || activeVertical === 'fisio';
}
