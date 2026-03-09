# Current Implementation vs Target Plan

This document reconciles the real codebase with the architecture described
in [`whole-initial-context.md`](../../whole-initial-context.md).

## Target Architecture (from Source of Truth)

- One monorepo with clear boundaries: `apps`, `services`, `packages`,
  `catalog`, `workflows`, `infra`.
- Two logical planes:
  - Control Plane: web + API + tenant/configuration/governance state.
  - Data Plane: worker + runtime + job/event execution.
- n8n as deterministic workflow capability, not control plane source of
  truth ([ADR-003](../adr/003-n8n-role.md)).
- Domain split: `template` vs `installation` vs `execution`.
- Shared contracts as type source of truth
  ([ADR-002](../adr/002-shared-contracts-type-system.md)).
- TypeScript runtime first ([ADR-004](../adr/004-typescript-runtime-first.md)).
- Postgres + pgvector + Redis stack
  ([ADR-005](../adr/005-postgres-pgvector-redis-stack.md)).

## What Is Implemented

### Control Plane (services/api)

8 API modules with real Drizzle ORM persistence:

| Module | Status | Tables |
| --- | --- | --- |
| tenants | Real CRUD | `tenants` |
| memberships | Real CRUD + user join | `memberships`, `users` |
| catalog | Real from manifest files | filesystem via catalog-sdk |
| installations | Real CRUD | `agent_installations`, `workflow_installations` |
| connectors | Real CRUD | `connector_accounts` |
| secrets | Real create/list/delete | `secret_envelopes` |
| runs | Real query + steps join | `execution_runs`, `execution_steps` |
| approvals | Real CRUD + decide | `approval_requests` |

Stub modules (not needed for Phase 2): `usage`, `billing`, `security`,
`webhooks`.

Phase 2 additions:

- `auth` module: register creates user + tenant + membership in
  transaction; JWT middleware + tenant access guard on all tenant routes.
- `n8n` module: wired to real n8n instance via `@agentmou/n8n-client`
  ([ADR-007](../adr/007-n8n-workflow-provisioning.md)).
- `runs` module: `POST /tenants/:id/runs` triggers agent or workflow
  execution by enqueuing BullMQ jobs.

### Data Plane (services/worker)

- BullMQ workers with 3 active queues: `install-pack`, `run-agent`,
  `run-workflow`.
- `install-pack`: reads pack manifest, creates agent and workflow
  installations in DB.
- `run-agent`: loads installation, calls Python agents API, records
  execution steps in DB.
- `run-workflow`: loads installation + n8nWorkflowId, triggers execution
  via N8nClient, records steps.
- Shared `packages/queue` provides queue names and typed payloads.

### Auth

- JWT (jose) + PBKDF2 password hashing in `packages/auth`.
- Register creates user + tenant + membership in a single transaction.
- Login returns user + tenants + token.
- JWT middleware (`requireAuth`) and tenant access guard
  (`requireTenantAccess`) protect all `/tenants/:id/*` routes.

### Web App (apps/web)

- Real login/register pages with API integration (zustand auth store,
  JWT cookie, Next.js middleware for route protection).
- DataProvider abstraction: `mockProvider` for marketing/demo routes,
  `apiProvider` for authenticated app routes.
- All 13 tenant pages migrated from mock data to API provider via
  `useProviderQuery` hook.
- Marketing pages still use mock provider for full demo catalog.
- Toaster (sonner) for user feedback on auth and data operations.

### Database

- 12-table Drizzle schema with foreign keys.
- Initial migration generated.
- Seed script for local development.

### Testing

- Vitest configured with 25 tests across 3 packages.
- `pnpm test` runs as part of the Turbo task graph.

### Agents Service (services/agents)

- Python FastAPI service with `/health`, `/health/deep`, `/hello`, and
  `/analyze-email` endpoints.
- `POST /analyze-email`: classifies emails using GPT-4o-mini with
  structured JSON output (priority, category, action, labels, summary).
- `POST /health/deep`: verifies OpenAI API connectivity.
- Runs on the VPS behind Traefik, protected by `x-api-key` header.

### Infrastructure (VPS)

The production stack runs on a single VPS
([ADR-006](../adr/006-vps-stack-alignment.md)):

- **Compose**: `infra/compose/docker-compose.prod.yml` is the source of
  truth for the VPS stack (project name: `agentmou-stack`).
- **Services**: Traefik, Postgres 16, Redis 7, n8n, agents (Python),
  Uptime Kuma.
- **Node services** (api, worker, web): available via `--profile node`
  but not yet active in production.
- **Networks**: `web` (external, Traefik-facing) and `internal` (isolated,
  DB-only).
- **Data**: bind mounts to repo-relative directories (postgres/data,
  redis/data, n8n/data, etc.).
- **TLS**: Traefik with Let's Encrypt ACME HTTP challenge.
- **Middlewares**: BasicAuth, HSTS/secure-headers, rate-limit, noindex.
- **Backups**: daily PostgreSQL dump + Redis snapshot + n8n workflow
  export with 14-day rotation.
- **Monitoring**: Uptime Kuma at `uptime.DOMAIN`.

See [VPS Operations](../runbooks/vps-operations.md) for operational
details.

## What Is Still Incomplete

- Agent runtime does not call real LLMs (executeWithTools is stub).
- n8n workflow invocation not implemented.
- Web pages still use mock data (API client is ready but not wired to
  pages yet).
- No real OAuth connector flows.
- No session middleware on API routes (auth is available but not enforced).
- No usage metering or billing.
- No knowledge/memory/pgvector.

## Validation Snapshot

- `pnpm typecheck`: 13/13 pass.
- `pnpm build`: 3/3 pass.
- `pnpm lint`: 12/12 pass (0 errors).
- `pnpm test`: 6/6 pass (25 tests).
