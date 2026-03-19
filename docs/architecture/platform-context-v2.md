# Platform Context v2.0

**Validated on**: March 19, 2026

This document is the current, code-verified successor to
[`whole-initial-context.md`](../../whole-initial-context.md).

Use this file for operational understanding of the repository as it exists
today. Keep [`whole-initial-context.md`](../../whole-initial-context.md) as the
historical architecture proposal and original decision baseline.

Execution planning derived from this document lives in
[`../product/action-plan.md`](../product/action-plan.md).

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

AgentMou is no longer at the purely aspirational stage described in the initial
context. The repository now contains a real monorepo structure, a working
control-plane API, a background worker, a first runtime slice, Gmail OAuth, and
versioned catalog/workflow assets. At the same time, it still carries demo
inventory, stubbed modules, and contract drift between shared types and runtime
payloads.

### Validated Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Monorepo structure | `implemented` | `apps/`, `services/`, `packages/`, `catalog/`, `workflows/`, `infra/`, and `docs/` are all present and used |
| Control plane API | `partial` | Core modules are real; some tenant-facing modules remain stubbed |
| Web app | `partial` | Authenticated routes use the API provider, but marketing/demo and some tenant surfaces still rely on demo or empty-default paths |
| Data plane | `partial` | Worker queues and runtime path are real, but breadth and contract maturity are still limited |
| Catalog and workflow assets | `partial` | Real installable assets exist, but demo inventory is much larger than the real catalog |
| Infrastructure model | `partial` | Production compose and deploy scripts are present, and March 19, 2026 VPS inspection verified live API, worker, and edge health; the deploy path still needs care because the live checkout is dirty |
| Validation baseline | `implemented` | `pnpm typecheck`, `pnpm test`, and `pnpm lint` all pass from the repo root as of March 19, 2026; `pnpm lint` still reports non-blocking warnings |

### Validation Commands Observed On March 19, 2026

- `pnpm typecheck`: passes
- `pnpm test`: passes
- `pnpm lint`: passes with warnings only (0 errors)

The March 17 Vitest resolution failure no longer reproduces in the current repo
state.

### Operational Verification Snapshot On March 19, 2026

This snapshot separates repository deployment intent from the live production
truth that was actually verified during this epic.

| Check | Result | Evidence / limits |
| --- | --- | --- |
| `bash infra/scripts/smoke-test.sh` | `passed` | Executed on the VPS from `/srv/agentmou-platform`; `3 passed, 0 failed` for API health `200`, catalog `200`, and invalid-login auth `400` |
| `infra/scripts/deploy-phase25.sh` | `not executed` | The live stack was already healthy, and the VPS checkout was dirty (`infra/compose/docker-compose.prod.yml` modified plus untracked backup artifacts), so a scripted pull/rebuild was intentionally skipped to avoid mutating production during verification |
| Local edge health via `curl --resolve ... 127.0.0.1` | `passed` | Executed on the VPS host; `https://api.agentmou.io/health` returned `200` through local Traefik routing |
| API health | `live-verified` | Local edge check returned `200`; public smoke test returned `200`; API logs showed live requests to `/health` and `/api/v1/auth/login` on March 19, 2026 |
| Catalog health | `live-verified` | Public smoke test returned `200` for `/api/v1/catalog/agents`; API logs showed repeated successful catalog requests |
| Minimal auth validation | `live-verified` | Public smoke test returned `400` for invalid `POST /api/v1/auth/login`, matching expected schema-validation behavior |
| Worker live status | `live-verified` | `docker compose ps` showed `worker` `Up`; worker logs showed all 5 active queues listening: `install-pack`, `run-agent`, `run-workflow`, `schedule-trigger`, and `approval-timeout` |
| Edge status | `live-verified` | `docker compose ps` showed Traefik `Up` on ports `80` and `443`; the local Traefik health gate returned `200`; recent Traefik logs showed active certificate-renew checks on March 19, 2026 |

The canonical live statement supported by current evidence is:

> As of March 19, 2026, the VPS host `vps-n8n-agents` is actively running the
> AgentMou production stack from `/srv/agentmou-platform`. `api`, `worker`,
> and the edge were directly verified via `docker compose ps`, the local
> Traefik health gate, the public smoke test, and recent container logs.
> `deploy-phase25.sh` was not executed during Epic D because the live host was
> already healthy and the checkout contained local operational drift that
> should be reviewed before any scripted redeploy.

## Current Architecture

