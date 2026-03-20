# Infrastructure Scripts

These scripts are the canonical operational entrypoints for the VPS-backed
deployment model.

## Script Inventory

| Script | Purpose |
| --- | --- |
| `setup.sh` | Bootstrap a fresh VPS checkout after cloning |
| `verify-prod-image-assets.sh` | Confirm API and worker images include repo-backed assets before deploy |
| `deploy-prod.sh` | Canonical production deploy entrypoint |
| `deploy.sh` | Deprecated compatibility wrapper that forwards to `deploy-prod.sh` |
| `deploy-phase25.sh` | Deprecated compatibility wrapper retained for one transition cycle |
| `smoke-test.sh` | Public API/catalog/auth verification check |
| `backup.sh` | Production-safe backup entrypoint |
| `cleanup-validation-tenant.sh` | VPS wrapper around disposable fixture cleanup |

## Operating Rules

- Use these scripts in the order documented in
  [`docs/deployment.md`](../../docs/deployment.md).
- Update the relevant runbook whenever a script changes operating procedure or
  required environment variables.
- Prefer script-backed procedures over ad hoc shell commands for production
  operations.
