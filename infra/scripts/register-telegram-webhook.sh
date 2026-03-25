#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Register the Internal Ops Telegram Webhook
# ---------------------------------------------------------------------------
# Uses the main production env file by default and registers Telegram against
# the tracked internal-ops webhook route.
#
# Usage:
#   bash infra/scripts/register-telegram-webhook.sh
#   DOMAIN=agentmou.io bash infra/scripts/register-telegram-webhook.sh
#   INTERNAL_OPS_WEBHOOK_URL=https://ops.example.com/telegram/webhook \
#   bash infra/scripts/register-telegram-webhook.sh
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEFAULT_ENV_FILE="$REPO_ROOT/infra/compose/.env"

GREEN='\033[0;32m'
RED='\033[0;31m'
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

if [ -f "$DEFAULT_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$DEFAULT_ENV_FILE" && set +a
else
  warn "No env file found at $DEFAULT_ENV_FILE; using the current shell environment only."
fi

DOMAIN="${DOMAIN:-agentmou.io}"
BOT_TOKEN="${INTERNAL_OPS_TELEGRAM_BOT_TOKEN:-}"
WEBHOOK_SECRET="${INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET:-}"
WEBHOOK_URL="${INTERNAL_OPS_WEBHOOK_URL:-https://ops.${DOMAIN}/telegram/webhook}"

if is_placeholder "$BOT_TOKEN"; then
  fail "INTERNAL_OPS_TELEGRAM_BOT_TOKEN must be set to a real Telegram bot token"
fi

if is_placeholder "$WEBHOOK_SECRET"; then
  fail "INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET must be set to a real secret token"
fi

step "Registering Telegram webhook"
SET_WEBHOOK_RESPONSE="$(curl -fsS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "content-type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"secret_token\":\"${WEBHOOK_SECRET}\"}")" \
  || fail "Telegram setWebhook request failed"

printf '%s' "$SET_WEBHOOK_RESPONSE" | grep -E '"ok"[[:space:]]*:[[:space:]]*true' >/dev/null 2>&1 \
  || fail "Telegram did not confirm webhook registration"

ok "Webhook registration request accepted"

step "Fetching webhook info"
WEBHOOK_INFO="$(curl -fsS "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")" \
  || fail "Telegram getWebhookInfo request failed"

printf '%s' "$WEBHOOK_INFO" | grep -F "\"url\":\"${WEBHOOK_URL}\"" >/dev/null 2>&1 \
  || warn "Webhook info does not yet show the expected URL; inspect the response below"

echo
echo "setWebhook response:"
printf '%s\n' "$SET_WEBHOOK_RESPONSE"

echo
echo "getWebhookInfo response:"
printf '%s\n' "$WEBHOOK_INFO"

echo
ok "Telegram webhook registration flow completed"
