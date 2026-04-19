#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Agentmou Stack - Production Deploy
# ---------------------------------------------------------------------------
# Canonical production deploy entrypoint for the VPS checkout.
#
# Behavior:
#   1. Pull latest code from origin/main
#   2. Validate required production environment variables
#   3. Snapshot the production database (pre-deploy rollback point)
#   4. Rebuild api, worker, agents, and migrate images
#   5. Wait for PostgreSQL health and run migrations
#   6. Restart the stack
#   7. Wait for all services to become healthy, verify local edge,
#      run the public smoke test
#   8. Run the live E2E triage against the public API as the final gate
#
# Env toggles:
#   SKIP_PRE_DEPLOY_BACKUP=1   — skip step 3 (use for rapid iteration only)
#   SKIP_E2E_TRIAGE=1          — skip step 8 (test-e2e-triage)
#   SKIP_E2E_CLEANUP=1         — keep the validation-* tenant after triage
#   HEALTHY_TIMEOUT_SECONDS=180 — override max wait for services to become healthy
#
# Usage:
#   bash infra/scripts/deploy-prod.sh
#   bash infra/scripts/deploy-prod.sh --build-only
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/compose/.env"
COMPOSE_ARGS=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE")

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BUILD_ONLY=0

usage() {
  cat <<'EOF'
Usage:
  bash infra/scripts/deploy-prod.sh
  bash infra/scripts/deploy-prod.sh --build-only
EOF
}

step() { echo -e "\n${GREEN}==> $1${NC}"; }
warn() { echo -e "${YELLOW}WARN: $1${NC}"; }
fail() { echo -e "${RED}ERROR: $1${NC}"; exit 1; }
ok() { echo -e "${GREEN}OK: $1${NC}"; }

is_placeholder() {
  local value="${1:-}"
  local lowered=""

  lowered=$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')
  case "$lowered" in
    ""|*changeme*|*replace-me*|*example-value*|*your-*)
      return 0
      ;;
  esac
  return 1
}

is_local_value() {
  local value="${1:-}"
  local lowered=""

  lowered=$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')
  case "$lowered" in
    *localhost*|*127.0.0.1*|*0.0.0.0*)
      return 0
      ;;
  esac
  return 1
}

extract_origin() {
  printf '%s' "${1:-}" | sed -E 's#^([a-z]+://[^/]+).*$#\1#; s#/$##'
}

allowlist_includes_origin() {
  local allowlist="${1:-}"
  local expected_origin="${2:-}"
  local entry=""
  local normalized_entry=""

  IFS=',' read -r -a entries <<< "$allowlist"
  for entry in "${entries[@]}"; do
    entry="$(printf '%s' "$entry" | xargs)"
    [ -z "$entry" ] && continue
    case "$entry" in
      *://*) normalized_entry="$(extract_origin "$entry")" ;;
      *) normalized_entry="$(extract_origin "https://$entry")" ;;
    esac

    if [ "$normalized_entry" = "$expected_origin" ]; then
      return 0
    fi
  done

  return 1
}

validate_domain_runtime_contract() {
  local app_origin=""
  local api_origin=""
  local cors_origin=""
  local redirect_value=""
  local failed=0

  app_origin="$(extract_origin "${APP_PUBLIC_BASE_URL:-}")"
  api_origin="$(extract_origin "${API_PUBLIC_BASE_URL:-}")"
  cors_origin="$(extract_origin "${CORS_ORIGIN:-}")"

  if [ "$cors_origin" != "$app_origin" ]; then
    warn "CORS_ORIGIN must match APP_PUBLIC_BASE_URL origin (got ${CORS_ORIGIN:-unset} vs ${APP_PUBLIC_BASE_URL:-unset})"
    failed=1
  fi

  if ! allowlist_includes_origin "${AUTH_WEB_ORIGIN_ALLOWLIST:-}" "$app_origin"; then
    warn "AUTH_WEB_ORIGIN_ALLOWLIST must include the APP_PUBLIC_BASE_URL origin ($app_origin)"
    failed=1
  fi

  for redirect_var in GOOGLE_OAUTH_REDIRECT_URI MICROSOFT_OAUTH_REDIRECT_URI GOOGLE_REDIRECT_URI; do
    redirect_value="${!redirect_var:-}"
    if [ -z "$redirect_value" ]; then
      continue
    fi

    if [ "$(extract_origin "$redirect_value")" != "$api_origin" ]; then
      warn "$redirect_var must use the API_PUBLIC_BASE_URL origin ($api_origin)"
      failed=1
    fi
  done

  if [ "$failed" -ne 0 ]; then
    fail "Domain/runtime contract validation failed. Fix the public origins and OAuth URLs in $ENV_FILE"
  fi
}

