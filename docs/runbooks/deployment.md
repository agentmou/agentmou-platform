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
[VPS Operations](./vps-operations.md) for full operational details.

### First-time setup

```bash
ssh deploy@<vps-ip>
cd /srv
git clone <repo-url> agentmou-stack
cd agentmou-stack
bash infra/scripts/setup.sh
nano infra/compose/.env              # Fill in real secrets
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

### Subsequent deploys

```bash
ssh deploy@<vps-ip>
cd /srv/agentmou-stack
bash infra/scripts/deploy.sh
```

### Deploy only a specific service

```bash
cd /srv/agentmou-stack
git pull origin main
docker compose -f infra/compose/docker-compose.prod.yml build agents
docker compose -f infra/compose/docker-compose.prod.yml up -d --no-deps agents
```

### Run database migrations

After first deploy or after schema changes:

```bash
docker compose -f infra/compose/docker-compose.prod.yml exec api pnpm db:migrate
```

### Active services

The `api` and `worker` services start automatically with the stack. The
`web` service is behind a profile (`--profile web`) because the web app
is deployed on Vercel instead.

## Health Verification

```bash
# API health
curl -f https://api.DOMAIN/health

# Agents health
curl -f https://agents.DOMAIN/health

# Or via Uptime Kuma at https://uptime.DOMAIN
```

## Rollback

```bash
cd /srv/agentmou-stack
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
