# Repository Map

This document describes the current repository layout, the job of each area,
and where to look first when you need to make a change.

## Root Structure

```text
agentmou-platform/
├─ apps/
│  └─ web/                  # Next.js public site + tenant control plane
├─ services/
│  ├─ agents/               # Python FastAPI helper service
│  ├─ api/                  # Fastify control-plane API
│  ├─ internal-ops/         # Personal Telegram/OpenClaw operating system
│  ├─ openclaw-runtime/     # Deployable reasoning runtime for internal ops
│  └─ worker/               # BullMQ workers
├─ packages/                # Shared internal libraries
├─ catalog/                 # Versioned agent and pack manifests
├─ templates/               # Non-installable agent/workflow skeletons
├─ workflows/               # Versioned workflow definitions
├─ infra/                   # Compose files, deploy scripts, backups, Traefik
├─ docs/                    # Canonical docs, runbooks, ADRs, and planning
├─ scripts/                 # Repo-level automation and helper scripts
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

## Workspace Groups

### `apps/`

- `apps/web`
  - Role: public marketing site plus authenticated tenant UI.
  - Main dependencies: `@agentmou/contracts`, the control-plane API, and local
    provider abstractions under `lib/data/`.
  - Auth UI and client: `components/auth`, `lib/auth`, routes under `(auth)`,
    `/auth/callback`, and `/reset-password`.

### `services/`

- `services/api`
  - Role: HTTP control plane for auth, tenants, catalog, installations,
    connectors, runs, approvals, public chat, and n8n operations.
  - Important directories: `src/modules/`, `src/routes/`, `src/lib/`.

- `services/internal-ops`
  - Role: private company-operations control plane driven through Telegram and
    a remote OpenClaw runtime.
  - Important directories: `src/orchestrator/`, `src/openclaw/`,
    `src/coherence/`, `src/routes/`.

- `services/openclaw-runtime`
  - Role: deployable OpenClaw-compatible runtime that stores remote sessions,
    plans turns, and exposes traces for `services/internal-ops`.
  - Important directories: `src/runtime/`, `src/routes/`.

- `services/worker`
  - Role: BullMQ jobs for installation, execution, scheduling, approvals, and
    internal work orders, and future ingestion paths.
  - Important directories: `src/jobs/`, `src/lib/`.

- `services/agents`
  - Role: narrow Python service for LLM-backed email analysis and deep health
    checks.

### `packages/`

- `packages/contracts`
  - Shared Zod schemas and inferred types used across the monorepo.
- `packages/db`
  - Drizzle schema, DB client, migrations, and seed utilities.
- `packages/queue`
  - Shared queue names and typed payloads between API and worker.
- `packages/catalog-sdk`
  - Manifest loading and repo-root discovery for `catalog/` and `workflows/`.
- `packages/agent-engine`
  - Runtime planning, policies, tools, and execution helpers.
- `packages/connectors`
  - Connector abstractions and provider implementations such as Gmail.
- `packages/auth`
  - JWT signing/verification and password hashing; API combines this with
    `@agentmou/db` for OAuth identities and login state.
- `packages/n8n-client`
  - Thin adapter over the n8n REST API.
- `packages/observability`
  - Logging and tracing helpers.
- `packages/ui`
  - Minimal shared UI package; most current UI components still live in
    `apps/web/components/ui/`.

## Runtime Flow

```mermaid
flowchart LR
  web["apps/web"]
  api["services/api"]
  internalOps["services/internal-ops"]
  telegram["Telegram"]
  openclaw["services/openclaw-runtime"]
  worker["services/worker"]
  agents["services/agents"]
  engine["packages/agent-engine"]
  db["packages/db"]
  contracts["packages/contracts"]
  catalogSdk["packages/catalog-sdk"]
  connectors["packages/connectors"]
  n8n["n8n"]

  web --> api
  telegram --> internalOps
  internalOps --> openclaw
  internalOps --> db
  internalOps --> worker
  api --> db
  api --> catalogSdk
  api --> worker
  worker --> engine
  worker --> db
  worker --> connectors
  engine --> agents
  api -. shared types .-> contracts
  worker -. shared types .-> contracts
  web -. shared types .-> contracts
  api --> n8n
  worker --> n8n
```

## Assets And Operations

- `catalog/`
  - Installable agent and pack manifests. The live catalog currently includes
    the `inbox-triage` agent and packs such as `support-starter`.
- `templates/`
  - Reference-only skeletons for future agents, workflows, and hybrid
    patterns. These files are intentionally outside the live catalog paths.
- `workflows/`
  - Public and planned workflow manifests plus n8n workflow JSON.
- `infra/compose/`
  - Local and production Docker Compose definitions plus `.env.example`.
- `infra/scripts/`
  - Canonical setup, deploy, smoke-test, backup, and cleanup scripts.
- `infra/traefik/`
  - Persistent certificate storage used by the production Traefik container.
- `services/internal-ops/`
  - Private internal operating system for Telegram-based company management and
    remote OpenClaw orchestration.

## Documentation Layout

- `docs/architecture/` for current architecture, conventions, and focused
  subsystem docs.
- `docs/runbooks/` for operational procedures.
- `docs/planning/` for the active roadmap only.

## Related Docs

- [Documentation Hub](./README.md)
- [Architecture Overview](./architecture/overview.md)
- [Current State](./architecture/current-state.md)
- [Internal Ops Personal Operating System](./architecture/internal-ops-personal-os.md)
- [Infrastructure Overview](../infra/README.md)
