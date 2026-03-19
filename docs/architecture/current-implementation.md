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

- BullMQ workers with 5 active queues: `install-pack`, `run-agent`,
  `run-workflow`, `schedule-trigger`, `approval-timeout`.
- `install-pack`: reads pack manifest, creates agent and workflow
  installations in DB, and registers BullMQ repeatable jobs for agents
  with cron triggers (e.g. inbox-triage fires every 15 min).
- `run-agent`: loads installation, catalog assets (prompt.md + policy.yaml),
  decrypted tenant connectors, and delegates to `AgentEngine.execute()`
  which handles planning, policy checks, tool calls, and step-level DB
  logging.
- `run-workflow`: loads installation + n8nWorkflowId, triggers execution
  via N8nClient, records steps.
- `schedule-trigger`: loads schedule from DB, creates `execution_runs` row,
  and enqueues the appropriate `run-agent` or `run-workflow` job.
- `approval-timeout`: auto-resolves pending approvals (auto-approve,
  auto-reject, or escalate) and writes audit events.
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

### Agent Engine (packages/agent-engine)

- `Planner`: generates execution plans via GPT-4o-mini (structured JSON)
  with a deterministic fallback for inbox-triage when no API key is set.
- `PolicyEngine`: evaluates actions against loaded `policy.yaml` configs —
  checks provider permissions (gmail.read/write/delete), HITL approval
  requirements for high-risk actions, and registered policy rules.
- `Toolkit`: real tool implementations — `gmail-read` (list + fetch
  messages via GmailConnector), `gmail-label` (add/remove labels),
  `analyze-email` (calls Python agents API).
- `RunLogger`: persists execution steps and run metrics to the database
  (`execution_steps`, `execution_runs` tables).
- `AgentEngine.execute()`: orchestrates plan → policy → tool → log
  pipeline with error handling and aggregated metrics.

### Connectors (packages/connectors)

- `GmailConnector`: backed by `googleapis` client library with OAuth2
  token refresh, real Gmail API calls (list, get, modify, getProfile).
- `encrypt`/`decrypt` helpers: AES-256-GCM for token encryption at rest.
- `loadGmailConnector`: decrypts stored tokens from DB and returns a
  ready-to-use connector instance.
- `loadTenantConnectors`: loads all connected connectors for a tenant.

### OAuth (services/api + packages/db)

- `connector_accounts` table extended with `access_token`, `refresh_token`,
  `token_expires_at`, `external_account_id`, `connected_at` columns.
- `connector_oauth_states` table for CSRF protection during OAuth dance.
- `OAuthService`: generates Google authorize URLs, handles callback with
  state validation, token exchange, encryption, and storage.
- Routes: `GET /connectors/oauth/gmail/authorize` (tenant-scoped) and
  `GET /api/v1/oauth/callback` (public).
- ADR-008 documents the token storage strategy.

### Database

- 14-table Drizzle schema with foreign keys (added
  `connector_oauth_states` and `schedules`).
- 3 migrations generated (initial, OAuth fields, schedules).
- Seed script for local development.

### Testing

- Vitest currently runs 67 tests across 6 packages/services.
- `pnpm test` runs green as part of the Turbo task graph.

### Agents Service (services/agents)

- Python FastAPI service with `/health`, `/health/deep`, `/hello`, and
  `/analyze-email` endpoints.
- `POST /analyze-email`: classifies emails using GPT-4o-mini with
  structured JSON output (priority, category, action, labels, summary).
