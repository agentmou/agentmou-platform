# Contributing to Agentmou Platform

This guide describes how we expect pull requests to look before merge. It
complements the automation in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
and the conventions in [Conventions](./architecture/conventions.md).

## Branching and commits

- **Branches:** short-lived feature branches from `main`; naming like
  `feature/<ticket>-short-description`, `fix/…`, `chore/…` (see project rules).
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) —
  imperative subject, optional scope, no trailing period in the subject line.

## What “merge-ready” means

A PR is merge-ready when it:

1. **Stays in scope** — one logical concern; no drive-by refactors unrelated to
   the stated goal.
2. **Passes local gates** (from repo root):

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

3. **Passes content validation** when you touch Markdown or YAML that the
   validator covers:

   ```bash
   make validate-content
   ```

   This requires `yamllint` available to Python (`python3 -m pip install yamllint`
   if `make validate-content` complains).

4. **Keeps CI signal honest** — do not silence lint or tests with broad ignores;
   prefer small, justified suppressions with a comment explaining **why**.

5. **Documents operational impact** when the change touches hosts, auth,
   cookies, env vars, flags, migrations, or deploy paths (use the PR template).

## GitHub Actions (CI)

The [`CI` workflow](../.github/workflows/ci.yml) runs on pushes and pull
requests to `main`. Treat these jobs as the primary merge gates:

| Job | Purpose |
| --- | --- |
| `check` | Install deps, lint, typecheck, tests, `make validate-content` |
| `clinic-demo-validation` | DB migrate + seed + clinic demo smoke script |
| `agents` | Python compile + unit tests for `services/agents` |
| `dependency-audit` | Runs `pnpm audit` for visibility; **does not block** merge (see below) |
| `deploy-prod` | Only on `main` pushes, after the three gates above succeed |

### Dependency audit policy

`pnpm audit` can fail for reasons outside a given PR (registry/API changes,
transitive advisories, or org-wide security tooling limits). It still provides
useful signal, so CI runs it in a dedicated **`dependency-audit`** job with
`continue-on-error: true`. **Review the job output on every PR**; treat
high-severity items as follow-up work unless explicitly waived with a recorded
reason.

Configure **required status checks** in GitHub branch protection for at least:
`check`, `clinic-demo-validation`, and `agents`. Do **not** require
`dependency-audit` until its signal is consistently actionable.

## When a PR needs extra validation

- **Infra / Compose / deploy scripts:** follow runbooks in `docs/runbooks/` and
  note any manual verification you performed.
- **Auth / sessions / subdomains:** add a short manual smoke checklist (login,
  logout, OAuth return, cookie attributes) even when automated tests pass.
- **Docs-only:** still run `make validate-content` when Markdown/YAML under the
  validated paths changes.

## Tests and quality

See also [Testing](./testing.md) — especially **Before Merging a Pull Request**.

## Questions

Open a draft PR early if you are unsure about scope or risk; prefer small,
stacked PRs over one large change set.
