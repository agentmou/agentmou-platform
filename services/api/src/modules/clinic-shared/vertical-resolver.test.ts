import { describe, expect, it } from 'vitest';
import type { TenantSettings } from '@agentmou/contracts';

import { resolveTenantVerticalConfig } from './vertical-resolver.js';

function baseSettings(
  override: Partial<TenantSettings> = {}
): Pick<TenantSettings, 'activeVertical' | 'verticalClinicUi'> {
  return {
    activeVertical: 'internal',
    verticalClinicUi: false,
    ...override,
  };
}

describe('resolveTenantVerticalConfig', () => {
  it('returns internal when activeVertical is internal', () => {
    const result = resolveTenantVerticalConfig({
      settings: baseSettings({ activeVertical: 'internal' }),
    });

    expect(result).toEqual({ active: 'internal', enabled: ['internal'] });
  });

  it('returns clinic when activeVertical is clinic', () => {
    const result = resolveTenantVerticalConfig({
      settings: baseSettings({ activeVertical: 'clinic' }),
    });

    expect(result).toEqual({ active: 'clinic', enabled: ['clinic'] });
  });

  it('returns fisio when activeVertical is fisio', () => {
    const result = resolveTenantVerticalConfig({
      settings: baseSettings({ activeVertical: 'fisio' }),
    });

    expect(result).toEqual({ active: 'fisio', enabled: ['fisio'] });
  });

  it('falls back to clinic when legacy verticalClinicUi is set without activeVertical', () => {
    const result = resolveTenantVerticalConfig({
      // Simulate a legacy tenant payload: the enum widens to a string here
      // because older persisted settings may carry a sentinel value.
      settings: { activeVertical: '' as unknown as 'internal', verticalClinicUi: true },
    });

    expect(result).toEqual({ active: 'clinic', enabled: ['clinic'] });
  });

  it('preserves explicit enabledKeys and deduplicates', () => {
    const result = resolveTenantVerticalConfig({
      settings: baseSettings({ activeVertical: 'clinic' }),
      enabledKeys: ['clinic', 'fisio', 'clinic'],
    });

    expect(result).toEqual({ active: 'clinic', enabled: ['clinic', 'fisio'] });
  });

  it('prepends the derived active vertical when enabledKeys omits it', () => {
    // Defensive: if an external source ever hands us a stale enabled list
    // that does not mention the active vertical, the invariant
    // `enabled.includes(active)` must still hold.
    const result = resolveTenantVerticalConfig({
      settings: baseSettings({ activeVertical: 'clinic' }),
      enabledKeys: ['fisio'],
    });

    expect(result.active).toBe('clinic');
    expect(result.enabled).toContain('clinic');
    expect(result.enabled).toContain('fisio');
  });

  it('ignores an empty enabledKeys list and falls back to [active]', () => {
    const result = resolveTenantVerticalConfig({
      settings: baseSettings({ activeVertical: 'fisio' }),
      enabledKeys: [],
    });

    expect(result).toEqual({ active: 'fisio', enabled: ['fisio'] });
  });
});
