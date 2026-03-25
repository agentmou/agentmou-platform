#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.openclaw.yml"
ENV_FILE="$REPO_ROOT/infra/compose/.env.openclaw"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

check_env_var() {
  local name="$1"
  local value="${!name:-}"

  if is_placeholder "$value"; then
    warn "Missing or placeholder: $name"
    return 1
  fi

  ok "$name is set"
  return 0
}

step "Step 1/5 - Pulling latest code from origin/main"
cd "$REPO_ROOT"
git pull origin main
ok "Code updated"

step "Step 2/5 - Validating OpenClaw environment"

if [ ! -f "$ENV_FILE" ]; then
  fail ".env.openclaw file not found at $ENV_FILE"
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

required_env_vars=(
  DOMAIN
  LE_EMAIL
  OPENCLAW_API_KEY
  OPENAI_API_KEY
)

missing_required=0
for var_name in "${required_env_vars[@]}"; do
  if ! check_env_var "$var_name"; then
    missing_required=1
  fi
done

if [ "$missing_required" -ne 0 ]; then
  fail "Populate the missing required env vars in $ENV_FILE and rerun the deploy"
fi

mkdir -p "$REPO_ROOT/openclaw/state" "$REPO_ROOT/traefik/openclaw-letsencrypt"
touch "$REPO_ROOT/traefik/openclaw-letsencrypt/acme.json"
chmod 600 "$REPO_ROOT/traefik/openclaw-letsencrypt/acme.json"

step "Step 3/5 - Building OpenClaw runtime image"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build openclaw-runtime
ok "Image rebuilt"

step "Step 4/5 - Restarting OpenClaw stack"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
ok "OpenClaw stack restarted"

echo "Waiting 10 seconds for services to stabilize..."
sleep 10

step "Step 5/5 - Verifying local OpenClaw health"
OPENCLAW_HOST="openclaw.${DOMAIN}"
HEALTH_URL="https://${OPENCLAW_HOST}/health"
HTTP_CODE=$(curl -sk --resolve "${OPENCLAW_HOST}:443:127.0.0.1" -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "200" ]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  echo
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail 120 openclaw-runtime || true
  echo
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail 120 traefik || true
  fail "Deploy failed because OpenClaw health is unhealthy"
fi

ok "OpenClaw runtime health check passed"
