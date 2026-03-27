# Current State

**Validated on**: March 19, 2026

**Internal ops addendum**: The private `services/internal-ops` subsystem plus
its related contracts, DB tables, and worker execution path were code-verified
on March 25, 2026. The broader production verification snapshot below retains
its March 19-20, 2026 evidence baseline.

**B2C auth addendum (code-verified March 27, 2026)**: The repository now
includes DB-backed user OAuth identities, B2C authorize/callback routes on the
API, a one-time code exchange, forgot/reset password endpoints, matching web
routes (`/auth/callback`, `/reset-password`), and ADR
[`013-enterprise-auth-sso-strategy.md`](../adr/013-enterprise-auth-sso-strategy.md)
for enterprise SSO direction. Production was not re-verified end-to-end for
these flows in this update; treat the March 19-20 operational table as the live
evidence baseline for VPS behavior until a new smoke pass is recorded.

This document is the current, code-verified architecture and operations
context for the repository. It supersedes the original architecture proposal
and should be used as the canonical starting point for operational
understanding of the repo as it exists today.

Active planning derived from this document lives in
[`../planning/roadmap.md`](../planning/roadmap.md). Retired execution planning
has been intentionally removed from the active documentation surface.

## How To Read This Document

- The code and configuration in this repository are the source of truth.
- Capability labels are intentionally conservative:
  - `implemented`: present in code and wired into the active repository shape
  - `partial`: real but incomplete, mixed with fallback paths, or not yet fully
    aligned across layers
  - `stub`: exposed surface exists, but behavior is placeholder or hard-coded
  - `planned`: directory, scaffold, or architectural intention exists without a
    real end-to-end implementation
- This document does not propose new APIs or schema changes. It describes the
  current state and highlights the most justified corrective actions.

## Executive Status

Agentmou is no longer at the purely aspirational stage described in the initial
context. The repository now contains a real monorepo structure, a working
control-plane API, a background worker, a first runtime slice, Gmail OAuth, and
versioned catalog/workflow assets. At the same time, it still carries demo
inventory, stubbed modules, and contract drift between shared types and runtime
payloads.

### Validated Snapshot

| Area                        | Status        | Notes                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo structure          | `implemented` | `apps/`, `services/`, `packages/`, `catalog/`, `workflows/`, `infra/`, and `docs/` are all present and used                                                                                                                                                                                                  |
| Control plane API           | `partial`     | Core modules are real; some tenant-facing modules remain stubbed                                                                                                                                                                                                                                             |
| Personal internal ops plane | `partial`     | `services/internal-ops` is a real private control-plane service with Telegram ingress, remote OpenClaw turns, `hc-coherence` governance, and worker handoffs                                                                                                                                                 |
| Web app                     | `partial`     | Authenticated routes use the API provider, but marketing/demo and some tenant surfaces still rely on demo or empty-default paths                                                                                                                                                                             |
| Data plane                  | `partial`     | Worker queues and runtime path are real, but breadth and contract maturity are still limited                                                                                                                                                                                                                 |
| Catalog and workflow assets | `partial`     | Real installable assets exist, but demo inventory is much larger than the real catalog                                                                                                                                                                                                                       |
| Infrastructure model        | `partial`     | Production compose and deploy scripts are present, and the March 19-20, 2026 VPS inspection plus follow-up fixes verified live API, worker, edge, backup cron, protected public routes, Gmail OAuth, the real n8n provisioning path, full validation-fixture cleanup, and the OpenAI-backed deep-health path |
| Validation baseline         | `implemented` | `pnpm typecheck`, `pnpm test`, and `pnpm lint` all pass from the repo root as of March 19-20, 2026; `pnpm lint` still reports non-blocking warnings                                                                                                                                                          |

### Validation Commands Observed On March 19-20, 2026

- `pnpm typecheck`: passes
- `pnpm test`: passes
- `pnpm lint`: passes with warnings only (0 errors)

The March 17 Vitest resolution failure no longer reproduces in the current repo
state.

### Operational Verification Snapshot On March 19-20, 2026

This snapshot separates repository deployment intent from the live production
truth that was actually verified during this epic.

