# @agentmou/api

Fastify-based control-plane API for tenants, catalog access, installations,
connectors, approvals, public chat, and run orchestration.

## Purpose

`services/api` is the main backend entry point for the platform. It exposes the
HTTP API used by `apps/web`, persists tenant state through Drizzle ORM, and
bridges synchronous control-plane requests to asynchronous worker execution via
BullMQ.

## Responsibilities

- Expose public authentication and catalog endpoints.
- Expose a public chat endpoint for the marketing experience.
- Protect authenticated and tenant-scoped routes with JWT and membership checks.
- Validate selected request bodies with Zod-based validators.
- Persist tenants, memberships, connectors, secrets, installations, runs, and
  approvals through `@agentmou/db`.
- Queue long-running work such as pack installation and run execution.
- Handle Gmail OAuth initiation and callback flows.
- Proxy selected n8n workflow management operations through `@agentmou/n8n-client`.
- Install workflow templates only when a real definition exists in
  `workflows/public/<templateId>/workflow.json`.

## How It Fits Into The System

`@agentmou/api` is the control-plane backend between the UI and the data plane:
- `apps/web` calls this service for auth, tenant data, and workflow management.
- `services/worker` consumes jobs that this API enqueues.
- `@agentmou/contracts` provides shared types and schemas.
- `@agentmou/db` provides the PostgreSQL schema and client.
- `@agentmou/queue` provides queue names and typed BullMQ payloads.

## Local Usage

Run the API in watch mode:

```bash
pnpm --filter @agentmou/api dev
```

Build and run the compiled service:

```bash
pnpm --filter @agentmou/api build
pnpm --filter @agentmou/api start
```

Health endpoint:

```bash
curl http://localhost:3001/health
```

## Route Overview

### Public Routes

| Prefix | Purpose |
| --- | --- |
| `/health` | Liveness check |
| `/api/v1/auth` | Register, login, me, B2C OAuth (Google/Microsoft), one-time code exchange, forgot/reset password |
| `/api/v1/catalog` | Agent, pack, workflow, category, and search access |
| `/public/chat` | Public chat route backed by shared contracts |
| `/api/v1/oauth/callback` | Public Google OAuth callback |

### Authenticated Routes

| Area | Examples |
| --- | --- |
| Tenants | `/api/v1/tenants`, `/api/v1/tenants/:id/settings` |
| Memberships | `/api/v1/tenants/:tenantId/members` |
| Installations | `/api/v1/tenants/:tenantId/installations/*` |
| Connectors | `/api/v1/tenants/:tenantId/connectors/*` |
| Secrets | `/api/v1/tenants/:tenantId/secrets/*` |
| Approvals | `/api/v1/tenants/:tenantId/approvals/*` |
| Runs | `/api/v1/tenants/:tenantId/runs/*` |
| n8n | `/api/v1/tenants/:tenantId/n8n/*` |

Stub modules for usage, billing, security, and webhooks are registered so the
route shape exists even where the implementation is still thin.

## Important Modules

- `src/app.ts` wires middleware, route registration, CORS, and validation.
- `src/modules/auth` owns register/login/me, B2C OAuth (authorize/callback,
  exchange, identity linking), forgot/reset password, and related rate limits.
- `src/modules/catalog` serves manifest-backed catalog data.
  It maps operational manifests to shared UI catalog contracts before sending
  API responses.
- `src/modules/installations` creates installations and queues pack installs.
  `GET /installations` returns grouped `{ agents, workflows }` lists.
- `src/modules/connectors` manages connector records and Gmail OAuth flows.
- `src/modules/runs` creates run records and triggers agent or workflow jobs.
- `src/modules/approvals` manages human-in-the-loop requests and decisions.
- `src/modules/n8n` adapts workflow import/export/execute operations to `@agentmou/n8n-client`.
- `src/modules/public-chat` exposes the public chat route and its backing
  service.

## Configuration

Important environment variables discovered from the service and its immediate
dependencies:

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3001` |
| `HOST` | Bind host; defaults to `0.0.0.0` |
| `LOG_LEVEL` | Fastify logger level |
| `CORS_ORIGIN` | Allowed browser origin and OAuth redirect base |
| `JWT_SECRET` | Signing secret used by `@agentmou/auth` |
| `DATABASE_URL` | PostgreSQL connection string via `@agentmou/db` |
| `REDIS_URL` | Redis connection for BullMQ queues via `@agentmou/queue` |
| `GOOGLE_CLIENT_ID` | Gmail OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Public OAuth callback URL |
| `AUTH_WEB_ORIGIN_ALLOWLIST` | Comma-separated browser origins allowed for OAuth `return_url` validation |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | B2C Google login (separate from Gmail connector client when you split them) |
| `GOOGLE_OAUTH_REDIRECT_URI` | API callback URL for B2C Google login |
| `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET` | B2C Microsoft login |
| `MICROSOFT_OAUTH_REDIRECT_URI` | API callback URL for B2C Microsoft login |
| `LOG_PASSWORD_RESET_LINK` | When `1`, log reset links (intended for non-production debugging) |
| `CONNECTOR_ENCRYPTION_KEY` | AES-256-GCM key for stored connector tokens |
| `N8N_API_URL` | n8n API base URL for workflow provisioning |
| `N8N_API_KEY` | n8n API key |

See [`infra/compose/.env.example`](../../infra/compose/.env.example) for the
current local and VPS-oriented example values.

## Development

```bash
pnpm --filter @agentmou/api typecheck
pnpm --filter @agentmou/api lint
pnpm --filter @agentmou/api test
pnpm --filter @agentmou/api build
```

## Related Docs

- [Current State](../../docs/architecture/current-state.md)
- [Repository Map](../../docs/repo-map.md)
- [ADR-007: n8n Workflow Provisioning](../../docs/adr/007-n8n-workflow-provisioning.md)
- [ADR-008: Connector OAuth Token Storage](../../docs/adr/008-connector-oauth-token-storage.md)
- [ADR-013: Enterprise Auth / SSO Strategy](../../docs/adr/013-enterprise-auth-sso-strategy.md)
