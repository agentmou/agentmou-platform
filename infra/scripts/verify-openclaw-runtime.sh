#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Verify the remote OpenClaw runtime deployment
# ---------------------------------------------------------------------------
# Usage:
#   bash infra/scripts/verify-openclaw-runtime.sh
#   OPENCLAW_URL=https://openclaw.agentmou.io \
#     bash infra/scripts/verify-openclaw-runtime.sh
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEFAULT_ENV_FILE="$REPO_ROOT/infra/compose/.env.openclaw"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

step() { echo -e "\n${GREEN}==> $1${NC}"; }
warn() { echo -e "${YELLOW}WARN: $1${NC}"; }

if [ -f "$DEFAULT_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$DEFAULT_ENV_FILE" && set +a
fi

DOMAIN="${DOMAIN:-agentmou.io}"
OPENCLAW_URL="${OPENCLAW_URL:-https://openclaw.${DOMAIN}}"
OPENCLAW_API_KEY="${OPENCLAW_API_KEY:-}"

require_value() {
  local name="$1"
  local value="${!name:-}"

  case "$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')" in
    ""|*changeme*|*replace-me*|*example-value*|*your-*)
      echo -e "${RED}  ✗${NC} Missing or placeholder value: $name"
      exit 1
      ;;
  esac
}

check_http_json() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local payload="${4:-}"
  local auth_header="${5:-}"
  local body_file
  local http_code
  local curl_args

  body_file="$(mktemp)"
  curl_args=(-sS -o "$body_file" -w "%{http_code}" --max-time 15)

  if [ -n "$auth_header" ]; then
    curl_args+=(-H "$auth_header")
  fi

  if [ -n "$payload" ]; then
    curl_args+=(-X POST -H "content-type: application/json" --data "$payload")
  fi

  http_code="$(curl "${curl_args[@]}" "$url" 2>/dev/null || echo "000")"

  if [ "$http_code" = "$expected" ]; then
    echo -e "${GREEN}  ✓${NC} $name -> HTTP $http_code"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}  ✗${NC} $name -> HTTP $http_code (expected $expected)"
    cat "$body_file" || true
    FAIL=$((FAIL + 1))
  fi

  rm -f "$body_file"
}

require_value "OPENCLAW_API_KEY"

step "Verifying OpenClaw runtime"
check_http_json "OpenClaw health" "$OPENCLAW_URL/health" "200"
check_http_json \
  "OpenClaw authenticated register" \
  "$OPENCLAW_URL/v1/internal-ops/agent-profiles/register" \
  "200" \
  '{"tenantId":"00000000-0000-0000-0000-000000000000","profiles":[]}' \
  "authorization: Bearer ${OPENCLAW_API_KEY}"

echo
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
