'use client';

import type { TenantSettings, VerticalKey } from '@agentmou/contracts';

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

export function isClinicUiEnabled(settings?: Partial<TenantSettings> | null) {
  return resolveActiveVertical(settings) === 'clinic';
}

export function isClinicDentalMode(settings?: Partial<TenantSettings> | null) {
  return isClinicUiEnabled(settings) && Boolean(settings?.clinicDentalMode);
}

export function isSharedVertical(activeVertical: VerticalKey) {
  return activeVertical === 'clinic' || activeVertical === 'fisio';
}
