# Epic C - Honest UI

**Status**: proposed

## Problem Source

- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  `apps/web` status table
- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Rectifications" item 2

## Objective

Make tenant-facing UI surfaces honest about backend maturity so users are never
misled by placeholder, empty-default, or synthetic data paths.

## In Scope

- Billing surface in tenant settings
- Security surface
- Synthetic dashboard and observability metrics backed by empty defaults
- n8n connection surface when the API provider returns `null`
- Chat assistant surface and any linked copy that suggests real execution where
  only mock behavior exists

## Out Of Scope

- Implementing real billing, security, or chat backends
- Large-scale page redesign
- Marketing page messaging that is already explicitly demo-oriented

## Dependencies

- Epic B should land first when a page depends on corrected payload contracts
- Independent copy and state-label work can start earlier if it does not depend
  on contract changes

## Public APIs / Types

- No route changes required
- No new API modules required
- UI state and display semantics may change to show `Preview`, `Read-only`, or
  `Not yet available`

## PR Sequence

### PR 1 - Audit and classify incomplete tenant surfaces

- Map which pages are fully real, partially real, stub-backed, or empty-default
  backed
- Use the existing `apiProvider` and page usage to ground the audit
- Keep UI behavior unchanged in this PR; capture the map first

### PR 2 - Add honest labels and disabled states

- Apply visible labels and disabled actions to incomplete surfaces
- Prefer honest copy over silent empty states where the feature appears live
- Keep working real flows unchanged

### PR 3 - Clean up misleading copy and action affordances

- Remove or rewrite text that implies production-ready backend support where it
  does not exist
- Ensure `demo-workspace` and marketing remain intentionally demo-oriented

## Validation

- `pnpm typecheck`
- `pnpm lint`
- Tenant dashboard, observability, security, and settings pages
- Chat entry point and assistant UX
- Confirm users can distinguish real data, empty data, and placeholder data
- Confirm `demo-workspace` still works as a demo flow

## Exit Criteria

- A user cannot reasonably interpret a stub-backed surface as production-ready
- Placeholder behavior is labeled, limited, or made read-only
- Honest states are consistent across tenant pages
