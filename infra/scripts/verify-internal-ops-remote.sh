#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Verify the remote internal-ops deployment and Telegram webhook wiring
# ---------------------------------------------------------------------------
# Usage:
#   bash infra/scripts/verify-internal-ops-remote.sh
#   DOMAIN=agentmou.io bash infra/scripts/verify-internal-ops-remote.sh
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEFAULT_ENV_FILE="$REPO_ROOT/infra/compose/.env"

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
OPS_URL="${INTERNAL_OPS_URL:-https://ops.${DOMAIN}}"
EXPECTED_WEBHOOK_URL="${INTERNAL_OPS_WEBHOOK_URL:-https://ops.${DOMAIN}/telegram/webhook}"
BOT_TOKEN="${INTERNAL_OPS_TELEGRAM_BOT_TOKEN:-}"

check_http() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local http_code

  http_code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")"
  if [ "$http_code" = "$expected" ]; then
    echo -e "${GREEN}  ✓${NC} $name -> HTTP $http_code"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}  ✗${NC} $name -> HTTP $http_code (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

step "Verifying internal-ops health"
check_http "Internal ops health" "$OPS_URL/health" "200"

step "Verifying Telegram webhook wiring"
case "$(printf '%s' "$BOT_TOKEN" | tr '[:upper:]' '[:lower:]')" in
  ""|*changeme*|*replace-me*|*example-value*|*your-*)
    warn "Skipping Telegram webhook check because INTERNAL_OPS_TELEGRAM_BOT_TOKEN is missing or placeholder"
    ;;
  *)
    WEBHOOK_INFO="$(curl -fsS "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" 2>/dev/null || true)"
    if printf '%s' "$WEBHOOK_INFO" | grep -E '"ok"[[:space:]]*:[[:space:]]*true' >/dev/null 2>&1; then
      if printf '%s' "$WEBHOOK_INFO" | grep -F "\"url\":\"${EXPECTED_WEBHOOK_URL}\"" >/dev/null 2>&1; then
        echo -e "${GREEN}  ✓${NC} Telegram webhook URL matches ${EXPECTED_WEBHOOK_URL}"
        PASS=$((PASS + 1))
      else
        echo -e "${RED}  ✗${NC} Telegram webhook URL does not match ${EXPECTED_WEBHOOK_URL}"
        printf '%s\n' "$WEBHOOK_INFO"
        FAIL=$((FAIL + 1))
      fi
    else
      echo -e "${RED}  ✗${NC} Telegram getWebhookInfo failed"
      printf '%s\n' "$WEBHOOK_INFO"
      FAIL=$((FAIL + 1))
    fi
    ;;
esac

echo
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
