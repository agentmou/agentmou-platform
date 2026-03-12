# Migración: Postgres credentials n8n → agentmou

Este runbook describe los pasos para cambiar el usuario y base de datos de Postgres
de `n8n` a `agentmou` en producción. Requiere recrear el volumen de Postgres;
**todos los datos se perderán**. Solo ejecutar si no hay datos importantes o tras
hacer backup.

## Requisitos

- Acceso SSH al VPS
- Repo clonado en el VPS (ej. `/srv/agentmou-platform`)

## Pasos

### 1. Backup (opcional)

```bash
cd /srv/agentmou-platform
source infra/compose/.env 2>/dev/null || true
export POSTGRES_USER POSTGRES_PASSWORD
bash infra/scripts/backup.sh
```

### 2. Detener servicios que usan Postgres

```bash
cd /srv/agentmou-platform
docker compose -f infra/compose/docker-compose.prod.yml stop api worker n8n
```

### 3. Detener y eliminar postgres-proxy (socat)

Si tienes el contenedor `postgres-proxy` para Drizzle Studio:

```bash
docker stop postgres-proxy 2>/dev/null || true
docker rm postgres-proxy 2>/dev/null || true
```

### 4. Detener postgres y borrar datos

El compose usa bind mount `../../postgres/data`. Borrar el contenido:

```bash
docker compose -f infra/compose/docker-compose.prod.yml stop postgres
docker compose -f infra/compose/docker-compose.prod.yml rm -f postgres
sudo rm -rf /srv/agentmou-platform/postgres/data/*
```

### 5. Actualizar .env

```bash
nano infra/compose/.env
```

Cambiar:

```
POSTGRES_USER=agentmou
POSTGRES_DB=agentmou
```

(POSTGRES_PASSWORD puede mantenerse o generarse nuevo.)

### 6. Levantar postgres

```bash
docker compose -f infra/compose/docker-compose.prod.yml up -d postgres
```

Esperar hasta que el healthcheck pase:

```bash
docker compose -f infra/compose/docker-compose.prod.yml ps postgres
# Debe mostrar "healthy"
```

### 7. Ejecutar migraciones

```bash
docker compose -f infra/compose/docker-compose.prod.yml --profile ops run --rm migrate
```

### 8. Levantar api, worker, n8n

```bash
docker compose -f infra/compose/docker-compose.prod.yml up -d api worker n8n
```

### 9. Recrear postgres-proxy (opcional)

Si usas socat para Drizzle Studio vía túnel SSH:

```bash
POSTGRES_IP=$(docker inspect agentmou-stack-postgres-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
docker run -d --name postgres-proxy --restart unless-stopped \
  --network host \
  alpine/socat TCP-LISTEN:5432,fork TCP:${POSTGRES_IP}:5432
```

### 10. Verificar

```bash
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -d agentmou -c '\dt'
nc -zv 127.0.0.1 5432  # si postgres-proxy está activo
```

## DATABASE_URL para Drizzle Studio

Tras la migración, usar:

```
DATABASE_URL=postgres://agentmou:PASSWORD@localhost:5433/agentmou
```

(Con túnel SSH en puerto 5433 y la contraseña real del `.env`.)
