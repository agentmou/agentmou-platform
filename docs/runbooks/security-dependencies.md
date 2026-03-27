# Security dependencies and transitive packages

This runbook covers how we keep JavaScript dependency risk under control in the
monorepo: audits, GitHub alerts, and when to revisit `pnpm.overrides`.

## Routine checks

1. **Local / pre-release**

   ```bash
   pnpm audit
   pnpm install --frozen-lockfile   # same resolution CI should use
   ```

   Fix or document anything that blocks a clean audit before merging
   dependency bumps.

2. **GitHub**

   Use **Dependabot** alerts and the **Security** tab for the repository.
   Align fixes with `pnpm audit` after lockfile updates.

3. **After any `drizzle-kit` bump** (`packages/db`)

   `drizzle-kit` has historically pulled `@esbuild-kit/*` (deprecated on npm).
   After upgrading `drizzle-kit`:

   ```bash
   pnpm --filter @agentmou/db why @esbuild-kit/esm-loader
   pnpm audit
   ```

   If `pnpm why` shows the package is gone, try removing the
   `@esbuild-kit/core-utils>esbuild` override from the root
   [`package.json`](../../package.json), run `pnpm install`, and confirm
   `pnpm audit` stays clean.

## Root `pnpm.overrides`

The root [`package.json`](../../package.json) may pin transitive versions when
advisories affect packages we do not depend on directly (for example
`esbuild` under `@esbuild-kit/core-utils`, or `picomatch` under tooling).

**Rules:**

- Prefer bumping **direct** dependencies first; use overrides when the tree
  does not yet offer a fixed release.
- When upstream fixes land, remove overrides that are no longer needed and
  document the change in the PR body.
- Do not add overrides to silence deprecation warnings alone; deprecation is
  not the same as a vulnerability. Track removal with package upgrades (see
  [@agentmou/db README](../../packages/db/README.md#drizzle-kit-and-transitive-dependencies)).

## Upstream tracking (Drizzle / esbuild-kit)

Drizzle maintainers are aware of deprecated `@esbuild-kit` usage and esbuild
version concerns. Useful threads to watch or vote on:

- [drizzle-team/drizzle-orm#5304](https://github.com/drizzle-team/drizzle-orm/issues/5304) — replace `@esbuild-kit/*` with `tsx`
- [drizzle-team/drizzle-orm#5481](https://github.com/drizzle-team/drizzle-orm/issues/5481) — vulnerable / deprecated esbuild-kit chain

No duplicate issues are needed unless you have new reproduction details.

## Related documentation

- [Deployment runbook](./deployment.md) for environments that apply migrations
- [@agentmou/db README](../../packages/db/README.md) for Drizzle scripts and
  transitive dependency notes
