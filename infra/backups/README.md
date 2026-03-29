# Backups

This directory is intentionally minimal in git.

## Purpose

- Keep the tracked directory present for repo structure and documentation.
- Avoid storing real production backups inside the checkout.

## Production Behavior

- The canonical backup script is `infra/scripts/backup.sh`.
- The canonical offsite script is `infra/scripts/backup-offsite.sh`.
- The canonical offsite restore smoke test is
  `infra/scripts/restore-offsite-smoke.sh`.
- Production backup output defaults to `/var/backups/agentmou`.
- The production lock file defaults to `/var/lock/agentmou/backup.lock`.
- The offsite restic env defaults to `/etc/agentmou/restic.env`.
- The offsite restic password file defaults to `/etc/agentmou/restic-password`.

## Hybrid Strategy

- Local application-aware backups remain the primary layer.
- Offsite restic snapshots replicate the generated backup artifacts plus
  `infra/compose/.env`.
- The recommended offsite repository is:
  `s3:s3.eu-central-003.backblazeb2.com/agentmou-backups/vps-n8n-agents`

Use the [Deployment Runbook](../../docs/runbooks/deployment.md) and
[VPS Operations](../../docs/runbooks/vps-operations.md) for the detailed
backup and restore context.
