# apps/web Architecture

`apps/web` is the user-facing surface of the monorepo. It combines the public
marketing site, authentication flows, a tenant-scoped control center with
clinic and platform modes, and a small set of Next.js API routes used by the
frontend itself.

## Responsibilities

- Render the public marketing experience under `app/(marketing)`.
- Handle login, registration, password reset, and the B2C OAuth return flow
  under `app/(auth)`.
- Render the authenticated tenant experience under `app/app/[tenantId]/`,
  choosing between the clinic shell and the original platform shell.
- Consume `services/api` through typed client helpers in `lib/api/`, including
  the clinic backend fetchers added for the new tenant-scoped domain routes.
- Expose web-owned API routes for marketing chat and the public catalog cards.
- Keep demo and operational catalog experiences separated through the
  `DataProvider` abstraction.
- Keep clinic and internal-platform navigation coherent for vertical tenants
  through the resolved `ClinicExperience` payload, tenant-aware routing,
  capability resolution, and redirect helpers.

## Route Layout

### Public marketing routes

```text
app/(marketing)/
├── page.tsx
├── docs/page.tsx
├── pricing/page.tsx
└── security/page.tsx
```

These routes use the marketing layout and default to demo-backed read models.

### Auth routes

```text
app/(auth)/
├── layout.tsx
├── login/page.tsx
├── register/page.tsx
├── reset-password/page.tsx
└── auth/callback/page.tsx
```

Important behavior:

- `login` and `register` call `services/api` auth endpoints.
- `auth/callback` receives the B2C OAuth redirect after the API completes the
  provider handshake.
- `reset-password` handles password reset tokens issued by the API.

### Tenant control-center routes

```text
app/app/
├── page.tsx
└── [tenantId]/
    ├── agenda/page.tsx
    ├── layout.tsx
    ├── approvals/page.tsx
    ├── bandeja/page.tsx
    ├── configuracion/page.tsx
    ├── dashboard/page.tsx
    ├── fleet/page.tsx
    ├── installer/new/page.tsx
    ├── marketplace/page.tsx
    ├── marketplace/agents/[agentId]/page.tsx
    ├── marketplace/packs/[packId]/page.tsx
    ├── marketplace/workflows/[workflowId]/page.tsx
    ├── observability/page.tsx
    ├── pacientes/page.tsx
    ├── platform/
    │   ├── layout.tsx
    │   ├── approvals/page.tsx
    │   ├── dashboard/page.tsx
    │   ├── fleet/page.tsx
    │   ├── installer/new/page.tsx
    │   ├── marketplace/
    │   ├── observability/page.tsx
    │   ├── runs/
    │   ├── security/page.tsx
    │   └── settings/page.tsx
    ├── reactivacion/page.tsx
    ├── rendimiento/page.tsx
    ├── runs/page.tsx
    ├── runs/[runId]/page.tsx
    ├── security/page.tsx
    ├── seguimiento/
    │   ├── page.tsx
    │   ├── formularios/page.tsx
    │   ├── confirmaciones/page.tsx
    │   └── huecos/page.tsx
    └── settings/page.tsx
```

The `proxy.ts` file protects `/app/*` traffic, keeps authenticated users away
from the login and register pages, and preserves public access to the
`demo-workspace` tenant.

`app/app/[tenantId]/layout.tsx` is the experience switch. It resolves the shell
using `tenant.settings.verticalClinicUi` as the canonical signal and falls back
to a loaded `clinic_profile` for older payloads. Clinical tenants render:

- `ClinicShell` for `dashboard` (`Resumen`), `bandeja`, `agenda`, `pacientes`,
  `seguimiento/*`, `reactivacion`, `rendimiento`, and `configuracion`
- `AgentmouShell` only for `/platform/*`
- redirects from legacy platform roots like `/runs` or `/marketplace` into
  `/platform/*`

Non-clinic tenants keep the original `AgentmouShell` and legacy root routes.
`clinicDentalMode` travels in the same tenant settings payload so the web app
does not need ad hoc heuristics to recognize the vertical before rendering
navigation.

Once the tenant is inside the app, `useResolvedTenantExperience` prefers
`GET /clinic/experience` as the canonical source for:

- `clinic` vs `platform_internal` mode
- normalized role and permissions
- resolved feature flags
- allowed navigation
- enriched module entitlements

It only falls back to separate tenant/profile/module requests when that payload
is not available.

### Next.js API routes

