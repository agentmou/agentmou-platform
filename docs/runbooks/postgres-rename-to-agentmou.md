# Postgres Credential Rename: `n8n` -> `agentmou`

## Purpose

Use this runbook to rename the production Postgres user and database from
`n8n` to `agentmou`.

This procedure recreates the Postgres volume. It is destructive and should run
only when the data is disposable or after a verified backup.

## Preconditions

- SSH access to the VPS
- Repository checkout present on the VPS, for example
  `/srv/agentmou-platform`
- Approval to destroy and recreate the production Postgres data volume

## Signals

Use this procedure only when the production stack still relies on legacy `n8n`
database naming and the team has decided to align the credentials with the
tracked `agentmou` stack naming.

## Procedure

### 1. Take a backup if needed

```bash
cd /srv/agentmou-platform
source infra/compose/.env 2>/dev/null || true
export POSTGRES_USER POSTGRES_PASSWORD
bash infra/scripts/backup.sh
```

### 2. Stop services that depend on Postgres

```bash
cd /srv/agentmou-platform
docker compose -f infra/compose/docker-compose.prod.yml stop api worker n8n
```

### 3. Stop and remove the optional `postgres-proxy`

If you use the `postgres-proxy` container for Drizzle Studio:

```bash
docker stop postgres-proxy 2>/dev/null || true
docker rm postgres-proxy 2>/dev/null || true
```

### 4. Stop Postgres and remove the existing data

The compose file uses the bind mount `../../postgres/data`. Remove its
contents:

```bash
docker compose -f infra/compose/docker-compose.prod.yml stop postgres
docker compose -f infra/compose/docker-compose.prod.yml rm -f postgres
sudo rm -rf /srv/agentmou-platform/postgres/data/*
```

### 5. Update `infra/compose/.env`

```bash
nano infra/compose/.env
```

Set these values:

```text
POSTGRES_USER=agentmou
POSTGRES_DB=agentmou
```

`POSTGRES_PASSWORD` can stay the same or be rotated at the same time.

### 6. Start Postgres

```bash
docker compose -f infra/compose/docker-compose.prod.yml up -d postgres
```

Wait for the health check to pass:

```bash
docker compose -f infra/compose/docker-compose.prod.yml ps postgres
```

The status should show `healthy`.

### 7. Run migrations

```bash
docker compose -f infra/compose/docker-compose.prod.yml --profile ops run --rm migrate
```

### 8. Start API, worker, and n8n again

```bash
docker compose -f infra/compose/docker-compose.prod.yml up -d api worker n8n
```

### 9. Recreate `postgres-proxy` if needed

If you use `socat` for Drizzle Studio through an SSH tunnel:

```bash
POSTGRES_IP=$(docker inspect agentmou-stack-postgres-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
docker run -d --name postgres-proxy --restart unless-stopped \
  --network host \
  alpine/socat TCP-LISTEN:5432,fork TCP:${POSTGRES_IP}:5432
```

## Verification

```bash
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -d agentmou -c '\dt'
nc -zv 127.0.0.1 5432
```

Run the second command only if `postgres-proxy` is active.

## Rollback Or Escalation

- Do not attempt an ad hoc rollback by rewriting the bind mount manually.
- Restore from the verified backup path if the renamed database cannot be
  brought back to a healthy state.
- Escalate before re-running the destructive volume removal step.

## `DATABASE_URL` For Drizzle Studio

After the rename, use:

```text
DATABASE_URL=postgres://agentmou:PASSWORD@localhost:5433/agentmou
```

Use the real password from `infra/compose/.env` and the SSH-tunneled port that
matches your local setup.
