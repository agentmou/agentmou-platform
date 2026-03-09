#!/bin/bash
set -e

# ---------------------------------------------------------------------------
# AgentMou Stack — Initial Setup
# ---------------------------------------------------------------------------
# Run once after cloning the repo on a fresh VPS.
#
# Usage:
#   bash infra/scripts/setup.sh
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== AgentMou Stack — Setup ==="

# --- Check prerequisites ---------------------------------------------------
if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker is not installed. Install Docker first."
  exit 1
fi

if ! docker compose version &>/dev/null; then
  echo "ERROR: Docker Compose v2 is not installed."
  exit 1
fi

# --- Create .env from template ----------------------------------------------
if [ ! -f "$REPO_ROOT/infra/compose/.env" ]; then
  echo "Creating .env from .env.example..."
  cp "$REPO_ROOT/infra/compose/.env.example" "$REPO_ROOT/infra/compose/.env"
  echo "  >>> Edit infra/compose/.env with your real values before starting."
else
  echo ".env already exists — skipping."
fi

# --- Create Docker networks -------------------------------------------------
echo "Ensuring Docker networks exist..."
docker network inspect web    >/dev/null 2>&1 || docker network create web
docker network inspect internal >/dev/null 2>&1 || docker network create --internal internal
echo "  Networks: web (external), internal (isolated)"

# --- Create data directories ------------------------------------------------
echo "Creating data directories..."
mkdir -p "$REPO_ROOT/postgres/data"
mkdir -p "$REPO_ROOT/redis/data"
mkdir -p "$REPO_ROOT/n8n/data"
mkdir -p "$REPO_ROOT/traefik/letsencrypt"
mkdir -p "$REPO_ROOT/uptime-kuma/data"
mkdir -p "$REPO_ROOT/backups/out"

# --- Done -------------------------------------------------------------------
echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. Edit infra/compose/.env with your real secrets"
echo "  2. Start the stack:"
echo "     docker compose -f infra/compose/docker-compose.prod.yml up -d"
echo "  3. Verify:"
echo "     docker compose -f infra/compose/docker-compose.prod.yml ps"
