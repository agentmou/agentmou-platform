# Deployment Guide

This page is the deployment entrypoint. Use it to choose the correct procedure,
then follow the linked runbook for the detailed steps.

## Choose The Right Path

- Local development stack:
  [`docs/runbooks/deployment.md#local-development-stack`](./runbooks/deployment.md#local-development-stack)
- Production VPS deploy:
  [`docs/runbooks/deployment.md#production-deployment-vps`](./runbooks/deployment.md#production-deployment-vps)
- First-time bring-up of the personal internal operating system:
  [`docs/runbooks/internal-ops-bring-up.md`](./runbooks/internal-ops-bring-up.md)
- Personal internal ops service and Telegram/OpenClaw setup:
  [`docs/runbooks/internal-ops-operations.md`](./runbooks/internal-ops-operations.md)
- Dedicated OpenClaw runtime VPS:
  [`docs/runbooks/openclaw-runtime-operations.md`](./runbooks/openclaw-runtime-operations.md)
- VPS operating procedures and host-level maintenance:
  [`docs/runbooks/vps-operations.md`](./runbooks/vps-operations.md)

## Canonical Deploy Scripts

Use the scripts in this order:

1. `infra/scripts/setup.sh` for first-time VPS bootstrap
2. `infra/scripts/verify-prod-image-assets.sh` before deploys that depend on
   repo-backed assets in `catalog/` or `workflows/`
3. `infra/scripts/deploy-prod.sh` for production deploys
4. `infra/scripts/deploy-openclaw.sh` for the dedicated OpenClaw runtime VPS
5. `infra/scripts/register-telegram-webhook.sh` for the tracked Telegram
   webhook registration path
6. `infra/scripts/smoke-test-internal-ops.sh` for local internal-ops/OpenClaw
   bring-up verification
7. `infra/scripts/smoke-test.sh` for standalone public verification
8. `infra/scripts/backup.sh` for scheduled or manual backups

## Before You Deploy

- Validate the repo locally with `pnpm typecheck`, `pnpm lint`, and
  `pnpm test`.
- Confirm `infra/compose/.env` is up to date for the target environment.
- Confirm `infra/compose/.env.openclaw` is up to date on the OpenClaw VPS if
  the change touches `services/openclaw-runtime`.
- Review [`infra/README.md`](../infra/README.md) if the change touches Docker
  Compose, Traefik, backups, or deploy scripts.
- If the change touches `services/internal-ops`, also review the OpenClaw and
  Telegram requirements in
  [`docs/runbooks/internal-ops-bring-up.md`](./runbooks/internal-ops-bring-up.md)
  and [`docs/runbooks/internal-ops-operations.md`](./runbooks/internal-ops-operations.md).

## Related Docs

- [Runbooks Index](./runbooks/README.md)
- [Infrastructure Overview](../infra/README.md)
- [Current State](./architecture/current-state.md)
