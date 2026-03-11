# @agentmou/web

Next.js application for the AgentMou public site and tenant control-plane UI.

## Purpose

`apps/web` is the user-facing surface of the monorepo. It serves two jobs:
- Public marketing pages that explain the product and showcase the catalog.
- Authenticated tenant pages that let users browse templates, install packs,
  review runs, approve actions, and manage workspace settings.

The web app is intentionally a control-plane client. It does not execute agents
or workflows itself.

## Responsibilities

- Render the marketing experience under `app/(marketing)`.
- Handle login and registration under `app/(auth)`.
- Protect tenant routes with Next.js middleware and a JWT cookie.
- Consume the control-plane API through typed client helpers in `lib/api/`.
- Switch between `mockProvider` and `apiProvider` so marketing/demo routes can
  stay mock-backed while authenticated routes use real backend data.

## How It Fits Into The System

`@agentmou/web` sits on top of the rest of the platform:
- Reads domain types from `@agentmou/contracts`.
- Talks to `services/api` through `lib/api/client.ts` and `lib/auth/api.ts`.
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
| `app/app` | Authenticated app shell and tenant redirects |
| `app/app/[tenantId]` | Tenant-scoped dashboard, marketplace, fleet, runs, approvals, security, and settings |

### Important Modules

- `app/layout.tsx` mounts theme support, toaster notifications, and analytics.
- `middleware.ts` redirects unauthenticated traffic away from `/app/*` and keeps authenticated users out of `/login` and `/register`.
- `lib/api/client.ts` contains typed fetchers for tenants, catalog, runs, approvals, connectors, and installations.
- `lib/data/api-provider.ts` adapts the real API to the `DataProvider` interface.
- `lib/data/mock-provider.ts` keeps marketing/demo routes working against the local read model.
- `lib/auth/store.ts` owns login, registration, cookie hydration, and active-tenant selection.

## Configuration

Required or important environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL for `services/api`; defaults to `http://localhost:3001` |

The app also expects the auth flow to set the `agentmou-token` cookie used by
`middleware.ts` and the typed API client.

## Development

```bash
pnpm --filter @agentmou/web typecheck
pnpm --filter @agentmou/web lint
pnpm --filter @agentmou/web build
```

Use `pnpm dev` at the repo root when you want the web app to run together with
other workspaces.

## Related Docs

- [Web App Architecture](../../docs/architecture/apps-web.md)
- [Current Implementation vs Target Plan](../../docs/architecture/current-implementation.md)
- [Monorepo Map](../../docs/architecture/monorepo-map.md)
