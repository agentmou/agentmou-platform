# `apps/web` Architecture

This document describes the real `apps/web` structure after refactors and
the engineering rules to keep it aligned with the target architecture.

## Purpose

`apps/web` is a single Next.js app with two surfaces:

- Marketing surface: public pages and product narrative.
- App surface: tenant-scoped control plane UI.

It is intentionally UI/control-plane only. It is not the runtime execution
authority.

## Dependency on Shared Contracts

`apps/web` depends on `@agentmou/contracts` as a workspace dependency.
All domain types used by pages and components are re-exported through
`lib/fleetops/types.ts`, which imports from contracts. This means:

- Pages continue to import from `@/lib/fleetops/types`.
- The underlying types are the canonical Zod-inferred types from
  contracts.
- Adding new domain types happens in contracts first, then is consumed
  here via re-export.

## Routing Structure

- `app/(marketing)/...`
  - Public pages (`/`, `/pricing`, `/security`, `/docs`, `/login`).
  - Uses marketing shell and visual brand components.

- `app/app/[tenantId]/...`
  - Tenant control plane pages.
  - Current sections:
    - `dashboard`
    - `marketplace` (+ detail pages for agents, workflows, packs)
    - `installer/new`
    - `fleet`
    - `runs` (+ detail page per run)
    - `approvals`
    - `observability`
    - `security`
    - `settings`

- `app/api/chat/route.ts`
  - Mock chat endpoint scaffold, designed to be replaced by real model
    integration.

## Data Access Pattern

All active FleetOps pages consume data through:

- `lib/fleetops/read-model.ts`

Read-model responsibilities:

- Catalog selectors (agent, workflow, pack, integration).
- Tenant selectors (installed, approvals, runs, security, members,
  billing, audit, secrets).
- Derived metrics (`getTenantDashboardMetrics`).

This keeps page components focused on view logic and avoids direct
coupling to raw mock source files.

## Theme Support

`ThemeProvider` from `next-themes` is mounted in the root layout with
`attribute="class"`, `defaultTheme="system"`, `enableSystem`. Dark mode
support is structurally wired.

## What Was Kept

- Visual direction and styling language.
- Existing page layout and route IA.
- Marketplace/fleet/runs/observability UX structure.
- Existing dependency set.

## What Was Refactored

Initial pass:

- Replaced direct `mock-data` imports in active pages with read-model
  functions.
- Fixed route/link mismatches in active app flows.
- Removed unused legacy app model layer and components.

Contracts elevation pass:

- Wired `@agentmou/contracts` as dependency.
- Refactored `types.ts` to re-export from contracts.
- Refactored `category-config.ts` to import canonical types from
  contracts.
- Removed duplicate `use-toast` file.
- Removed 3 dead components (`data-table`, `filter-bar`, `empty-state`).
- Wired `ThemeProvider` in root layout.
- Removed v0 generator tag from metadata.
- Fixed `no-case-declarations` lint errors in chat engine.

## Component/Folder Guidance

- `components/ui/*` — shadcn-style primitives (~57 components).
- `components/fleetops/*` — tenant shell (`app-shell.tsx`) and command
  palette (`command-palette.tsx`).
- `components/brand/*` — marketing-only brand visuals.
- `components/chat/*` — assistant behavior and chat UI.
- `components/badges.tsx`, `stat-card.tsx`, `json-viewer.tsx` — feature
  components.
- `hooks/` — `use-toast.ts` (canonical), `use-mobile.ts`.
- `lib/fleetops/*` — FleetOps domain models, read-model, catalog data.
- `lib/chat/*` — assistant behavior/state (currently mock engine).
- `lib/utils.ts` — `cn`, `formatDate`, `formatNumber`.
- `lib/saved-views.ts` — localStorage-backed saved views for runs.
- `lib/search-index.ts` — command palette search index.

## Server vs Client Boundaries

- Most tenant pages are currently client components for
  interaction-heavy UIs.
- Route handlers are limited and currently mock-backed.
- Future migration path:
  - Move fetchers to real API clients in server contexts where possible.
  - Keep interactive state and transient UI logic in client components.

## Patterns to Follow

- Prefer read-model selectors over direct dataset imports in page
  components.
- Keep tenant awareness explicit in routes and selectors.
- Keep catalog entities separate from installed/execution entities in
  UI logic.
- Keep feature behavior in domain-specific folders (`fleetops`, `chat`)
  instead of generic `lib` growth.
- Import domain types through `@/lib/fleetops/types` (which re-exports
  from contracts).

## Anti-Patterns to Avoid

- Reintroducing a second domain model/store parallel to FleetOps.
- Building new pages directly on raw mock arrays.
- Mixing template metadata with tenant installation state in one object.
- Adding route actions to non-existent paths.
- Defining new domain types locally instead of in contracts.

## Immediate Next Step for `apps/web`

Replace mock-backed read-model internals with real typed API clients
while preserving the same selector interface for pages.
