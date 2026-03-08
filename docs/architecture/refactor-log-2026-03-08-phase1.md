# Refactor Log — 2026-03-08 — Phase 1: Real Control Plane

This log records the Phase 1 refactor that transforms the scaffold-level
backend into a real control plane with database persistence.

## Scope

- `services/api`: all 8 priority modules rewritten with real Drizzle ORM
  persistence.
- `services/worker`: BullMQ workers initialized, install-pack job
  implemented end-to-end.
- `packages/queue`: new shared package for queue names and typed payloads.
- `packages/auth`: real JWT + password hashing (PBKDF2), auth service
  with register/login/me endpoints backed by DB.
- `packages/db`: Drizzle migrations generated, seed script created.
- `apps/web`: typed API client created with 20+ endpoint methods and
  React data-fetching hooks.
- Testing: Vitest configured, 25 tests across 3 packages (contracts,
  catalog-sdk, auth).
- Infrastructure: n8n version pinned, env vars added, 3 ADRs written.

## Key Changes

### 1) API Modules With Real DB Persistence

All 8 priority API modules rewritten from hardcoded mock data to real
Drizzle queries:

| Module | Tables Used | Operations |
| --- | --- | --- |
| tenants | `tenants` | CRUD, settings |
| memberships | `memberships`, `users` | list (with user join), add, update role, remove |
| catalog | filesystem via `catalog-sdk` | list/get agents, workflows, packs from manifests |
| installations | `agent_installations`, `workflow_installations` | list, install, uninstall |
| connectors | `connector_accounts` | list, create, delete, test |
| secrets | `secret_envelopes` | list metadata, create, delete |
| runs | `execution_runs`, `execution_steps` | list, get (with steps join) |
| approvals | `approval_requests` | list, get, approve, reject, create |

Services no longer take Fastify as constructor argument. Fixed multiple
bugs in scaffold route files (typos, wrong param names, import errors).

### 2) Catalog Service From Manifests

The catalog module now reads agent, pack, and workflow manifests from
disk using `@agentmou/catalog-sdk`, caches them in memory, and serves
them through the API. This replaces the hardcoded catalog arrays.

### 3) Worker With Real BullMQ Processing

`services/worker` now initializes actual BullMQ `Worker` instances
connected to Redis. The `install-pack` job processor reads pack manifests
via catalog-sdk and creates installation rows in the database.

### 4) Shared Queue Package

Created `packages/queue` with:

- Queue name constants (`QUEUE_NAMES`).
- Typed job payload interfaces (`InstallPackPayload`, `RunAgentPayload`).
- Connection factory using BullMQ's built-in Redis handling.

Both API (enqueue) and worker (process) import from this package,
preventing queue name drift.

### 5) Real Auth Flow

`packages/auth` now provides:

- JWT creation/verification with `jose`.
- Password hashing with PBKDF2 (no native deps).
- Auth service with register/login backed by `users` table.

### 6) Web Typed API Client

Created `apps/web/lib/api/client.ts` with 20+ typed methods covering
all API endpoints. Created `useApiData` hook for progressive page
migration from mock to API data.

### 7) Database Migrations

Generated initial Drizzle migration (12 tables, 20 foreign keys).
Created seed script for local development. Added `pnpm db:seed` command.

### 8) Testing Baseline

- Vitest configured at workspace root.
- `test` task added to Turbo graph.
- 25 tests: 11 contracts schema tests, 8 catalog-sdk tests (including
  real manifest loading), 6 auth tests (JWT + password).
- `pnpm test` passes 6/6 tasks.

### 9) Infrastructure

- Pinned n8n to v1.76.1 (was `latest`).
- Added `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` to `.env.example`.
- Created ADR-003 (n8n role), ADR-004 (TypeScript first), ADR-005
  (Postgres + pgvector + Redis stack).

## Validation Results

- `pnpm typecheck`: 13/13 pass.
- `pnpm build`: 3/3 pass.
- `pnpm lint`: 12/12 pass (0 errors).
- `pnpm test`: 6/6 pass (25 tests, 0 failures).

## What Remains for Phase 2

- Migrate web pages from mock read-model to API client (progressive).
- Agent runtime with real LLM integration.
- n8n workflow invocation via n8n-client.
- Real connector OAuth flows.
- End-to-end Support Starter vertical slice.