- `POST /health/deep`: verifies OpenAI API connectivity.
- Production compose places this service behind Traefik, and non-health
  endpoints are protected by the `x-api-key` header. See the
  [Platform Context v2 operational verification snapshot](../architecture/platform-context-v2.md#operational-verification-snapshot-on-march-19-2026)
  for the live-status evidence that was actually revalidated.

### Infrastructure (VPS)

The repository defines a single-VPS production stack
([ADR-006](../adr/006-vps-stack-alignment.md)):

- **Compose**: `infra/compose/docker-compose.prod.yml` is the source of
  truth for the intended VPS stack (project name: `agentmou-stack`).
- **Compose-defined services**: Traefik, Postgres 16, Redis 7, n8n, agents
  (Python), API, worker, migrate, and optional web.
- **Node services**: `api` and `worker` are first-class services in
  production compose; only `web` is behind `--profile web`.
- **Networks**: `web` (external, Traefik-facing) and `internal` (isolated,
  DB-only).
- **Data**: bind mounts to repo-relative directories (postgres/data,
  redis/data, n8n/data, etc.).
- **TLS**: Traefik with Let's Encrypt ACME HTTP challenge.
- **Middlewares**: BasicAuth, HSTS/secure-headers, rate-limit, noindex.
- **Backups**: daily PostgreSQL dump + Redis snapshot + n8n workflow
  export with 14-day rotation.
- **Live verification**: on March 19, 2026, the VPS host
  `vps-n8n-agents` was inspected directly at `/srv/agentmou-platform`.
  `docker compose ps` showed Traefik, Postgres, Redis, n8n, agents, API,
  worker, and Uptime Kuma all `Up`; the local Traefik health gate returned
  `200`; an initial hardened catalog-content check failed and led to a
  follow-up `REPO_ROOT` fix; the final `deploy-phase25.sh` rerun passed the
  hardened public smoke test `3/3`; `/api/v1/catalog/agents` returned the
  live `inbox-triage` manifest; and worker logs showed all 5 active queues
  listening.
- **Monitoring**: Uptime Kuma at `uptime.DOMAIN` when the VPS stack is up.

See [VPS Operations](../runbooks/vps-operations.md) for operational
details.

## What Is Still Incomplete

- The root-owned legacy cron file `/etc/cron.d/stack-backup` still points at
  `/srv/stack`. The tracked backup script was proven to work outside the repo
  checkout, but replacing the cron job with `/etc/cron.d/agentmou-backup`
  remains blocked until an operator with sudo access performs that root-level
  change.
- The stale `.env.bak` copy inside the VPS checkout was removed, but broader
  provider-backed secret rotation still needs explicit operator follow-up.
- Usage metering and billing (stubs exist, not blocking).
- Knowledge/memory with pgvector.
- RBAC and multi-tenant isolation hardening.
- Enterprise features: SSO/SAML, audit export, retention controls.
- Additional connector providers (Slack, Drive, etc.).

## Validation Snapshot

- `pnpm typecheck`: 13/13 pass on March 19, 2026.
- `pnpm build`: last documented green snapshot remains March 18, 2026; it was
  not re-run during Epic D.
- `pnpm lint`: 12/12 pass on March 19, 2026 (warnings only; 0 errors).
- `pnpm test`: 7/7 pass on March 19, 2026 (70 tests across 7
  packages/services).
- VPS `docker compose ps`: `api`, `worker`, `agents`, `n8n`, `postgres`,
  `redis`, `uptime-kuma`, and Traefik all `Up` on March 19, 2026.
- VPS local edge check: `curl -sk --resolve api.agentmou.io:443:127.0.0.1 https://api.agentmou.io/health`
  returned `200` on March 19, 2026.
- VPS `bash infra/scripts/deploy-phase25.sh`: final rerun passed on March 19,
  2026 and executed the hardened public smoke test internally.
- Hardened `bash infra/scripts/smoke-test.sh`: initially failed `2 passed,
  1 failed` after the packaging-only redeploy, then passed `3 passed, 0
  failed` after the `REPO_ROOT` follow-up fix on March 19, 2026.
- VPS public catalog check: `curl -sk https://api.agentmou.io/api/v1/catalog/agents`
  returned the live `inbox-triage` manifest payload on March 19, 2026.
- VPS tracked backup script: manual run with
  `BACKUP_DIR=/tmp/agentmou-backup LOCK_FILE=/tmp/agentmou-backup.lock`
  completed successfully on March 19, 2026 and left `git status` clean.