| Check                                                             | Result          | Evidence / limits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VPS copy of `bash infra/scripts/smoke-test.sh` before remediation | `passed`        | Executed on the VPS from `/srv/agentmou-platform`; `3 passed, 0 failed` for API health `200`, catalog `200`, and invalid-login auth `400`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Hardened `bash infra/scripts/smoke-test.sh` before remediation    | `failed`        | Re-run against the VPS before any redeploy; `2 passed, 1 failed` because `/api/v1/catalog/agents` returned `{"agents":[]}` instead of containing `inbox-triage`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| First `infra/scripts/deploy-phase25.sh` after `1572f669`          | `failed`        | Redeploy rebuilt the images, but the hardened smoke test still failed because the compiled services resolved `REPO_ROOT` one level too high and kept serving an empty catalog                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Second `infra/scripts/deploy-phase25.sh` after `f2a73bad`         | `passed`        | Redeploy from `main` rebuilt API and worker, local edge health returned `200`, and the hardened public smoke test passed `3 passed, 0 failed`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| VPS checkout drift                                                | `clean`         | Known untracked artifacts (`infra/backups/backup.sh`, `infra/backups/stack-backup.lock`, and `infra/compose/.env.bak.*`) were removed; `git status --short --branch` returned only `## main...origin/main` before and after the final redeploy and after the residual-risk cleanup                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Root backup cron replacement                                      | `passed`        | `/etc/cron.d/stack-backup` was removed, `/etc/cron.d/agentmou-backup` was installed, `/srv/stack` was confirmed absent, and the tracked backup script ran to `/var/backups/agentmou` without reintroducing git drift                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Local edge health via `curl --resolve ... 127.0.0.1`              | `passed`        | Executed on the VPS host; `https://api.agentmou.io/health` returned `200` through local Traefik routing before and after the residual-risk cleanup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| API health                                                        | `live-verified` | Local edge check returned `200`; public smoke test returned `200`; API logs showed live requests to `/health` and `/api/v1/auth/login` on March 19, 2026                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Catalog reachability                                              | `live-verified` | Public smoke test returned `200` for `/api/v1/catalog/agents`; API logs showed repeated successful catalog requests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Catalog content                                                   | `live-verified` | After the follow-up `REPO_ROOT` fix, `curl -sk https://api.agentmou.io/api/v1/catalog/agents` returned the `inbox-triage` manifest payload from production                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Minimal auth validation                                           | `live-verified` | Public smoke test returned `400` for invalid `POST /api/v1/auth/login`, matching expected schema-validation behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Worker live status                                                | `live-verified` | `docker compose ps` showed `worker` `Up`; the March 19 production logs showed 5 active queues listening: `install-pack`, `run-agent`, `run-workflow`, `schedule-trigger`, and `approval-timeout`. The repo now additionally starts `internal-work-order`, which was verified from code on March 25, 2026 rather than from that earlier VPS snapshot                                                                                                                                                                                                                                                                                                                                                 |
| Edge status                                                       | `live-verified` | `docker compose ps` showed Traefik `Up` on ports `80` and `443`; the local Traefik health gate returned `200`; recent Traefik logs showed active certificate-renew checks on March 19, 2026                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Protected public routes                                           | `live-verified` | `https://agents.agentmou.io/health` returned `401` without BasicAuth and `200` with the rotated BasicAuth credential; `https://uptime.agentmou.io/` returned `401` without auth and `302 /dashboard` with it; `https://n8n.agentmou.io/` returned `200`                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| VPS-local secret rotation                                         | `passed`        | `JWT_SECRET`, `AGENTS_API_KEY`, and `BASIC_AUTH_USERS` were rotated in `infra/compose/.env`; only `api`, `worker`, `agents`, and `traefik` were recreated; the hardened public smoke test still passed `3 passed, 0 failed` afterward                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Tracked backup script outside the checkout                        | `passed`        | Manual runs with `BACKUP_DIR=/tmp/agentmou-backup LOCK_FILE=/tmp/agentmou-backup.lock` and later `BACKUP_DIR=/var/backups/agentmou LOCK_FILE=/var/lock/agentmou/backup.lock` produced PostgreSQL, Redis, n8n, and file backups and left `git status` clean                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Gmail OAuth end-to-end                                            | `live-verified` | A first live attempt expired the 10-minute state TTL; a second authorize URL completed within the window, `/api/v1/oauth/callback` returned `302` without an OAuth error log, and the connectors API showed `gmail` `connected` for the temporary tenant used for validation                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Connector cleanup after OAuth test                                | `live-verified` | After deploying `d358428` from `codex/fix-production-residual-risks`, a fresh disposable tenant was created through `POST /api/v1/auth/register`, `POST /api/v1/tenants/:tenantId/connectors` returned `201` for `gmail`, `DELETE /api/v1/tenants/:tenantId/connectors/gmail` returned `200`, and `GET /api/v1/tenants/:tenantId/connectors` came back empty. The guarded `scripts/cleanup-validation-tenant.ts` path was then dry-run and execute-verified on both the historical March 19 OAuth fixture and the temporary delete-test tenant, with PostgreSQL post-checks showing `tenants=0`, `memberships=0`, `connector_accounts=0`, and `users=0` for each cleanup target                     |
| Provider-backed rotation: `GOOGLE_CLIENT_SECRET`                  | `live-verified` | After the live `.env` update and service restart, a fresh Gmail authorize URL completed successfully and the connectors API again showed `gmail` `connected` for the March 19 validation tenant                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Provider-backed rotation: `N8N_API_KEY`                           | `live-verified` | A direct n8n API call using `X-N8N-API-KEY` succeeded. The real `support-starter` pack path initially exposed missing worker env wiring, then two read-only n8n create-payload fields. After deploying `cabbab85`, `9911bc38`, and `5dbaa108` from `codex/fix-production-residual-risks`, a fresh disposable tenant reached `workflow.status = active` on the first poll on March 20, 2026                                                                                                                                                                                                                                                                                                          |
| Provider-backed rotation: `OPENAI_API_KEY`                        | `live-verified` | On March 20, 2026, a direct `POST /health/deep` against the agents container with the current `AGENTS_API_KEY` returned `{\"ok\":true,\"model\":\"gpt-4o-mini-2024-07-18\"}` after OpenAI credit was restored, confirming the rotated key is usable in production                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Validation cleanup after live pack provisioning                   | `live-verified` | After deploying `ee804132` from `codex/fix-production-residual-risks`, a fresh disposable `e2e-*` tenant exercised the real `support-starter` pack path. Dry-run output from `scripts/cleanup-validation-tenant.ts` showed `n8n_workflows: 1` and `schedule_repeatables: 1`; execute mode then removed the tenant rows, the remote n8n workflow returned `404`, and BullMQ repeatables returned to their pre-fixture baseline. A second disposable tenant verified the shared uninstall path directly: repeatables moved from `5 -> 6 -> 5`, the workflow uninstall returned success, the remote n8n workflow returned `404`, and the guarded cleanup script then removed the empty tenant and user |

