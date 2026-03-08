# ADR-002 — Shared Contracts as Type Source of Truth

**Status**: accepted
**Date**: 2026-03-08

## Context

The monorepo has multiple workspaces that share domain concepts: `apps/web`
(Next.js frontend), `services/api` (Fastify control plane), `services/worker`
(BullMQ jobs), and several shared packages. Without a single source of truth
for domain types, each workspace would maintain its own definitions, leading
to drift, duplication, and integration bugs.

The initial bootstrap created a minimal `packages/contracts` with 3 trivial
schemas (Agent, Workflow, Pack), while the real domain complexity (~25+
types, rich enums, nested objects) lived only inside `apps/web`.

## Decision

`packages/contracts` is the single source of truth for all domain schemas
and types shared across workspaces.

Implementation:

- Domain types are defined as Zod schemas with inferred TypeScript types.
- Schemas are organized by bounded context: `catalog.ts`, `tenancy.ts`,
  `installations.ts`, `execution.ts`, `approvals.ts`, `connectors.ts`,
  `security.ts`, `billing.ts`, `dashboard.ts`.
- Consumer packages import types from `@agentmou/contracts`.
- UI-only type extensions (e.g., `CatalogGroup` alias, `DashboardMetrics`)
  live in contracts when they represent domain concepts, and remain local
  only if they are purely presentational.

## Alternatives Considered

1. **Keep types local per workspace**: rejected because it guarantees drift
   between frontend and backend representations.
2. **Use a separate OpenAPI spec as source of truth**: rejected for this
   phase — adds complexity before the API is mature enough to stabilize
   endpoint contracts.
3. **Use TypeScript interfaces without Zod**: rejected because Zod provides
   runtime validation for API boundaries and manifest parsing.

## Consequences

- All workspaces must depend on `@agentmou/contracts` for shared domain
  types.
- Adding or changing a domain type requires updating contracts first.
- Runtime validation is available at API boundaries and catalog loading
  via Zod `.parse()`.
- The Turbo dependency graph ensures contracts are always built before
  consumers.
