#!/bin/bash
set -e

# ---------------------------------------------------------------------------
# AgentMou Stack — Manual Deploy
# ---------------------------------------------------------------------------
# Pull latest code from main, rebuild changed images, and restart services.
#
# Usage:
#   bash infra/scripts/deploy.sh
#   bash infra/scripts/deploy.sh --build-only   # build without restarting
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/compose/docker-compose.prod.yml"

echo "=== AgentMou Stack — Deploy ==="

# --- Pull latest code -------------------------------------------------------
echo "Pulling latest from origin/main..."
cd "$REPO_ROOT"
git pull origin main

# --- Build ------------------------------------------------------------------
echo "Building images..."
docker compose -f "$COMPOSE_FILE" build

if [ "$1" = "--build-only" ]; then
  echo "Build complete (--build-only). Skipping restart."
  exit 0
fi

# --- Restart ----------------------------------------------------------------
echo "Restarting services..."
docker compose -f "$COMPOSE_FILE" up -d

# --- Verify -----------------------------------------------------------------
echo ""
echo "Deploy complete. Current status:"
docker compose -f "$COMPOSE_FILE" ps