The canonical live statement supported by current evidence is:

> As of March 20, 2026, the VPS host `vps-n8n-agents` is actively running the
> Agentmou production stack from `/srv/agentmou-platform`. `api`, `worker`,
> the edge, the root backup cron, protected public routes, Gmail OAuth, the
> real queued n8n provisioning path, temporary-fixture cleanup, normal
> installation uninstall cleanup, and the OpenAI-backed `agents` deep-health
> path were all directly re-verified against production. Evidence includes
> `docker compose ps`, the local Traefik health gate, the hardened public smoke
> test, direct catalog reads, a manual backup run to `/var/backups/agentmou`,
> BasicAuth route checks, API logs, live OAuth callbacks, direct n8n API
> reads, BullMQ repeatable-count checks, disposable tenant creation through
> `POST /api/v1/auth/register`, uninstall calls through
> `DELETE /api/v1/tenants/:tenantId/installations/:installationId`, guarded
> `scripts/cleanup-validation-tenant.ts` dry-run plus execute output, and a
> final `POST /health/deep` result of
> `{\"ok\":true,\"model\":\"gpt-4o-mini-2024-07-18\"}` from the agents
> container. Production catalog data remains live-verified:
> `/api/v1/catalog/agents` returns the `inbox-triage` manifest payload, and
> the VPS checkout itself is clean.

## Current Architecture

### Control Plane

#### `apps/web`

