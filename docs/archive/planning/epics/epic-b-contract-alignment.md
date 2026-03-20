# Epic B - Contract Alignment

**Status**: proposed

## Problem Source

- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Rectifications" item 1
- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Appendix A - Contract Drift"

## Objective

Make `@agentmou/contracts` authoritative for the core tenant-facing payloads
that already power the API, worker, and web app.

## In Scope

- Execution runs and execution steps
- Approval request shape
- Installation response shape
- Connector response shape
- Tenant settings shape
- Runtime schema parsing in `apps/web/lib/api/client.ts`

## Out Of Scope

- New routes
- New business capabilities
- Broad redesign of the domain model beyond the mismatches already identified
- Billing, usage, and security contract work that depends on still-stubbed
  modules

## Dependencies

- Epic A should land first so validation can be trusted while changing shared
  contracts and consumers.

## Public APIs / Types

- Existing route paths should remain stable
- Shared contracts in `@agentmou/contracts` will likely change
- API response envelopes may be aligned, but should not be broadened beyond
  current behavior
- Web client should move from optimistic typing to runtime parsing

## PR Sequence

### PR 1 - Align execution contracts

- Reconcile `ExecutionRunSchema`, `ExecutionStepSchema`, and emitted run/step
  payloads
- Make worker and API producers agree on step types and status vocabulary
- Keep existing run routes and query patterns stable

### PR 2 - Align approval contracts

- Reconcile approval shapes between DB/API producers and shared contracts
- Standardize field names such as installation vs agent identity
- Keep approval routes stable

### PR 3 - Align installations, connectors, and tenant settings

- Reconcile installed asset shapes, connector list items, and tenant settings
- Add shared contracts for response envelopes only where necessary to stop
  implicit drift
- Keep install/connect/settings endpoints stable

### PR 4 - Add runtime parsing in the web client

- Parse API responses against shared schemas in `apps/web/lib/api/client.ts`
- Fail loudly on drift instead of silently flowing invalid data into the UI
- Keep the client surface stable for calling pages

## Validation

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- Register/login/me
- List tenants and members
- List installations and connectors
- Trigger a run, fetch the run, and fetch run logs
- List, approve, and reject approvals
- Confirm the web client rejects malformed data during local development

## Exit Criteria

- Core API payloads match `@agentmou/contracts` or explicitly validated schema
  equivalents
- The web client no longer relies on optimistic TypeScript-only trust
- Appendix A items for runs, approvals, installations, connectors, and tenant
  settings are resolved or materially narrowed
