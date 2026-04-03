# @agentmou/web

Next.js application for the Agentmou public site and tenant control-plane UI.

## Purpose

`apps/web` is the user-facing surface of the monorepo. It serves two jobs:
- Public marketing pages that explain the product and showcase the catalog.
- Authenticated tenant pages that let users browse templates, install packs,
  review runs, approve actions, and manage workspace settings.

The web app is intentionally a control-plane client. It does not execute agents
or workflows itself.

## Responsibilities

- Render the marketing experience under `app/(marketing)`.
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
- Export typed clinic backend fetchers in `lib/api/clinic.ts` while keeping the
  visible tenant UI on the existing `DataProvider` surfaces for now.
- Serve marketing homepage cards from `/api/public-catalog`, built from the
  **curated demo featured list** (`lib/demo-catalog/marketing-featured.ts`) plus
  `demoTotals`, `operationalFeaturedCounts`, and `gaInventoryCounts` (see
  `docs/catalog-and-demo.md`). Featured ids must be operational and marked
  `availability: available` in demo data.
- Switch between `apiProvider` and `demoProvider`: real tenants use the API
  catalog; `demo-workspace` uses the full demo inventory with **planned** +
  **Coming soon** on items not backed by operational manifests
  (`operational-ids.gen.json` + `operational-refs.ts`).
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
| `app/(marketing)` | Public landing, pricing, docs, and security pages |
| `app/(auth)` | Login and registration flows |
| `app/auth/callback`, `app/reset-password` | OAuth return handling and password reset deep links |
| `app/app` | Authenticated app shell and tenant redirects |
| `app/app/[tenantId]` | Tenant-scoped dashboard, marketplace, fleet, runs, approvals, security, and settings |

### Data providers

| Provider | When | Catalog source |
| --- | --- | --- |
| `mockProvider` | Marketing layout `DataProviderContext` default | `lib/demo-catalog` via `lib/demo/read-model.ts` |
| `demoProvider` | `tenantId === demo-workspace` | Same as mock, plus operational overlay in `lib/data/demo-provider.ts` |
| `apiProvider` | Authenticated real tenants | `services/api` / `catalog/` + `workflows/` on disk |

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
- `lib/data/api-provider.ts` adapts the real API to the `DataProvider` interface.
- `lib/data/demo-provider.ts` powers `demo-workspace` with read-only demo data
  and operational vs non-operational availability (`planned` + status note).
- `lib/demo/read-model.ts` is the synchronous selector layer used only behind
  `mockProvider`.
- `lib/catalog/availability.ts` centralizes default listing tier resolution for UI.
- `lib/demo-catalog/` owns the demo inventory, marketing featured IDs, and
  generated operational ID index.
- `lib/honest-ui/audit.ts` is the authoritative audit map for placeholder,
  preview, and demo tenant surfaces.
- `lib/marketing/featured-from-demo.ts` builds the homepage catalog payload.
- `lib/marketing/public-catalog.ts` remains for optional API/filesystem catalog
  helpers; homepage cards no longer depend on it.
- `lib/auth/store.ts` owns login, registration, cookie hydration, and active-tenant selection.
- `components/auth/` provides the tabbed sign-in / register UI (`AuthForm`,
  `PasswordInput`) used by `app/(auth)`.
- `components/ui/` is the current source of truth for reusable UI primitives;
  there is no live `packages/ui` workspace package.

The clinic fetchers are intentionally not wired into `DataProvider` yet. This
PR adds typed backend access for later UI phases without changing the current
tenant page surface.

## Configuration

Required or important environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL for `services/api`; defaults to `http://localhost:3001` |
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