| Capability                                        | Status        | Notes                                                                                                                         |
| ------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Marketing site                                    | `implemented` | Homepage catalog from demo featured slice via `/api/public-catalog` (operational stats use `demoTotals` / `operationalFeaturedCounts`) |
| Auth flows                                        | `implemented` | Login/register, optional B2C OAuth (Google/Microsoft when configured), forgot/reset password, Zustand store, JWT cookie, `proxy.ts` route protection |
| Tenant app shell                                  | `implemented` | Tenant route groups, navigation shell, command palette, typed client helpers                                                  |
| Authenticated tenant pages backed by API provider | `partial`     | Tenant pages use `apiProvider`, but several surfaces still fall back to empty defaults because backend modules are incomplete |
| Demo workspace and marketing demo data            | `implemented` | `mockProvider` / `demoProvider` read `apps/web/lib/demo-catalog/`; marketing cards use curated `marketing-featured`; see `docs/catalog-and-demo.md` |
| `/api/chat` assistant route                       | `stub`        | Uses the mock chat engine with an explicit TODO for a real OpenAI-backed implementation                                       |

The web app is now a real control-plane client, but not a fully honest one yet.
Some pages are rendered from real API data, while others are shaped by demo
catalog data or API-provider defaults that intentionally hide missing backend
capabilities.

#### `services/api`

The API has 15 module directories under `services/api/src/modules`.

| Module          | Status        | Notes                                                                                                                                                                                                                          |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth`          | `implemented` | Register/login/me, JWT issuance, tenant creation transaction, B2C OAuth + exchange, forgot/reset password, rate limits and web-origin allowlist for OAuth redirects                                                          |
| `tenants`       | `implemented` | CRUD and settings storage via Drizzle                                                                                                                                                                                          |
| `memberships`   | `implemented` | Tenant membership listing and management                                                                                                                                                                                       |
| `catalog`       | `implemented` | Loads manifests from `catalog/` and `workflows/` through `@agentmou/catalog-sdk`                                                                                                                                               |
| `installations` | `partial`     | Real installs and queued pack installs; uninstall exists; no broader lifecycle management yet                                                                                                                                  |
| `connectors`    | `partial`     | Real DB-backed connectors plus live-validated Gmail OAuth; `DELETE /connectors/:connectorId` now works with either a row UUID or a provider slug like `gmail`, but response shapes are still not aligned with shared contracts |
| `secrets`       | `partial`     | Real persistence exists, but broader governance and UI integration are limited                                                                                                                                                 |
| `approvals`     | `partial`     | Real CRUD/decision flow, but payload shape drifts from shared contracts                                                                                                                                                        |
| `runs`          | `partial`     | Real run creation and DB-backed retrieval, but contract shape is not yet stable                                                                                                                                                |
| `n8n`           | `partial`     | Real adapter routes exist, but tenant scoping is mostly path-level rather than full domain enforcement                                                                                                                         |
| `public-chat`   | `partial`     | Public `/public/chat` route validates against shared chat contracts and currently relies on a narrow service implementation                                                                                                    |
| `usage`         | `stub`        | Exposed surface exists without real metering implementation                                                                                                                                                                    |
| `billing`       | `stub`        | Hard-coded placeholder values                                                                                                                                                                                                  |
| `security`      | `stub`        | Hard-coded placeholder values                                                                                                                                                                                                  |
| `webhooks`      | `stub`        | Exposed route shape exists, but behavior is placeholder                                                                                                                                                                        |

#### `services/internal-ops`

The private internal operating system lives in `services/internal-ops`.

| Capability                        | Status        | Notes                                                                                                                                                |
| --------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram webhook ingress          | `implemented` | Accepts operator messages and inline-button callbacks through `POST /telegram/webhook`                                                               |
| Remote OpenClaw boundary          | `implemented` | Uses a typed HTTP adapter for remote turn start, continue, cancel, trace, agent registration, and capability registration                            |
| `hc-coherence` governance         | `implemented` | Builds an execution snapshot from real turn state and persists official coherence artifacts in `internal_protocol_events`                            |
| Private org chart                 | `implemented` | Internal agent profiles, relationships, and default native capability bindings are bootstrapped into the DB and registered with OpenClaw             |
| Optional Agentmou substrate reuse | `partial`     | Can dispatch installed agents and workflows through tenant-scoped capability bindings, but only native bindings are bootstrapped automatically       |
| Deployment packaging              | `partial`     | Service is real and documented, but there is no checked-in Compose service for it yet and the OpenClaw runtime is expected to live outside this repo |

#### Auth and Tenant Boundaries

| Capability              | Status        | Notes                                                                                                            |
| ----------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| JWT auth                | `implemented` | `@agentmou/auth` plus API middleware                                                                             |
| Tenant membership guard | `implemented` | `requireTenantAccess` protects tenant-scoped routes                                                              |
| Tenant settings model   | `partial`     | Stored in DB, but runtime payloads can be partial or `{}` while shared contracts assume a fully populated object |
| RBAC hardening          | `planned`     | Basic roles exist, but deeper permission enforcement is still limited                                            |

### Data Plane

#### `services/worker`

The worker has 10 job directories under `services/worker/src/jobs`, and 6 queues
are currently started from `services/worker/src/index.ts`.

| Queue / Job           | Status        | Notes                                                                                                                                                |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install-pack`        | `implemented` | Creates installations, provisions workflows, and creates schedules                                                                                   |
| `run-agent`           | `partial`     | Loads installation assets and delegates to `AgentEngine.execute()`                                                                                   |
| `run-workflow`        | `partial`     | Executes installed n8n workflows and persists results, but uses its own run-step semantics                                                           |
| `schedule-trigger`    | `partial`     | Converts cron schedules into concrete run jobs                                                                                                       |
| `approval-timeout`    | `partial`     | Applies timeout policies and writes audit events                                                                                                     |
| `internal-work-order` | `implemented` | Executes the private internal-ops queue, including Telegram delivery, approval gates, native artifacts, and dispatch into installed agents/workflows |
| `install-agent`       | `planned`     | Job scaffold exists but is not started                                                                                                               |
| `daily-digest`        | `planned`     | Job scaffold exists but is not started                                                                                                               |
| `ingest-document`     | `planned`     | Job scaffold exists but is not started                                                                                                               |
| `rebuild-embeddings`  | `planned`     | Job scaffold exists but is not started                                                                                                               |

