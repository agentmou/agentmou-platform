# Testing Guide

This repository uses workspace-level tests plus root validation commands driven
by Turborepo.

## Primary Commands

Run the full repository validation suite from the root:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Use these commands as the baseline merge gate unless a runbook or PR explicitly
documents an exception.

## Workspace-Level Validation

Use targeted commands while iterating:

```bash
pnpm --filter @agentmou/web lint
pnpm --filter @agentmou/web build
pnpm --filter @agentmou/api test
pnpm --filter @agentmou/api typecheck
pnpm --filter @agentmou/worker test
pnpm --filter @agentmou/contracts test
pnpm --filter @agentmou/catalog-sdk test
```

## Test Layers

- `packages/contracts` validates shared schemas and type-level assumptions.
- `packages/catalog-sdk` validates manifest loading and repo-root discovery.
- `services/api` covers route behavior, validation, and module-level helpers.
- `services/worker` covers job behavior and shared execution helpers where
  tests exist.
- Workspace builds are also part of validation because type drift often shows
  up at package boundaries first.

## What To Check Before Merging

- Contracts changed: run `pnpm --filter @agentmou/contracts test`.
- Manifest or asset loading changed: run
  `pnpm --filter @agentmou/catalog-sdk test`.
- API routes, payloads, or auth changed: run
  `pnpm --filter @agentmou/api test`.
- Frontend data flow changed: run `pnpm --filter @agentmou/web build`.
- Queue or worker behavior changed: run `pnpm --filter @agentmou/worker test`
  and `pnpm --filter @agentmou/worker typecheck`.

## Common Testing Patterns

- Prefer workspace-targeted runs while iterating and the root suite before
  finishing.
- Keep tests close to the code they validate.
- When a docs change depends on a real command succeeding, run the command and
  update the docs with the verified result instead of repeating stale text.

## Related Docs

- [Onboarding](./onboarding.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Current State](./architecture/current-state.md)
