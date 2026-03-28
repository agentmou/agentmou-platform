# apps/web Architecture

`apps/web` is the user-facing surface of the monorepo. It combines the public
marketing site, authentication flows, a tenant-scoped control plane, and a
small set of Next.js API routes used by the frontend itself.

## Responsibilities

- Render the public marketing experience under `app/(marketing)`.
- Handle login, registration, password reset, and the B2C OAuth return flow
  under `app/(auth)`.
- Render the authenticated control plane under `app/app/[tenantId]/`.
- Consume `services/api` through typed client helpers in `lib/api/`.
- Expose web-owned API routes for marketing chat and the public catalog cards.
- Keep demo and operational catalog experiences separated through the
  `DataProvider` abstraction.

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

### Tenant control-plane routes

```text
app/app/
├── page.tsx
└── [tenantId]/
    ├── layout.tsx
    ├── approvals/page.tsx
    ├── dashboard/page.tsx
    ├── fleet/page.tsx
    ├── installer/new/page.tsx
    ├── marketplace/page.tsx
    ├── marketplace/agents/[agentId]/page.tsx
    ├── marketplace/packs/[packId]/page.tsx
    ├── marketplace/workflows/[workflowId]/page.tsx
    ├── observability/page.tsx
    ├── runs/page.tsx
    ├── runs/[runId]/page.tsx
    ├── security/page.tsx
    └── settings/page.tsx
```

The `proxy.ts` file protects `/app/*` traffic, keeps authenticated users away
from the login and register pages, and preserves public access to the
`demo-workspace` tenant.

### Next.js API routes

```text
app/api/
├── chat/route.ts
└── public-catalog/route.ts
```

- `chat` is the frontend-owned route for the public chat experience.
- `public-catalog` returns the curated catalog cards used on marketing pages.

## Data Access Model

The control plane uses a single `DataProvider` interface in
`lib/data/provider.ts`. There are three concrete modes:

| Provider | Mode | Used by | Backing source |
| --- | --- | --- | --- |
| `mockProvider` | `mock` | Marketing layouts and synchronous demo reads | `lib/demo/read-model.ts` |
| `demoProvider` | `demo` | `demo-workspace` tenant routes | Demo catalog plus operational overlays |
| `apiProvider` | `api` | Authenticated real tenants | `services/api` |

This separation lets the UI keep a stable shape while some surfaces are fully
live and others are still demo-backed or read-only.

## Important Supporting Modules

- `lib/api/` contains typed fetchers and hooks for `services/api`.
- `lib/auth/` owns cookie hydration, auth requests, and the active tenant store.
- `lib/data/` contains the provider abstraction and the tenant dashboard metric
  helpers.
- `lib/demo-catalog/` stores the curated demo inventory, featured marketing
  IDs, and the generated operational ID index.
- `lib/marketing/featured-from-demo.ts` builds the homepage catalog payload.
- `lib/honest-ui/` centralizes preview and placeholder labeling for the UI.
- `components/` groups reusable UI and domain components used across the app.

## How It Fits Into The Platform

- `apps/web` never executes agents or workflows directly.
- `services/api` remains the source of truth for tenant data, installations,
  approvals, runs, connectors, billing, and security.
- `packages/contracts` provides the shared types used by both the UI and the
  backend.
- `apps/web/lib/demo-catalog/` is intentionally separate from the operational
  manifests in `catalog/` and `workflows/`.

## Related Docs

- [Architecture Overview](./overview.md)
- [Catalog, Demo, and Marketing](../catalog-and-demo.md)
- [Repository Map](../repo-map.md)
- [API Routes](../api-routes.md)