#### `packages/agent-engine`

| Capability        | Status    | Notes                                                                                 |
| ----------------- | --------- | ------------------------------------------------------------------------------------- |
| Planner           | `partial` | Real GPT-4o-mini path plus deterministic fallback behavior                            |
| Policy engine     | `partial` | Real policy checks exist, but approval/resume semantics are still limited             |
| Tool execution    | `partial` | Gmail read/label and `analyze-email` are real                                         |
| Run logging       | `partial` | Persists to the DB, but emitted step/run statuses do not fully match shared contracts |
| Memory            | `planned` | Package surface exists, but there is no real knowledge/memory product path yet        |
| Workflow dispatch | `planned` | Scaffolded, not yet a broad orchestration layer                                       |

#### `services/agents`

| Capability                     | Status        | Notes                                                            |
| ------------------------------ | ------------- | ---------------------------------------------------------------- |
| FastAPI service                | `implemented` | `/health`, `/health/deep`, `/hello`, `/analyze-email`            |
| Real LLM-backed email analysis | `implemented` | GPT-4o-mini structured output for inbox triage                   |
| Broader agent runtime          | `planned`     | Service is narrow and currently supports one concrete capability |

The initial context recommended a TypeScript-first runtime. The repository has
mostly followed that path, but it has intentionally retained a small Python
service for email analysis.

### Shared Packages