wait_for_postgres() {
  local retries=30
  local delay_seconds=2
  local container_id=""
  local status=""

  for attempt in $(seq 1 "$retries"); do
    container_id=$(docker compose "${COMPOSE_ARGS[@]}" ps -q postgres)
    if [ -n "$container_id" ]; then
      status=$(docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "unknown")
      if [ "$status" = "healthy" ]; then
        return 0
      fi
    fi
    sleep "$delay_seconds"
  done

  return 1
}

# Wait until every container that declares a healthcheck reports `healthy`.
# Services without a healthcheck (e.g. traefik, uptime-kuma) are ignored.
wait_for_all_healthy() {
  local timeout_seconds="${1:-180}"
  local delay_seconds=5
  local deadline=$((SECONDS + timeout_seconds))
  local container_ids=""
  local id=""
  local name=""
  local status=""
  local unhealthy=""

  while [ $SECONDS -lt $deadline ]; do
    unhealthy=""
    container_ids=$(docker compose "${COMPOSE_ARGS[@]}" ps -q)
    for id in $container_ids; do
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id" 2>/dev/null || echo "unknown")
      case "$status" in
        healthy|none)
          continue
          ;;
        *)
          name=$(docker inspect --format '{{.Name}}' "$id" 2>/dev/null | sed 's#^/##')
          unhealthy+="  - ${name} (${status})\n"
          ;;
      esac
    done

    if [ -z "$unhealthy" ]; then
      return 0
    fi

    echo "Waiting for services to become healthy..."
    printf '%b' "$unhealthy"
    sleep "$delay_seconds"
  done

  echo "Still unhealthy after ${timeout_seconds}s:"
  printf '%b' "$unhealthy"
  return 1
}

check_local_https_health() {
  local host="$1"
  local label="$2"
  local max_retries=12
  local delay_seconds=5
  local health_url="https://${host}/health"

  for attempt in $(seq 1 "$max_retries"); do
    http_code=$(curl -sk --resolve "${host}:443:127.0.0.1" -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
      ok "${label} health: ${health_url} -> 200"
      return 0
    fi

    warn "${label} health attempt ${attempt}/${max_retries} failed: ${health_url} -> $http_code"
    sleep "$delay_seconds"
  done

  return 1
}

check_env_var() {
  local name="$1"
  local mode="$2"
  local value="${!name:-}"

  if is_placeholder "$value"; then
    if [ "$mode" = "required" ]; then
      warn "Missing or placeholder: $name"
      return 1
    fi
    warn "Optional value missing or placeholder: $name"
    return 0
  fi

  ok "$name is set"
  return 0
}

check_public_env_var() {
  local name="$1"
  local mode="$2"
  local value="${!name:-}"

  if ! check_env_var "$name" "$mode"; then
    return 1
  fi

  if [ -n "$value" ] && is_local_value "$value"; then
    warn "Production value must not point to localhost: $name=$value"
    return 1
  fi

  return 0
}

check_optional_oauth_config() {
  local label="$1"
  local client_id_var="$2"
  local client_secret_var="$3"
  local redirect_var="$4"
  local client_id="${!client_id_var:-}"
  local client_secret="${!client_secret_var:-}"
  local redirect_uri="${!redirect_var:-}"
  local configured_count=0
  local failed=0

  if ! is_placeholder "$client_id"; then
    configured_count=$((configured_count + 1))
  fi
  if ! is_placeholder "$client_secret"; then
    configured_count=$((configured_count + 1))
  fi
  if ! is_placeholder "$redirect_uri"; then
    configured_count=$((configured_count + 1))
  fi

  if [ "$configured_count" -eq 0 ]; then
    warn "$label OAuth not configured; that login option will stay disabled"
    return 0
  fi

  if ! check_env_var "$client_id_var" "required"; then
    failed=1
  fi
  if ! check_env_var "$client_secret_var" "required"; then
    failed=1
  fi
  if ! check_public_env_var "$redirect_var" "required"; then
    failed=1
  fi

  if [ "$failed" -ne 0 ]; then
    warn "$label OAuth is partially configured"
    return 1
  fi

  ok "$label OAuth configuration is complete"
  return 0
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --build-only)
        BUILD_ONLY=1
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        usage
        fail "Unknown argument: $1"
        ;;
    esac
    shift
  done
}

parse_args "$@"

step "Step 1/8 - Pulling latest code from origin/main"
cd "$REPO_ROOT"
git pull origin main
DEPLOY_SHA=$(git rev-parse --short HEAD)
ok "Code updated to ${DEPLOY_SHA}"

step "Step 2/8 - Validating production environment"

if [ ! -f "$ENV_FILE" ]; then
  fail ".env file not found at $ENV_FILE"
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

