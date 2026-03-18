# Epic D - Production Truth

**Status**: proposed

## Problem Source

- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Infrastructure and Deployment Model"
- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Conservatively Resolving the Deployment Contradiction"
- [`platform-context-v2.md`](../../architecture/platform-context-v2.md),
  "Rectifications" item 5

## Objective

Replace contradictory production claims with one verified operational truth.

## In Scope

- Run the documented deployment verification path
- Verify API health, catalog health, and auth-edge behavior against the live
  environment
- Update production-facing docs to reflect only what was actually verified

## Out Of Scope

- Major infrastructure redesign
- Changing the production topology unless verification proves a specific doc is
  wrong
- New feature deployment beyond what is already present in the repo

## Dependencies

- None strictly required, but Epic A is preferred so local validation is
  trustworthy before operational verification work begins.

## Public APIs / Types

- No intended API or type changes
- Documentation and operational statements are the primary outputs

## PR Sequence

### PR 1 - Verify deployment truth

- Run the documented `deploy-phase25` and `smoke-test` workflow, or the minimum
  allowed verification subset for the current environment
- Capture exactly what was observed for `api`, `worker`, and edge health
- Do not update docs in this PR if the verification result is still incomplete

### PR 2 - Reconcile production documentation

- Update roadmap, runbooks, and implementation docs to match verified reality
- Remove contradictory statements about whether `api` and `worker` are active
  or merely deployable
- Keep architecture intent separate from live environment truth

## Validation

- `infra/scripts/smoke-test.sh`
- Local edge health or VPS health checks used by `deploy-phase25.sh`
- API health
- Catalog health
- Minimal auth validation where safe
- Cross-check updated docs against the observed result

## Exit Criteria

- There is one canonical statement about live production state
- That statement is backed by successful checks or explicitly documented failed
  checks
- Roadmap, runbooks, and implementation docs no longer contradict one another