| Package                   | Status        | Notes                                                                                                             |
| ------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@agentmou/contracts`     | `partial`     | Central type package exists, but it is not yet authoritative in runtime payloads                                  |
| `@agentmou/db`            | `implemented` | Drizzle client and the growing shared schema back the API, worker, and private internal-ops subsystem             |
| `@agentmou/auth`          | `implemented` | JWT and password hashing are real                                                                                 |
| `@agentmou/queue`         | `implemented` | Queue names and typed payloads are shared between API and worker                                                  |
| `@agentmou/catalog-sdk`   | `partial`     | Real manifest loading works for current assets, but its manifest shapes are narrower than the richer UI contracts |
| `@agentmou/connectors`    | `partial`     | Real Gmail connector and encryption helpers exist; more providers are still absent                                |
| `@agentmou/n8n-client`    | `partial`     | Real thin client exists, but broader lifecycle and scale concerns remain                                          |
| `@agentmou/observability` | `partial`     | Logging/tracing helpers exist, but product-grade observability is still mostly implemented elsewhere              |
| `@agentmou/ui`            | `planned`     | Minimal placeholder package, not yet a true design system                                                         |

### Catalog and Asset Reality

#### Real Installable Catalog

| Asset group                                          | Count | Status        | Notes                                                |
| ---------------------------------------------------- | ----- | ------------- | ---------------------------------------------------- |
| Agent manifests under `catalog/agents`               | 1     | `implemented` | `inbox-triage` is the only real agent manifest today |
| Public workflow manifests under `workflows/public`   | 1     | `implemented` | One real public workflow manifest with workflow JSON |
| Planned workflow manifests under `workflows/planned` | 1     | `planned`     | Planning asset, not installable runtime inventory    |
| Pack manifests under `catalog/packs`                 | 2     | `implemented` | `support-starter` and `sales-accelerator`            |

#### Demo and UX Catalog

`apps/web/lib/demo-catalog/` holds the full demo inventory (templates, fixtures)
for `demo-workspace` and the marketing **featured** subset. Operational
installable assets remain under `catalog/` and `workflows/public/`; demo IDs map
to operational IDs in `operational-refs.ts` where they differ. Generated
`operational-ids.gen.json` tracks which demo items are backed by real manifests
(`pnpm demo-catalog:generate`). See [Catalog, demo, and marketing](../catalog-and-demo.md)
and [ADR 011](../adr/011-operational-demo-marketing-catalog.md).

### Infrastructure and Deployment Model

| Capability              | Status        | Notes                                                                                                                                                |
| ----------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production compose file | `implemented` | `infra/compose/docker-compose.prod.yml` is present and includes Traefik, Postgres, Redis, n8n, agents, API, worker, migrate, and optional web        |
| Version pinning for n8n | `implemented` | Compose uses `n8nio/n8n:2.11.2`, not `latest`                                                                                                        |
| Split networks          | `implemented` | `web` and `internal` networks exist in compose                                                                                                       |
| Web deployment profile  | `implemented` | Web service exists behind a compose profile and is documented as Vercel-first for production                                                         |
| Deploy scripts          | `implemented` | `deploy-prod.sh` is the canonical production entrypoint, and `smoke-test.sh` is the standalone verification gate                                     |
| VPS cleanup wrapper     | `implemented` | `cleanup-validation-tenant.sh` derives host-shell `DATABASE_URL`, `REDIS_URL`, and `N8N_API_URL` before invoking the guarded TypeScript cleanup path |
| Proven live VPS state   | `partial`     | The repo proves deployment intent and scripts, but not the actual live state of the VPS at this moment                                               |

#### Conservatively Resolving the Deployment Contradiction

Before the March 19, 2026 documentation reconciliation, repository documents
disagreed:

- some docs say API and worker are active on the VPS
- some docs still say Node services are not yet active in production

The repository itself proves that:

- the production compose file includes API and worker as first-class services
- only the web app is behind a compose profile
- the Phase 2.5 deploy script rebuilds and restarts them
- the runbook documents them as public or internal services

The March 19, 2026 VPS verification additionally proved that:

- the live checkout path is `/srv/agentmou-platform`
- `docker compose ps` showed `api`, `worker`, `agents`, `n8n`, `postgres`,
  `redis`, `uptime-kuma`, and Traefik all `Up`
- the local edge gate returned `200` for `https://api.agentmou.io/health`
- the public smoke test returned `3 passed, 0 failed`
- worker startup logs confirmed 5 active queues listening

The safest current statement is:

> The repository is prepared to run API and worker in production, and the live
> VPS state was directly verified on March 19, 2026. Future production claims
> should still be backed by fresh smoke tests or VPS inspection rather than
> inferred from compose or docs alone.

## Delta Versus The Initial Context

The original architecture proposal described the desired destination. The
repository has since moved from proposal to implementation in several areas.

| Theme from the initial context                      | Current state                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| One monorepo with clear boundaries                  | `implemented`                                                                                                  |
| TypeScript-first product architecture               | `implemented` with a narrow retained Python sidecar                                                            |
| Control plane and data plane split                  | `implemented` at a structural level, `partial` in maturity                                                     |
| n8n should be a capability engine, not the product  | `partial`; the code treats it as infrastructure, but lifecycle and exposure policies still need hardening      |
| Template vs installation vs execution separation    | `partial`; this distinction exists in DB schema and services, but some web and contract surfaces still blur it |
| Shared contracts as the single type source of truth | `partial`; package exists, but producer payloads are not consistently aligned or parsed                        |
| Real multi-tenant control plane                     | `partial`; core tenancy/auth is real, deeper hardening is still missing                                        |
| Marketplace backed by versioned assets              | `partial`; real manifests exist, but the demo catalog is much broader than the installable catalog             |
| Memory/RAG/usage/billing/security enterprise layers | `planned` or `stub`, not real platform capabilities yet                                                        |

