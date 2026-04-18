import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getClientFeatureFlag } from './client';

// Cast around the readonly `NODE_ENV` property on the type-only view of
// `process.env` so the tests can toggle the stub's two branches without
// fighting the compiler.
const env = process.env as Record<string, string | undefined>;

describe('getClientFeatureFlag', () => {
  const originalKey = env.NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Silence the one-time dev warnings emitted by the stub so test output
    // stays clean; the assertions below cover the behavior directly.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    env.NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY = originalKey;
  });

  it('returns the publishable_key_missing stub when no key is set', () => {
    env.NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY = '';

    const result = getClientFeatureFlag('ui.banner.spring_2026');

    expect(result).toEqual({
      value: false,
      source: 'stub',
      reason: 'publishable_key_missing',
    });
  });

  it('returns the browser_sdk_not_wired stub when the publishable key is set', () => {
    env.NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY = 'pk_test_example';

    const result = getClientFeatureFlag('plan.clinic.core_reception');

    expect(result).toEqual({
      value: false,
      source: 'stub',
      reason: 'browser_sdk_not_wired',
    });
  });
});
