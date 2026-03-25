# AgentMou Platform

AgentMou is a monorepo for an AI agents platform with a tenant control plane,
workflow orchestration via n8n, and background execution infrastructure.

The canonical documentation entrypoint is [`docs/README.md`](./docs/README.md).

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
| `pnpm typecheck` | Run TypeScript checks across the repo |
| `pnpm lint` | Run lint across workspaces |
| `pnpm test` | Run tests across workspaces |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run DB migrations |
| `pnpm db:seed` | Seed the local database |
| `pnpm cleanup:validation-tenant` | Preview or execute disposable tenant cleanup |

## Local Endpoints

| Service | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:3001` |
| n8n | `http://localhost:5678` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

## Read Next

- [Documentation Hub](./docs/README.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Current State](./docs/architecture/current-state.md)
- [Repository Map](./docs/repo-map.md)
- [Deployment Guide](./docs/deployment.md)