### Control Plane

#### `apps/web`

| Capability | Status | Notes |
| --- | --- | --- |
| Marketing site | `partial` | Uses a public catalog route with API-first loading and filesystem fallback |
| Auth flows | `implemented` | Login/register pages, Zustand auth store, JWT cookie, route protection |
| Tenant app shell | `implemented` | Tenant route groups, navigation shell, command palette, typed client helpers |
| Authenticated tenant pages backed by API provider | `partial` | Tenant pages use `apiProvider`, but several surfaces still fall back to empty defaults because backend modules are incomplete |
| Demo workspace and marketing demo data | `implemented` | `mockProvider` and `demoProvider` remain active for marketing and demo UX |
| `/api/chat` assistant route | `stub` | Uses the mock chat engine with an explicit TODO for a real OpenAI-backed implementation |

The web app is now a real control-plane client, but not a fully honest one yet.
Some pages are rendered from real API data, while others are shaped by demo
catalog data or API-provider defaults that intentionally hide missing backend
capabilities.

#### `services/api`

The API has 14 module directories under `services/api/src/modules`.

| Module | Status | Notes |
| --- | --- | --- |
| `auth` | `implemented` | Register/login/me, JWT issuance, tenant creation transaction |
| `tenants` | `implemented` | CRUD and settings storage via Drizzle |
| `memberships` | `implemented` | Tenant membership listing and management |
| `catalog` | `implemented` | Loads manifests from `catalog/` and `workflows/` through `@agentmou/catalog-sdk` |
| `installations` | `partial` | Real installs and queued pack installs; uninstall exists; no broader lifecycle management yet |
| `connectors` | `partial` | Real DB-backed connectors plus Gmail OAuth, but response shapes are not aligned with shared contracts |
| `secrets` | `partial` | Real persistence exists, but broader governance and UI integration are limited |
| `approvals` | `partial` | Real CRUD/decision flow, but payload shape drifts from shared contracts |
| `runs` | `partial` | Real run creation and DB-backed retrieval, but contract shape is not yet stable |
| `n8n` | `partial` | Real adapter routes exist, but tenant scoping is mostly path-level rather than full domain enforcement |
| `usage` | `stub` | Exposed surface exists without real metering implementation |
| `billing` | `stub` | Hard-coded placeholder values |
| `security` | `stub` | Hard-coded placeholder values |
| `webhooks` | `stub` | Exposed route shape exists, but behavior is placeholder |

#### Auth and Tenant Boundaries

| Capability | Status | Notes |
| --- | --- | --- |
| JWT auth | `implemented` | `@agentmou/auth` plus API middleware |
| Tenant membership guard | `implemented` | `requireTenantAccess` protects tenant-scoped routes |
| Tenant settings model | `partial` | Stored in DB, but runtime payloads can be partial or `{}` while shared contracts assume a fully populated object |
| RBAC hardening | `planned` | Basic roles exist, but deeper permission enforcement is still limited |

### Data Plane

#### `services/worker`

The worker has 9 job directories under `services/worker/src/jobs`, but only 5
queues are currently started from `services/worker/src/index.ts`.

| Queue / Job | Status | Notes |
| --- | --- | --- |
| `install-pack` | `implemented` | Creates installations, provisions workflows, and creates schedules |
| `run-agent` | `partial` | Loads installation assets and delegates to `AgentEngine.execute()` |
| `run-workflow` | `partial` | Executes installed n8n workflows and persists results, but uses its own run-step semantics |
| `schedule-trigger` | `partial` | Converts cron schedules into concrete run jobs |
| `approval-timeout` | `partial` | Applies timeout policies and writes audit events |
| `install-agent` | `planned` | Job scaffold exists but is not started |
| `daily-digest` | `planned` | Job scaffold exists but is not started |
| `ingest-document` | `planned` | Job scaffold exists but is not started |
| `rebuild-embeddings` | `planned` | Job scaffold exists but is not started |

#### `packages/agent-engine`

| Capability | Status | Notes |
| --- | --- | --- |
| Planner | `partial` | Real GPT-4o-mini path plus deterministic fallback behavior |
| Policy engine | `partial` | Real policy checks exist, but approval/resume semantics are still limited |
| Tool execution | `partial` | Gmail read/label and `analyze-email` are real |
| Run logging | `partial` | Persists to the DB, but emitted step/run statuses do not fully match shared contracts |
| Memory | `planned` | Package surface exists, but there is no real knowledge/memory product path yet |
| Workflow dispatch | `planned` | Scaffolded, not yet a broad orchestration layer |

