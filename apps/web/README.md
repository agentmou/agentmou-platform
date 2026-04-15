# @agentmou/web

Next.js application for the Agentmou public site and tenant control-center UI.

## Purpose

`apps/web` is the user-facing surface of the monorepo. It serves two jobs:
- Public marketing pages that sell Agentmou as a multichannel AI receptionist
  for clinics, with `/platform` as the secondary technical narrative and
  `/docs` preserved as an alias.
- Authenticated tenant pages that resolve `internal`, `clinic`, or `fisio`
  from `TenantExperience`, with the Admin console only for admin-capable
  internal tenants.

The web app is intentionally a control-plane client. It does not execute agents
or workflows itself.

## Responsibilities

- Render the clinic-first marketing experience under `app/(marketing)`, with
  public pages for `/`, `/pricing`, `/security`, `/platform`, and
  `/contact-sales`.
- Handle login and registration under `app/(auth)` using `components/auth`
  (`AuthForm`, password strength UI). **B2C OAuth** (Google, Microsoft) uses
  `GET /api/v1/auth/oauth/:provider/authorize` with `return_url` pointing to
  `/auth/callback`, then `POST /api/v1/auth/oauth/exchange` for a one-time
  code. **Forgot password** calls `POST /api/v1/auth/forgot-password` and
  `/reset-password` on the web; email delivery is not integrated yet (reset
  links are logged in non-production when `LOG_PASSWORD_RESET_LINK=1` or by
  default in dev on the API). **Enterprise SAML/OIDC** per tenant is planned
  via an external provider (see `docs/adr/011-enterprise-auth-strategy.md`);
  the UI shows a disabled SSO row with tooltip.
- Protect tenant routes with Next.js proxy and a JWT cookie.
- Consume the control-plane API through typed client helpers in `lib/api/`.
- Resolve the tenant shell in `app/app/[tenantId]/layout.tsx` from
  `GET /api/v1/tenants/:tenantId/experience`, using `activeVertical`,
  `shellKey`, `allowedNavigation`, and resolved flags as the primary signals.
- Keep top-level internal routes canonical while preserving
  `/app/[tenantId]/platform/*` as a legacy alias for old links.
- Export typed clinic backend fetchers in `lib/api/clinic.ts` and consume them
  through the same `DataProvider` abstraction used by the rest of the tenant UI.
- Keep the primary marketing narrative in `lib/marketing/clinic-site.ts` and
  `components/marketing/*`, instead of driving the homepage hero from the
  public catalog payload.
- Serve the secondary technical `/platform` page from `/api/public-catalog`,
  built from the **curated demo featured list**
  (`lib/demo-catalog/marketing-featured.ts`) plus `demoTotals`,
  `operationalFeaturedCounts`, and `gaInventoryCounts` (see
  `docs/catalog-and-demo.md`). Featured ids must be operational and marked
  `availability: available` in demo data.
- Capture public sales leads through `POST /api/contact-sales`, validate the
  payload with Zod, and forward it to a configurable webhook when present.
- Switch between `apiProvider` and `demoProvider`: real tenants use the API
  catalog; `demo-workspace` uses the full demo inventory with **planned** +
  **Coming soon** on items not backed by operational manifests
  (`operational-ids.gen.json` + `operational-refs.ts`).
- Overlay deterministic clinic demo data for `demo-workspace` and mock-backed
  surfaces so the vertical control center renders a realistic dental tenant
  without live writes.
- Keep `demo-workspace` explicitly separate from the seeded local QA tenants:
  `Demo Workspace` (internal admin), `Dental Demo Clinic`, and
  `Fisio Pilot Workspace`.
- Apply honest product labels for tenant surfaces that are still preview,
  read-only, demo, or not yet available.

## How It Fits Into The System

`@agentmou/web` sits on top of the rest of the platform:
- Reads domain types from `@agentmou/contracts`.
- Talks to `services/api` through `lib/api/client.ts`, `lib/api/clinic.ts`, and
  `lib/auth/api.ts`.
- Uses `DataProviderContext` so tenant pages can stay stable while the backing
  implementation evolves.
- Displays runs, approvals, connectors, and installations that are created and
  executed elsewhere in the stack.
