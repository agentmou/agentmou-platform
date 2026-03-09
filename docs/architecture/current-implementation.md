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

Stub modules (not needed for Phase 1): `usage`, `billing`, `security`,
`webhooks`, `n8n`.

### Data Plane (services/worker)

- BullMQ workers initialized with real Redis connection.
- `install-pack` job processes end-to-end: reads pack manifest, creates
  agent and workflow installations in DB.
- Shared `packages/queue` provides queue names and typed payloads.

### Auth

- JWT (jose) + PBKDF2 password hashing in `packages/auth`.
- Register/login/me endpoints in API backed by `users` table.
- No session middleware yet (stateless JWT).

### Web App (apps/web)

- Typed API client (`lib/api/client.ts`) with 20+ methods.
- `useApiData` hook for progressive page migration.
- Pages still consume mock data via `read-model.ts` — migration to API
  client is Phase 2 work.

### Database

- 12-table Drizzle schema with foreign keys.
- Initial migration generated.
- Seed script for local development.

### Testing

- Vitest configured with 25 tests across 3 packages.
- `pnpm test` runs as part of the Turbo task graph.

### Agents Service (services/agents)

- Python FastAPI service with `/health` and `/hello` endpoints.
- Runs on the VPS behind Traefik with BasicAuth + API key auth.
- No business logic yet — scaffold for future agent endpoints called by
  n8n workflows.

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
