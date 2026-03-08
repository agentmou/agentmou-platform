#!/bin/bash
set -e

echo "Setting up AgentMou Platform..."

# Check if .env exists
if [ ! -f infra/compose/.env ]; then
    echo "Creating .env from .env.example..."
    cp infra/compose/.env.example infra/compose/.env
    echo "⚠️  Please update infra/compose/.env with your configuration"
fi

# Create Traefik network if it doesn't exist
echo "Creating Traefik network..."
docker network inspect agentmou-network >/dev/null 2>&1 || \
    docker network create agentmou-network

# Create Traefik acme directory
mkdir -p infra/traefik/acme
chmod 600 infra/traefik/acme

# Check for Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update infra/compose/.env with your configuration"
echo "2. Run: pnpm install"
echo "3. Run: pnpm db:generate && pnpm db:migrate"
echo "4. Run: docker compose -f infra/compose/docker-compose.local.yml up -d"
