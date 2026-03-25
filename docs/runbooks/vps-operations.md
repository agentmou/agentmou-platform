# VPS Operations

This runbook documents the main AgentMou production VPS. Pair it with the
[OpenClaw Runtime Operations](./openclaw-runtime-operations.md) runbook for the
separate reasoning-runtime host used by internal ops. Also pair it with the
[current-state operational verification snapshot](../architecture/current-state.md#operational-verification-snapshot-on-march-19-20-2026)
before making claims about the live state that is currently verified.

The March 19, 2026 live verification used the current VPS checkout at
`/srv/agentmou-platform`.

## Server Specs

| Resource | Value               |
| -------- | ------------------- |
| Provider | (your provider)     |
| OS       | Ubuntu (latest LTS) |
| RAM      | 8 GB                |
| Disk     | 150 GB SSD          |
| CPU      | Shared vCPUs        |
| IP       | Static public IPv4  |
| SSH user | `deploy`            |
| Hostname | `vps-n8n-agents`    |

## Network and Firewall

UFW rules (deny all incoming by default):

| Port | Protocol | Source   | Purpose         |
| ---- | -------- | -------- | --------------- |
| 22   | TCP      | Anywhere | SSH             |
| 80   | TCP      | Anywhere | HTTP (redirect) |
| 443  | TCP      | Anywhere | HTTPS           |

No other ports are exposed. All services communicate over Docker internal
networks.

## Docker Networks

| Network    | Type     | Services                                                     |
| ---------- | -------- | ------------------------------------------------------------ |
| `web`      | External | Traefik, n8n, agents, api, internal-ops, worker, uptime-kuma |
| `internal` | Internal | Postgres, Redis, n8n, api, internal-ops, worker              |

`internal` is a true Docker internal network — no outbound internet
access. n8n is on both networks: `web` for HTTP traffic and `internal` to
reach Postgres and Redis.

## Subdomains and Routing

All traffic enters through Traefik on ports 80/443. HTTP redirects to
HTTPS automatically. The routing table below describes the compose and Traefik
intent from the repository; live reachability still needs separate
verification.

Public web traffic is served by Vercel:

- Canonical web domain: `https://agentmou.io`
- `https://www.agentmou.io` redirects permanently to apex

| Subdomain       | Service           | Auth       | Middlewares                               |
| --------------- | ----------------- | ---------- | ----------------------------------------- |
| `api.DOMAIN`    | Control Plane API | None (JWT) | secure-headers, rate-limit, noindex       |
| `ops.DOMAIN`    | Internal Ops      | None       | secure-headers, rate-limit, noindex       |
| `n8n.DOMAIN`    | n8n editor        | —          | secure-headers, noindex                   |
| `hooks.DOMAIN`  | n8n webhooks      | None       | secure-headers, rate-limit, noindex       |
| `agents.DOMAIN` | agents API        | BasicAuth  | auth, secure-headers, noindex             |
| `uptime.DOMAIN` | Uptime Kuma       | BasicAuth  | auth, secure-headers, rate-limit, noindex |

Replace `DOMAIN` with the value of the `DOMAIN` env var
(e.g., `agentmou.io`).

### Traefik Middlewares

Defined as labels on the Traefik service in the compose file:

- **auth**: HTTP Basic Authentication via `BASIC_AUTH_USERS` env var.
- **secure-headers**: HSTS (1 year, includeSubdomains, preload), frameDeny,
  contentTypeNosniff, referrerPolicy no-referrer.
- **rate-limit**: 30 req/s average, 60 burst.
- **noindex**: `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`.

## Directory Structure

After cloning the repo on the VPS:

```
/srv/agentmou-platform/           # Git clone of agentmou-platform
├── infra/
│   ├── compose/
│   │   ├── docker-compose.prod.yml
│   │   ├── docker-compose.local.yml
│   │   ├── .env.example
│   │   └── .env                  # Real secrets — NOT in git
│   └── scripts/
│       ├── backup.sh
│       ├── cleanup-validation-tenant.sh
│       ├── deploy-prod.sh
│       ├── setup.sh
│       ├── smoke-test.sh
│       └── verify-prod-image-assets.sh
├── services/agents/              # Python FastAPI source
├── postgres/data/                # Bind mount — NOT in git
├── redis/data/                   # Bind mount — NOT in git
├── n8n/data/                     # Bind mount — NOT in git
├── traefik/letsencrypt/          # Bind mount — NOT in git
├── uptime-kuma/data/             # Bind mount — NOT in git
└── (no production backups in git checkout)

/var/backups/agentmou/            # Backup output
/var/lock/agentmou/backup.lock    # Backup lock file
```

## First-Time Setup

```bash
ssh deploy@<vps-ip>
cd /srv
git clone <repo-url> agentmou-platform
cd agentmou-platform
bash infra/scripts/setup.sh
# Edit .env:
nano infra/compose/.env
sudo install -d -o deploy -g deploy -m 750 /var/backups/agentmou /var/lock/agentmou
# Start:
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

## Script Roles

Use the scripts below in this order so the VPS workflow stays coherent:

| Script                                       | When to use it                                     | Why it exists                                                                                                                                                                                                       |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/scripts/setup.sh`                     | Once per VPS after clone                           | Creates `.env` from the tracked example, ensures Docker networks exist, and prepares the bind-mounted service data directories                                                                                      |
| `infra/scripts/verify-prod-image-assets.sh`  | Before shipping API or worker image changes        | Confirms the built runtime images still contain repo-backed `catalog/` and `workflows/` assets that production resolves at runtime                                                                                  |
| `infra/scripts/deploy-prod.sh`               | Every production deploy                            | Pulls `origin/main`, validates required production env vars, rebuilds `api`, `worker`, and `internal-ops`, runs migrations, restarts the stack, gates on local edge health, and runs the hardened public smoke test |
| `infra/scripts/deploy-openclaw.sh`           | OpenClaw runtime deploy on the separate VPS        | Pulls `origin/main`, validates the OpenClaw env file, rebuilds `services/openclaw-runtime`, restarts the runtime stack, and gates on local OpenClaw health                                                          |
| `infra/scripts/smoke-test.sh`                | After deploys or during incident checks            | Verifies public API health, catalog content, and auth behavior without requiring a redeploy                                                                                                                         |
| `infra/scripts/backup.sh`                    | Daily cron or manual backup                        | Dumps PostgreSQL, snapshots Redis, exports n8n workflows, and captures bind-mounted state while writing outside the git checkout by default                                                                         |
| `infra/scripts/cleanup-validation-tenant.sh` | Disposable OAuth or E2E fixture cleanup on the VPS | Wraps the TypeScript cleanup implementation with the host-shell `DATABASE_URL`, `REDIS_URL`, and `N8N_API_URL` values that production cleanup needs                                                                 |

`infra/scripts/deploy-prod.sh` is the tracked deploy command for the main
AgentMou VPS. `infra/scripts/deploy-openclaw.sh` is the tracked deploy command
for the separate OpenClaw runtime VPS. If an operator wants a shortcut, keep it
as a shell alias outside the repo instead of a duplicate tracked script.

## Deploy (Manual)

```bash
ssh deploy@<vps-ip>
cd /srv/agentmou-platform
bash infra/scripts/deploy-prod.sh
```

The canonical deploy script does:

1. `git pull origin main`
2. validates the required production env vars in `infra/compose/.env`
3. rebuilds `api`, `worker`, `internal-ops`, and `migrate`
4. waits for PostgreSQL to become healthy and runs migrations
5. restarts the stack
6. gates success on local edge health (`--resolve ... 127.0.0.1`)
7. runs the hardened public smoke test in `infra/scripts/smoke-test.sh`

It should be run only from an intentionally clean or reviewed worktree. On
March 19, 2026 Epic D first cleaned the known untracked drift, then reran the
historical `deploy-phase25.sh` path from `main` until the hardened smoke test
passed. That deploy gate now lives in `deploy-prod.sh`.

### Deploy a specific service only

```bash
cd /srv/agentmou-platform
git pull origin main
docker compose -f infra/compose/docker-compose.prod.yml build agents
docker compose -f infra/compose/docker-compose.prod.yml up -d --no-deps agents
```

## Rollback

```bash
cd /srv/agentmou-platform
git log --oneline -10              # Find the good commit
git checkout <commit-sha>
docker compose -f infra/compose/docker-compose.prod.yml build
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

To return to latest main:

```bash
git checkout main && git pull origin main
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

## Backups

Run manually with the production-safe defaults:

```bash
bash infra/scripts/backup.sh
```

For local or non-VPS runs, set explicit overrides if those defaults are not
writable:

```bash
BACKUP_DIR=/tmp/agentmou-backup \
LOCK_FILE=/tmp/agentmou-backup.lock \
bash infra/scripts/backup.sh
```

The script backs up:

- **PostgreSQL**: full `pg_dumpall` compressed with gzip.
- **Redis**: `dump.rdb` snapshot.
- **n8n workflows**: exported via `n8n export:workflow --all`.
- **Files**: tar.gz of n8n data, Traefik certs, uptime-kuma data.

Production output should go to `/var/backups/agentmou`, not into the repo
checkout. Backups older than 14 days are automatically deleted.

### Cron example (daily at 04:30)

```bash
sudo install -d -o deploy -g deploy -m 750 /var/backups/agentmou /var/lock/agentmou

sudo tee /etc/cron.d/agentmou-backup >/dev/null <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

30 4 * * * deploy BACKUP_DIR=/var/backups/agentmou LOCK_FILE=/var/lock/agentmou/backup.lock /bin/bash /srv/agentmou-platform/infra/scripts/backup.sh >> /var/backups/agentmou/backup.log 2>&1
EOF

sudo rm -f /etc/cron.d/stack-backup
```

On March 19, 2026, Epic D confirmed that the tracked backup script runs cleanly
outside the checkout by writing to `/tmp/agentmou-backup`. Later the same day,
the residual-risk cleanup installed `/etc/cron.d/agentmou-backup`, removed
`/etc/cron.d/stack-backup`, created `/var/backups/agentmou` and
`/var/lock/agentmou`, and manually ran the tracked backup script with
production output paths while leaving `git status` clean.

## Temporary Validation Fixture Cleanup

Use the repo-tracked cleanup script instead of direct SQL whenever you need to
remove a disposable OAuth or E2E validation tenant:

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

The script is dry-run by default and prints the exact deletion plan first. It
refuses to run unless the tenant and owner email match the disposable fixture
markers used in this repo (`oauth-check-*`, `e2e-*`, `example.com`,
`test.agentmou.io`), the tenant remains on the `free` plan, and the tenant is
still a single-owner workspace.

The wrapper exists because the underlying TypeScript implementation runs on
the VPS host, not inside Docker. It sources `infra/compose/.env`, builds a
host-reachable `DATABASE_URL` via `127.0.0.1:5432`, resolves the current
Redis container IP for `REDIS_URL`, derives `N8N_API_URL` from
`${N8N_EDITOR_BASE_URL}/api/v1`, and then executes
`scripts/cleanup-validation-tenant.ts`.

On March 19, 2026, this script was dry-run and execute-verified live against
both the historical OAuth validation tenant and a temporary connector-delete
fixture. PostgreSQL post-checks returned `tenants=0`, `memberships=0`,
`connector_accounts=0`, and `users=0` after each cleanup.

On March 20, 2026, the same command path was re-verified after deploying
`ee804132` from `codex/fix-production-residual-risks`. Dry-run output for a
fresh `e2e-*` tenant showed `n8n_workflows: 1` and `schedule_repeatables: 1`;
execute mode then removed the tenant rows, the remote n8n workflow returned
`404`, and BullMQ repeatables returned to baseline. The same deployment also
live-verified the normal uninstall path: a disposable tenant moved repeatables
from `5 -> 6 -> 5`, the remote n8n workflow returned `404` after uninstall,
and the guarded cleanup script then removed the empty tenant and owner user.

## Provider-Backed Secret Rotation

The March 19-20 provider-backed rotation window covered:

- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_SECRET`
- `N8N_API_KEY`

Rotate each value in its source system first, then edit
`/srv/agentmou-platform/infra/compose/.env` in place without leaving `.bak`
files in the checkout.

Restart only the affected services:

```bash
cd /srv/agentmou-platform
docker compose -f infra/compose/docker-compose.prod.yml up -d --no-deps agents worker api
```

Post-rotation verification matrix:

```bash
docker compose -f infra/compose/docker-compose.prod.yml ps
curl -sk --resolve api.agentmou.io:443:127.0.0.1 https://api.agentmou.io/health
bash infra/scripts/smoke-test.sh
```

Then verify:

- `https://agents.agentmou.io/health/deep` with the current `x-api-key`
- a fresh Gmail OAuth authorize URL, callback, and `connected` connector state
- a direct n8n API path that uses `X-N8N-API-KEY`

Observed March 19-20, 2026 results:

- `GOOGLE_CLIENT_SECRET`: live-verified. A fresh Gmail OAuth authorize URL
  completed successfully and the connectors API returned `gmail` in
  `connected` state.
- `N8N_API_KEY`: live-verified. A direct n8n API call succeeded, and after
  deploying `cabbab85`, `9911bc38`, and `5dbaa108`, the real queued
  `support-starter` install path reached `workflow.status = active`.
- `OPENAI_API_KEY`: live-verified. On March 20, 2026, a direct
  `POST /health/deep` against the agents container returned
  `{"ok":true,"model":"gpt-4o-mini-2024-07-18"}`.

### Restore PostgreSQL

```bash
gunzip -c /var/backups/agentmou/agentmou-stack_postgres_2026-03-08_043001.sql.gz | \
  docker compose -f infra/compose/docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER"
```

### Restore n8n workflows

```bash
docker cp /var/backups/agentmou/agentmou-stack_n8n-workflows_2026-03-08.json \
  $(docker compose -f infra/compose/docker-compose.prod.yml ps -q n8n):/tmp/import.json
docker compose -f infra/compose/docker-compose.prod.yml exec n8n \
  n8n import:workflow --input=/tmp/import.json
```

## Monitoring

Uptime Kuma runs at `uptime.DOMAIN` and should monitor:

- `https://api.DOMAIN/health` — API public TLS and route health
- `https://agents.DOMAIN/health` — agents service health
- `https://n8n.DOMAIN` — n8n editor reachability
- `https://hooks.DOMAIN/webhook-test` — n8n webhook endpoint
- TCP `postgres:5432` (via Docker internal) — database
- TCP `redis:6379` (via Docker internal) — cache/queue

## Useful Commands

```bash
# Service status
docker compose -f infra/compose/docker-compose.prod.yml ps

# Logs (all or specific service)
docker compose -f infra/compose/docker-compose.prod.yml logs -f
docker compose -f infra/compose/docker-compose.prod.yml logs -f n8n

# Restart a single service
docker compose -f infra/compose/docker-compose.prod.yml restart agents

# Shell into a container
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou
docker compose -f infra/compose/docker-compose.prod.yml exec n8n sh

# Disk usage
sudo du -h --max-depth=2 /srv/agentmou-platform | sort -h | tail -20

# Check resources
free -h && uptime && df -h /
```

## Secrets Management

- All secrets live in `infra/compose/.env` which is gitignored.
- `BASIC_AUTH_USERS` uses htpasswd format with doubled `$$` for compose.
- `N8N_ENCRYPTION_KEY` encrypts n8n credentials at rest — **do not lose
  this key** or stored n8n credentials become unrecoverable.
- `AGENTS_API_KEY` is consumed directly by `services/agents` and
  `services/worker`. If any n8n workflow also calls the agents service,
  rotate that workflow-side credential separately because the n8n container
  does not currently receive `AGENTS_API_KEY` via compose.
- Generate strong values: `openssl rand -hex 32`

### March 19, 2026 Cleanup Follow-Up

- Root-level cleanup completed: `/etc/cron.d/agentmou-backup` replaced the
  legacy `/etc/cron.d/stack-backup` entry, and `/srv/stack` was confirmed
  absent on the host.
- VPS-local secret rotation completed for `JWT_SECRET`, `AGENTS_API_KEY`, and
  `BASIC_AUTH_USERS`. Provider-backed secret rotation still remains a separate
  operator task.
- Public route validation completed after the rotation:
  - `https://api.DOMAIN/health` returned `200`
  - `https://agents.DOMAIN/health` returned `401` without BasicAuth and `200`
    with the rotated credential
  - `https://uptime.DOMAIN/` returned `401` without auth and `302 /dashboard`
    with the rotated credential
  - `https://n8n.DOMAIN/` returned `200`
- Gmail OAuth was validated live against the production API. The first attempt
  expired the 10-minute OAuth state; the second attempt completed
  successfully, and the connectors API showed a `gmail` connector in
  `connected` status for the temporary validation tenant.
- The temporary `sudoers` file used for the root-level cleanup was removed
  after the intervention.

## Migration from Legacy Stack

If migrating from the old `/srv/stack/` layout:

```bash
# 1. Clone repo
cd /srv
git clone <repo-url> agentmou-platform
cd agentmou-platform
bash infra/scripts/setup.sh

# 2. Copy .env (adapt variable names if needed)
cp /srv/stack/.env infra/compose/.env

# 3. Symlink existing data to avoid copying
ln -sf /srv/stack/postgres/data   postgres/data
ln -sf /srv/stack/redis/data      redis/data
ln -sf /srv/stack/n8n/data        n8n/data
ln -sf /srv/stack/traefik/letsencrypt traefik/letsencrypt
ln -sf /srv/stack/uptime-kuma/data    uptime-kuma/data

# 4. Stop old stack
cd /srv/stack && docker compose down

# 5. Start new stack
cd /srv/agentmou-platform
docker compose -f infra/compose/docker-compose.prod.yml up -d

# 6. Verify everything works, then clean up
docker compose -f infra/compose/docker-compose.prod.yml ps
# If all good, optionally move data instead of symlinks:
#   mv /srv/stack/postgres/data postgres/data  (etc.)
```