API_DOMAIN="${DOMAIN:-agentmou.io}"
APP_ORIGIN="${APP_PUBLIC_BASE_URL:-${CORS_ORIGIN:-https://app.agentmou.io}}"

required_env_vars=(
  DOMAIN
  LE_EMAIL
  BASIC_AUTH_USERS
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  TZ
  N8N_PROXY_HOPS
  N8N_ENCRYPTION_KEY
  AGENTS_API_KEY
  OPENAI_API_KEY
  JWT_SECRET
  N8N_API_KEY
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  CONNECTOR_ENCRYPTION_KEY
)

optional_env_vars=(
  N8N_API_URL
  LOG_PASSWORD_RESET_LINK
)

public_env_vars=(
  N8N_EDITOR_BASE_URL
  WEBHOOK_URL
  MARKETING_PUBLIC_BASE_URL
  APP_PUBLIC_BASE_URL
  API_PUBLIC_BASE_URL
  CORS_ORIGIN
  AUTH_WEB_ORIGIN_ALLOWLIST
  GOOGLE_REDIRECT_URI
)

missing_required=0
for var_name in "${required_env_vars[@]}"; do
  if ! check_env_var "$var_name" "required"; then
    missing_required=1
  fi
done

for var_name in "${public_env_vars[@]}"; do
  if ! check_public_env_var "$var_name" "required"; then
    missing_required=1
  fi
done

for var_name in "${optional_env_vars[@]}"; do
  check_env_var "$var_name" "optional"
done

if ! check_optional_oauth_config \
  "Google" \
  "GOOGLE_OAUTH_CLIENT_ID" \
  "GOOGLE_OAUTH_CLIENT_SECRET" \
  "GOOGLE_OAUTH_REDIRECT_URI"; then
  missing_required=1
fi

if ! check_optional_oauth_config \
  "Microsoft" \
  "MICROSOFT_OAUTH_CLIENT_ID" \
  "MICROSOFT_OAUTH_CLIENT_SECRET" \
  "MICROSOFT_OAUTH_REDIRECT_URI"; then
  missing_required=1
fi

validate_domain_runtime_contract

if [ "$missing_required" -ne 0 ]; then
  fail "Populate the missing required production env vars in $ENV_FILE and rerun the deploy"
fi

step "Step 3/8 - Snapshotting database (pre-deploy rollback point)"
if [ "${SKIP_PRE_DEPLOY_BACKUP:-0}" = "1" ]; then
  warn "SKIP_PRE_DEPLOY_BACKUP=1; skipping pre-deploy database snapshot"
else
  if ! docker compose "${COMPOSE_ARGS[@]}" ps postgres --status=running --quiet | grep -q .; then
    warn "Postgres is not running yet; skipping pre-deploy snapshot (first deploy?)"
  else
    PRE_DEPLOY_DIR="${PRE_DEPLOY_BACKUP_DIR:-/var/backups/agentmou/pre-deploy}"
    if mkdir -p "$PRE_DEPLOY_DIR" 2>/dev/null; then
      TS=$(date -u +%Y%m%dT%H%M%SZ)
      SNAPSHOT="${PRE_DEPLOY_DIR}/${TS}_${DEPLOY_SHA}.sql.gz"
      if docker compose "${COMPOSE_ARGS[@]}" exec -T postgres \
          pg_dumpall -U "${POSTGRES_USER}" 2>/dev/null | gzip > "$SNAPSHOT"; then
        size=$(du -h "$SNAPSHOT" 2>/dev/null | cut -f1 || echo "?")
        ok "Snapshot saved: ${SNAPSHOT} (${size})"
        # Rotate: keep only the last 10 pre-deploy snapshots
        ls -t "${PRE_DEPLOY_DIR}"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
      else
        rm -f "$SNAPSHOT"
        warn "Pre-deploy snapshot failed; continuing (rollback will fall back to routine backups)"
      fi
    else
      warn "Could not create ${PRE_DEPLOY_DIR}; skipping pre-deploy snapshot"
    fi
  fi
fi

step "Step 4/8 - Rebuilding API, worker, agents, and migrate images"
docker compose "${COMPOSE_ARGS[@]}" --profile ops build api worker agents migrate
ok "Images rebuilt"

if [ "$BUILD_ONLY" -eq 1 ]; then
  warn "--build-only requested; skipping migrations, restart, and smoke checks"
  exit 0
fi

step "Step 5/8 - Running database migrations"
docker compose "${COMPOSE_ARGS[@]}" up -d postgres
echo "Waiting for Postgres to become healthy..."
if ! wait_for_postgres; then
  docker compose "${COMPOSE_ARGS[@]}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  fail "Postgres did not become healthy"
