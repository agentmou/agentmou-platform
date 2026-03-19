# Deployment Runbook

## Pre-Deployment Checklist

- `pnpm install`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm test`
- Infrastructure env file configured (`infra/compose/.env`)
- Required external secrets set for your target environment

## Local Development Stack

### 1) Environment

```bash
cp infra/compose/.env.example infra/compose/.env
```

### 2) Start Infrastructure

```bash
docker compose -f infra/compose/docker-compose.local.yml up -d
```

### 3) Typecheck and Build

```bash
pnpm typecheck
pnpm build
```

### 4) Start Dev Servers

```bash
pnpm dev
```

### Service Endpoints (Local)

| Service    | URL                        |
| ---------- | -------------------------- |
| Web        | `http://localhost:3000`     |
| API        | `http://localhost:3001`     |
| n8n        | `http://localhost:5678`     |
| PostgreSQL | `localhost:5432`           |
| Redis      | `localhost:6379`           |

## Production Deployment (VPS)

The production stack runs on a single VPS. See
[VPS Operations](./vps-operations.md) for full operational details. This
runbook describes the intended deployment procedure; it is not the canonical
record of the latest verified live state. Use the
[Platform Context v2 operational verification snapshot](../architecture/platform-context-v2.md#operational-verification-snapshot-on-march-19-2026)
before making production-state claims.

### First-time setup

```bash
ssh deploy@<vps-ip>
cd /srv
git clone <repo-url> agentmou-platform
cd agentmou-platform
bash infra/scripts/setup.sh
nano infra/compose/.env              # Fill in real secrets
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

### Subsequent deploys

```bash
ssh deploy@<vps-ip>
cd /srv/agentmou-platform
bash infra/scripts/deploy.sh
```

### Deploy only a specific service

```bash
cd /srv/agentmou-platform
git pull origin main
docker compose -f infra/compose/docker-compose.prod.yml build agents
docker compose -f infra/compose/docker-compose.prod.yml up -d --no-deps agents
```

### Run database migrations

After first deploy or after schema changes:

```bash
docker compose --profile ops -f infra/compose/docker-compose.prod.yml run --rm migrate
```

### Active services

In compose, the `api` and `worker` services start automatically with the
stack. The `web` service is behind a profile (`--profile web`) because the web
app is deployed on Vercel instead (`https://agentmou.io`, with `www`
redirecting to apex). Verify the live VPS state with the checks below rather
than inferring it from this runbook alone.

On March 19, 2026, these checks were revalidated from the live VPS checkout at
`/srv/agentmou-platform`: `git status --short --branch` was clean before the
final redeploy, local Traefik health returned `200`, `bash infra/scripts/deploy-phase25.sh`
completed successfully, and the hardened public smoke test passed `3/3` with
the live catalog payload exposing `inbox-triage`.

## Health Verification

Run these checks from the VPS checkout with a real `infra/compose/.env`. If
you cannot do that, record the checks as not executed rather than inferred.
The smoke test now treats an empty catalog response as a failure by requiring
the live catalog payload to include `inbox-triage`.
Before running `deploy.sh` or `deploy-phase25.sh`, inspect `git status --short`
on the VPS checkout and resolve any unexpected local drift.

```bash
# Local deploy gate (through Traefik on the VPS host)
curl -sk --resolve api.DOMAIN:443:127.0.0.1 https://api.DOMAIN/health

# Public DNS/TLS/API smoke
bash infra/scripts/smoke-test.sh

# Or via Uptime Kuma at https://uptime.DOMAIN
```

## Temporary Validation Fixture Cleanup

Use the repo-tracked cleanup script instead of ad hoc SQL when you need to
remove a disposable OAuth or E2E validation tenant:

```bash
cd /srv/agentmou-platform
tsx scripts/cleanup-validation-tenant.ts \
  --tenant-id <tenant-id> \
  --user-email <validation-email>

tsx scripts/cleanup-validation-tenant.ts \
  --tenant-id <tenant-id> \
  --user-email <validation-email> \
  --execute
```

The script is dry-run by default. It fails closed unless the tenant and owner
match disposable validation markers (`oauth-check-*`, `e2e-*`,
`example.com`, `test.agentmou.io`), the tenant is still on the `free` plan,
and the tenant only has its single owner membership.

On March 19, 2026, this script was dry-run and execute-verified live against
the historical OAuth validation tenant and a temporary connector-delete
fixture. PostgreSQL post-checks returned `tenants=0`, `memberships=0`,
`connector_accounts=0`, and `users=0` after each cleanup.

On March 20, 2026, the script was used again after two disposable tenants
exercised the live `support-starter` pack flow. PostgreSQL post-checks again
returned `tenant=0`, `user=0`, `membership=0`, and `workflow_installations=0`
for both fixtures. One successful fixture had already provisioned an n8n
workflow, so that workflow was deleted manually through the n8n API
afterward. Treat the current cleanup path as DB-scoped until external n8n
resource cleanup is added.

## Provider-Backed Secret Rotation

Keep provider-backed rotation in its own live window. Rotate in the provider
console first, then edit `infra/compose/.env` in place on the VPS without
creating `.bak` files in the checkout.

Order:

1. `OPENAI_API_KEY`
2. `GOOGLE_CLIENT_SECRET`
3. `N8N_API_KEY`

Restart only the affected services after updating `.env`:

```bash
docker compose -f infra/compose/docker-compose.prod.yml up -d --no-deps agents worker api
```

Minimum post-rotation verification:

```bash
docker compose -f infra/compose/docker-compose.prod.yml ps
curl -sk --resolve api.DOMAIN:443:127.0.0.1 https://api.DOMAIN/health
bash infra/scripts/smoke-test.sh
```

Then verify:

- `agents.DOMAIN/health/deep` with the current `x-api-key`
- a fresh Gmail OAuth authorize + callback flow
- at least one n8n API path that uses `X-N8N-API-KEY`

Observed March 19-20, 2026 results:

- `GOOGLE_CLIENT_SECRET`: live-verified by a successful Gmail OAuth callback
  and a `gmail` connector that returned in `connected` state.
- `N8N_API_KEY`: live-verified by both a direct n8n API call and the real
  queued `support-starter` install path after the worker env and payload fixes
  landed on `codex/fix-production-residual-risks`.
- `OPENAI_API_KEY`: still blocked by OpenAI `429 insufficient_quota` on the
  direct `agents` deep-health path. Treat this as an upstream quota or billing
  issue, not a local deploy issue.

## Rollback

```bash
cd /srv/agentmou-platform
git log --oneline -10
git checkout <good-commit>
docker compose -f infra/compose/docker-compose.prod.yml build
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

## Backup

```bash
BACKUP_DIR=/var/backups/agentmou \
LOCK_FILE=/var/lock/agentmou/backup.lock \
bash infra/scripts/backup.sh
```

Production backups should live outside the git checkout. The recommended VPS
targets are `/var/backups/agentmou` for backup output and
`/var/lock/agentmou/backup.lock` for the non-overlapping run lock.
See [VPS Operations](./vps-operations.md) for the root-owned cron setup and
restore procedures.
