# VPS Operations

This runbook documents the single-VPS production layout defined in the
repository. Pair it with the
[Platform Context v2 operational verification snapshot](../architecture/platform-context-v2.md#operational-verification-snapshot-on-march-19-2026)
before making claims about the live state that is currently verified.

The March 19, 2026 live verification used the current VPS checkout at
`/srv/agentmou-platform`.

## Server Specs

| Resource   | Value                          |
| ---------- | ------------------------------ |
| Provider   | (your provider)                |
| OS         | Ubuntu (latest LTS)            |
| RAM        | 8 GB                           |
| Disk       | 150 GB SSD                     |
| CPU        | Shared vCPUs                   |
| IP         | Static public IPv4             |
| SSH user   | `deploy`                       |
| Hostname   | `vps-n8n-agents`               |

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

| Network    | Type     | Services                                  |
| ---------- | -------- | ----------------------------------------- |
| `web`      | External | Traefik, n8n, agents, api, uptime-kuma    |
| `internal` | Internal | Postgres, Redis, n8n, api, worker         |

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

| Subdomain           | Service          | Auth       | Middlewares                                |
| ------------------- | ---------------- | ---------- | ------------------------------------------ |
| `api.DOMAIN`        | Control Plane API| None (JWT) | secure-headers, rate-limit, noindex        |
| `n8n.DOMAIN`        | n8n editor       | —          | secure-headers, noindex                    |
| `hooks.DOMAIN`      | n8n webhooks     | None       | secure-headers, rate-limit, noindex        |
| `agents.DOMAIN`     | agents API       | BasicAuth  | auth, secure-headers, noindex              |
| `uptime.DOMAIN`     | Uptime Kuma      | BasicAuth  | auth, secure-headers, rate-limit, noindex  |

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
│       ├── deploy-phase25.sh
│       ├── setup.sh
│       └── deploy.sh
├── services/agents/              # Python FastAPI source
├── postgres/data/                # Bind mount — NOT in git
├── redis/data/                   # Bind mount — NOT in git
├── n8n/data/                     # Bind mount — NOT in git
├── traefik/letsencrypt/          # Bind mount — NOT in git
├── uptime-kuma/data/             # Bind mount — NOT in git
└── backups/out/                  # Backup output — NOT in git
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
# Start:
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

## Deploy (Manual)

```bash
ssh deploy@<vps-ip>
cd /srv/agentmou-platform
bash infra/scripts/deploy.sh
```

The deploy script does:

1. `git pull origin main`
2. `docker compose build` (rebuilds changed images)
3. `docker compose up -d` (restarts changed services)
4. Prints `docker compose ps` for verification

For Phase 2.5 deploys, use `infra/scripts/deploy-phase25.sh`:

- includes migrations via `migrate` profile service
- gates success on local edge health (`--resolve ... 127.0.0.1`)
- keeps public DNS/TLS checks separate in `infra/scripts/smoke-test.sh`
- requires a VPS checkout with `infra/compose/.env` populated
- should be run only from an intentionally clean or reviewed worktree; on
  March 19, 2026 the live checkout was healthy but dirty, so Epic D verified
  the stack directly instead of triggering a redeploy

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

Run manually or via cron:

```bash
bash infra/scripts/backup.sh
```

The script backs up:

- **PostgreSQL**: full `pg_dumpall` compressed with gzip.
- **Redis**: `dump.rdb` snapshot.
- **n8n workflows**: exported via `n8n export:workflow --all`.
- **Files**: tar.gz of n8n data, Traefik certs, uptime-kuma data.

Output goes to `backups/out/`. Backups older than 14 days are
automatically deleted.

### Cron example (daily at 04:30)

```bash
# crontab -e
30 4 * * * cd /srv/agentmou-platform && bash infra/scripts/backup.sh >> /var/log/agentmou-backup.log 2>&1
```

### Restore PostgreSQL

```bash
gunzip -c backups/out/agentmou-stack_postgres_2026-03-08_043001.sql.gz | \
  docker compose -f infra/compose/docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER"
```

### Restore n8n workflows

```bash
docker cp backups/out/agentmou-stack_n8n-workflows_2026-03-08.json \
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
- `AGENTS_API_KEY` is a shared secret between n8n and the agents service.
- Generate strong values: `openssl rand -hex 32`

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
