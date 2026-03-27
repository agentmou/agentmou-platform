# Infrastructure Scripts

These scripts are the canonical operational entrypoints for the VPS-backed
deployment model.

## Script Inventory

| Script                              | Purpose                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `bootstrap-openclaw-ubuntu-host.sh` | One-time bootstrap for a fresh Ubuntu OpenClaw VPS                     |
| `setup.sh`                          | Bootstrap a fresh VPS checkout after cloning                           |
| `verify-prod-image-assets.sh`       | Confirm API and worker images include repo-backed assets before deploy |
| `deploy-prod.sh`                    | Canonical production deploy entrypoint                                 |
| `deploy-openclaw.sh`                | Canonical deploy entrypoint for the dedicated OpenClaw runtime VPS     |
| `register-telegram-webhook.sh`      | Register the tracked Telegram webhook for `services/internal-ops`      |
| `smoke-test-internal-ops.sh`        | Local bring-up verification for `internal-ops` + `openclaw-runtime`    |
| `verify-openclaw-runtime.sh`        | Remote health and contract verification for the OpenClaw runtime       |
| `verify-internal-ops-remote.sh`     | Remote health and Telegram webhook verification for `internal-ops`     |
| `smoke-test.sh`                     | Public API/catalog/auth verification check                             |
| `backup.sh`                         | Production-safe backup entrypoint                                      |
| `cleanup-validation-tenant.sh`      | VPS wrapper around disposable fixture cleanup                          |

## Operating Rules

- Use these scripts in the order documented in
  [`docs/deployment.md`](../../docs/deployment.md).
- Update the relevant runbook whenever a script changes operating procedure or
  required environment variables.
- Prefer script-backed procedures over ad hoc shell commands for production
  operations.
- Keep `deploy-prod.sh` and `deploy-openclaw.sh` as the tracked production
  deploy commands. If an operator wants a shortcut, use a shell alias outside
  the repo.
- `pnpm lint:infra` is the repo-level guardrail for this directory. It runs
  `bash -n infra/scripts/*.sh` and also validates the tracked Compose files
  because those manifests are operationally coupled to these scripts.
