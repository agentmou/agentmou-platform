# Local Development Setup

This runbook covers setting up your local development environment, starting services, common workflows, and troubleshooting.

## Prerequisites

Ensure you have the following installed:

- **Node.js**: v20.x or later (verify with `node --version`)
- **pnpm**: v9.15.0 or later (verify with `pnpm --version`; install with `npm install -g pnpm@9.15.0`)
- **Docker**: Latest stable version (verify with `docker --version`)
- **Docker Compose**: Part of Docker Desktop on Mac and Windows; standalone on Linux
- **Git**: Latest stable version
- **Python 3**: v3.9 or later (for `services/agents` type-checking)

### macOS / Linux

```bash
# Verify Node.js (install from https://nodejs.org if needed)
node --version

# Install pnpm globally
npm install -g pnpm@9.15.0

# Verify Docker is running
docker ps
```

### Windows

Install Docker Desktop, which includes Docker Compose. Ensure WSL 2 is enabled for best performance.

---

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/agentmou/agentmou-platform.git
cd agentmou-platform
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This installs Node.js dependencies for all workspaces in a single `node_modules` directory at the root.

### 3. Copy Environment Variables

```bash
# Copy the example environment file
cp infra/compose/.env.example infra/compose/.env

# Edit .env to set values (for local dev, defaults are fine except where marked)
# In your editor, update these placeholders:
# - DOMAIN: can stay as "agentmou.io" (local DNS will be overridden)
# - BASIC_AUTH_USERS: keep the default (or generate with: htpasswd -nB admin)
# - All secrets: keep defaults for local dev
```

### 4. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, n8n, and Traefik in the background
docker compose -f infra/compose/docker-compose.local.yml up -d

# Wait for services to be healthy (usually 10-15 seconds)
docker compose -f infra/compose/docker-compose.local.yml ps
```

Verify all services are showing `healthy` or `Up`.

### 5. Initialize the Database

```bash
# Generate Drizzle migration files
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Seed the database with example data
pnpm db:seed

