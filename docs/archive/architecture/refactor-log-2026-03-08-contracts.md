# Refactor Log — 2026-03-08 — Contracts Elevation & Monorepo Alignment

This log records the second alignment refactor executed to further reconcile
the repository with `whole-initial-context.md`.

## Scope

Primary focus:

- Elevate `packages/contracts` from trivial 3-schema scaffold to a
  comprehensive shared type system covering all domain entities.
- Wire `apps/web` to consume types from `@agentmou/contracts` instead of
  maintaining a parallel local type system.
- Expand `packages/db` schema from 3 minimal tables to the full set of
  plan-aligned tables.
- Fix `packages/catalog-sdk` schema mismatch with actual manifest files.
- Clean `apps/web` hygiene issues (dead code, duplicates, ThemeProvider).
- Add workspace-level ESLint baseline.
- Fix `packages/observability` missing dependency.
- Fix `packages/agent-engine` duration computation bug.
- Fix `packages/n8n-client` type mismatch after contracts expansion.

## Key Changes

### 1) Contracts Elevation (highest impact)

Previous state:

- `packages/contracts` contained 3 trivial Zod schemas (`AgentSchema`,
  `WorkflowSchema`, `PackSchema`) with ~5 fields each.
- `apps/web/lib/fleetops/types.ts` contained the real domain types (~365
  lines) covering Tenant, AgentTemplate, WorkflowTemplate, PackTemplate,
  Integration, InstalledAgent, InstalledWorkflow, ExecutionRun,
  ExecutionStep, ApprovalRequest, SecurityFinding, SecurityPolicy,
  TenantMember, Invoice, DashboardMetrics, N8nConnection, and all
  supporting enums/unions.
- The web types and contracts were completely disconnected.

Action taken:

- Created domain-organized schema files in `packages/contracts/src/`:
  `catalog.ts`, `tenancy.ts`, `installations.ts`, `execution.ts`,
  `approvals.ts`, `connectors.ts`, `security.ts`, `billing.ts`,
  `dashboard.ts`.
- Each file contains Zod schemas with inferred TypeScript types.
- Updated barrel exports (`schemas.ts`, `types.ts`, `index.ts`).

Why:

- The plan mandates contracts as the shared type source of truth across
  web, API, and worker.
- Without this, the monorepo is structurally correct but functionally
  disconnected — each workspace would maintain its own type system.

### 2) Wire apps/web to @agentmou/contracts

Previous state:

- `apps/web` had zero dependencies on any `@agentmou/*` package.
- `lib/fleetops/types.ts` defined all domain types locally.
- `lib/fleetops/category-config.ts` defined the `Category` type locally.

Action taken:

- Added `@agentmou/contracts` as workspace dependency.
- Refactored `types.ts` to re-export all types from `@agentmou/contracts`.
- Refactored `category-config.ts` to import `Category` and `CATEGORIES`
  from contracts, keeping only UI helper functions local.

Impact:

- All existing page/component imports remain stable (they still import
  from `@/lib/fleetops/types`).
- The web app is now a real consumer of the shared type system.
- Future backend services can share the same types with zero drift risk.

### 3) Catalog SDK Schema Fix

Previous state:

- `AgentManifestSchema` required `prompts: z.array(z.string())`.
- Actual manifest files use separate `prompt.md` files and have
  `capabilities`, `triggers`, `tags`, `metadata` — not `prompts`.
- Validation would fail on any real manifest.

Action taken:

- Rewrote `AgentManifestSchema` to match actual manifest structure.
- Rewrote `PackManifestSchema` to include `connectors` and
  `recommended_settings`.
- Added `WorkflowManifestSchema` for workflow manifest files.

### 4) Database Schema Expansion

Previous state:

- 3 tables: `users` (3 cols), `agents` (3 cols), `workflows` (3 cols).
- `agents` and `workflows` conflated template with installation.

Action taken:

- Expanded `users` table with `name`, `passwordHash`.
- Added plan-aligned tables: `tenants`, `memberships`,
  `connector_accounts`, `secret_envelopes`, `agent_installations`,
  `workflow_installations`, `execution_runs`, `execution_steps`,
  `approval_requests`, `audit_events`, `usage_events`.
- Removed the generic `agents` and `workflows` tables.

Why:

- The plan separates template, installation, and execution as first-class
  entities. The old schema conflated these.

### 5) apps/web Hygiene

- Removed duplicate `components/ui/use-toast.ts` (identical to
  `hooks/use-toast.ts`).
- Removed dead components with zero imports: `data-table.tsx`,
  `filter-bar.tsx`, `empty-state.tsx`.
- Wired `ThemeProvider` in root layout (`next-themes` was installed but
  never mounted).
- Removed `generator: 'v0.app'` from metadata.

### 6) ESLint Baseline

- Installed `eslint`, `@eslint/js`, `typescript-eslint` at workspace root.
- Created flat config `eslint.config.js` with recommended + TS rules.
- Updated all package `lint` scripts from legacy `--ext` format to
  `eslint .`.
- Fixed 2 lint errors (1 `prefer-const` in agent-engine, 2
  `no-case-declarations` in chat engine).
- `pnpm lint` now passes across all 11 packages (0 errors).

### 7) Observability Fix

- Added `pino-pretty` to `packages/observability` dependencies (was
  referenced as transport but not declared).

### 8) Agent Engine Duration Fix

- Fixed `duration: Date.now()` to `duration: Date.now() - startTime` in
  both success and error paths of `AgentEngine.execute()`.

### 9) N8n Client Type Fix

- Replaced import of removed `Workflow` type with n8n-specific types
  (`N8nWorkflow`, `N8nExecutionResult`).
- These types model the actual n8n REST API response shape, not our
  domain model.

## Validation Results

- `pnpm install`: pass.
- `pnpm typecheck`: 12/12 packages pass.
- `pnpm build`: 3/3 buildable packages pass (web build produces all
  routes correctly).
- `pnpm lint`: 11/11 packages pass (0 errors, warnings are pre-existing
  scaffold code).

## Trade-offs

- Kept mock-backed data sources in `apps/web` — the read-model selector
  interface is preserved so pages don't need changes when mocks are
  replaced with real API calls.
- Pre-existing lint warnings in scaffold packages (agent-engine, API,
  worker) were not fixed to avoid unnecessary churn in stub code that
  will be rewritten.
- The `packages/ui` package remains a minimal placeholder — shared UI
  components continue to live in `apps/web/components/ui/` following the
  shadcn co-location pattern.
