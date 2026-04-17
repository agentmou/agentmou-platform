# Verticals and Entitlements

Two orthogonal axes govern what a tenant sees in Agentmou:

1. **Vertical identity** — which product shell is rendered (`internal`,
   `clinic`, `fisio`). This is the *what-kind-of-tenant* question.
2. **Entitlements** — which commercial capabilities are active inside that
   shell, driven by `tenant.plan`, `tenant_modules`, and Reflag rollouts.
   This is the *what-features-are-unlocked* question.

Keeping them separated lets us introduce a new vertical without renegotiating
pricing, and roll out a new feature flag without touching the shell registry.

## Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GET /api/v1/tenants/:id/experience            │
│                                                                     │
│                           resolveTenantExperience                   │
│                                    │                                │
│            ┌───────────────────────┼────────────────────────┐       │
│            ▼                       ▼                        ▼       │
│  ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────┐   │
│  │ vertical-        │  │ clinic-entitlements  │  │ feature-flag │   │
│  │ resolver.ts      │  │ (plan baseline +     │  │ service      │   │
│  │ (identity only)  │  │  module overrides +  │  │ (Reflag      │   │
│  │                  │  │  role permissions)   │  │  rollouts)   │   │
│  └────────┬─────────┘  └──────────┬───────────┘  └──────┬───────┘   │
│           │                       │                     │           │
│           ▼                       ▼                     ▼           │
│  ┌──────────────────┐  ┌────────────────────┐  ┌───────────────┐    │
│  │ verticalConfig   │  │ permissions +      │  │ flags +       │    │
│  │ { active,        │  │ allowedNavigation +│  │ featureDec.   │    │
│  │   enabled[] }    │  │ modules[]          │  │               │    │
│  └──────────────────┘  └────────────────────┘  └───────────────┘    │
│                                 │                                   │
│                                 ▼                                   │
│                 TenantExperience (single payload                    │
│                 returned to apps/web)                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Axis 1: Vertical identity

Owned by `services/api/src/modules/clinic-shared/vertical-resolver.ts`.

```ts
interface TenantVerticalConfig {
  active: VerticalKey;          // the shell currently rendered
  enabled: VerticalKey[];       // all verticals the tenant can operate
}
```

- Today `enabled = [active]` for every tenant. The shape is a superset so
  adding multi-vertical tenants (PR-09) is a UI change rather than a
  contract/migration change.
- The resolver reads `tenants.settings.activeVertical` (jsonb) and falls
  back to the legacy `verticalClinicUi` boolean for tenants that predate the
  enum.
- The `tenant_vertical_configs` table exists in the DB schema but is not
  read yet. Activating it is the scope of PR-09.

### Endpoint

```
GET /api/v1/tenants/:id/verticals  →  { verticals: TenantVerticalConfig }
```

This is a thin read-only endpoint designed to be cacheable independently of
`/experience`, because identity changes rarely while entitlements change
frequently (plan upgrades, module toggles, Reflag rollouts).

`verticalConfig` is also surfaced on `GET /experience` inside
`TenantExperience.verticalConfig` (optional during rollout).

## Axis 2: Entitlements

Owned by `services/api/src/modules/clinic-shared/clinic-entitlements.ts`
(name preserved for now to contain the blast radius of this change; a
follow-up PR may rename it to `entitlement-resolver.ts`).

Three layered inputs:

| Layer | Source | What it produces |
| --- | --- | --- |
| Plan baseline | `TenantPlan` + `PLAN_BASELINES` constant | Default `status` / `visibleToClient` per `ModuleKey` |
| Per-tenant override | `tenant_modules` row, if any | Replaces baseline when present |
| Rollout | Reflag via `FeatureFlagService` | Adds feature-level decisions (forms, confirmations, gap recovery, reactivation, voice inbound/outbound) |

The composition yields:
- `modules: ClinicModuleEntitlement[]`
- `permissions: TenantPermission[]` (role-based)
- `allowedNavigation: TenantNavigationKey[]`
- `flags: TenantResolvedFlags`
- `featureDecisions: TenantFeatureDecisions` (trace of sources)

## How the web consumes the split

- `apps/web/lib/tenant-vertical.ts` exposes
  `resolveTenantVerticalConfig(source)` and `resolveActiveVertical(settings)`.
  Both fall back to derived values if the server payload predates this PR.
- `apps/web/lib/vertical-registry.ts` maps `active` → shell component, nav
  schema, default route, and search mode. It does not consume plan features.
- `apps/web/lib/tenant-experience.tsx` assembles the client-side
  `TenantExperienceState` by combining vertical identity (for routing and
  shell selection) and entitlements (for the `ClinicUiCapabilities`).

## Migration notes

- `tenant.settings.activeVertical` remains the persistent source of truth
  until `tenant_vertical_configs` is activated.
- `verticalClinicUi`, `clinicDentalMode`, and `internalPlatformVisible` in
  `TenantSettings` are legacy boolean fallbacks. New code must read from
  `activeVertical` / `verticalConfig`, not these booleans.
- Deprecating the legacy booleans is scoped to a separate PR alongside the
  file rename of `clinic-entitlements.ts`.

## Related

- [ADR-011: Enterprise Auth Strategy](./adr/011-enterprise-auth-strategy.md)
- [Architecture Overview](./overview.md)
- [`docs/plan/pr-02-vertical-entitlements-model.md`](../plan/pr-02-vertical-entitlements-model.md)
- [`docs/plan/pr-09-multi-vertical-optional.md`](../plan/pr-09-multi-vertical-optional.md)
