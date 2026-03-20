# Backups

This directory is intentionally minimal in git.

## Purpose

- Keep the tracked directory present for repo structure and documentation.
- Avoid storing real production backups inside the checkout.

## Production Behavior

- The canonical backup script is `infra/scripts/backup.sh`.
- Production backup output defaults to `/var/backups/agentmou`.
- The production lock file defaults to `/var/lock/agentmou/backup.lock`.

Use the [Deployment Runbook](../../docs/runbooks/deployment.md) and
[VPS Operations](../../docs/runbooks/vps-operations.md) for the detailed
backup and restore context.