#### `services/agents`

| Capability | Status | Notes |
| --- | --- | --- |
| FastAPI service | `implemented` | `/health`, `/health/deep`, `/hello`, `/analyze-email` |
| Real LLM-backed email analysis | `implemented` | GPT-4o-mini structured output for inbox triage |
| Broader agent runtime | `planned` | Service is narrow and currently supports one concrete capability |

The initial context recommended a TypeScript-first runtime. The repository has
mostly followed that path, but it has intentionally retained a small Python
service for email analysis.

### Shared Packages

| Package | Status | Notes |
| --- | --- | --- |
| `@agentmou/contracts` | `partial` | Central type package exists, but it is not yet authoritative in runtime payloads |
| `@agentmou/db` | `implemented` | Drizzle client and 14-table schema back the real API and worker |
| `@agentmou/auth` | `implemented` | JWT and password hashing are real |
| `@agentmou/queue` | `implemented` | Queue names and typed payloads are shared between API and worker |
| `@agentmou/catalog-sdk` | `partial` | Real manifest loading works for current assets, but its manifest shapes are narrower than the richer UI contracts |
| `@agentmou/connectors` | `partial` | Real Gmail connector and encryption helpers exist; more providers are still absent |
| `@agentmou/n8n-client` | `partial` | Real thin client exists, but broader lifecycle and scale concerns remain |
| `@agentmou/observability` | `partial` | Logging/tracing helpers exist, but product-grade observability is still mostly implemented elsewhere |
| `@agentmou/ui` | `planned` | Minimal placeholder package, not yet a true design system |

### Catalog and Asset Reality

#### Real Installable Catalog

| Asset group | Count | Status | Notes |
| --- | --- | --- | --- |
| Agent manifests under `catalog/agents` | 1 | `implemented` | `inbox-triage` is the only real agent manifest today |
| Public workflow manifests under `workflows/public` | 1 | `implemented` | One real public workflow manifest with workflow JSON |
| Planned workflow manifests under `workflows/planned` | 1 | `planned` | Planning asset, not installable runtime inventory |
| Pack manifests under `catalog/packs` | 2 | `implemented` | `support-starter` and `sales-accelerator` |

#### Demo and UX Catalog

`apps/web/lib/fleetops/mock-data.ts` still carries a significantly larger demo
inventory for the marketing experience and demo workspace:

| Asset group | Count | Status | Notes |
| --- | --- | --- | --- |
| Demo/mock agents | 10 | `implemented` | UX and demo inventory, not the real installable source of truth |
| Demo/mock workflows | 10 | `implemented` | Includes planned and marketing-oriented surfaces |
| Demo/mock packs | 6 | `implemented` | Outcome-based demo inventory |

This split is deliberate for now, but it is one of the most important sources
of domain ambiguity in the repository.

### Infrastructure and Deployment Model

| Capability | Status | Notes |
| --- | --- | --- |
| Production compose file | `implemented` | `infra/compose/docker-compose.prod.yml` is present and includes Traefik, Postgres, Redis, n8n, agents, API, worker, migrate, and optional web |
| Version pinning for n8n | `implemented` | Compose uses `n8nio/n8n:2.11.2`, not `latest` |
| Split networks | `implemented` | `web` and `internal` networks exist in compose |
| Web deployment profile | `implemented` | Web service exists behind a compose profile and is documented as Vercel-first for production |
| Deploy scripts | `implemented` | `deploy.sh`, `deploy-phase25.sh`, and `smoke-test.sh` are present |
| Proven live VPS state | `partial` | The repo proves deployment intent and scripts, but not the actual live state of the VPS at this moment |

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

The original context in `whole-initial-context.md` described the desired
destination. The repository has since moved from proposal to implementation in
several areas.

| Theme from the initial context | Current state |
| --- | --- |
| One monorepo with clear boundaries | `implemented` |
| TypeScript-first product architecture | `implemented` with a narrow retained Python sidecar |
| Control plane and data plane split | `implemented` at a structural level, `partial` in maturity |
| n8n should be a capability engine, not the product | `partial`; the code treats it as infrastructure, but lifecycle and exposure policies still need hardening |
| Template vs installation vs execution separation | `partial`; this distinction exists in DB schema and services, but some web and contract surfaces still blur it |
| Shared contracts as the single type source of truth | `partial`; package exists, but producer payloads are not consistently aligned or parsed |
| Real multi-tenant control plane | `partial`; core tenancy/auth is real, deeper hardening is still missing |
| Marketplace backed by versioned assets | `partial`; real manifests exist, but the demo catalog is much broader than the installable catalog |
| Memory/RAG/usage/billing/security enterprise layers | `planned` or `stub`, not real platform capabilities yet |

