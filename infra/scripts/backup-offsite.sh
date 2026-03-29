#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-/etc/agentmou/restic.env}"
LOCK_FILE="${LOCK_FILE:-/var/lock/agentmou/offsite-backup.lock}"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-/var/backups/agentmou}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$REPO_ROOT/infra/compose/.env}"
RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/var/cache/restic}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
KEEP_MONTHLY="${KEEP_MONTHLY:-6}"
MODE="manual"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
HOST_TAG="${RESTIC_HOST:-$(hostname -s)}"

usage() {
  cat <<'EOF'
Usage:
  sudo bash infra/scripts/backup-offsite.sh [--mode=daily|predeploy|manual]
EOF
}

log() {
  printf '[backup-offsite] %s\n' "$1"
}

fail() {
  printf '[backup-offsite] ERROR: %s\n' "$1" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    fail "run this script as root so it can read /etc/agentmou and backup state"
  fi
}

ensure_dir() {
  local dir="$1"
  mkdir -p "$dir"
}

require_file() {
  local file="$1"
  local description="$2"
  [ -f "$file" ] || fail "missing ${description} at ${file}"
}

require_glob() {
  local pattern="$1"
  local description="$2"
  compgen -G "$pattern" >/dev/null || fail "missing ${description} matching ${pattern}"
}

load_env() {
  require_file "$ENV_FILE" "restic env file"

  # shellcheck disable=SC1090
  source "$ENV_FILE"

  [ -n "${RESTIC_REPOSITORY:-}" ] || fail "RESTIC_REPOSITORY must be set in $ENV_FILE"
  if [ -z "${RESTIC_PASSWORD:-}" ] && [ -z "${RESTIC_PASSWORD_FILE:-}" ]; then
    fail "set RESTIC_PASSWORD or RESTIC_PASSWORD_FILE in $ENV_FILE"
  fi

  if [[ "${RESTIC_REPOSITORY}" == s3:* ]]; then
    [ -n "${AWS_ACCESS_KEY_ID:-}" ] || fail "AWS_ACCESS_KEY_ID is required for s3 repositories"
    [ -n "${AWS_SECRET_ACCESS_KEY:-}" ] || fail "AWS_SECRET_ACCESS_KEY is required for s3 repositories"
    [ -n "${AWS_DEFAULT_REGION:-}" ] || fail "AWS_DEFAULT_REGION is required for s3 repositories"
  fi

  export RESTIC_REPOSITORY
  export RESTIC_PASSWORD="${RESTIC_PASSWORD:-}"
  export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-}"
  export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
  export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-}"
  export AWS_REGION="${AWS_DEFAULT_REGION:-}"
  export RESTIC_CACHE_DIR
}

acquire_lock() {
  ensure_dir "$(dirname "$LOCK_FILE")"
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    fail "another offsite backup run is already in progress"
  fi
}

verify_local_artifacts() {
  require_file "$COMPOSE_ENV_FILE" "compose env file"
  [ -d "$LOCAL_BACKUP_DIR" ] || fail "missing local backup directory at $LOCAL_BACKUP_DIR"
  require_glob "$LOCAL_BACKUP_DIR/agentmou-stack_postgres_*.sql.gz" "PostgreSQL backup"
  require_glob "$LOCAL_BACKUP_DIR/agentmou-stack_redis_*.rdb" "Redis backup"
  require_glob "$LOCAL_BACKUP_DIR/agentmou-stack_n8n-workflows_*.json" "n8n workflow export"
  require_glob "$LOCAL_BACKUP_DIR/agentmou-stack_files_*.tar.gz" "bind-mounted data archive"
}

run_backup() {
  ensure_dir "$RESTIC_CACHE_DIR"

  log "starting restic backup (${MODE})"
  restic backup \
    "$LOCAL_BACKUP_DIR" \
    "$COMPOSE_ENV_FILE" \
    --exclude "$LOCAL_BACKUP_DIR/backup.log" \
    --tag "agentmou-vps" \
    --tag "host:${HOST_TAG}" \
    --tag "mode:${MODE}" \
    --tag "timestamp:${TIMESTAMP}"

  log "applying retention"
  restic forget --prune \
    --tag "agentmou-vps" \
    --keep-daily "$KEEP_DAILY" \
    --keep-weekly "$KEEP_WEEKLY" \
    --keep-monthly "$KEEP_MONTHLY"

  log "latest snapshots"
  restic snapshots --tag "agentmou-vps" --latest 5
}

while [ $# -gt 0 ]; do
  case "$1" in
    --mode=*)
      MODE="${1#*=}"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      fail "unknown argument: $1"
      ;;
  esac
  shift
done

case "$MODE" in
  daily|predeploy|manual)
    ;;
  *)
    fail "MODE must be one of: daily, predeploy, manual"
    ;;
esac

require_root
command -v flock >/dev/null 2>&1 || fail "flock is required"
command -v restic >/dev/null 2>&1 || fail "restic is not installed"
load_env
acquire_lock
verify_local_artifacts
run_backup