The biggest change since the initial context is that Agentmou now has a real
vertical slice. The biggest remaining gap is that the repository still presents
some surfaces as more complete than their runtime truth.

## Rectifications

This section intentionally focuses on evidence-backed corrections, not cleanup
for cleanup's sake.

### 1. Make `@agentmou/contracts` Authoritative Before Adding More Features

**Why this matters**

Shared contracts now exist, but several API and worker payloads no longer match
them. That means the repository compiles while still allowing silent runtime
shape drift across API, worker, and web.

**Conservative correction**

- Align runtime producers to shared contracts, or explicitly narrow the
  contracts to the shapes that are truly emitted today.
- Add runtime parsing at API boundaries in the web client before expanding more
  tenant-facing features.

See [Appendix A](#appendix-a--contract-drift) for the concrete mismatches.

### 2. Expose Only Real Tenant Features, or Label Placeholders Explicitly

**Why this matters**

Several tenant surfaces look production-ready in the UI even when the backing
module is a stub or the API provider returns empty defaults.

**Evidence**

- `services/api/src/modules/billing/billing.service.ts` returns hard-coded
  placeholder data.
- `services/api/src/modules/security/security.service.ts` returns hard-coded
  placeholder data.
- `apps/web/lib/data/api-provider.ts` returns empty or synthetic defaults for
  security, billing, dashboard metrics, and n8n connection.
- `apps/web/app/api/chat/route.ts` uses the mock chat engine.

**Conservative correction**

- Hide, badge, or clearly label placeholder tenant surfaces until the backing
  behavior is real.
- Prefer an honest “not yet available” state over a convincing but synthetic
  control-plane screen.

### 3. Keep The Demo Catalog, But Fence It Strictly

**Why this matters**

The real installable catalog and the demo/marketing catalog currently coexist.
That is acceptable for a product-in-transition, but only if the boundaries stay
clear.

**Conservative correction**

- Treat manifest-backed assets as the installable source of truth.
- Keep `apps/web/lib/control-plane/*` demo inventory only for marketing and
  `demo-workspace`.
- Do not let tenant-scoped business logic depend on demo inventory again.

### 4. Keep The Validation Baseline Verified, Not Assumed

**Why this matters**

The local validation baseline is green again, but those claims only stay useful
if they continue to reflect freshly re-run commands instead of inherited
assumptions.

**Conservative correction**

- Update top-level docs to report the March 18, 2026 validation snapshot
  exactly.
- Re-run `pnpm typecheck`, `pnpm test`, and `pnpm lint` before changing the
  repository's validation claims again.

### 5. Stop Letting Documentation Drift Create Product Drift

**Why this matters**

Documentation now disagrees about phase naming, validation status, and
production deployment state. That makes onboarding harder and weakens decision
quality.

**Conservative correction**

- Use this document as the current architecture context.
- Reconcile future README, roadmap, and implementation notes only after code or
  deployment facts are revalidated.

## Prioritized Next Steps

### Priority 0: Canonicalize the Current Context

- Keep this document linked from the repo entry points.
- Keep this document and [`../planning/roadmap.md`](../planning/roadmap.md) as
  the active architecture and planning context.

### Priority 1: Fix Contract Drift Across API, Worker, DB, and Web

- Align execution, approval, installation, connector, and tenant settings
  payloads with `@agentmou/contracts`.
- Add runtime parsing in the web API client to make drift fail loudly.

### Priority 2: Make Stub Surfaces Honest

- Either implement or explicitly label/hide billing, security, dashboard, n8n
  connection, and chat surfaces that still rely on placeholders or empty
  defaults.

### Priority 3: Verify Production Truth Before Claiming Production Maturity

- Run the documented smoke tests against the live environment.
- Confirm whether API and worker are actually active on the VPS before updating
  roadmap or implementation documents again.

### Priority 4: Expand Only After The Baseline Is Trustworthy

- Add more connectors, workflows, and installable catalog assets only after the
  control-plane contracts and validation baseline are reliable.
- Keep memory/RAG, usage metering, and enterprise hardening behind the baseline
  work above.

## Decision Guardrails

- Do not remove the demo catalog until the real catalog can support both
  marketing and product UX needs.
- Do not add more cross-layer features while `@agentmou/contracts` is visibly
  out of sync with producer payloads.
- Do not describe placeholder modules as “MVP complete” just because they have
  routes and pages.
- Do not claim live production activation from repository state alone.
- Do not replace the Python agents service by default; remove it only when the
  remaining functionality is actually absorbed elsewhere.

## Appendix A - Contract Drift

The following mismatches should be treated as the minimum contract-alignment
work before broadening feature scope.

### Execution Runs And Steps

| Surface                | Shared contract                       | Real producer today                                                                                         | Drift                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run status and shape   | `packages/contracts/src/execution.ts` | `services/api/src/modules/runs/runs.service.ts`, `packages/db/src/schema.ts`                                | Shared contract expects `agentId`, `workflowId`, `logs`, `timeline`, and required `durationMs`; API returns DB-backed rows with `agentInstallationId`, `workflowInstallationId`, optional duration, and nested `steps` only on the single-run path |
| Step types             | `ExecutionStepTypeSchema`             | `packages/agent-engine/src/planner/planner.ts`, `services/worker/src/jobs/run-workflow/run-workflow.job.ts` | Shared contract does not include emitted values such as `tool_call` and `n8n-execution`                                                                                                                                                            |
| Step status vocabulary | `ExecutionStatusSchema`               | `packages/agent-engine/src/run-logger/logger.ts`                                                            | Run logger persists step status `completed`, while the shared execution status enum does not include `completed`                                                                                                                                   |

### Approval Payload Shape

| Surface          | Shared contract                       | Real producer today                                                                    | Drift                                                                                                                                                                                  |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approval request | `packages/contracts/src/approvals.ts` | `services/api/src/modules/approvals/approvals.service.ts`, `packages/db/src/schema.ts` | Shared contract expects `agentId`, required `description`, and a structured `context.inputs/sources`; runtime uses `agentInstallationId`, optional description, and generic JSON blobs |

### Installation Response Shape

| Surface                           | Shared contract                           | Real producer today                                               | Drift                                                                                                             |
| --------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Installed agent                   | `packages/contracts/src/installations.ts` | `services/api/src/modules/installations/installations.service.ts` | Shared contract requires `kpiValues`; DB/API rows do not provide it                                               |
| Installations collection response | none                                      | `services/api/src/modules/installations/installations.routes.ts`  | API returns grouped `{ installations: { agents, workflows } }`, but there is no shared contract for this envelope |

### Connector Response Shape

| Surface             | Shared contract                        | Real producer today                                                                      | Drift                                                                                                                                                                                        |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connector list item | `packages/contracts/src/connectors.ts` | `services/api/src/modules/connectors/connectors.service.ts`, `packages/db/src/schema.ts` | Shared contract expects display metadata such as `name`, `icon`, `category`, and `requiredScopes`; API returns raw `connector_accounts` rows centered on provider credentials and timestamps |

### Tenant Settings Shape

| Surface         | Shared contract                     | Real producer today                                                                | Drift                                                                                                                            |
| --------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Tenant settings | `packages/contracts/src/tenancy.ts` | `services/api/src/modules/tenants/tenants.service.ts`, `packages/db/src/schema.ts` | Shared contract assumes a fully populated settings object; DB defaults to `{}` and the service can return partial arbitrary JSON |

### Lack Of Runtime Parsing In The Web API Client

| Surface        | Shared contract                                          | Real consumer today          | Drift                                                                                                                  |
| -------------- | -------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Web API client | Typed return annotations in `apps/web/lib/api/client.ts` | `apps/web/lib/api/client.ts` | The client trusts JSON responses without schema parsing, so the mismatches above compile and flow into the UI silently |

### Additional Important Drift: Catalog Response Shape

| Surface                      | Shared contract                     | Real producer today                                                                        | Drift                                                                                                                                       |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog agents and workflows | `packages/contracts/src/catalog.ts` | `services/api/src/modules/catalog/catalog.service.ts`, `packages/catalog-sdk/src/index.ts` | The API returns manifest shapes from `CatalogSDK`, while the web client types them as richer `AgentTemplate` and `WorkflowTemplate` objects |
