# Repo-level Scripts

Utilities that run from a developer workstation or from CI — **not** from a
production VPS. For VPS-side scripts (deploy, backup, offsite, setup), see
[`infra/scripts/README.md`](../infra/scripts/README.md).

## Where does a script belong?

| Directory | Purpose | Runs on |
| --- | --- | --- |
| `scripts/` | Dev workflows, e2e tests, ops one-offs invoked via `pnpm ...` | Developer laptop, CI |
| `infra/scripts/` | VPS lifecycle (setup, deploy, backup, restore) | Production VPS |

If a script talks to `infra/compose/docker-compose.prod.yml` or to
`/var/backups/agentmou`, it belongs in `infra/scripts/`. Everything else
lives here.

## Script inventory

| Script | Invoked via | Purpose |
| --- | --- | --- |
| `test-e2e-clinic-demo.ts` | `pnpm test:clinic-demo-smoke` | Full-stack smoke over the clinic demo seed (local compose). |
| `test-e2e-triage.ts` | `pnpm ops:smoke-e2e-live` | API-driven vertical slice test (Gmail inbox triage). Runs against any `API_URL` — including production — using a pre-provisioned verified smoke user (`E2E_EMAIL`, `E2E_PASSWORD`, optional `E2E_TENANT_ID`). |
| `cleanup-validation-tenant.ts` | `pnpm cleanup:validation-tenant` | Manual cleanup helper for disposable validation fixtures created in local/ephemeral workflows. Requires `DATABASE_URL`. |
| `generate-operational-catalog-ids.ts` | `pnpm demo-catalog:generate` | Rebuilds the catalog id map consumed by the demo seed. Paired with `demo-catalog:check` guard in CI. |
| `validate-clinic-demo.sh` | `pnpm validate:clinic-demo` | CI/local smoke for the clinic vertical. Boots a local Postgres via compose, migrates+seeds, then runs db/api/web tests plus the clinic e2e smoke. |

## Operating rules

- **Prefer `pnpm` entrypoints** over invoking the files directly. The pnpm
  scripts set up the right interpreter (`tsx` / `bash`) and working
  directory.
- **Keep `scripts/` dev- and CI-facing.** If a workflow needs to run on the
  VPS against prod compose, extract the prod-side orchestration to
  `infra/scripts/` and keep the portable core here.
- **Cross-reference runbooks** under [`docs/runbooks/`](../docs/runbooks/):
  - `test-e2e-triage.ts` — post-deploy gate described in
    [`deployment.md`](../docs/runbooks/deployment.md).
  - `validate-clinic-demo.sh` — local pre-PR gate described in
    [`local-development.md`](../docs/runbooks/local-development.md).
- **`pnpm lint:infra` covers both directories.** It shell-checks
  `infra/scripts/*.sh` and `scripts/*.sh`, and validates the compose
  manifests. Run it before opening a PR that touches any script.
