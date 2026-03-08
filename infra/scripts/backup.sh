#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-./infra/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="agentmou-postgres"
DB_NAME="${DB_NAME:-agentmou}"
DB_USER="${DB_USER:-agentmou}"

echo "Starting backup at $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL
echo "Backing up PostgreSQL database..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Backup Redis (if persistence is enabled)
echo "Backing up Redis data..."
REDIS_CONTAINER="agentmou-redis"
if docker exec "$REDIS_CONTAINER" test -f /data/dump.rdb 2>/dev/null; then
    docker cp "$REDIS_CONTAINER":/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"
fi

echo "✅ Backup completed!"
echo "Backup location: $BACKUP_DIR"

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -5