# Or run the full clinic validation lane (migrate + seed + tests + smoke)
pnpm validate:clinic-demo
```

### 6. Start Development Services

In a new terminal, start all Node.js and Python services:

```bash
# Start all services in watch mode (auto-reload on file changes)
pnpm dev
```

You should see output indicating services are starting:
```
▲ apps/web ready - started server on 0.0.0.0:3000
▲ services/api ready - started server on 0.0.0.0:3001
▲ services/worker ready - consuming jobs
▲ services/agents ready - started server on 0.0.0.0:3002
```

### 7. Access the Application

Open your browser to the local endpoints:

| Service | URL |
| --------- | ----- |
| Web (control plane + marketing) | http://localhost:3000 |
| API | http://localhost:3001 |
| n8n workflows | http://localhost:5678 |
| PostgreSQL | localhost:5432 (from services) |
| Redis | localhost:6379 (from services) |

To access the web app:
1. Navigate to http://localhost:3000
2. Create an account, or use the seeded local login:
   `admin@agentmou.dev` / `Demo1234!`
3. Explore `Demo Workspace` for the horizontal demo or `Dental Demo Clinic`
   for the seeded clinic tenant with internal `/platform/*` access

---

## Common Development Workflows

### Running Tests

```bash
# Run all tests across workspaces
pnpm test

# Run tests in a specific workspace
pnpm --filter @agentmou/contracts test

# Run tests in watch mode (re-run on file changes)
pnpm --filter @agentmou/db test -- --watch

# Run Python agent tests
pnpm test:agents
```

### Formatting and Linting

```bash
# Format all code with Biome
pnpm format

# Lint all code
pnpm lint

# Lint only infrastructure (shell scripts and Compose files)
pnpm lint:infra

# Type-check all TypeScript
pnpm typecheck

# Type-check Python agents
pnpm typecheck:agents
```

### Database Operations

```bash
# View database schema in Drizzle Studio (interactive browser)
pnpm db:studio

# Create a new migration after schema changes
pnpm db:generate

# Run migrations (if new ones were generated)
pnpm db:migrate

# Reseed the database (deletes all data and re-seeds)
pnpm db:seed

# Clean up and reset the database from scratch
docker compose -f infra/compose/docker-compose.local.yml exec postgres psql -U agentmou -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm db:migrate
pnpm db:seed
```

### Building for Production

```bash
# Build all workspaces (for local testing)
pnpm build

# Build a specific workspace
pnpm --filter services/api build
```

### Making Database Schema Changes

1. Edit the schema file (e.g., `packages/db/src/schema.ts`)
2. Generate a migration:
   ```bash
   pnpm db:generate
   ```
3. Review the generated migration in `packages/db/drizzle/`
4. Run the migration:
   ```bash
   pnpm db:migrate
   ```
5. Commit the migration files and schema changes together

---

## Hot Reload Behavior

All services in `pnpm dev` watch for file changes and auto-reload:

- **TypeScript files**: Changes trigger a rebuild; the service restarts within 1-2 seconds
- **Environment variables**: Requires manual service restart (kill and re-run `pnpm dev`)
- **Database schema**: Requires migration and service restart
- **Next.js pages and components**: Hot Module Replacement (HMR) applies changes instantly without reload

### Troubleshooting Hot Reload

If a service doesn't auto-reload:

1. Check if the file change was saved
2. Look for TypeScript errors in the output (e.g., `tsc` errors in the logs)
3. Manually restart the services:
   ```bash
   # Stop all services
   Ctrl+C

   # Start again
   pnpm dev
   ```

---

## Stopping Services

### Stop Development Services

```bash
# Press Ctrl+C in the terminal running `pnpm dev`
```

### Stop Infrastructure Services

```bash
# Stop and remove containers (data is preserved in volumes)
docker compose -f infra/compose/docker-compose.local.yml down

# Stop containers and delete volumes (destructive, resets database)
docker compose -f infra/compose/docker-compose.local.yml down -v
```

---

## Accessing Services

### PostgreSQL

From the host machine:
```bash
# Connect via psql
psql postgresql://agentmou:changeme@localhost:5432/agentmou

# Or use a GUI client (e.g., pgAdmin, DBeaver) with these credentials:
# Host: localhost
# Port: 5432
# User: agentmou
# Password: changeme
# Database: agentmou
```

From within a Docker container:
```bash
# Connect from services/api container
docker compose -f infra/compose/docker-compose.local.yml exec api psql postgresql://agentmou:changeme@postgres:5432/agentmou
```

### Redis

```bash
# Interactive CLI
docker compose -f infra/compose/docker-compose.local.yml exec redis redis-cli

# Commands (in redis-cli):
KEYS *                    # List all keys
GET key-name              # Get a value
LPUSH queue:jobs job1     # Push a job to queue
LRANGE queue:jobs 0 -1    # List all jobs in queue
FLUSHALL                  # Clear all data (destructive)
```

### n8n

1. Navigate to http://localhost:5678
2. Set up admin credentials on first access
3. Explore workflow editor and existing workflows

---

## Troubleshooting

### Services won't start ("port already in use")

**Problem**: Port 3000, 3001, 5678, etc. are already in use.

**Solution**:
```bash
# Find what's using a port (on macOS/Linux)
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in the service and environment
```

### Docker containers fail to start ("insufficient memory")

**Problem**: Docker doesn't have enough memory allocated.

**Solution**:
- Increase Docker's memory limit in Docker Desktop settings (Mac/Windows)
- Or run fewer services at once:
  ```bash
  docker compose -f infra/compose/docker-compose.local.yml up -d postgres redis
  pnpm dev  # Start only API, worker, agents
  ```

### Database migration fails

**Problem**: A pending migration fails to run.

**Solution**:
```bash
# Check migration status
pnpm db:migrate

# If stuck, review the migration file
cat packages/db/drizzle/0001_...sql

# Manually apply the migration
docker compose -f infra/compose/docker-compose.local.yml exec postgres psql -U agentmou -d agentmou -f /path/to/migration.sql
```

### TypeScript errors despite correct code

**Problem**: Editor shows errors that don't exist.

**Solution**:
```bash
# Rebuild TypeScript
pnpm typecheck

# Restart the TypeScript server in your editor (VS Code: Ctrl+Shift+P → "Restart TS Server")
```

### Node modules corrupted or out of date

**Problem**: Weird import errors or missing types.

**Solution**:
```bash
# Clean and reinstall
pnpm clean
pnpm install

# Restart services
pnpm dev
```

---

## Next Steps

- Read [Agent Authoring](./agent-authoring.md) to create and test agents
- Review [ADR-002: Shared Contracts](../adr/002-shared-contracts-type-system.md) to understand the type system
- Check the [Main README](../../README.md) for an overview of the project structure
