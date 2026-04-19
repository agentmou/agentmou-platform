# Infrastructure Scripts

These scripts are the canonical operational entrypoints for the VPS-backed
backend deployment model. The public web app is expected to live outside the
VPS (for example, on Vercel), while this stack runs the API, worker, agents,
n8n, PostgreSQL, Redis, Traefik, and uptime monitoring.

For dev- and CI-facing scripts that run from a workstation rather than the
VPS, see [`scripts/README.md`](../../scripts/README.md).

## Script Inventory

| Script | Purpose |
| --- | --- |
| `setup.sh` | Bootstrap a fresh VPS checkout after cloning |
| `verify-prod-image-assets.sh` | Confirm API and worker images include repo-backed assets before deploy |
| `deploy-prod.sh` | Canonical production deploy entrypoint (pull → validate → pre-deploy snapshot → build → migrate → restart → healthcheck wait → smoke → live E2E triage) |
| `rollback-to.sh` | Rollback the VPS to a prior commit SHA. With `RESTORE_DB=1`, also restores the matching pre-deploy `pg_dumpall` snapshot |
| `smoke-test.sh` | Public API/catalog/auth/n8n-edge/agents-edge verification check |
| `backup.sh` | Production-safe backup entrypoint |
| `backup-offsite.sh` | Offsite restic snapshot of the local backup artifacts |
| `restore-offsite-smoke.sh` | Restore the latest offsite snapshot into a temp path and verify artifacts |
| `install-offsite-backup.sh` | Install restic plus the offsite systemd timer on the VPS |
| `cleanup-validation-tenant.sh` | VPS wrapper around disposable fixture cleanup |

## Operating Rules

- Use these scripts in the order documented in
  [`docs/runbooks/deployment.md`](../../docs/runbooks/deployment.md).
- Update the relevant runbook whenever a script changes operating procedure or
  required environment variables.
- Prefer script-backed procedures over ad hoc shell commands for production
  operations.
- Keep `deploy-prod.sh` as the tracked production deploy command. If an
  operator wants a shortcut, use a shell alias outside the repo.
- `pnpm lint:infra` is the repo-level guardrail for this directory. It runs
  `bash -n infra/scripts/*.sh` and also validates the tracked Compose files
  because those manifests are operationally coupled to these scripts.
