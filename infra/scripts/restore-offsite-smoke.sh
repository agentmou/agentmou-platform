#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-/etc/agentmou/restic.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/agentmou}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$REPO_ROOT/infra/compose/.env}"
TARGET_DIR="${TARGET_DIR:-/var/tmp/agentmou-offsite-restore-$(date -u +%Y%m%dT%H%M%SZ)}"
SNAPSHOT="${SNAPSHOT:-latest}"

usage() {
  cat <<'EOF'
Usage:
  sudo bash infra/scripts/restore-offsite-smoke.sh [--snapshot=<id>|--snapshot=latest] [--target=/path]
EOF
}

log() {
  printf '[restore-offsite-smoke] %s\n' "$1"
}

fail() {
  printf '[restore-offsite-smoke] ERROR: %s\n' "$1" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    fail "run this script as root so it can write the restore target"
  fi
}

load_env() {
  [ -f "$ENV_FILE" ] || fail "missing restic env file at $ENV_FILE"

  # shellcheck disable=SC1090
  source "$ENV_FILE"

  [ -n "${RESTIC_REPOSITORY:-}" ] || fail "RESTIC_REPOSITORY must be set in $ENV_FILE"
  if [ -z "${RESTIC_PASSWORD:-}" ] && [ -z "${RESTIC_PASSWORD_FILE:-}" ]; then
    fail "set RESTIC_PASSWORD or RESTIC_PASSWORD_FILE in $ENV_FILE"
  fi

  export RESTIC_REPOSITORY
  export RESTIC_PASSWORD="${RESTIC_PASSWORD:-}"
  export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-}"
  export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
  export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-}"
  export AWS_REGION="${AWS_DEFAULT_REGION:-}"
  export RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/var/cache/restic}"
}

latest_match() {
  local root="$1"
  local pattern="$2"
  local result

  result="$(find "$root" -maxdepth 1 -type f -name "$pattern" | sort | tail -1)"
  [ -n "$result" ] || fail "missing file matching $pattern in $root"
  printf '%s\n' "$result"
}

verify_restore() {
  local restored_backup_dir="$TARGET_DIR$BACKUP_DIR"
  local restored_env="$TARGET_DIR$COMPOSE_ENV_FILE"
  local latest_postgres
  local latest_redis
  local latest_workflows
  local latest_files

  [ -d "$restored_backup_dir" ] || fail "restored backup directory not found at $restored_backup_dir"
  [ -f "$restored_env" ] || fail "restored compose env not found at $restored_env"

  latest_postgres="$(latest_match "$restored_backup_dir" 'agentmou-stack_postgres_*.sql.gz')"
  latest_redis="$(latest_match "$restored_backup_dir" 'agentmou-stack_redis_*.rdb')"
  latest_workflows="$(latest_match "$restored_backup_dir" 'agentmou-stack_n8n-workflows_*.json')"
  latest_files="$(latest_match "$restored_backup_dir" 'agentmou-stack_files_*.tar.gz')"

  gzip -t "$latest_postgres"
  [ -s "$latest_redis" ] || fail "restored Redis snapshot is empty"
  [ -s "$latest_workflows" ] || fail "restored n8n workflow export is empty"
  [ -s "$latest_files" ] || fail "restored files archive is empty"
  tar -tzf "$latest_files" >/dev/null

  log "restore verification passed"
  log "restored backup dir: $restored_backup_dir"
  log "restored env file: $restored_env"
  log "verified artifacts:"
  printf '  postgres: %s\n  redis: %s\n  workflows: %s\n  files: %s\n' \
    "$latest_postgres" "$latest_redis" "$latest_workflows" "$latest_files"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --snapshot=*)
      SNAPSHOT="${1#*=}"
      ;;
    --target=*)
      TARGET_DIR="${1#*=}"
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

require_root
command -v restic >/dev/null 2>&1 || fail "restic is not installed"
command -v gzip >/dev/null 2>&1 || fail "gzip is required"
command -v tar >/dev/null 2>&1 || fail "tar is required"
load_env
mkdir -p "$TARGET_DIR"
log "restoring snapshot $SNAPSHOT into $TARGET_DIR"
restic restore "$SNAPSHOT" --target "$TARGET_DIR"
verify_restore
