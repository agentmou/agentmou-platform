# Epic E - Catalog Convergence

**Status**: proposed

## Problem Source

- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Catalog and Asset Reality"
- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Rectifications" item 3

## Objective

Preserve the value of the demo catalog while ensuring that real tenant and
installable product behavior only depends on manifest-backed assets and API
data.

## In Scope

- Map where `mockProvider`, `demoProvider`, `read-model`, and `mock-data` still
  influence product behavior
- Fence demo inventory to marketing and `demo-workspace`
- Clarify `source` and `availability` semantics where users can confuse demo and
  installable inventory

## Out Of Scope

- Removing the demo catalog entirely
- Adding large amounts of new real catalog inventory
- Redesigning marketing information architecture

## Dependencies

- Epic B should land first if contract alignment changes catalog payloads or
  consumer assumptions
- Epic C should land first for any overlapping honest-label work on tenant
  surfaces

## Public APIs / Types

- No new public routes required
- Existing catalog routes should remain stable
- UI display metadata may become more explicit about `source` and
  installability

## PR Sequence

### PR 1 - Audit remaining demo influence

- Identify all tenant-path and business-path consumers that still depend on
  `mock-data`, `mockProvider`, `demoProvider`, or `read-model`
- Distinguish accepted demo usage from accidental product-path usage

### PR 2 - Fence demo behavior to marketing and `demo-workspace`

- Make route-group and provider boundaries explicit
- Remove any remaining tenant-path dependency on demo inventory for real product
  decisions
- Keep marketing and `demo-workspace` behavior intact

### PR 3 - Clarify source and availability semantics

- Add or refine markers that distinguish manifest-backed inventory from demo
  inventory where needed
- Keep the current user-facing demo value while reducing ambiguity

## Validation

- `pnpm typecheck`
- `pnpm lint`
- Marketing catalog routes
- `demo-workspace`
- Authenticated tenant marketplace and installer paths
- Confirm installable flows are driven only by manifest/API-backed assets

## Exit Criteria

- Marketing and `demo-workspace` still retain their demo value
- Tenant product behavior no longer depends on demo inventory
- The real installable catalog and the demo catalog are clearly separated in
  both code paths and user-visible semantics