The biggest change since the initial context is that AgentMou now has a real
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
- Keep `apps/web/lib/fleetops/*` demo inventory only for marketing and
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
- Preserve the original initial-context file as history.
- Reconcile future README, roadmap, and implementation notes only after code or
  deployment facts are revalidated.

## Prioritized Next Steps

### Priority 0: Canonicalize the Current Context

- Keep this document linked from the repo entry points.
- Preserve `whole-initial-context.md` as history, not as the operational guide.

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

| Surface | Shared contract | Real producer today | Drift |
| --- | --- | --- | --- |
| Run status and shape | `packages/contracts/src/execution.ts` | `services/api/src/modules/runs/runs.service.ts`, `packages/db/src/schema.ts` | Shared contract expects `agentId`, `workflowId`, `logs`, `timeline`, and required `durationMs`; API returns DB-backed rows with `agentInstallationId`, `workflowInstallationId`, optional duration, and nested `steps` only on the single-run path |
| Step types | `ExecutionStepTypeSchema` | `packages/agent-engine/src/planner/planner.ts`, `services/worker/src/jobs/run-workflow/run-workflow.job.ts` | Shared contract does not include emitted values such as `tool_call` and `n8n-execution` |
| Step status vocabulary | `ExecutionStatusSchema` | `packages/agent-engine/src/run-logger/logger.ts` | Run logger persists step status `completed`, while the shared execution status enum does not include `completed` |

### Approval Payload Shape

| Surface | Shared contract | Real producer today | Drift |
| --- | --- | --- | --- |
| Approval request | `packages/contracts/src/approvals.ts` | `services/api/src/modules/approvals/approvals.service.ts`, `packages/db/src/schema.ts` | Shared contract expects `agentId`, required `description`, and a structured `context.inputs/sources`; runtime uses `agentInstallationId`, optional description, and generic JSON blobs |

### Installation Response Shape

| Surface | Shared contract | Real producer today | Drift |
| --- | --- | --- | --- |
| Installed agent | `packages/contracts/src/installations.ts` | `services/api/src/modules/installations/installations.service.ts` | Shared contract requires `kpiValues`; DB/API rows do not provide it |
| Installations collection response | none | `services/api/src/modules/installations/installations.routes.ts` | API returns grouped `{ installations: { agents, workflows } }`, but there is no shared contract for this envelope |

### Connector Response Shape

| Surface | Shared contract | Real producer today | Drift |
| --- | --- | --- | --- |
| Connector list item | `packages/contracts/src/connectors.ts` | `services/api/src/modules/connectors/connectors.service.ts`, `packages/db/src/schema.ts` | Shared contract expects display metadata such as `name`, `icon`, `category`, and `requiredScopes`; API returns raw `connector_accounts` rows centered on provider credentials and timestamps |

### Tenant Settings Shape

| Surface | Shared contract | Real producer today | Drift |
| --- | --- | --- | --- |
| Tenant settings | `packages/contracts/src/tenancy.ts` | `services/api/src/modules/tenants/tenants.service.ts`, `packages/db/src/schema.ts` | Shared contract assumes a fully populated settings object; DB defaults to `{}` and the service can return partial arbitrary JSON |

### Lack Of Runtime Parsing In The Web API Client

| Surface | Shared contract | Real consumer today | Drift |
| --- | --- | --- | --- |
| Web API client | Typed return annotations in `apps/web/lib/api/client.ts` | `apps/web/lib/api/client.ts` | The client trusts JSON responses without schema parsing, so the mismatches above compile and flow into the UI silently |

### Additional Important Drift: Catalog Response Shape

| Surface | Shared contract | Real producer today | Drift |
| --- | --- | --- | --- |
| Catalog agents and workflows | `packages/contracts/src/catalog.ts` | `services/api/src/modules/catalog/catalog.service.ts`, `packages/catalog-sdk/src/index.ts` | The API returns manifest shapes from `CatalogSDK`, while the web client types them as richer `AgentTemplate` and `WorkflowTemplate` objects |
