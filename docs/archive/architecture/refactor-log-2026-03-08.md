# Refactor Log - 2026-03-08

This log records the alignment refactor executed to reconcile the repository with `whole-initial-context.md`.

## Scope

Primary focus:

- `apps/web` architecture alignment.
- Removal of legacy model drift.
- Route and type consistency improvements.
- Monorepo integration cleanup.

Secondary fixes discovered during validation:

- Typecheck blockers in `packages/connectors`, `packages/agent-engine`, and `services/api`.

## Key Changes

## 1) FleetOps Read-Model Consolidation

- Introduced and adopted `apps/web/lib/fleetops/read-model.ts` as the active access layer for FleetOps pages/components.
- Replaced direct page-level imports from raw FleetOps mock sources in active UI routes.

Why:

- Explicitly separate view logic from underlying data source.
- Prepare drop-in replacement of mock internals with real API-backed selectors.

## 2) Route Integrity Fixes

- Fixed broken links to non-existent routes in active pages and assistant actions.
- Ensured fleet-to-runs links use stable query keys (`agentId`, `workflowId`).
- Added compatibility support where legacy query keys could still exist.

Why:

- Prevent dead navigation paths.
- Keep tenant flows coherent across dashboard, fleet, runs, and observability.

## 3) Legacy Model Removal

Removed unused legacy files that represented a competing domain model and stale route assumptions.

Files removed:

- `apps/web/lib/store.ts`
- `apps/web/lib/mock-data.ts`
- `apps/web/lib/domain.ts`
- `apps/web/lib/checklist.ts`
- `apps/web/lib/gates.ts`
- `apps/web/lib/types.ts`
- `apps/web/components/app-shell.tsx`
- `apps/web/components/activation-checklist.tsx`
- `apps/web/components/approval-banner.tsx`
- `apps/web/components/audit-log-table.tsx`
- `apps/web/components/gate-timeline.tsx`
- `apps/web/components/reason-list.tsx`
- `apps/web/components/step-timeline.tsx`
- `apps/web/components/workspace-status-badge.tsx`

Why:

- Eliminate dual-model drift highlighted by the source architecture document.

## 4) `apps/web` Monorepo Cleanup

- Package renamed to `@agentmou/web`.
- `apps/web/tsconfig.json` aligned to root base config.
- Added `apps/web/Dockerfile`.
- Removed `apps/web/pnpm-lock.yaml` and other duplicate leftovers.
- Updated web build to `next build --webpack` for stable build execution in this environment.

## 5) Chat Engine Alignment

- Updated `apps/web/lib/chat/engine.ts` actions to tenant-aware valid routes.
- Replaced obsolete route targets with current app IA targets.

## 6) Type Safety and Validation Repairs

Web/domain type repairs:

- Added missing domain values (`ExecutionStatus: error`, `ExecutionStep` extra step types, approval action coverage).
- Added tenant scope to `SecurityPolicy`.
- Fixed payload rendering guards in approvals page.
- Fixed team member field mismatches in security page.
- Fixed animated-tabs effect return path typing.

Workspace typecheck blockers outside web:

- Repaired connector registry typing and imports.
- Repaired agent-engine internal imports and workflow dispatcher typing.
- Removed stale API route file and cleanup of API module typing conflicts.

## Validation Results

Executed commands:

- `pnpm --filter @agentmou/web typecheck` -> pass.
- `pnpm --filter @agentmou/web build` -> pass.
- `pnpm --filter @agentmou/web exec next build --webpack` -> pass.
- `pnpm typecheck` -> pass.
- `pnpm build` -> pass.
- `pnpm lint` -> fail (ESLint binary not installed in workspace).
- `pnpm test` -> fail (no test task graph configured yet).

## Trade-offs

- Kept mock-backed data sources for now, but centralized them behind read-model selectors to protect page code.
- Did not re-architect backend modules; preserved target architecture and focused on removing drift and breakage.
- Kept visual UI style unchanged while improving structure and reliability.
