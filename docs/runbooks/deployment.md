# Deployment Runbook

## Purpose

Use this runbook for local environment bring-up, VPS deploys, health
verification, temporary validation-fixture cleanup, and provider-backed secret
rotation.

## Preconditions

- Access to the repository checkout for the target environment
- Docker and Compose available for the relevant environment
- A populated `infra/compose/.env` when working outside disposable local flows

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

| Service    | URL                     |
| ---------- | ----------------------- |
| Web        | `http://localhost:3000` |
| API        | `http://localhost:3001` |
| n8n        | `http://localhost:5678` |
| PostgreSQL | `localhost:5432`        |
| Redis      | `localhost:6379`        |

## Production Deployment (VPS)

The production stack runs on a single VPS. See
[VPS Operations](./vps-operations.md) for full operational details. This
runbook describes the intended deployment procedure; it is not the canonical
record of the latest verified live state. Use the
[current-state operational verification snapshot](../architecture/current-state.md#operational-verification-snapshot-on-march-19-20-2026)
before making production-state claims.

### Production script order

Use the infra scripts in this order so the VPS workflow stays predictable:

1. `infra/scripts/setup.sh` for first-time AgentMou VPS bootstrap after cloning.
2. `infra/scripts/verify-prod-image-assets.sh` before shipping API or worker
   changes that depend on repo-backed `catalog/` or `workflows/` assets.
3. `infra/scripts/deploy-prod.sh` for every main AgentMou VPS deploy.
4. `infra/scripts/deploy-openclaw.sh` for the dedicated OpenClaw runtime VPS.
5. `infra/scripts/smoke-test.sh` for standalone public verification.
6. `infra/scripts/backup.sh` for scheduled or manual backups.

`infra/scripts/deploy-prod.sh` is the tracked deploy command for the main
AgentMou VPS. `infra/scripts/deploy-openclaw.sh` is the tracked deploy command
for the dedicated OpenClaw runtime VPS. If an operator wants a shortcut, keep
it as a shell alias outside the repo instead of a duplicate tracked script.

### First-time setup

```bash
ssh deploy@<vps-ip>
cd /srv
git clone <repo-url> agentmou-platform
cd agentmou-platform
bash infra/scripts/setup.sh
nano infra/compose/.env              # Fill in real secrets
sudo install -d -o deploy -g deploy -m 750 /var/backups/agentmou /var/lock/agentmou
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

### Subsequent deploys

```bash
ssh deploy@<vps-ip>
cd /srv/agentmou-platform
bash infra/scripts/deploy-prod.sh
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

### Deploy the OpenClaw runtime VPS

```bash
ssh deploy@<openclaw-vps-ip>
cd /srv/agentmou-platform
bash infra/scripts/deploy-openclaw.sh
```

### Active services

In compose, the `api`, `worker`, and `internal-ops` services start
automatically with the main stack. The `web` service is behind a profile
(`--profile web`) because the web app is deployed on Vercel instead
(`https://agentmou.io`, with `www` redirecting to apex). The OpenClaw runtime
is intentionally deployed on a separate VPS with
`infra/scripts/deploy-openclaw.sh`. Verify the live VPS state with the checks
below rather than inferring it from this runbook alone.

On March 19, 2026, these checks were revalidated from the live VPS checkout at
`/srv/agentmou-platform`: `git status --short --branch` was clean before the
final redeploy, local Traefik health returned `200`, the historical
`bash infra/scripts/deploy-phase25.sh` path completed successfully, and the
hardened public smoke test passed `3/3` with the live catalog payload
exposing `inbox-triage`. The canonical deploy entrypoint is now
`bash infra/scripts/deploy-prod.sh`.

## Health Verification

Run these checks from the VPS checkout with a real `infra/compose/.env`. If
you cannot do that, record the checks as not executed rather than inferred.
The smoke test now treats an empty catalog response as a failure by requiring
the live catalog payload to include `inbox-triage`.
Before running `deploy-prod.sh`, inspect `git status --short` on the VPS
checkout and resolve any unexpected local drift.

If the `internal-ops` container exits with `ERR_UNKNOWN_FILE_EXTENSION` for
`.ts` files under workspace packages (for example `@agentmou/contracts`), the
image must start with `tsx` as in the tracked
[`services/internal-ops/Dockerfile`](../../services/internal-ops/Dockerfile).
Rebuild from a clean checkout and redeploy; do not override `CMD` with plain
`node` in Compose overrides.

```bash
# Local deploy gates (through Traefik on the VPS host)
curl -sk --resolve api.DOMAIN:443:127.0.0.1 https://api.DOMAIN/health
curl -sk --resolve ops.DOMAIN:443:127.0.0.1 https://ops.DOMAIN/health

# Public DNS/TLS/API smoke
bash infra/scripts/smoke-test.sh

# Or via Uptime Kuma at https://uptime.DOMAIN
```

## Temporary Validation Fixture Cleanup

Use the VPS wrapper instead of ad hoc SQL or manual host-shell env exports
when you need to remove a disposable OAuth or E2E validation tenant:

```bash
cd /srv/agentmou-platform
bash infra/scripts/cleanup-validation-tenant.sh \
  --tenant-id <tenant-id> \
  --user-email <validation-email>

bash infra/scripts/cleanup-validation-tenant.sh \
  --tenant-id <tenant-id> \
  --user-email <validation-email> \
  --execute
```

The script is dry-run by default. It fails closed unless the tenant and owner
match disposable validation markers (`oauth-check-*`, `e2e-*`,
`example.com`, `test.agentmou.io`), the tenant is still on the `free` plan,
and the tenant only has its single owner membership.

The wrapper sources `infra/compose/.env`, derives `DATABASE_URL` for
`127.0.0.1:5432`, resolves the current Redis container IP for `REDIS_URL`,
converts `N8N_EDITOR_BASE_URL` into `${N8N_EDITOR_BASE_URL}/api/v1`, and
then invokes the underlying TypeScript implementation in
`scripts/cleanup-validation-tenant.ts`.

On March 19, 2026, this script was dry-run and execute-verified live against
the historical OAuth validation tenant and a temporary connector-delete
fixture. PostgreSQL post-checks returned `tenants=0`, `memberships=0`,
`connector_accounts=0`, and `users=0` after each cleanup.

On March 20, 2026, the same command path was re-verified after deploying
`ee804132` from `codex/fix-production-residual-risks`. Dry-run output for a
fresh `e2e-*` tenant showed `n8n_workflows: 1` and `schedule_repeatables: 1`;
execute mode then removed the tenant rows, the remote n8n workflow returned
`404`, and BullMQ repeatables returned to their pre-fixture baseline. The same
deployment also live-verified `DELETE /api/v1/tenants/:tenantId/installations/:installationId`
against a disposable tenant: repeatables moved from `5 -> 6 -> 5`, the remote
n8n workflow returned `404`, and the guarded cleanup script then removed the
empty tenant and owner user.

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
docker compose -f infra/compose/docker-compose.prod.yml up -d --no-deps agents worker api internal-ops
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
- `OPENAI_API_KEY`: live-verified. On March 20, 2026, a direct
  `POST /health/deep` against the agents container returned
  `{"ok":true,"model":"gpt-4o-mini-2024-07-18"}`.

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
bash infra/scripts/backup.sh
```

`backup.sh` now defaults to the production-safe external paths
`/var/backups/agentmou` and `/var/lock/agentmou/backup.lock`. For local or
non-VPS runs, set explicit overrides if those paths are not writable:

```bash
BACKUP_DIR=/tmp/agentmou-backup \
LOCK_FILE=/tmp/agentmou-backup.lock \
bash infra/scripts/backup.sh
```

Production backups should live outside the git checkout.
See [VPS Operations](./vps-operations.md) for the root-owned cron setup and
restore procedures.
