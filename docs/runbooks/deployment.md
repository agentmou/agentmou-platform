# Deployment Runbook

This runbook reflects the current monorepo bootstrap state.

## Pre-Deployment Checklist

- `pnpm install`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- Infrastructure env file configured (`infra/compose/.env`)
- Required external secrets set for your target environment

## Known Current Tooling Gaps

- `pnpm test` currently has no task graph configured.

Treat this as a roadmap item before production hardening.

## Local Development Stack

## 1) Environment

```bash
cp infra/compose/.env.example infra/compose/.env
```

## 2) Start Infrastructure

```bash
docker compose -f infra/compose/docker-compose.local.yml up -d
```

## 3) Typecheck and Build

```bash
pnpm typecheck
pnpm build
```

## 4) Start Dev Servers

```bash
pnpm dev
```

## Service Endpoints (Local)

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- n8n: `http://localhost:5678`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Production Compose Deployment

```bash
docker compose -f infra/compose/docker-compose.prod.yml build
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

## Health Verification

```bash
curl -f http://localhost:3001/health
```

For web checks, validate key routes through your external ingress/proxy.

## Backup Procedure

Use the provided script:

```bash
pnpm backup
```

Current script backs up local Docker Postgres/Redis artifacts under `infra/backups`.

For production resilience, add offsite backup replication (S3/R2/B2) as a mandatory next step.