fi

docker compose "${COMPOSE_ARGS[@]}" --profile ops run --rm migrate
ok "Migrations applied"

step "Step 6/8 - Restarting services"
docker compose "${COMPOSE_ARGS[@]}" up -d
ok "All services restarted"

step "Step 7/8 - Waiting for services to become healthy, verifying edge + smoke"
HEALTHY_TIMEOUT="${HEALTHY_TIMEOUT_SECONDS:-180}"
if ! wait_for_all_healthy "$HEALTHY_TIMEOUT"; then
  docker compose "${COMPOSE_ARGS[@]}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  echo
  docker compose "${COMPOSE_ARGS[@]}" logs --tail 120 api worker agents n8n || true
  fail "One or more services did not become healthy within ${HEALTHY_TIMEOUT}s"
fi
ok "All services healthy"

API_HOST="api.${API_DOMAIN}"

if ! check_local_https_health "$API_HOST" "API"; then
  docker compose "${COMPOSE_ARGS[@]}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  echo
  docker compose "${COMPOSE_ARGS[@]}" logs --tail 120 api || true
  echo
  docker compose "${COMPOSE_ARGS[@]}" logs --tail 120 traefik || true
  fail "Deploy failed because local edge/API health is unhealthy"
fi

echo
docker compose "${COMPOSE_ARGS[@]}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo
echo "Running public smoke test..."
DOMAIN="$API_DOMAIN" bash "$REPO_ROOT/infra/scripts/smoke-test.sh"
ok "Public smoke test passed"

step "Step 8/8 - Live E2E triage against the public API"
if [ "${SKIP_E2E_TRIAGE:-0}" = "1" ]; then
  warn "SKIP_E2E_TRIAGE=1; skipping live E2E triage"
else
  # Ensure pnpm is on PATH. pnpm is typically installed via the standalone
  # script and lives under ~/.local/share/pnpm, which isn't in non-interactive
  # login shells on the VPS.
  if [ -n "${PNPM_HOME:-}" ]; then
    :
  elif [ -d "$HOME/.local/share/pnpm" ]; then
    export PNPM_HOME="$HOME/.local/share/pnpm"
  fi
  if [ -n "${PNPM_HOME:-}" ]; then
    case ":$PATH:" in
      *:"$PNPM_HOME":*) ;;
      *) export PATH="$PNPM_HOME:$PATH" ;;
    esac
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    warn "pnpm not available on PATH; skipping live E2E triage"
  else
    # Resolve Postgres + Redis container IPs — the VPS may have native
    # services on 0.0.0.0:5432 / 0.0.0.0:6379 that shadow the compose host
    # port bindings, leaving host connections hanging (see
    # cleanup-validation-tenant.sh).
    POSTGRES_CONTAINER_ID=$(docker compose "${COMPOSE_ARGS[@]}" ps -q postgres)
    REDIS_CONTAINER_ID=$(docker compose "${COMPOSE_ARGS[@]}" ps -q redis)
    POSTGRES_IP=""
    REDIS_IP=""
    if [ -n "$POSTGRES_CONTAINER_ID" ]; then
      POSTGRES_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$POSTGRES_CONTAINER_ID" 2>/dev/null || true)
    fi
    if [ -n "$REDIS_CONTAINER_ID" ]; then
      REDIS_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$REDIS_CONTAINER_ID" 2>/dev/null || true)
    fi

    triage_args=()
    if [ "${SKIP_E2E_CLEANUP:-0}" = "1" ]; then
      warn "SKIP_E2E_CLEANUP=1; triage will skip internal-vertical steps and leave fixture in DB"
    else
      if [ -z "$POSTGRES_IP" ] || [ -z "$REDIS_IP" ]; then
        warn "Could not resolve Postgres/Redis container IPs; triage will run in light-smoke mode"
      else
        triage_args+=(--cleanup)
        export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_IP}:5432/${POSTGRES_DB}"
        export REDIS_URL="redis://${REDIS_IP}:6379"
      fi
    fi

    (
      cd "$REPO_ROOT"
      API_URL="https://${API_HOST}" pnpm tsx scripts/test-e2e-triage.ts "${triage_args[@]}"
    ) || fail "Live E2E triage failed — prod is serving traffic but the vertical slice is broken"
    ok "Live E2E triage passed"
  fi
fi

echo
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN} Production deploy completed successfully (${DEPLOY_SHA})${NC}"
echo -e "${GREEN}===============================================${NC}"
echo
echo "Suggested next checks:"
echo "  1. Review docker compose ps output above"
echo "  2. Verify OAuth flow from ${APP_ORIGIN}"
echo "  3. Check https://uptime.${API_DOMAIN} for green monitors"
