# Onboarding

This guide is the fastest path for a newcomer to understand, boot, and safely
change the repository.

## Reading Order

1. Read the [root README](../README.md) for the short repo summary and quick
   start commands.
2. Read the [Architecture Overview](./architecture/overview.md) for the
   high-level system split.
3. Read the [Current State](./architecture/current-state.md) for the validated
   implementation snapshot.
4. Read the [Repository Map](./repo-map.md) to see where each concern lives.
5. Read the [Testing Guide](./testing.md) before changing code.
6. Read the [Infrastructure Overview](../infra/README.md) if your change
   touches deployment, Docker Compose, or VPS operations.

## Prerequisites

- Node.js 20 or newer
- `pnpm` 9
- Docker with Compose support
- PostgreSQL and Redis are optional locally because the default workflow uses
  Docker Compose

## First Local Setup

```bash
cp infra/compose/.env.example infra/compose/.env
docker compose -f infra/compose/docker-compose.local.yml up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Core Validation Commands

Run these from the repo root before opening a PR:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Use targeted workspace commands when you only need one surface:

```bash
pnpm --filter @agentmou/api test
pnpm --filter @agentmou/web build
pnpm --filter @agentmou/worker typecheck
```

## Where Things Live

- `apps/web` holds the public site and tenant control-plane UI.
- `services/api` holds the Fastify control-plane API.
- `services/worker` holds BullMQ background jobs.
- `services/agents` holds the Python FastAPI helper service for LLM-backed
  email analysis.
- `packages/*` holds shared contracts, DB schema, queue payloads, auth,
  observability, connectors, and SDKs.
- `catalog/` and `workflows/` hold versioned installable assets.
- `infra/` holds Docker Compose, deploy scripts, backups, and Traefik data.

## Safe Change Workflow

1. Identify the canonical doc for the area you are changing.
2. Update the code and the co-located README or runbook in the same change.
3. Re-run the smallest validation command that proves the behavior.
4. Finish with the root validation trio: `pnpm typecheck`, `pnpm lint`,
   `pnpm test`.

## When You Need More Context

- Use [Runbooks](./runbooks/README.md) for operational procedures.
- Use [ADRs](./adr/) for cross-package decisions.
