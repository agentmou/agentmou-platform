'use client';

/**
 * Client-side feature flag client — UI hints only.
 *
 * ⚠️  AUTHORIZATION RULE
 *
 * This module must not be used to make authorization decisions. Anything
 * that gates access to data, endpoints, routes, or sensitive UI flows reads
 * from the server-resolved `TenantExperience.flags` payload. This client
 * exists so product can A/B non-critical UX (copy variants, banner order,
 * CTAs) without a backend round-trip.
 *
 * An ESLint rule (`no-restricted-imports` on `@/lib/feature-flags/client`
 * from authz-sensitive paths) enforces this at build time. See
 * `eslint.config.js`.
 *
 * ## Current state (PR-03)
 *
 * The real Reflag browser SDK is intentionally not wired yet. Every call
 * returns `false` and emits a one-time console warning in development so
 * callers notice the stub. The public API is stable — wiring the SDK is a
 * 10-line follow-up change when the team actually needs client A/B.
 *
 * When the SDK is wired, replace the body of `getClientFeatureFlag` /
 * `useFeatureFlag`; do not change their signatures.
 */

import * as React from 'react';

import type { PlanFlagKey } from './keys';

/**
 * Any flag key accepted by the client. We accept the plan namespace directly
 * and pass-through any other string so UX-only keys (e.g. `ui.onboarding.v2`)
 * can be evaluated too without clogging the plan catalog.
 */
export type ClientFlagKey = PlanFlagKey | `ui.${string}`;

export interface ClientFeatureFlagResult {
  value: boolean;
  source: 'stub' | 'reflag-browser-sdk';
  reason?: string;
}

const warnedKeys = new Set<string>();

function publishableKey(): string | null {
  if (typeof process === 'undefined') {
    return null;
  }

  const key = process.env.NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY;
  return key && key.length > 0 ? key : null;
}

function isDevelopment(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
}

function warnOnce(key: string, message: string) {
  if (warnedKeys.has(key)) {
    return;
  }
  warnedKeys.add(key);
  if (isDevelopment()) {
    // eslint-disable-next-line no-console -- dev-only diagnostic, silent in production.
    console.warn(`[feature-flags/client] ${message}`);
  }
}

/**
 * Synchronous evaluation of a client flag. Safe to call from render paths.
 *
 * Returns `false` when:
 *  - `NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY` is not set.
 *  - The browser SDK has not been wired (current state).
 *  - The key is unknown to the configured Reflag project.
 */
export function getClientFeatureFlag(key: ClientFlagKey): ClientFeatureFlagResult {
  if (!publishableKey()) {
    warnOnce(
      `no-key:${key}`,
      `"${key}" evaluated against stub: NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY is not set.`
    );
    return {
      value: false,
      source: 'stub',
      reason: 'publishable_key_missing',
    };
  }

  // TODO(feature-flags/client): wire @reflag/browser-sdk here once product
  // actually needs client-side A/B. Keep the stub return path for when the
  // key is absent even after the SDK is wired.
  warnOnce(
    `no-sdk:${key}`,
    `"${key}" evaluated against stub: Reflag browser SDK is not wired yet.`
  );
  return {
    value: false,
    source: 'stub',
    reason: 'browser_sdk_not_wired',
  };
}

/**
 * React hook wrapper for `getClientFeatureFlag`. Returns a primitive boolean
 * so consumers can write `const showBanner = useFeatureFlag('ui.banner.v2')`.
 *
 * Reminders:
 *  - Not for authz. See the rule at the top of this file.
 *  - Safe to call unconditionally — the underlying evaluation is synchronous
 *    and idempotent.
 */
export function useFeatureFlag(key: ClientFlagKey): boolean {
  return React.useMemo(() => getClientFeatureFlag(key).value, [key]);
}

/**
 * Debug variant that returns the full resolution trace. Intended for admin
 * tooling and devtools; UI code should prefer `useFeatureFlag`.
 */
export function useFeatureFlagDebug(key: ClientFlagKey): ClientFeatureFlagResult {
  return React.useMemo(() => getClientFeatureFlag(key), [key]);
}
