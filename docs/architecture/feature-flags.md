# Feature Flags

Agentmou uses [Reflag](https://reflag.com) as the managed feature-flag backend.
The catalog lives at
[`services/api/src/modules/feature-flags/catalog.ts`](../../services/api/src/modules/feature-flags/catalog.ts);
the browser client wrapper is at
[`apps/web/lib/feature-flags/client.ts`](../../apps/web/lib/feature-flags/client.ts).

## Two namespaces, two lifecycles

| Namespace | Purpose | Lifetime | Consumer | Authorization? |
| --- | --- | --- | --- | --- |
| `rollout.<vertical>.<feature>` | Deployment strategy (canary, staged rollout, kill-switch) | **Short.** Created on canary, flipped to 100 % when shipped, deleted when the rollout is complete. | `FeatureFlagService.resolve()` | Never — a rollout is about *when* a feature is safe, not *who* can buy it. |
| `plan.<vertical>.<capability>` | Commercial entitlement (what the tenant bought) | **Long.** Lives as long as the capability exists in the product. | `FeatureFlagService.resolvePlanEntitlements()` | **Yes** — the only acceptable source for plan-based authz decisions. |

Mixing the two leads to flags with confusing names (`rollout.*` key used
to gate a paying feature, or `plan.*` key left on for 100 % of users as an
A/B driver). Keep them strictly separate.

## The plan namespace (`plan.*`)

Resolver: [`FeatureFlagService.resolvePlanEntitlements()`](../../services/api/src/modules/feature-flags/feature-flag.service.ts).

For each entry in `PLAN_FLAG_CATALOG`:

1. **Baseline.** `tenant.plan >= minPlan` and the vertical is supported.
2. **Reflag override.** If Reflag returns a boolean for the `plan.*` key, it
   wins — used for per-tenant exceptions (e.g. granting Voice to a Starter
   tenant during a paid pilot).

Result: `Record<PlanFlagKey, boolean>` plus a decision trace for the admin UI.

### Catalog (as of PR-03)

| Key | Min plan | Module |
| --- | --- | --- |
| `plan.clinic.core_reception` | starter | `core_reception` |
| `plan.clinic.forms` | starter | `core_reception` |
| `plan.clinic.confirmations` | starter | `core_reception` |
| `plan.clinic.voice.inbound` | pro | `voice` |
| `plan.clinic.voice.outbound` | pro | `voice` |
| `plan.clinic.gap_recovery` | scale | `growth` |
| `plan.clinic.reactivation` | scale | `growth` |
| `plan.clinic.waitlist` | scale | `growth` |
| `plan.clinic.multi_location` | enterprise | — |
| `plan.clinic.advanced_settings` | enterprise | `advanced_mode` |
| `plan.clinic.priority_support` | enterprise | — |

The catalog is the single source of truth. The pricing page
([`apps/web/lib/marketing/clinic-site.ts`](../../apps/web/lib/marketing/clinic-site.ts))
references the same keys via the `PricingPlan.planFlags: PlanFlagKey[]` field,
so adding a capability in the catalog forces a matching update on the
marketing page (the typechecker blocks drift).

## The rollout namespace (`rollout.*`)

Resolver: [`FeatureFlagService.resolve()`](../../services/api/src/modules/feature-flags/feature-flag.service.ts).

Rollouts sit **on top of** entitlements and readiness — a rollout flag can
dim a feature temporarily but cannot grant something the tenant has not
purchased. When a rollout finishes (100 % or aborted) the flag is deleted
from the Reflag dashboard and its key is removed from `FEATURE_FLAG_KEYS`
in the same PR that removes the gate.

## Client-side evaluation

The browser wrapper [`apps/web/lib/feature-flags/client.ts`](../../apps/web/lib/feature-flags/client.ts)
exposes `useFeatureFlag(key)` and `getClientFeatureFlag(key)` for non-authz
UI hints only: copy variants, CTA ordering, banner visibility, A/B tests.

Current state (PR-03):
- `NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY` env var reserved.
- The Reflag browser SDK is **not wired** yet — the client returns
  `{ value: false, source: 'stub' }` with a one-time dev warning. The API is
  stable; wiring the SDK is a follow-up change when product needs it.

### Authorization firewall

Authorization logic (route guards, data providers, middleware) must not
import from `apps/web/lib/feature-flags/client.ts`. This is enforced by an
ESLint rule (`no-restricted-imports` in
[`eslint.config.js`](../../eslint.config.js)) that blocks the client
module from:

- `apps/web/lib/auth/**`
- `apps/web/lib/providers/**`
- `apps/web/proxy.ts`
- `apps/web/**/*-access.{ts,tsx}`
- `services/api/src/middleware/**`
- `services/api/src/**/*-access.{ts,tsx}`

If the rule triggers, the correct fix is to read the resolved flag from
`TenantExperience.flags` (server-side) rather than the browser wrapper.

## Environment variables

```bash
# SERVER — secret. Authoritative evaluation inside services/api.
REFLAG_SDK_KEY=
REFLAG_ENVIRONMENT=development
REFLAG_BASE_URL=
REFLAG_LOCAL_OVERRIDES_JSON=

# CLIENT — public. Only for non-authz UI hints in the browser.
NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY=
NEXT_PUBLIC_REFLAG_ENVIRONMENT=development
```

See [`infra/compose/.env.example`](../../infra/compose/.env.example).

## Adding a new capability

1. Add the key to `PLAN_FLAG_KEYS` and `PLAN_FLAG_CATALOG` in
   [`catalog.ts`](../../services/api/src/modules/feature-flags/catalog.ts),
   picking the right `minPlan` and `moduleKey`.
2. Add the same literal to the Zod enum in
   [`packages/contracts/src/feature-flags.ts`](../../packages/contracts/src/feature-flags.ts).
3. Update the relevant pricing tier in
   [`apps/web/lib/marketing/clinic-site.ts`](../../apps/web/lib/marketing/clinic-site.ts).
4. Create the flag in the Reflag dashboard with the matching key.
5. Consume `PlanEntitlements` in the product runtime — never read a
   `plan.*` key directly from Reflag anywhere else.

## Related

- [PR-03 plan](../plan/pr-03-reflag-plan-keys.md)
- [`verticals-and-entitlements.md`](./verticals-and-entitlements.md) — how
  entitlements compose with vertical identity.
- [Reflag Node SDK docs](https://docs.reflag.com/sdk/node).
