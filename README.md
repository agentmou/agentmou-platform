# Agentmou Platform

Agentmou is a monorepo for an AI agents platform with a tenant control plane,
workflow orchestration via n8n, and background execution infrastructure.

The canonical documentation entrypoint is [`docs/README.md`](./docs/README.md).

## Workspace Map

- `apps/web`: public marketing site plus authenticated tenant control plane
- `services/api`: Fastify control-plane API
- `services/worker`: BullMQ worker for installs, executions, schedules, and
  approval timeout handling
- `services/agents`: narrow Python FastAPI sidecar for email analysis and deep
  health
- `packages/*`: shared contracts, DB, queueing, catalog SDK, connectors, auth,
  observability, and runtime helpers

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

| Command                          | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `pnpm dev`                       | Run workspace development tasks through Turbo |
| `pnpm build`                     | Build all workspaces                          |
| `pnpm typecheck`                 | Run TypeScript checks plus Python syntax validation for `services/agents` |
| `pnpm lint`                      | Run workspace lint plus infrastructure shell and Compose validation |
| `pnpm lint:infra`                | Validate `infra/scripts/*.sh` and all Compose manifests against tracked env examples |
| `pnpm test`                      | Run tests across workspaces                   |
| `pnpm test:agents`               | Run the Python unit tests for `services/agents` |
| `pnpm db:generate`               | Generate Drizzle migrations                   |
| `pnpm db:migrate`                | Run DB migrations                             |
| `pnpm db:seed`                   | Seed the local database                       |
| `pnpm cleanup:validation-tenant` | Preview or execute disposable tenant cleanup  |
| `pnpm demo-catalog:generate`     | Regenerate `operational-ids.gen.json` after catalog changes |
| `pnpm demo-catalog:check`        | Fail CI if the operational ID snapshot is out of date |

## Local Endpoints

| Service                        | URL                     |
| ------------------------------ | ----------------------- |
| Web                            | `http://localhost:3000` |
| API                            | `http://localhost:3001` |
| n8n                            | `http://localhost:5678` |
| PostgreSQL                     | `localhost:5432`        |
| Redis                          | `localhost:6379`        |

## Read Next

- [Documentation Hub](./docs/README.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Current State](./docs/architecture/current-state.md)
- [Repository Map](./docs/repo-map.md)
- [Catalog, demo, and marketing](./docs/catalog-and-demo.md)
- [Deployment Guide](./docs/deployment.md)
