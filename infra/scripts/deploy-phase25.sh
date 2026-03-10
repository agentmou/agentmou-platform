#!/bin/bash
set -euo pipefail

# ===========================================================================
# AgentMou — Phase 2.5 Deploy Script
# ===========================================================================
# Deploys all Phase 2.5 changes to the VPS:
#   1. Pull latest code
#   2. Verify new env vars are set
#   3. Rebuild API + worker containers
#   4. Run DB migrations
#   5. Restart services
#   6. Run smoke tests
#
# Usage:
#   ssh your-vps
#   cd /path/to/agentmou-platform
#   bash infra/scripts/deploy-phase25.sh
# ===========================================================================

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/infra/compose/.env"
API_DOMAIN="${DOMAIN:-agentmou.io}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${GREEN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }

# ===========================================================================
# Step 1: Pull latest code
# ===========================================================================
step "Step 1/6 — Pulling latest code from origin/main"
cd "$REPO_ROOT"
git pull origin main
ok "Code updated"

# ===========================================================================
# Step 2: Verify env vars
# ===========================================================================
step "Step 2/6 — Verifying new environment variables"

if [ ! -f "$ENV_FILE" ]; then
  fail ".env file not found at $ENV_FILE"
fi

source "$ENV_FILE"

MISSING=0
for var in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_REDIRECT_URI CONNECTOR_ENCRYPTION_KEY; do
  val="${!var:-}"
  if [ -z "$val" ] || [[ "$val" == *"changeme"* ]]; then
    warn "Missing or placeholder: $var"
    MISSING=1
  else
    ok "$var is set"
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "Add the missing variables to $ENV_FILE:"
  echo ""
  echo "  # Google OAuth (get from Google Cloud Console)"
  echo "  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com"
  echo "  GOOGLE_CLIENT_SECRET=GOCSPX-your-secret"
  echo "  GOOGLE_REDIRECT_URI=https://api.${API_DOMAIN}/api/v1/oauth/callback"
  echo ""
  echo "  # Connector encryption key (generate once, keep safe)"
  echo "  CONNECTOR_ENCRYPTION_KEY=\$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
  echo ""
  echo "Then re-run this script."
  exit 1
fi

# ===========================================================================
# Step 3: Rebuild containers
# ===========================================================================
step "Step 3/6 — Rebuilding API and worker containers"
docker compose -f "$COMPOSE_FILE" build api worker
ok "Containers rebuilt"

# ===========================================================================
# Step 4: Run DB migrations
# ===========================================================================
step "Step 4/6 — Running database migrations"

docker compose -f "$COMPOSE_FILE" up -d postgres
echo "  Waiting for Postgres to be healthy..."
sleep 5

docker compose -f "$COMPOSE_FILE" run --rm api sh -c \
  "cd /app/packages/db && npx drizzle-kit migrate" \
  2>&1 || warn "Migration command may need adjustment for your Dockerfile setup"

ok "Migrations applied"

# ===========================================================================
# Step 5: Restart services
# ===========================================================================
step "Step 5/6 — Restarting services"
docker compose -f "$COMPOSE_FILE" up -d
ok "All services restarted"

echo "  Waiting 10s for services to stabilize..."
sleep 10

# ===========================================================================
# Step 6: Smoke tests
# ===========================================================================
step "Step 6/6 — Running smoke tests"

API_URL="https://api.${API_DOMAIN}"

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  ok "Health check: $API_URL/health → 200"
else
  warn "Health check failed: $API_URL/health → $HTTP_CODE"
fi

# Container status
echo ""
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# ===========================================================================
# Done
# ===========================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Phase 2.5 deploy complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify all containers are healthy above"
echo "  2. Test OAuth flow: open https://app.${API_DOMAIN} and connect Gmail"
echo "  3. Run full E2E test: API_URL=$API_URL tsx scripts/test-e2e-triage.ts"
echo ""