```text
app/api/
├── chat/route.ts
└── public-catalog/route.ts
```

- `chat` is the frontend-owned route for the public chat experience.
- `public-catalog` returns the curated catalog cards used on marketing pages.

## Data Access Model

The tenant control center uses a single `DataProvider` interface in
`lib/data/provider.ts`. There are three concrete modes:

| Provider | Mode | Used by | Backing source |
| --- | --- | --- | --- |
| `mockProvider` | `mock` | Marketing layouts and synchronous mock reads | `lib/demo/read-model.ts` plus clinic demo read models |
| `demoProvider` | `demo` | `demo-workspace` tenant routes | Demo catalog plus operational and clinic overlays |
| `apiProvider` | `api` | Authenticated real tenants | `services/api` through `lib/api/client.ts` and `lib/api/clinic.ts` |

This separation lets the UI keep a stable shape while some surfaces are fully
live and others are still demo-backed or read-only.

The clinic fetchers in `lib/api/clinic.ts` now sit under the same
`DataProvider` contract as the original control-plane fetchers. That keeps the
clinic shell, the demo tenant, and mock-backed tests on the same frontend read
surface without page-level `fetch` calls.

The provider contract now also carries the resolved clinic experience so
navigation, guards, command palette items, and internal-mode eligibility all
derive from the same payload instead of each page re-implementing gating.

## Important Supporting Modules

- `lib/api/core.ts` centralizes request/error helpers shared by all web API
  clients.
- `lib/api/client.ts` remains the typed fetcher layer for the original control
  plane.
- `lib/api/clinic.ts` adds typed fetchers for clinic dashboard, profile,
  experience, modules, channels, patients, conversations, calls,
  appointments, forms, follow-up, and reactivation. It also parses structured `409`
  `clinic_feature_unavailable` responses into a dedicated client error.
- `lib/auth/` owns cookie hydration, auth requests, and the active tenant store.
- `lib/data/` contains the provider abstraction, clinic/provider adapters, and
  tenant dashboard metric helpers.
- `lib/tenant-experience.tsx` resolves shell mode, clinic capability flags,
  internal-platform access, allowed navigation, and clinic fallbacks from
  tenant state plus the resolved experience payload.
- `components/clinic/` contains the reusable domain UI used by the clinic
  shell, including `ClinicShell`, `ClinicSidebar`, `ClinicTopbar`,
  `ClinicCommandSurface`, domain cards, and `InternalModeSwitch`.
- `components/control-plane/legacy-platform-redirect.tsx` moves clinic tenants
  from legacy platform roots into `/platform/*` only when internal access is
  allowed; otherwise it sends them back to the clinic dashboard.
- `lib/demo-catalog/` stores the curated demo inventory, featured marketing
  IDs, and the generated operational ID index.
- `lib/demo/clinic-read-model.ts` provides deterministic clinic fixtures for
  `mockProvider` and the demo tenant overlays.
- `lib/marketing/featured-from-demo.ts` builds the homepage catalog payload.
- `lib/honest-ui/` centralizes preview and placeholder labeling for the UI.
- `lib/search-index.ts` and the command palette now support `clinic` and
  `platform_internal` modes so the clinic shell surfaces patients,
  appointments, conversations, forms, gaps, and campaigns instead of
  marketplace and runs.
- `components/` groups reusable UI and domain components used across the app.

Hidden clinic routes now render controlled unavailable states based on the same
resolved navigation and entitlement data; they do not rely on uncaught render
errors to express access control.

The internal switch is visible only when all of these are true:

- normalized role is `owner` or `admin`
- the resolved `internal_platform` module entitlement is enabled
- `tenant.settings.internalPlatformVisible` is `true`

`demo-workspace` keeps realistic clinic data but intentionally fails that final
visibility condition so the internal switch stays hidden.

## How It Fits Into The Platform

- `apps/web` never executes agents or workflows directly.
- `services/api` remains the source of truth for tenant data, installations,
  approvals, runs, connectors, billing, and security.
- `services/api` also supplies the clinic-domain backend read models that power
  the clinic shell.
- `packages/contracts` provides the shared types used by both the UI and the
  backend.
- `apps/web/lib/demo-catalog/` is intentionally separate from the operational
  manifests in `catalog/` and `workflows/`.

## Related Docs

- [Architecture Overview](./overview.md)
- [Catalog, Demo, and Marketing](../catalog-and-demo.md)
- [Repository Map](../repo-map.md)
- [API Routes](../api-routes.md)
