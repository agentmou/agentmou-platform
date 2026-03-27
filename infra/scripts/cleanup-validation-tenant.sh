#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Agentmou Stack - Validation Fixture Cleanup Wrapper
# ---------------------------------------------------------------------------
# VPS-friendly wrapper around scripts/cleanup-validation-tenant.ts.
# It derives the host-shell env vars that the TypeScript implementation needs
# so operators do not have to export DATABASE_URL, REDIS_URL, and N8N_API_URL
# manually on the host.
#
# Usage:
#   bash infra/scripts/cleanup-validation-tenant.sh --tenant-id <id> --user-email <email>
#   bash infra/scripts/cleanup-validation-tenant.sh --tenant-id <id> --user-email <email> --execute
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/compose/.env"
TSX_BIN="$REPO_ROOT/node_modules/.bin/tsx"

usage() {
  cat <<'EOF'
Usage:
  bash infra/scripts/cleanup-validation-tenant.sh --tenant-id <id> --user-email <email>
  bash infra/scripts/cleanup-validation-tenant.sh --tenant-id <id> --user-email <email> --execute
EOF
}

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ ! -f "$ENV_FILE" ]; then
  fail "Expected env file at $ENV_FILE"
fi

if [ ! -x "$TSX_BIN" ]; then
  fail "Expected tsx at $TSX_BIN. Run pnpm install in $REPO_ROOT first."
fi

if ! command -v docker >/dev/null 2>&1; then
  fail "docker is required"
fi

cd "$REPO_ROOT"

# shellcheck disable=SC1090
source "$ENV_FILE"

REDIS_CONTAINER_ID=$(docker compose -f "$COMPOSE_FILE" ps -q redis)
if [ -z "$REDIS_CONTAINER_ID" ]; then
  fail "Redis container is not running. Start the production stack first."
fi

REDIS_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$REDIS_CONTAINER_ID" 2>/dev/null)
if [ -z "$REDIS_IP" ]; then
  fail "Could not resolve the Redis container IP"
fi

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  fail "POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB must be set in $ENV_FILE"
fi

if [ -z "${N8N_EDITOR_BASE_URL:-}" ]; then
  fail "N8N_EDITOR_BASE_URL must be set in $ENV_FILE"
fi

export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}"
export REDIS_URL="redis://${REDIS_IP}:6379"
export N8N_API_URL="${N8N_EDITOR_BASE_URL%/}/api/v1"

exec "$TSX_BIN" scripts/cleanup-validation-tenant.ts "$@"
