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
`/srv/agentmou-platform`: local Traefik health returned `200`, and
`bash infra/scripts/smoke-test.sh` passed `3/3`.

## Health Verification

Run these checks from the VPS checkout with a real `infra/compose/.env`. If
you cannot do that, record the checks as not executed rather than inferred.
Before running `deploy.sh` or `deploy-phase25.sh`, inspect `git status --short`
on the VPS checkout and resolve any unexpected local drift.

```bash
# Local deploy gate (through Traefik on the VPS host)
curl -sk --resolve api.DOMAIN:443:127.0.0.1 https://api.DOMAIN/health

# Public DNS/TLS/API smoke
bash infra/scripts/smoke-test.sh

# Or via Uptime Kuma at https://uptime.DOMAIN
```

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

Backups are stored in `backups/out/` with 14-day automatic rotation.
See [VPS Operations](./vps-operations.md) for restore procedures and
cron setup.
