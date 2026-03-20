# Epic A - Validation Baseline

**Status**: proposed

## Problem Source

- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Validated Snapshot"
- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Validation Commands Observed On March 17, 2026"
- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Rectifications" item 4

## Objective

Restore a trustworthy local validation baseline so the repository can be used as
an engineering source of truth again.

## In Scope

- Fix the current `pnpm test` failure centered on `@agentmou/api`
- Revalidate `pnpm typecheck`, `pnpm test`, and `pnpm lint`
- Update validation-focused docs if the verified status changes

## Out Of Scope

- Broad refactors unrelated to test execution
- New product capabilities
- Contract-shape cleanup beyond what is required to make tests run and pass

## Dependencies

- None. This is the first epic in the program plan.

## Public APIs / Types

- No route redesign
- No intentional public API changes
- Package scripts or workspace test wiring may change if required to fix the
  runner

## PR Sequence

### PR 1 - Fix test runner integrity

- Repair the `@agentmou/api` test execution path so `pnpm test` can run from a
  clean checkout
- Keep package names, routes, and test intent stable
- Validate with `pnpm --filter @agentmou/api test` and then `pnpm test`

### PR 2 - Revalidate the baseline and update status docs

- Re-run `pnpm typecheck`, `pnpm test`, and `pnpm lint`
- Update only validation statements that are now outdated
- Keep architecture and roadmap claims aligned with the new verified result

## Validation

- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- Confirm `@agentmou/api` test runner works both filtered and through Turbo
- Confirm the documentation no longer claims a stale validation status

## Exit Criteria

- `pnpm test` is green from the repo root
- The failure documented in `platform-context-v2.md` no longer reproduces
- Validation claims in the docs match the freshly observed state
