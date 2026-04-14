# Agentmou Platform

Agentmou is a **multi-tenant platform whose visible product is a multichannel AI receptionist for clinics**, powered by an internal AI agent engine with human-in-the-loop approvals. It combines a React/Next.js web surface, a Fastify REST API, background job processing via BullMQ, and workflow orchestration through n8n.

**Start here:** Read the [Documentation Hub](./docs/README.md) for comprehensive guides on setup, architecture, testing, and operations.

## Workspace Map

### Applications

| Workspace | Description |
| --------- | ----------- |
| `apps/web` | Next.js 16 + React 19 frontend. Clinic-first public marketing site, auth flows, web-owned API routes, and authenticated tenant control center under `/app/[tenantId]/`. Resolves `internal`, `clinic`, and `fisio` experiences from `TenantExperience`, keeps top-level internal routes canonical while preserving `/app/[tenantId]/platform/*` as a legacy alias, exposes the Admin console only for admin-capable tenants, keeps `demo-workspace` as the public clinic demo, and uses provider modes to switch between real tenant data and demo overlays. |

### Services

| Workspace | Description |
| --------- | ----------- |
| `services/api` | Fastify 5 REST API. Serves the control plane plus tenant-scoped route families for experience, dashboard, profile, modules, channels, patients, inbox, calls, appointments, forms, follow-up, and reactivation. Resolves `TenantExperience` and feature gating server-side from plan/module baseline, operational prerequisites, and Reflag overrides with fail-open fallback; exposes admin-only tenant-management APIs; and uses JWT authentication with role-based access control and Zod validation on inputs. |
| `services/worker` | BullMQ background job processor. 5 queues: INSTALL_PACK, RUN_AGENT, RUN_WORKFLOW, SCHEDULE_TRIGGER, APPROVAL_TIMEOUT. Redis-backed with exponential backoff retry logic. |
| `services/agents` | Python FastAPI sidecar for specialized AI tasks. Provides `/analyze-email` endpoint using GPT-4o-mini. X-API-Key authentication. |

### Packages (Shared Libraries)

| Workspace | Description |
| --------- | ----------- |
| `packages/contracts` | Zod schemas and TypeScript types for validation and type safety across services. Covers the platform control plane plus the clinic-domain contracts for patients, conversations, appointments, follow-up, gaps, and reactivation. |
| `packages/db` | Drizzle ORM + PostgreSQL 16. Tracks the platform control-plane schema plus clinic-domain tables for clinic config, patients, conversations, calls, forms, appointments, follow-up, gap recovery, and reactivation. |
| `packages/queue` | BullMQ queue definitions with typed payloads for all job types. |
| `packages/auth` | JWT token generation and verification using jose library. |
| `packages/connectors` | OAuth connectors for Gmail and extensible connector registry pattern. Handles credential encryption (AES-256-GCM). |
| `packages/catalog-sdk` | YAML manifest loading and validation for agents and workflows. |
| `packages/agent-engine` | Core agent runtime with Planner (GPT-4o), PolicyEngine, Toolkit, MemoryManager, WorkflowDispatcher, ApprovalGateManager, RunLogger, TemplatesManager. |
| `packages/observability` | Structured logging with Pino logger. |
| `packages/n8n-client` | Thin HTTP client wrapper for n8n API using axios. |

### Infrastructure & Configuration

| Workspace | Description |
| --------- | ----------- |
| `infra/` | Docker Compose for local and production deployments. Includes Traefik reverse proxy config, backup scripts, and setup automation. |
| `catalog/` | Operational product-agent manifests, pack definitions, and category taxonomy. |
| `templates/` | Starter skeletons for creating new agents and workflows. |
| `workflows/` | Installable public workflow assets plus planned workflow inventory. |
| `scripts/` | Workspace utilities: tenant cleanup, catalog ID generation, E2E tests. |

### Tooling

- **Root tools:** pnpm 9.15, Turborepo, Biome, ESLint, Vitest, TypeScript strict mode
- **CI/CD:** GitHub Actions (lint, typecheck, test, Python validation)
- **Runtime:** Node 22 LTS, Python 3.12, PostgreSQL 16, Redis 7, n8n 1.76.1

## Quick Start

```bash
pnpm install
cp infra/compose/.env.example infra/compose/.env
docker compose -f infra/compose/docker-compose.local.yml up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Core Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run workspace development tasks through Turbo |
| `pnpm build` | Build all workspaces |
| `pnpm format` | Format supported code and JSON files with Biome |
| `pnpm typecheck` | Run TypeScript checks plus Python syntax validation for `services/agents` |
| `pnpm lint` | Run workspace lint plus infrastructure shell and Compose validation |
| `pnpm lint:infra` | Validate `infra/scripts/*.sh` and all Compose manifests against tracked env examples |
| `pnpm test` | Run tests across workspaces |
| `pnpm test:agents` | Run the Python unit tests for `services/agents` |
| `make validate-content` | Run relaxed Markdown and YAML validation for docs and config |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run DB migrations |
| `pnpm db:seed` | Seed the local database |
| `pnpm cleanup:validation-tenant` | Preview or execute disposable tenant cleanup |
| `pnpm demo-catalog:generate` | Regenerate `operational-ids.gen.json` after catalog changes |
| `pnpm demo-catalog:check` | Fail CI if the operational ID snapshot is out of date |

## Local Endpoints

| Service | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| n8n | `http://localhost:5678` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

## Next Steps

**New to Agentmou?**

1. Start with [Onboarding Guide](./docs/onboarding.md) for local setup
2. Read [Glossary](./docs/glossary.md) to learn domain terminology
3. Review [Architecture Overview](./docs/architecture/overview.md) for system design
4. Read [apps/web Architecture](./docs/architecture/apps-web.md) for the frontend and provider model
5. See [Repository Map](./docs/repo-map.md) for detailed workspace breakdown

**For Specific Tasks:**

- **Testing**: [Testing Guide](./docs/testing.md) — Vitest patterns, AAA pattern, mocking strategies
- **Troubleshooting**: [Troubleshooting Guide](./docs/troubleshooting.md) — Common issues and solutions
- **Deployment**: [Deployment Guide](./docs/runbooks/deployment.md) — Production setup and Docker configuration
- **API Development**: [API Routes](./docs/api-routes.md) — REST endpoint overview
- **Catalog Work**: [Catalog, Demo, and Marketing](./docs/catalog-and-demo.md) — Operational vs demo inventory boundaries
- **Configuration**: [Environment Variables](./docs/environment-variables.md) — Complete reference

**Full Documentation Hub**: [docs/README.md](./docs/README.md) — Central index with role-based navigation
