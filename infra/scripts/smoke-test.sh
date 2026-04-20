#!/bin/bash
set -uo pipefail

# ===========================================================================
# Agentmou — Smoke Test
# ===========================================================================
# Quick verification that the public API is responding and serving the minimum
# expected production inventory.
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
  local method="${4:-GET}"
  local payload="${5:-}"
  local contains="${6:-}"
  local host
  local body_file
  local body_excerpt
  local err_file
  local err_msg
  local http_code
  local curl_exit=0
  local -a curl_args

  host="$(extract_host "$url")"
  if ! getent hosts "$host" >/dev/null 2>&1; then
    echo -e "${RED}  ✗${NC} $name → DNS failed for $host"
    FAIL=$((FAIL + 1))
    return
  fi

  body_file="$(mktemp)"
  err_file="$(mktemp)"
  curl_args=(-sS -o "$body_file" -w "%{http_code}" --max-time 10 -X "$method")
  if [ -n "$payload" ]; then
    curl_args+=(-H "Content-Type: application/json" --data "$payload")
  fi
  http_code=$(curl "${curl_args[@]}" "$url" 2>"$err_file") || curl_exit=$?
  err_msg="$(tr '\n' ' ' < "$err_file" | sed -E 's/[[:space:]]+/ /g')"
  body_excerpt="$(tr '\n' ' ' < "$body_file" | sed -E 's/[[:space:]]+/ /g' | cut -c1-200)"
  rm -f "$body_file"
  rm -f "$err_file"

  if [ "$curl_exit" -eq 0 ] && [ "$http_code" = "$expected" ]; then
    if [ -n "$contains" ] && ! printf '%s' "$body_excerpt" | grep -F "$contains" >/dev/null 2>&1; then
      echo -e "${RED}  ✗${NC} $name [$method $url] → HTTP $http_code but body missing expected marker: $contains (${body_excerpt:-empty body})"
      FAIL=$((FAIL + 1))
      return
    fi

    echo -e "${GREEN}  ✓${NC} $name → $method HTTP $http_code"
    PASS=$((PASS + 1))
    return
  fi

  if [ "$curl_exit" -eq 60 ] || [ "$curl_exit" -eq 35 ]; then
    echo -e "${RED}  ✗${NC} $name [$method $url] → TLS failed (${err_msg:-certificate/handshake error})"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$curl_exit" -ne 0 ]; then
    echo -e "${RED}  ✗${NC} $name [$method $url] → Connection failed (${err_msg:-curl exit $curl_exit})"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ "$http_code" = "000" ]; then
    echo -e "${RED}  ✗${NC} $name [$method $url] → No HTTP response (network/edge issue)"
  else
    echo -e "${RED}  ✗${NC} $name [$method $url] → HTTP $http_code (expected $expected)"
  fi

  FAIL=$((FAIL + 1))
}

echo "═══════════════════════════════════════════"
echo " Smoke Test — $API_DOMAIN"
echo "═══════════════════════════════════════════"
echo ""

check "API Health"        "$API_URL/health"
check "API Catalog"       "$API_URL/api/v1/catalog/agents" "200" "GET" "" "\"id\":\"inbox-triage\""
check "API Auth Login (invalid payload)" "$API_URL/api/v1/auth/login" "400" "POST" "{}"

# The following checks don't assert functional behaviour — they only confirm
# that Traefik is routing to the upstream and that the upstream is answering.
# Expected non-200 codes encode "service is alive and responded":
#   hooks.${DOMAIN}/…/ping → 404  (no such n8n workflow, but n8n answered)
#   agents.${DOMAIN}/docs  → 401  (BasicAuth in front of a live FastAPI)
check "n8n webhook edge"  "https://hooks.${API_DOMAIN}/webhook-test/ping" "404"
check "Agents edge"       "https://agents.${API_DOMAIN}/docs" "401"

echo ""
echo "═══════════════════════════════════════════"
echo " Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════"

exit $FAIL
