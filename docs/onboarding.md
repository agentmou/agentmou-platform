# Developer Onboarding Guide

This guide gets a new contributor from clone to a working local checkout and a
useful mental model of the repo.

## Prerequisites

### Required

- Node.js 20 or newer
- pnpm 9.15 or newer
- Docker with Docker Compose
- Git

### Helpful

- Python 3.12 if you will touch `services/agents`
- PostgreSQL client tooling for local inspection
- VS Code or another editor with TypeScript support

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/agentmou/agentmou-platform.git
cd agentmou-platform
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure local environment

```bash
cp infra/compose/.env.example infra/compose/.env
```

For local work, the defaults in `.env.example` are usually enough. Generate new
values if you want stronger local secrets:

- `JWT_SECRET`: `openssl rand -hex 32`
- `CONNECTOR_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `N8N_ENCRYPTION_KEY`: `openssl rand -hex 16`

### 4. Start local infrastructure

```bash
docker compose -f infra/compose/docker-compose.local.yml up -d
```

This brings up PostgreSQL, Redis, and n8n.

### 5. Migrate and seed the database

```bash
pnpm db:migrate
pnpm db:seed
```

### 6. Start the workspaces

```bash
pnpm dev
```

Expected local entrypoints:

- web: `http://localhost:3000`
- api: `http://localhost:3001`
- n8n: `http://localhost:5678`

## Quick Verification

Run a small sanity check before you start reading code:

```bash
curl http://localhost:3001/health
```

Expected shape:

```json
{
  "status": "ok"
}
```

Then open `http://localhost:3000` and confirm the marketing site renders.

## Platform Mental Model

Agentmou has five runtime layers:

1. `apps/web` for marketing, auth, and the tenant control plane
2. `services/api` for control-plane HTTP and persistence
3. `services/worker` for queued background execution
4. `services/agents` for specialized email-analysis behavior
5. `catalog/`, `workflows/`, and `packages/*` as the shared runtime inputs and
   libraries behind the system

If you only remember one rule, remember this one:

> The web app manages and visualizes runs. The API records and queues them. The
> worker executes them.

## Workspace Tour

| Path | Why it matters |
| --- | --- |
| `apps/web` | Frontend routes, provider layer, demo catalog, tenant UI |
| `services/api/src/app.ts` | Route registration and auth boundaries |
| `services/worker/src/index.ts` | Queue registration and async execution model |
| `packages/contracts` | Shared schemas and types used across the repo |
| `packages/db` | Drizzle schema, migrations, and seed logic |
| `catalog/` | Installable product agents and packs |
| `workflows/public/` | Installable n8n workflow assets |
| `templates/` | Starter skeletons for new agents and workflows |
| `infra/compose` | Local and production Compose manifests |

## First Files To Read

Read these in roughly this order:

1. [Architecture Overview](./architecture/overview.md)
2. [apps/web Architecture](./architecture/apps-web.md)
3. [Catalog, Demo, and Marketing](./catalog-and-demo.md)
4. [Repository Map](./repo-map.md)
5. `services/api/src/app.ts`
6. `services/worker/src/index.ts`
7. `apps/web/lib/data/provider.ts`

That sequence gives you the system shape before you dive into implementation.

## Good First Tasks

### Verify content validation

```bash
make validate-content
```

Useful when you are touching docs, manifests, or runbooks.

### Inspect a real route family

Open one of:

- `services/api/src/modules/installations/installations.routes.ts`
- `services/api/src/modules/runs/runs.routes.ts`
- `services/api/src/modules/approvals/approvals.routes.ts`

These show how the repo models install, execute, and review flows.

### Inspect the tenant UI data layer

Open:

- `apps/web/lib/data/provider.ts`
- `apps/web/lib/data/api-provider.ts`
- `apps/web/lib/data/demo-provider.ts`

This is the fastest way to understand how the same UI switches between demo and
real tenant data.

### Inspect the operational catalog boundary

Compare:

- `catalog/agents/inbox-triage/`
- `workflows/public/wf-01-auto-label-gmail/`
- `apps/web/lib/demo-catalog/`

That contrast explains the difference between installable assets and richer
demo inventory.

## Common Workflows

### Changing docs or READMEs

```bash
make validate-content
```

Also spot-check internal links in the docs you touched.

### Changing manifests or demo catalog

```bash
pnpm demo-catalog:generate
pnpm demo-catalog:check
```

Use these after changing `catalog/`, `workflows/public/`, or the generated
operational ID snapshot.

### Changing backend code

```bash
pnpm lint
pnpm typecheck
pnpm test
```

### Changing only the Python sidecar

```bash
pnpm test:agents
pnpm typecheck:agents
```

## Before You Open a PR

Run the checks that match your change set. For a typical TypeScript or docs
change:

```bash
pnpm lint
pnpm typecheck
pnpm test
make validate-content
```

## Related Docs

- [Documentation Hub](./README.md)
- [Architecture Overview](./architecture/overview.md)
- [apps/web Architecture](./architecture/apps-web.md)
- [Catalog, Demo, and Marketing](./catalog-and-demo.md)
- [Testing Guide](./testing.md)
