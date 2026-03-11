#!/bin/bash
set -uo pipefail

# ===========================================================================
# AgentMou — Smoke Test
# ===========================================================================
# Quick verification that all services are responding.
#
# Usage:
#   bash infra/scripts/smoke-test.sh
#   DOMAIN=agentmou.io bash infra/scripts/smoke-test.sh
# ===========================================================================

API_DOMAIN="${DOMAIN:-agentmou.io}"
API_URL="https://api.${API_DOMAIN}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0

extract_host() {
  printf '%s' "$1" | sed -E 's#^[a-z]+://([^/]+).*$#\1#'
}

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local host
  local err_file
  local err_msg
  local http_code
  local curl_exit=0

  host="$(extract_host "$url")"
  if ! getent hosts "$host" >/dev/null 2>&1; then
    echo -e "${RED}  ✗${NC} $name → DNS failed for $host"
    FAIL=$((FAIL + 1))
    return
  fi

  err_file="$(mktemp)"
  http_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>"$err_file") || curl_exit=$?
  err_msg="$(tr '\n' ' ' < "$err_file" | sed -E 's/[[:space:]]+/ /g')"
  rm -f "$err_file"

  if [ "$curl_exit" -eq 0 ] && [ "$http_code" = "$expected" ]; then
    echo -e "${GREEN}  ✓${NC} $name → HTTP $http_code"
    PASS=$((PASS + 1))
    return
  fi

  if [ "$curl_exit" -eq 60 ] || [ "$curl_exit" -eq 35 ]; then
    echo -e "${RED}  ✗${NC} $name → TLS failed (${err_msg:-certificate/handshake error})"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$curl_exit" -ne 0 ]; then
    echo -e "${RED}  ✗${NC} $name → Connection failed (${err_msg:-curl exit $curl_exit})"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$http_code" = "000" ]; then
    echo -e "${RED}  ✗${NC} $name → No HTTP response (network/edge issue)"
  else
    echo -e "${RED}  ✗${NC} $name → HTTP $http_code (expected $expected)"
  fi

  FAIL=$((FAIL + 1))
}

echo "═══════════════════════════════════════════"
echo " Smoke Test — $API_DOMAIN"
echo "═══════════════════════════════════════════"
echo ""

check "API Health"        "$API_URL/health"
check "API Catalog"       "$API_URL/api/v1/catalog/agents"
check "API Auth (no body)" "$API_URL/api/v1/auth/login" "400"

echo ""
echo "═══════════════════════════════════════════"
echo " Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════"

exit $FAIL
