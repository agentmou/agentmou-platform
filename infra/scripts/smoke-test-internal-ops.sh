#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Internal Ops + OpenClaw Local Smoke Test
# ---------------------------------------------------------------------------
# Verifies the local bring-up loop before touching VPS infrastructure:
#   1. openclaw-runtime health
#   2. internal-ops health
#   3. one synthetic Telegram-style webhook payload into internal-ops
#
# Usage:
#   bash infra/scripts/smoke-test-internal-ops.sh
#   INTERNAL_OPS_URL=http://localhost:3002 \
#   OPENCLAW_URL=http://localhost:3003 \
#   bash infra/scripts/smoke-test-internal-ops.sh
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

if [ -f "$DEFAULT_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$DEFAULT_ENV_FILE" && set +a
fi

INTERNAL_OPS_URL="${INTERNAL_OPS_URL:-http://localhost:3002}"
OPENCLAW_URL="${OPENCLAW_URL:-http://localhost:3003}"
TELEGRAM_SECRET="${INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET:-}"
TEST_MESSAGE_TEXT="${INTERNAL_OPS_TEST_MESSAGE_TEXT:-Smoke test: confirm the internal ops loop is alive.}"

first_csv_value() {
  local input="${1:-}"
  printf '%s' "$input" | tr ',' '\n' | sed -E 's/^[[:space:]]+|[[:space:]]+$//g' | sed -n '1p'
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

check_health() {
  local label="$1"
  local url="$2"
  local response

  response="$(curl -fsS "$url/health")" || fail "$label health check failed at $url/health"
  printf '%s' "$response" | grep -F '"status":"ok"' >/dev/null 2>&1 \
    || fail "$label health response did not contain status ok"
  ok "$label health check passed"
}

TEST_CHAT_ID="${INTERNAL_OPS_TEST_CHAT_ID:-$(first_csv_value "${INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS:-}")}"
TEST_USER_ID="${INTERNAL_OPS_TEST_USER_ID:-$(first_csv_value "${INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS:-}")}"

if [ -z "$TEST_CHAT_ID" ]; then
  TEST_CHAT_ID="10001"
fi

if [ -z "$TEST_USER_ID" ]; then
  TEST_USER_ID="10001"
fi

if [ -z "$TELEGRAM_SECRET" ]; then
  fail "INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET must be set for the smoke test"
fi

UPDATE_ID="$(date +%s)"
MESSAGE_ID="$((UPDATE_ID % 1000000))"
MESSAGE_TEXT_ESCAPED="$(json_escape "$TEST_MESSAGE_TEXT")"
REQUEST_BODY="$(cat <<EOF
{
  "update_id": $UPDATE_ID,
  "message": {
    "message_id": $MESSAGE_ID,
    "date": $UPDATE_ID,
    "from": {
      "id": $TEST_USER_ID,
      "is_bot": false,
      "first_name": "Smoke",
      "username": "smoke_test"
    },
    "chat": {
      "id": $TEST_CHAT_ID,
      "type": "private"
    },
    "text": "$MESSAGE_TEXT_ESCAPED"
  }
}
EOF
)"

step "Checking OpenClaw runtime"
check_health "OpenClaw runtime" "$OPENCLAW_URL"

step "Checking internal-ops"
check_health "Internal ops" "$INTERNAL_OPS_URL"

step "Posting a synthetic Telegram update"
BODY_FILE="$(mktemp)"
HTTP_CODE="$(curl -sS -o "$BODY_FILE" -w "%{http_code}" \
  -X POST "$INTERNAL_OPS_URL/telegram/webhook" \
  -H "content-type: application/json" \
  -H "x-telegram-bot-api-secret-token: $TELEGRAM_SECRET" \
  --data "$REQUEST_BODY")"

RESPONSE_BODY="$(cat "$BODY_FILE")"
rm -f "$BODY_FILE"

if [ "$HTTP_CODE" != "200" ]; then
  printf '%s\n' "$RESPONSE_BODY"
  fail "Synthetic Telegram update failed with HTTP $HTTP_CODE"
fi

printf '%s' "$RESPONSE_BODY" | grep -E '"ok"[[:space:]]*:[[:space:]]*true' >/dev/null 2>&1 \
  || fail "internal-ops did not return ok: true"

ok "Synthetic Telegram update accepted"

echo
echo "Response:"
printf '%s\n' "$RESPONSE_BODY"

echo
ok "Local bring-up smoke test completed successfully"
echo "Next step: deploy openclaw-runtime to the dedicated VPS if this loop looks healthy."
