# Program Action Plan

This document converts
[`platform-context-v2.md`](../architecture/platform-context-v2.md) into an
execution system for the next phase of work.

Use this file as the near-term planning index. It does not replace the product
roadmap or the architecture context:

- [`platform-context-v2.md`](../architecture/platform-context-v2.md) explains
  what is true today and what must be corrected.
- [`roadmap.md`](./roadmap.md) summarizes phase-level product direction.
- This document defines the active program tracks, the dependency order, and
  the initial epic portfolio.

## Planning Hierarchy

Work should now be planned at three levels:

### 1. Program Tracks

These are the cross-cutting workstreams that define the dependency order for
the next phase. They answer "what must be true before we expand the product?"

### 2. Epic Plans

Each epic is derived from a concrete problem statement in
[`platform-context-v2.md`](../architecture/platform-context-v2.md). Epics are
the working unit for a multi-PR effort. They answer "what truth are we
restoring or what gap are we closing?"

### 3. PR Slices

Each epic is delivered through 2-4 small PRs. PRs should stay narrow,
verifiable, and concern-focused. Do not mix baseline repair with unrelated new
feature work.

## Dependency Order

The execution sequence for the next phase is:

1. Baseline confidence
2. Honest product surfaces
3. Production truth
4. Catalog convergence
5. Controlled expansion

This order is deliberate. The repository already has a meaningful vertical
slice, but the current bottleneck is trust in the baseline, not lack of
features.

## Active Program Tracks

| Track | Goal | Why now | Exit criteria |
| --- | --- | --- | --- |
| Track 0 - Baseline confidence | Make the repo trustworthy before more feature work | Current validation is not green and contract drift is real | `pnpm typecheck` and `pnpm test` are green; core payloads no longer rely on optimistic typing |
| Track 1 - Honest product surfaces | Make the UI accurately reflect backend maturity | Some tenant pages look live while being stub-backed or empty-default backed | A user cannot reasonably mistake placeholder behavior for production-ready behavior |
| Track 2 - Production truth | Separate "deployment-ready" from "actually deployed" | Current docs disagree about live VPS state | There is one canonical statement about production state and it is backed by checks |
| Track 3 - Catalog convergence | Keep demo value without contaminating the real product path | Real installable assets and demo inventory currently coexist | Tenant logic no longer depends on demo inventory for real product behavior |
| Track 4 - Controlled expansion | Grow only after the baseline is reliable | Expansion is currently riskier than repair | New work starts only once Tracks 0-3 have clear closure evidence |

## Track Definitions

### Track 0 - Baseline Confidence

**Problem source**

- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Validated Snapshot"
- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Validation Commands Observed On March 17, 2026"
- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Rectifications" item 1 and item 4
- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Appendix A - Contract Drift"

**Focus**

- Fix the current `pnpm test` breakage first
- Align runtime payloads with shared contracts
- Add runtime validation in the web client

**Initial epics**

- [Epic A - Validation Baseline](./epics/epic-a-validation-baseline.md)
- [Epic B - Contract Alignment](./epics/epic-b-contract-alignment.md)

### Track 1 - Honest Product Surfaces

**Problem source**

- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Rectifications" item 2
- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  `apps/web` and control-plane status tables

**Focus**

- Label or limit incomplete tenant surfaces instead of letting them look live
- Remove misleading UX paths before broadening the feature set

**Initial epics**

- [Epic C - Honest UI](./epics/epic-c-honest-ui.md)

### Track 2 - Production Truth

**Problem source**

- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Infrastructure and Deployment Model"
- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Conservatively Resolving the Deployment Contradiction"
- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Rectifications" item 5

**Focus**

- Verify production state with real smoke checks
- Make the docs match verified reality

**Initial epics**

- [Epic D - Production Truth](./epics/epic-d-production-truth.md)

### Track 3 - Catalog Convergence

**Problem source**

- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Catalog and Asset Reality"
- [`platform-context-v2.md`](../architecture/platform-context-v2.md),
  "Rectifications" item 3

**Focus**

- Preserve demo inventory for marketing and `demo-workspace`
- Fence it away from real tenant logic and installable catalog behavior

**Initial epics**

- [Epic E - Catalog Convergence](./epics/epic-e-catalog-convergence.md)

### Track 4 - Controlled Expansion

This track starts only after Tracks 0-3 are credibly closed.

Recommended order:

1. Multi-tenant marketplace and RBAC hardening
2. Usage metering and real billing
3. Memory / RAG
4. Additional connectors
5. Enterprise hardening

Do not start Track 4 work while Track 0 still has open contract drift or
validation failures.

## Epic Creation Rules

New epics should be created from concrete sections in
[`platform-context-v2.md`](../architecture/platform-context-v2.md), usually:

- `Rectifications`
- `Prioritized Next Steps`
- `Appendix A - Contract Drift`
- `Decision Guardrails`

Each epic should use the structure in
[`epic-template.md`](./epic-template.md) and must include:

- Problem source
- Objective
- In scope
- Out of scope
- Dependencies
- PR sequence
- Validation plan
- Exit criteria

## PR Slice Rules

- Keep one concern per PR.
- Preserve current routes and product URLs unless the epic explicitly requires a
  route change.
- Prefer schema, payload, and validation alignment before UI polish.
- Do not mix "fix the baseline" with "add a new capability" in the same PR.
- If a PR touches shared contracts, it must validate producers and consumers in
  the same slice.

## Initial Epic Portfolio

- [Epic A - Validation Baseline](./epics/epic-a-validation-baseline.md)
- [Epic B - Contract Alignment](./epics/epic-b-contract-alignment.md)
- [Epic C - Honest UI](./epics/epic-c-honest-ui.md)
- [Epic D - Production Truth](./epics/epic-d-production-truth.md)
- [Epic E - Catalog Convergence](./epics/epic-e-catalog-convergence.md)

## Completion Rule For This Program Phase

This program phase is complete when:

- the repo has a trustworthy local validation baseline
- shared contracts are authoritative for core tenant-facing payloads
- placeholder tenant surfaces are visibly honest
- production documentation reflects verified operational truth
- demo catalog behavior is fenced away from real tenant and installable flows

Only then should the roadmap shift primary focus from baseline repair to feature
expansion.
