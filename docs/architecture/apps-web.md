# apps/web Architecture

`apps/web` is the user-facing surface of the monorepo. It combines the public
marketing site, authentication flows, a tenant-scoped control center with
vertical-aware shells, and a small set of Next.js API routes used by the
frontend itself.

## Responsibilities

- Render the public clinic marketing experience under `app/(marketing)`.
- Handle login, registration, password reset, and the B2C OAuth return flow
  under `app/(auth)`.
- Render the authenticated tenant experience under `app/app/[tenantId]/`,
  choosing between `internal`, `clinic`, and `fisio` via the resolved
  `TenantExperience`.
- Consume `services/api` through typed client helpers in `lib/api/`, including
  the clinic backend fetchers added for the new tenant-scoped domain routes.
- Expose web-owned API routes for marketing chat, public catalog cards, and
  contact-sales lead capture.
- Keep demo and operational catalog experiences separated through the
  `DataProvider` abstraction.
- Keep clinic, fisio, internal, and admin navigation coherent through the
  resolved `TenantExperience` payload, tenant-aware routing, capability
  resolution, and redirect helpers.

## Route Layout

### Public marketing routes

```text
app/(marketing)/
├── contact-sales/page.tsx
├── page.tsx
├── docs/page.tsx
├── platform/page.tsx
├── pricing/page.tsx
└── security/page.tsx
```

These routes use the marketing layout and default to demo-backed read models.
The homepage, pricing, security, and contact-sales pages are clinic-first.
`/docs/engine` is the public technical secondary page, while `/docs` and
`/platform` redirect back to `/` so the technical narrative no longer leads the
main funnel.

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
    ├── admin/
    │   ├── page.tsx
    │   └── tenants/
    │       ├── page.tsx
    │       └── [managedTenantId]/page.tsx
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

The `proxy.ts` file also enforces host canonicity: marketing routes stay on
`agentmou.io`, while `/login`, `/register`, `/reset-password`, `/auth/callback`,
and `/app/*` stay on `app.agentmou.io`. After that host check, it protects
`/app/*` traffic, keeps authenticated users away from the login and register
pages, and preserves public access to the `demo-workspace` tenant.

`app/app/[tenantId]/layout.tsx` is the experience switch. It resolves the shell
from `GET /api/v1/tenants/:tenantId/experience`, using `activeVertical`,
`shellKey`, `defaultRoute`, and `allowedNavigation` as the canonical signals.
Shared-care tenants render:

- `ClinicShell` for `dashboard` (`Resumen`), `bandeja`, `agenda`, `pacientes`,
  `seguimiento/*`, `reactivacion`, `rendimiento`, and `configuracion`
- redirects from internal/admin routes back to their vertical default route

Internal tenants keep `AgentmouShell`, use top-level internal routes such as
`/runs`, `/marketplace`, `/settings`, and `/admin/tenants`, and still accept
`/platform/*` only as a compatibility alias. `clinicDentalMode` and the old
boolean settings still travel for compatibility, but the web app no longer uses
them as the primary routing signal.

Once the tenant is inside the app, `useResolvedTenantExperience` prefers
`GET /tenants/:tenantId/experience` as the canonical source for:

- `internal`, `clinic`, or `fisio`
- normalized role and permissions
- resolved feature flags
- allowed navigation
- settings sections
- enriched module entitlements

It only falls back to separate tenant/profile/module requests when that payload
is not available. The legacy clinic-specific experience endpoint remains as a
compatibility layer for clinic read models.

### Next.js API routes

```text
app/api/
├── chat/route.ts
├── contact-sales/route.ts
└── public-catalog/route.ts
```

- `chat` is the frontend-owned route for the public chat experience.
- `contact-sales` validates the commercial lead form and relays it to a
  configurable webhook.
- `public-catalog` returns the curated catalog payload used by the secondary
  `/platform` page and technical supporting blocks.

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

The provider contract now also carries the resolved tenant experience so
navigation, guards, command palette items, admin visibility, and internal-mode
eligibility all derive from the same payload instead of each page
re-implementing gating.

Public marketing does not depend on `DataProvider` for its main story anymore.
Instead:

- `lib/marketing/clinic-site.ts` models the clinic positioning, pricing, trust,
  and flow sections.
- `lib/marketing/site-config.ts` drives nav/footer structure.
- `lib/marketing/featured-from-demo.ts` and `/api/public-catalog` are reserved
  for the secondary `/docs/engine` story and technical catalog snippets.

## Important Supporting Modules

- `lib/api/core.ts` centralizes request/error helpers shared by all web API
  clients.
- `lib/api/client.ts` remains the typed fetcher layer for the original control
  plane, including the Admin console routes.
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
- `lib/vertical-registry.ts`, `lib/tenant-routing.ts`, and
  `lib/internal-navigation.ts` encode shell, route, and navigation policy for
  `internal`, `clinic`, and `fisio`.
- `components/clinic/` contains the reusable domain UI used by the clinic
  shell, including `ClinicShell`, `ClinicSidebar`, `ClinicTopbar`,
  `ClinicCommandSurface`, domain cards, and `InternalModeSwitch`.
- `components/admin/` contains the internal Admin console for tenant
  management, membership operations, vertical changes, and impersonation UI.
- `lib/demo-catalog/` stores the curated demo inventory, featured marketing
  IDs, and the generated operational ID index.
- `lib/demo/clinic-read-model.ts` provides deterministic clinic fixtures for
  `mockProvider` and the demo tenant overlays.
- `lib/marketing/featured-from-demo.ts` builds the homepage catalog payload.
- `lib/marketing/site-config.ts` defines the clinic public nav/footer structure.
- `lib/marketing/clinic-site.ts` provides the clinic marketing read model used
  by `/`, `/pricing`, `/security`, and `/contact-sales`.
- `lib/honest-ui/` centralizes preview and placeholder labeling for the UI.
- `components/marketing/` contains the clinic hero, value grids, patient-flow
  sections, trust blocks, platform grid, and `ContactSalesForm`.
- `lib/search-index.ts` and the command palette now support the shared care
  search mode plus the internal mode, including Admin navigation only when the
  tenant can access it.
- `components/` groups reusable UI and domain components used across the app.

Hidden clinic routes now render controlled unavailable states based on the same
resolved navigation, entitlement, and feature-flag data; they do not rely on
uncaught render errors to express access control. `demo-workspace` keeps
realistic clinic data but intentionally hides internal/admin surfaces so it can
remain the public read-only demo, separate from the seeded local QA tenants in
the database.

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
