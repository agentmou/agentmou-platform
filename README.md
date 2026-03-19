# AgentMou Platform

AgentMou is a monorepo for an AI agents platform with a tenant control
plane, workflow orchestration via n8n, and runtime execution
infrastructure.

The current, code-verified architecture context is documented in
[`docs/architecture/platform-context-v2.md`](./docs/architecture/platform-context-v2.md).

[`whole-initial-context.md`](./whole-initial-context.md) is preserved as the
historical baseline that shaped the original direction.

## Current Status

**Early vertical slice with mixed maturity.**

- `implemented`: monorepo structure, real auth and tenancy persistence,
  manifest-backed catalog loading, BullMQ worker queues, Gmail OAuth,
  first runtime slice, and n8n workflow provisioning paths.
- `partial`: authenticated web app routes use the real API, but demo/mock
  inventory and empty-default fallback paths still exist in the web layer.
- `stub` or `planned`: billing, usage, security, parts of observability,
  richer memory/RAG, and enterprise hardening.
- Validation on March 19, 2026: `pnpm typecheck`, `pnpm test`, and
  `pnpm lint` all pass from the repo root; `pnpm lint` still reports
  warnings only.

## Monorepo Structure

```text
agentmou-platform/
├─ apps/
│  └─ web/                # Next.js: marketing + tenant control plane
├─ services/
│  ├─ agents/             # Python FastAPI agent endpoints (production)
│  ├─ api/                # Fastify control-plane API (real DB persistence)
│  └─ worker/             # BullMQ workers (install-pack implemented)
├─ packages/
│  ├─ contracts/          # Shared Zod schemas and domain types
│  ├─ db/                 # Drizzle ORM schema + Postgres client
│  ├─ queue/              # BullMQ queue names + typed job payloads
│  ├─ auth/               # JWT + password hashing
│  ├─ catalog-sdk/        # Manifest loader/validator
│  ├─ agent-engine/       # Agent runtime engine (first real vertical slice)
│  ├─ connectors/         # Connector abstractions + Gmail implementation
│  ├─ n8n-client/         # n8n REST API adapter
│  ├─ observability/      # Structured logging (Pino) + tracing
│  └─ ui/                 # Shared UI (placeholder)
├─ catalog/               # Versioned agent and pack manifests
├─ workflows/             # Versioned workflow assets (public/planned)
├─ infra/                 # Docker Compose, Traefik, scripts, backups
├─ docs/                  # Architecture, ADRs, roadmap, runbooks
└─ whole-initial-context.md  # Historical architecture baseline
```

## Prerequisites

- Node.js `>=20`
- pnpm `9.x`
- Docker + Docker Compose (for Postgres, Redis, n8n)

## Quick Start

```bash
pnpm install

# Start local infrastructure (Postgres, Redis, n8n)
cp infra/compose/.env.example infra/compose/.env
docker compose -f infra/compose/docker-compose.local.yml up -d

# Run database migrations and seed
pnpm db:migrate
pnpm db:seed

# Run the main repository checks
# See the validation snapshot above for the currently verified status.
pnpm typecheck
pnpm build
pnpm lint
pnpm test

# Start development servers
pnpm dev
```

## Core Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Run all dev servers via Turbo |
| `pnpm build` | Build all packages/apps |
| `pnpm typecheck` | TypeScript checks (13 packages) |
| `pnpm lint` | ESLint (12 packages) |
| `pnpm test` | Run package test scripts via Turbo |
| `pnpm format` | Prettier formatting |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed local database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm cleanup:validation-tenant` | Preview or execute cleanup for disposable OAuth/E2E validation tenants |

## Service Endpoints (Local)

| Service | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| n8n | `http://localhost:5678` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

## Documentation Index

### Architecture

- [Platform Context v2.0](./docs/architecture/platform-context-v2.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Monorepo Map](./docs/architecture/monorepo-map.md)
- [Current Implementation vs Target Plan](./docs/architecture/current-implementation.md)
- [Web App Architecture](./docs/architecture/apps-web.md)
- [Engineering Conventions](./docs/architecture/conventions.md)

### ADRs

- [ADR-001: Monorepo Structure](./docs/adr/001-monorepo-structure.md)
- [ADR-002: Shared Contracts](./docs/adr/002-shared-contracts-type-system.md)
- [ADR-003: n8n Role](./docs/adr/003-n8n-role.md)
- [ADR-004: TypeScript Runtime First](./docs/adr/004-typescript-runtime-first.md)
- [ADR-005: Postgres + pgvector + Redis](./docs/adr/005-postgres-pgvector-redis-stack.md)
- [ADR-006: VPS Stack Alignment](./docs/adr/006-vps-stack-alignment.md)

### Refactor Logs

- [Phase 0: Initial Alignment](./docs/architecture/refactor-log-2026-03-08.md)
- [Phase 0: Contracts Elevation](./docs/architecture/refactor-log-2026-03-08-contracts.md)
- [Phase 1: Real Control Plane](./docs/architecture/refactor-log-2026-03-08-phase1.md)

### Product

- [Program Action Plan](./docs/product/action-plan.md)
- [Product Roadmap](./docs/product/roadmap.md)

### Operations

- [Deployment Runbook](./docs/runbooks/deployment.md)
- [VPS Operations](./docs/runbooks/vps-operations.md)

## Development Guidance

- Use `docs/architecture/platform-context-v2.md` as the operational
  architecture source of truth.
- Keep `whole-initial-context.md` as the historical baseline.
- Define shared domain types in `@agentmou/contracts` first.
- API services import `db` from `@agentmou/db` — no mock data in services.
- Use `@agentmou/queue` for job definitions shared between API and worker.
- Preserve separation between template, installation, and execution.
- Write tests for new functionality (target: >80% on critical paths).
- Update documentation in the same PR as code changes.
