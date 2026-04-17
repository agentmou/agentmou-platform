import type { TenantSettings, TenantVerticalConfig, VerticalKey } from '@agentmou/contracts';

/**
 * Vertical identity resolver.
 *
 * This module owns one question only: **which verticals does this tenant
 * operate in, and which one is currently rendered?** Commercial entitlements
 * (plan, modules, feature flags) are orthogonal and live in
 * `clinic-entitlements.ts`.
 *
 * Today every tenant has exactly one enabled vertical. The resolver returns
 * `enabled = [active]` in that case. The shape is a superset that supports
 * `enabled.length > 1` so a future PR can add multi-vertical tenants without
 * touching the contract or any downstream consumer beyond its own UI.
 *
 * Storage contract:
 *   - `tenants.settings.activeVertical` is the current fallback source of
 *     truth and always reflects the rendered vertical.
 *   - `tenant_vertical_configs` (DB table) is reserved for the multi-vertical
 *     path. This resolver does not read from it yet; activating it is the
 *     scope of PR-09.
 */

export interface ResolveVerticalConfigParams {
  settings: Pick<TenantSettings, 'activeVertical' | 'verticalClinicUi'>;
  /**
   * Optional override for explicitly-enabled verticals, typically sourced
   * from `tenant_vertical_configs`. When omitted or empty, the resolver
   * falls back to `[activeVertical]`.
   *
   * The `active` value must always appear in the returned `enabled` list;
   * if the caller passes an `enabledKeys` that does not include the derived
   * active vertical, the resolver inserts it to preserve that invariant.
   */
  enabledKeys?: readonly VerticalKey[];
}

function deriveActiveFromSettings(settings: ResolveVerticalConfigParams['settings']): VerticalKey {
  if (
    settings.activeVertical === 'internal' ||
    settings.activeVertical === 'clinic' ||
    settings.activeVertical === 'fisio'
  ) {
    return settings.activeVertical;
  }

  // Legacy fallback used for pre-settingsVersion-2 tenants that were migrated
  // from a boolean-only shape. Prefer the explicit `activeVertical` when set.
  if (settings.verticalClinicUi) {
    return 'clinic';
  }

  return 'internal';
}

export function resolveTenantVerticalConfig(
  params: ResolveVerticalConfigParams
): TenantVerticalConfig {
  const active = deriveActiveFromSettings(params.settings);

  if (!params.enabledKeys || params.enabledKeys.length === 0) {
    return { active, enabled: [active] };
  }

  const unique = Array.from(new Set(params.enabledKeys));
  const enabled = unique.includes(active) ? unique : [active, ...unique];

  return { active, enabled };
}
