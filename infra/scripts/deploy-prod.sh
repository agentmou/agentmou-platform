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
#   3. Rebuild api, worker, internal-ops, and migrate images
#   4. Wait for PostgreSQL health and run migrations
#   5. Restart the stack
#   6. Gate success on local edge health and the public smoke test
#
# Usage:
#   bash infra/scripts/deploy-prod.sh
#   bash infra/scripts/deploy-prod.sh --build-only
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/compose/.env"

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

wait_for_postgres() {
  local retries=30
  local delay_seconds=2
  local container_id=""
  local status=""

  for attempt in $(seq 1 "$retries"); do
    container_id=$(docker compose -f "$COMPOSE_FILE" ps -q postgres)
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

step "Step 1/6 - Pulling latest code from origin/main"
cd "$REPO_ROOT"
git pull origin main
ok "Code updated"

step "Step 2/6 - Validating production environment"

if [ ! -f "$ENV_FILE" ]; then
  fail ".env file not found at $ENV_FILE"
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

API_DOMAIN="${DOMAIN:-agentmou.io}"
WEB_ORIGIN="${CORS_ORIGIN:-https://agentmou.io}"

required_env_vars=(
  DOMAIN
  LE_EMAIL
  BASIC_AUTH_USERS
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  TZ
  N8N_EDITOR_BASE_URL
  WEBHOOK_URL
  N8N_PROXY_HOPS
  N8N_ENCRYPTION_KEY
  AGENTS_API_KEY
  OPENAI_API_KEY
  JWT_SECRET
  N8N_API_KEY
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URI
  CONNECTOR_ENCRYPTION_KEY
  INTERNAL_OPS_TENANT_ID
  INTERNAL_OPS_TELEGRAM_BOT_TOKEN
  INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET
  INTERNAL_OPS_CALLBACK_SECRET
  OPENCLAW_API_URL
  OPENCLAW_API_KEY
)

optional_env_vars=(
  CORS_ORIGIN
  N8N_API_URL
  INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS
  INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS
  OPENCLAW_TIMEOUT_MS
)

missing_required=0
for var_name in "${required_env_vars[@]}"; do
  if ! check_env_var "$var_name" "required"; then
    missing_required=1
  fi
done

for var_name in "${optional_env_vars[@]}"; do
  check_env_var "$var_name" "optional"
done

if [ "$missing_required" -ne 0 ]; then
  fail "Populate the missing required production env vars in $ENV_FILE and rerun the deploy"
fi

step "Step 3/6 - Rebuilding API, worker, internal-ops, and migrate images"
docker compose --profile ops -f "$COMPOSE_FILE" build api worker internal-ops migrate
ok "Images rebuilt"

if [ "$BUILD_ONLY" -eq 1 ]; then
  warn "--build-only requested; skipping migrations, restart, and smoke checks"
  exit 0
fi

step "Step 4/6 - Running database migrations"
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "Waiting for Postgres to become healthy..."
if ! wait_for_postgres; then
  docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  fail "Postgres did not become healthy"
fi

docker compose --profile ops -f "$COMPOSE_FILE" run --rm migrate
ok "Migrations applied"

step "Step 5/6 - Restarting services"
docker compose -f "$COMPOSE_FILE" up -d
ok "All services restarted"

echo "Waiting 10 seconds for services to stabilize..."
sleep 10

step "Step 6/6 - Verifying local edge health and public smoke"

API_HOST="api.${API_DOMAIN}"
OPS_HOST="ops.${API_DOMAIN}"

if ! check_local_https_health "$API_HOST" "API"; then
  docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  echo
  docker compose -f "$COMPOSE_FILE" logs --tail 120 api || true
  echo
  docker compose -f "$COMPOSE_FILE" logs --tail 120 traefik || true
  fail "Deploy failed because local edge/API health is unhealthy"
fi

if ! check_local_https_health "$OPS_HOST" "Internal Ops"; then
  docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  echo
  docker compose -f "$COMPOSE_FILE" logs --tail 120 internal-ops || true
  echo
  docker compose -f "$COMPOSE_FILE" logs --tail 120 traefik || true
  fail "Deploy failed because internal-ops health is unhealthy"
fi

echo
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo
echo "Running public smoke test..."
DOMAIN="$API_DOMAIN" bash "$REPO_ROOT/infra/scripts/smoke-test.sh"
ok "Public smoke test passed"

echo
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN} Production deploy completed successfully${NC}"
echo -e "${GREEN}===============================================${NC}"
echo
echo "Suggested next checks:"
echo "  1. Review docker compose ps output above"
echo "  2. Verify OAuth flow from ${WEB_ORIGIN}"
echo "  3. Run API_URL=https://${API_HOST} tsx scripts/test-e2e-triage.ts for a full E2E pass"