- Resolves a tenant-aware shell that keeps clinic UX at the tenant root and the
  canonical internal surfaces at `/app/[tenantId]/*`, while treating
  `/app/[tenantId]/platform/*` as a compatibility alias. `TenantExperience` is
  the canonical source of mode, permissions, navigation, settings sections,
  and flags.

## Local Usage

Run the app by itself:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm --filter @agentmou/web dev
```

Build and start the production bundle:

```bash
pnpm --filter @agentmou/web build
pnpm --filter @agentmou/web start
```

## Key Surfaces

### Route Groups

| Route group | Purpose |
| --- | --- |
| `app/(marketing)` | Public clinic marketing pages, `/platform`, `/contact-sales`, and the `/docs` alias |
| `app/(auth)` | Login and registration flows |
| `app/auth/callback`, `app/reset-password` | OAuth return handling and password reset deep links |
| `app/app` | Authenticated app shell and tenant redirects |
| `app/app/[tenantId]` | Tenant-scoped control center with vertical-aware routing, admin pages, and legacy `/platform/*` aliases |

### Data providers

| Provider | When | Catalog source |
| --- | --- | --- |
| `mockProvider` | Marketing layout `DataProviderContext` default | `lib/demo-catalog`, `lib/demo/read-model.ts`, and clinic fixtures in `lib/demo/clinic-demo-fixtures.ts` + `lib/demo/clinic-read-model.ts` |
| `demoProvider` | `tenantId === demo-workspace` | Same as mock, plus operational overlay and read-only clinic demo data in `lib/data/demo-provider.ts` |
| `apiProvider` | Authenticated real tenants | `services/api` via `lib/api/client.ts` and `lib/api/clinic.ts` |

### Important Modules

- `app/layout.tsx` mounts theme support, toaster notifications, and analytics.
- `proxy.ts` redirects unauthenticated traffic away from `/app/*` except
  the public `demo-workspace`, and keeps authenticated users out of `/login`
  and `/register`.
- `lib/api/core.ts` contains shared request, error, and query-string helpers
  for the web API clients.
- `lib/api/client.ts` contains typed fetchers for tenants, catalog, runs,
  approvals, connectors, and installations.
- `lib/api/clinic.ts` contains typed fetchers for the clinic backend families
  and parses structured `409 clinic_feature_unavailable` responses into
  `ClinicFeatureUnavailableApiError`.
- `lib/data/api-provider.ts` adapts both the original control-plane API and the
  clinic API to the `DataProvider` interface.
- `lib/data/demo-provider.ts` powers `demo-workspace` with read-only demo data
  and operational vs non-operational availability (`planned` + status note),
  plus the dental clinic overlay used by the clinic shell.
- `lib/internal-navigation.ts`, `lib/tenant-routing.ts`, and
  `lib/vertical-registry.ts` resolve shell, navigation, and route policies for
  `internal`, `clinic`, and `fisio`.
- `lib/demo/read-model.ts` is the synchronous selector layer used only behind
  `mockProvider`.
- `lib/demo/clinic-demo-fixtures.ts` contains the dental demo tenant story used
  by the clinic shell: 11 patients, WhatsApp + voice journeys, forms,
  confirmations, a live gap-fill case, and a running reactivation campaign.
- `lib/demo/clinic-read-model.ts` is the synchronous clinic selector layer used
  behind `mockProvider` and `demoProvider`.
- `lib/catalog/availability.ts` centralizes default listing tier resolution for UI.
- `lib/demo-catalog/` owns the demo inventory, marketing featured IDs, and
  generated operational ID index.
- `lib/honest-ui/audit.ts` is the authoritative audit map for placeholder,
  preview, and demo tenant surfaces.
- `lib/marketing/featured-from-demo.ts` builds the homepage catalog payload.
- `lib/marketing/site-config.ts` defines the clinic marketing nav/footer
  structure.
- `lib/marketing/clinic-site.ts` contains the clinic marketing read model used
  by the homepage, pricing, and security surfaces.
- `lib/marketing/public-catalog.ts` remains for optional API/filesystem catalog
  helpers; homepage cards no longer depend on it.
- `app/api/contact-sales/route.ts` validates and relays public sales leads to a
  webhook with a controlled non-production fallback when no webhook is set.
- `components/marketing/` contains the dedicated clinic marketing sections,
  technical `/platform` grid, and `ContactSalesForm`.
- `lib/auth/store.ts` owns login, registration, cookie hydration, and active-tenant selection.
- `lib/tenant-experience.tsx` exposes `useResolvedTenantExperience`, which
  prefers `GET /tenants/:tenantId/experience` and only falls back to
  tenant/profile/module reads when the resolved payload is missing.
- `components/auth/` provides the tabbed sign-in / register UI (`AuthForm`,
  `PasswordInput`) used by `app/(auth)`.
- `components/clinic/` contains the clinic shell, inbox/detail views, agenda
  board, follow-up cards, KPI cards, and the shared impersonation banner used
  when an operator is acting as another tenant user.
- `components/admin/` contains the internal Admin console for tenant directory,
  membership management, vertical changes, and impersonation flows.
- `lib/search-index.ts` and the command palette switch between `clinic` and
  `platform_internal` inventories so clinic tenants search patients,
  appointments, conversations, forms, gaps, and campaigns instead of
  marketplace and runs.
- `components/ui/` is the current source of truth for reusable UI primitives;
  there is no live `packages/ui` workspace package.

Clinical tenants now use:

- `dashboard` as `Resumen`
- `bandeja`, `agenda`, `pacientes`
- `seguimiento`, `seguimiento/formularios`,
  `seguimiento/confirmaciones`, `seguimiento/huecos`
- `reactivacion`, `rendimiento`, `configuracion`

The original platform pages remain available under
`/app/[tenantId]/platform/*` as legacy aliases. Internal tenants use the same
destinations through canonical top-level routes such as `/runs`, `/marketplace`,
`/security`, `/settings`, and `/admin/tenants`.

For clinic and fisio tenants, manual entry to internal or `/platform/*` routes
redirects back to the vertical default route. `demo-workspace` keeps a
realistic clinic shell but hides internal/admin surfaces by default.

The demo clinic currently covers these reference journeys:

- new patient via WhatsApp -> form completed -> appointment booked
- existing patient reschedule with WhatsApp + callback
- pending and confirmed appointment confirmations
- recent cancellation -> active gap -> outreach to a compatible waitlist patient
- running reactivation campaign with booked, contacted, and failed recipients

## Configuration

Required or important environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL for `services/api`; defaults to `http://localhost:3001` |
| `MARKETING_PUBLIC_BASE_URL` | Canonical marketing origin used by metadata and cross-surface public links |
| `APP_PUBLIC_BASE_URL` | Canonical app/auth origin used by login and demo deep links |
| `API_PUBLIC_BASE_URL` | Canonical public API origin exposed to the client bundle |
| `CONTACT_SALES_WEBHOOK_URL` | Optional webhook URL for `POST /api/contact-sales`; when omitted outside production, the route accepts and logs leads locally |
| `CONTACT_SALES_WEBHOOK_TOKEN` | Optional bearer token sent to the contact-sales webhook |
| API `AUTH_WEB_ORIGIN_ALLOWLIST` | Comma-separated origins allowed for OAuth `return_url` (e.g. `http://localhost:3000`). Must include the web app origin or OAuth redirects are rejected. |

The app also expects the auth flow to set the `agentmou-token` cookie used by
`proxy.ts` and the typed API client.

## Development

```bash
pnpm --filter @agentmou/web typecheck
pnpm --filter @agentmou/web lint
pnpm --filter @agentmou/web build
```

Use `pnpm dev` at the repo root when you want the web app to run together with
other workspaces.

To re-check the clinic demo dataset without starting the app:

```bash
pnpm test:clinic-demo-smoke
```

After changing operational manifests, refresh the generated ID list:

```bash
pnpm demo-catalog:generate
```

## Related Docs

- [Web App Architecture](../../docs/architecture/apps-web.md)
- [Architecture Overview](../../docs/architecture/overview.md)
- [Catalog, Demo, and Marketing](../../docs/catalog-and-demo.md)
- [ADR-011: Enterprise Auth Strategy](../../docs/adr/011-enterprise-auth-strategy.md)
- [Honest UI Audit Map](./lib/honest-ui/audit.ts)
- [Repository Map](../../docs/repo-map.md)
