#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# AgentMou Stack - Backup Script
# ---------------------------------------------------------------------------
# Backs up PostgreSQL, Redis, n8n workflows, and bind-mounted state.
#
# Production-safe defaults write outside the git checkout:
#   BACKUP_DIR=/var/backups/agentmou
#   LOCK_FILE=/var/lock/agentmou/backup.lock
#
# For local/manual runs, set explicit overrides if those paths are not
# writable in the current environment.
#
# Usage:
#   bash infra/scripts/backup.sh
#   BACKUP_DIR=/custom/path bash infra/scripts/backup.sh
#   LOCK_FILE=/run/lock/agentmou/backup.lock bash infra/scripts/backup.sh
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/agentmou}"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
RETENTION_DAYS=14
LOCK_FILE="${LOCK_FILE:-/var/lock/agentmou/backup.lock}"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

ensure_writable_directory() {
  local directory="$1"
  local description="$2"

  if mkdir -p "$directory" 2>/dev/null; then
    :
  elif [ ! -d "$directory" ]; then
    fail "Cannot create ${description} at ${directory}. Set an explicit override for local/manual runs."
  fi

  if [ ! -w "$directory" ]; then
    fail "${description} is not writable at ${directory}. Set an explicit override for local/manual runs."
  fi
}

cleanup_lock_dir() {
  local lock_dir

  if ! command -v flock >/dev/null 2>&1; then
    fail "flock is required when LOCK_FILE is set"
  fi

  lock_dir="$(dirname "$LOCK_FILE")"
  ensure_writable_directory "$lock_dir" "LOCK_FILE parent directory"
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    fail "another backup run is already holding $LOCK_FILE"
  fi
}

echo "=== AgentMou backup — $TIMESTAMP ==="
ensure_writable_directory "$BACKUP_DIR" "BACKUP_DIR"
cleanup_lock_dir

# --- PostgreSQL -------------------------------------------------------------
echo "Backing up PostgreSQL..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  sh -c 'pg_dumpall -U "$POSTGRES_USER"' | gzip \
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
