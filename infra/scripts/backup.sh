#!/bin/bash
set -e

# ---------------------------------------------------------------------------
# AgentMou Stack — Backup Script
# ---------------------------------------------------------------------------
# Backs up PostgreSQL, Redis, and n8n workflows.
# Run from the repo root or set REPO_ROOT explicitly.
#
# Usage:
#   bash infra/scripts/backup.sh
#   BACKUP_DIR=/custom/path bash infra/scripts/backup.sh
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups/out}"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
RETENTION_DAYS=14

echo "=== AgentMou backup — $TIMESTAMP ==="
mkdir -p "$BACKUP_DIR"

# --- PostgreSQL -------------------------------------------------------------
echo "Backing up PostgreSQL..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dumpall -U "$POSTGRES_USER" | gzip \
  > "$BACKUP_DIR/agentmou-stack_postgres_$TIMESTAMP.sql.gz"

# --- Redis ------------------------------------------------------------------
echo "Backing up Redis AOF..."
REDIS_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q redis 2>/dev/null || true)
if [ -n "$REDIS_CONTAINER" ]; then
  docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE >/dev/null 2>&1 || true
  sleep 2
  if docker exec "$REDIS_CONTAINER" test -f /data/dump.rdb 2>/dev/null; then
    docker cp "$REDIS_CONTAINER":/data/dump.rdb "$BACKUP_DIR/agentmou-stack_redis_$TIMESTAMP.rdb"
  fi
fi

# --- n8n workflows (via API) ------------------------------------------------
echo "Backing up n8n workflows..."
N8N_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q n8n 2>/dev/null || true)
if [ -n "$N8N_CONTAINER" ]; then
  docker exec "$N8N_CONTAINER" n8n export:workflow --all \
    --output=/tmp/n8n-workflows-export.json 2>/dev/null || true
  docker cp "$N8N_CONTAINER":/tmp/n8n-workflows-export.json \
    "$BACKUP_DIR/agentmou-stack_n8n-workflows_$TIMESTAMP.json" 2>/dev/null || true
fi

# --- Files (bind-mounted data) ----------------------------------------------
echo "Backing up bind-mounted data..."
tar czf "$BACKUP_DIR/agentmou-stack_files_$TIMESTAMP.tar.gz" \
  -C "$REPO_ROOT" \
  --exclude='postgres/data' \
  --exclude='redis/data' \
  n8n/data traefik/letsencrypt uptime-kuma/data 2>/dev/null || true

# --- Rotation ---------------------------------------------------------------
echo "Rotating backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f \( -name "*.gz" -o -name "*.rdb" -o -name "*.json" \) \
  -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# --- Summary -----------------------------------------------------------------
echo ""
echo "Backup complete. Files in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR" | tail -10
