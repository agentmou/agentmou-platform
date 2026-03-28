# ADR-001: Monorepo Structure with pnpm Workspaces and Turborepo

**Status**: accepted
**Date**: 2024-01-15

## Context

The Agentmou platform consists of multiple services (control plane API, background worker, Python agents sidecar), a marketing and tenant web application, and shared libraries for database schemas, contracts, observability, and connectors. These components need to:

- Share TypeScript type definitions and runtime contracts across services
- Use a unified tooling and build system to reduce operational burden
- Maintain a single source of truth for common configurations and dependencies
- Execute fast, reproducible builds in CI/CD pipelines
- Allow independent deployment of services while enforcing dependency constraints

A monorepo structure with workspace tooling addresses these needs better than separate repositories, which would create friction around shared code and dependency synchronization.

## Decision

Use **pnpm workspaces** combined with **Turborepo** as the canonical monorepo structure.

- **pnpm**: Manages workspaces and dependencies at the root `pnpm-workspace.yaml` and in each package.json. Provides stricter phantom dependency prevention than npm or yarn.
- **Turborepo**: Orchestrates build, test, lint, and dev tasks across the monorepo. Provides incremental builds, local caching, and clear dependency graphs.

Workspace layout:
- `apps/web`: Next.js web application (marketing + tenant control plane)
- `services/api`: Fastify API (control plane backend)
- `services/worker`: BullMQ job processor (async work)
- `services/agents`: Python FastAPI sidecar (specialized AI tasks)
- `packages/*`: Shared libraries (@agentmou/contracts, @agentmou/db, @agentmou/auth, @agentmou/connectors, etc.)

## Alternatives Considered

1. **Polyrepo**: Separate Git repositories per service
   - Pros: Independent versioning, simpler CI/CD per repo
   - Cons: Difficult to keep shared types and configs in sync; repeated dependency management

2. **Nx**: Another monorepo orchestration tool
   - Pros: Plugin ecosystem, more features out of the box
   - Cons: Steeper learning curve; heavier than needed for this team size

3. **Lerna**: JavaScript monorepo package manager
   - Pros: Mature, widely used
   - Cons: Slower than Turborepo; lacks task orchestration

## Consequences

- **Single CI pipeline**: All services build in one workflow. Dependency changes trigger rebuilds across the monorepo.
- **Shared configuration**: ESLint, TypeScript, Prettier configs are inherited from the root; consistency is enforced.
- **Workspace protocol dependencies**: Services reference shared packages via `workspace:*` protocol, enabling tight coupling during development but clear separation at deployment time.
- **Single node_modules installation**: `pnpm install` installs all workspace dependencies once, reducing disk space and install time compared to per-package node_modules.
- **Task parallelization**: Turbo runs independent tasks (e.g., `lint` across packages) in parallel, accelerating feedback loops.
- **Deployment remains independent**: Services are deployed as separate Docker images; the monorepo structure does not force shared deployments.

All workspace packages are scoped as `@agentmou/*` to avoid name collisions and clarify ownership.
