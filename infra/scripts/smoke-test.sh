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

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "$expected" ]; then
    echo -e "${GREEN}  ✓${NC} $name → $HTTP_CODE"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}  ✗${NC} $name → $HTTP_CODE (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
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
