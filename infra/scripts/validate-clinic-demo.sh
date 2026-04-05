#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.local.yml"
DB_USER="${DB_USER:-agentmou}"
DB_PASSWORD="${DB_PASSWORD:-changeme}"
DB_NAME="${DB_NAME:-agentmou}"
DB_PORT="${DB_PORT:-5432}"
CANONICAL_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}"
HAS_PROVIDED_DATABASE_URL=0

if [ -n "${DATABASE_URL:-}" ]; then
  HAS_PROVIDED_DATABASE_URL=1
fi

export DATABASE_URL="${DATABASE_URL:-$CANONICAL_DATABASE_URL}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:3001}"
export CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:3000}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret}"
export WEB_APP_BASE_URL="${WEB_APP_BASE_URL:-http://localhost:3000}"
export LOG_LEVEL="${LOG_LEVEL:-silent}"
export NODE_ENV="${NODE_ENV:-test}"
export TURBO_TELEMETRY_DISABLED="${TURBO_TELEMETRY_DISABLED:-1}"

ensure_postgres() {
  if [ "$HAS_PROVIDED_DATABASE_URL" -eq 1 ]; then
    echo "Using provided DATABASE_URL"
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required when DATABASE_URL is not provided" >&2
    exit 1
  fi

  echo "Ensuring local postgres is running..."
  (cd "$REPO_ROOT" && docker compose -f "$COMPOSE_FILE" up -d postgres >/dev/null)

  for _ in $(seq 1 30); do
    if (cd "$REPO_ROOT" && docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1); then
      echo "Postgres is ready"
      return
    fi
    sleep 2
  done

  echo "Timed out waiting for postgres to become healthy" >&2
  exit 1
}

run_step() {
  local label="$1"
  shift

  echo "-- $label"
  "$@"
}

main() {
  echo "== Clinic demo validation =="
  echo "DATABASE_URL=$DATABASE_URL"

  ensure_postgres

  cd "$REPO_ROOT"

  run_step "db migrate" pnpm db:migrate
  run_step "db seed" pnpm db:seed
  run_step "db typecheck" pnpm --filter @agentmou/db typecheck
  run_step "db test" pnpm --filter @agentmou/db test
  run_step "api typecheck" pnpm --filter @agentmou/api typecheck
  run_step "api test" pnpm --filter @agentmou/api test
  run_step "web typecheck" pnpm --filter @agentmou/web typecheck
  run_step "web test" pnpm --filter @agentmou/web test
  run_step "clinic demo smoke" node --import tsx scripts/test-e2e-clinic-demo.ts
  run_step "content validation" make validate-content

  echo "== Clinic demo validation complete =="
}

main "$@"
