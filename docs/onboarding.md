# Developer Onboarding Guide

Welcome to Agentmou! This guide will help you get set up, understand the project structure, and make your first contribution.

## Prerequisites

Before you start, ensure you have the following installed:

### Required

- **Node.js** — Version 20 or higher. Check with `node --version`
- **pnpm** — Version 9.15 or higher. Install with `npm install -g pnpm` or `brew install pnpm`
- **Docker** — With Docker Compose. Install from [docker.com](https://www.docker.com/)
- **Git** — For version control

### Recommended

- **Visual Studio Code** — With ESLint and TypeScript extensions
- **Postman** or **REST Client** — For testing API endpoints
- **PostgreSQL client** — For direct database queries (optional, `psql` or DBeaver)

### Optional

- **Python 3.12** — If working on the `services/agents` module
- **n8n CLI** — For local workflow testing (install via npm)

## Local Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/agentmou/platform.git
cd platform
```

### Step 2: Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies using pnpm's workspaces feature.

### Step 3: Configure Environment

```bash
cp infra/compose/.env.example infra/compose/.env
```

Edit `infra/compose/.env` and fill in any values marked as `changeme`. For local development, the defaults are usually fine, but you may want to:

- Set `JWT_SECRET` to a random value: `openssl rand -hex 32`
- Set `CONNECTOR_ENCRYPTION_KEY` to a random value: `openssl rand -hex 32`
- Set `N8N_ENCRYPTION_KEY` to a random value: `openssl rand -hex 32`

For OAuth (Google/Microsoft login), you'll need to create credentials in their respective console. For local development without OAuth, leave these blank.

### Step 4: Start Infrastructure

```bash
docker compose -f infra/compose/docker-compose.local.yml up -d
```

This starts:
- **PostgreSQL 16** on port 5432
- **Redis 7** on port 6379
- **n8n 1.76.1** on port 5678

Wait for all containers to be healthy:

```bash
docker compose -f infra/compose/docker-compose.local.yml ps
```

### Step 5: Run Database Migrations

```bash
pnpm db:migrate
```

This creates all database tables and schemas.

### Step 6: Seed Test Data

```bash
pnpm db:seed
```

This populates the database with sample tenants, users, agents, and workflows for development and testing.

### Step 7: Start Development Services

```bash
pnpm dev
```

This starts all services in development mode:
- **Web App** at `http://localhost:3000`
- **API** at `http://localhost:3001`
- **n8n** already running at `http://localhost:5678`

Open http://localhost:3000 in your browser. You should see the Agentmou marketing site. Log in with the seed credentials (usually printed in the console or check the seed script).

## Project Overview

### What is Agentmou?

Agentmou is a **multi-tenant AI agents platform**. It allows organizations (tenants) to:

1. **Install pre-built agents** from the marketplace (e.g., inbox triage, sales support)
2. **Execute agents** with a human-in-the-loop (HITL) approval workflow
3. **Orchestrate workflows** using n8n for complex multi-step automation
4. **Manage connectors** (Gmail, Slack, etc.) securely with encrypted credentials
5. **Monitor runs** with full execution logs and step-by-step visibility

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│  apps/web (Next.js 16)                                  │
│  - Public marketing site (/, /pricing, /docs)          │
│  - Tenant control plane (/app/[tenantId]/...)          │
│  - Authentication (login, register, OAuth)              │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/API
                 ▼
┌─────────────────────────────────────────────────────────┐
│  services/api (Fastify 5)                               │
│  - REST API for control plane operations               │
│  - Auth, tenants, installations, runs, approvals       │
│  - 15 route modules, Zod validation, JWT auth         │
└────────────────┬────────────────────────────────────────┘
    ┌────────────┴────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│ services/worker         │      │ services/agents         │
│ (BullMQ + Redis)        │      │ (FastAPI, Python)       │
│ - Install agents        │      │ - Email analysis        │
│ - Execute runs          │      │ - GPT-4o-mini model    │
│ - Trigger schedules     │      │ - API Key auth          │
│ - Handle approvals      │      │ - Health checks         │
└─────────────────────────┘      └─────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  packages/db (Drizzle ORM)                              │
│  - PostgreSQL schema (30+ tables)                       │
│  - User auth, tenancy, installations, executions       │
└─────────────────────────────────────────────────────────┘
    ▲
    │ SQL
    │
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL 16 + Redis 7 + n8n 1.76.1                  │
└─────────────────────────────────────────────────────────┘
```

### Key Concepts

#### Tenant
An isolated organization using the Agentmou platform. Each tenant has its own:
- Users and members
- Installed agents and workflows
- Execution runs and logs
- Connectors and credentials
- Approval policies

#### Agent
A pre-built, reusable AI agent from the catalog. Example: **Inbox Triage** analyzes emails and routes them. Defined by:
- `manifest.yaml` — metadata and configuration
- `prompt.md` — system prompt for the LLM
- `policy.yaml` — approval/security policies

#### Installation
When a tenant installs an agent from the catalog. Creates:
- Database record linking agent to tenant
- Variables for the agent (e.g., which email folder to triage)
- Execution logs

#### Run
A single execution of an installed agent. Tracks:
- Start/end time
- Input data (e.g., email to analyze)
- Output
- Steps taken
- Approval state (if HITL required)

#### Workflow
Complex multi-step automation using n8n. Can:
- Call agents
- Chain connector operations (e.g., read email, create ticket)
- Include human approvals

#### Pack
A bundle of related agents/workflows. Example: **Sales Accelerator** includes agents for lead scoring, email drafting, and CRM integration.

#### Connector
Integration with external services (Gmail, Slack, etc.). Manages:
- OAuth flows
- Credential encryption (AES-256-GCM)
- API communication

#### Approval
Human-in-the-loop (HITL) checkpoint. When an agent action requires human review, an approval request is created. Admins can:
- Review the proposed action
- Approve or reject
- Add comments

#### Control Plane
The Agentmou UI and API for managing agents, installations, and executions.

#### Data Plane
The actual execution layer where agents and workflows run (services/worker + services/agents).

## Workspace Structure

```
agentmou-platform/
├── apps/
│   └── web/                    # Next.js 16 + React 19 frontend
│       ├── app/               # App Router pages
│       ├── components/        # React components
│       ├── lib/               # Utilities, hooks, state
│       └── public/            # Static assets
│
├── services/
│   ├── api/                   # Fastify 5 REST API
│   │   └── src/modules/       # 15 route modules
│   ├── worker/                # BullMQ job processor
│   │   └── src/jobs/          # 5 job types
│   └── agents/                # Python FastAPI sidecar
│       ├── main.py            # Email analysis endpoint
│       └── test_*.py          # Unit tests
│
├── packages/                  # Shared libraries
│   ├── contracts/             # Zod schemas + TypeScript types
│   ├── db/                    # Drizzle ORM + PostgreSQL
│   ├── queue/                 # BullMQ queue definitions
│   ├── auth/                  # JWT utilities
│   ├── connectors/            # Gmail OAuth + registry
│   ├── catalog-sdk/           # Catalog YAML loading
│   ├── agent-engine/          # Core agent runtime
│   ├── observability/         # Pino logging
│   └── n8n-client/            # n8n API client
│
├── catalog/
│   ├── agents/                # Agent definitions
│   │   └── inbox-triage/
│   │       ├── manifest.yaml  # Metadata
│   │       ├── prompt.md      # LLM prompt
│   │       └── policy.yaml    # Policies
│   └── packs/                 # Pack manifests
│
├── infra/
│   ├── compose/               # Docker Compose files
│   ├── scripts/               # Setup, backup, etc.
│   ├── traefik/               # Reverse proxy config (prod)
│   └── backups/               # Backup storage
│
├── scripts/                   # Workspace scripts
│   ├── cleanup-validation-tenant.ts
│   └── generate-operational-catalog-ids.ts
│
├── docs/                      # Documentation (you are here!)
├── templates/                 # Starter skeletons
├── workflows/                 # n8n workflow exports
├── package.json               # Workspace root
├── pnpm-workspace.yaml        # Workspace config
├── turbo.json                 # Turborepo config
└── README.md                  # Root README
```

## Key Files & Their Purposes

| Path | Purpose |
| ---- | ------- |
| `packages/db/src/schema.ts` | Drizzle schema definition (30+ tables) |
| `packages/contracts/src/` | Zod schemas for runtime validation |
| `services/api/src/index.ts` | Fastify app initialization |
| `services/api/src/modules/` | API route handlers (15 modules) |
| `services/worker/src/index.ts` | BullMQ worker setup |
| `services/worker/src/jobs/` | Job processor implementations |
| `apps/web/app/` | Next.js App Router pages |
| `apps/web/lib/` | Client state (Zustand), hooks, utilities |
| `catalog/agents/*/manifest.yaml` | Agent metadata |
| `infra/compose/docker-compose.local.yml` | Local dev environment |
| `infra/compose/.env.example` | Environment variables template |

## First Tasks

### Task 1: Verify Your Setup

Run the health check:

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:
```json
{"ok": true}
```

Test the web app by opening http://localhost:3000 and logging in with seed credentials.

### Task 2: Explore the Database

```bash
pnpm db:studio
```

This opens Drizzle Studio, a visual database explorer. You can:
- Browse tables and data
- Understand schema relationships
- Query data directly

### Task 3: Read a Route Module

Open `services/api/src/modules/tenants/tenants.routes.ts`. This gives you a sense of:
- How Fastify routes are structured
- How Zod validation works
- How middleware (auth, tenant access) is applied

### Task 4: Understand State Management

Open `apps/web/lib/store/` to see how app state is managed with Zustand. Look for:
- User store (authentication state)
- Tenant store (selected tenant)
- UI stores (modals, filters)

### Task 5: Review a Test

Open `packages/contracts/src/__tests__/schemas.test.ts` to see:
- How Vitest tests are structured
- Zod schema validation testing
- AAA (Arrange, Act, Assert) pattern

### Task 6: Add a Small Feature

Try adding a new environment variable to `.env.example`. Then:

```bash
pnpm lint:infra
```

This validates the Compose files against the env template.

## Common Development Workflows

### Adding a New API Endpoint

1. Create a new file or add to existing module in `services/api/src/modules/`
2. Define request/response schemas in `packages/contracts/src/`
3. Implement route handler with Zod validation
4. Add tests in `__tests__/` folder
5. Run `pnpm typecheck && pnpm lint && pnpm test`

### Modifying the Database Schema

1. Edit `packages/db/src/schema.ts`
2. Generate migration: `pnpm db:generate`
3. Review generated migration in `packages/db/migrations/`
4. Run migration: `pnpm db:migrate`
5. Update related types in `packages/contracts/`
6. Seed new test data if needed: `pnpm db:seed`

### Creating a New Job Type

1. Create a folder in `services/worker/src/jobs/[job-name]/`
2. Define queue payload in `packages/queue/src/`
3. Implement processor in `services/worker/src/jobs/[job-name]/processor.ts`
4. Register in `services/worker/src/jobs/index.ts`
5. Enqueue from API: `queue.add([job-name], payload)`
6. Add tests and error handling

### Adding a React Component

1. Create component in `apps/web/components/[category]/`
2. Use shadcn/ui components for consistency
3. Add TypeScript types for props
4. Write unit tests in `__tests__/` folder
5. Document complex logic with comments
6. Run `pnpm format` to auto-style

### Adding a Test

1. Create `[feature].test.ts` or use `__tests__/` folder
2. Use Vitest + Expect API
3. Follow AAA pattern:
   ```typescript
   it('should do something', () => {
     // Arrange: set up test data
     const input = { /* ... */ };

     // Act: call the function
     const result = myFunction(input);

     // Assert: verify the result
     expect(result).toBe(expectedValue);
   });
   ```
4. Run `pnpm test` or `pnpm test:watch`

## Validation Commands

Before committing or pushing, run these in order:

```bash
# 1. Auto-format code
pnpm format

# 2. Lint code
pnpm lint

# 3. TypeScript check
pnpm typecheck

# 4. Run tests
pnpm test

# 5. Check infrastructure configs
pnpm lint:infra
```

If all pass, you're ready to commit!

## Troubleshooting Setup

### Docker containers won't start

```bash
# Check logs
docker compose -f infra/compose/docker-compose.local.yml logs postgres

# Restart containers
docker compose -f infra/compose/docker-compose.local.yml restart

# Or clean slate
docker compose -f infra/compose/docker-compose.local.yml down -v
docker compose -f infra/compose/docker-compose.local.yml up -d
```

### Database migration fails

```bash
# Check current schema
pnpm db:studio

# Reset database (⚠️ loses all data)
docker exec agentmou-postgres psql -U agentmou -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm db:migrate
pnpm db:seed
```

### Port already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Or change in docker-compose
# Edit infra/compose/docker-compose.local.yml and adjust ports
```

### Node modules are broken

```bash
# Clean install
pnpm clean
pnpm install
pnpm dev
```

## Next Steps

1. **Read the [Glossary](./glossary.md)** — Understand all domain terms
2. **Review [Architecture Overview](./architecture/overview.md)** — Understand system design
3. **Study [Repository Map](./repo-map.md)** — Dive into specific folders
4. **Read [Testing Guide](./testing.md)** — Learn testing conventions
5. **Pick a small issue or feature** — Make your first contribution!

## Getting Help

- Check [Troubleshooting Guide](./troubleshooting.md) for common issues
- Read through related documentation in `docs/`
- Ask questions in the team Slack channel
- Create a GitHub issue if you find a bug

## Key Conventions

- **Naming**: camelCase for variables/functions, PascalCase for types/components, kebab-case for files
- **Formatting**: Biome (auto-format with `pnpm format`)
- **Linting**: ESLint with TypeScript strict mode
- **Testing**: Vitest with AAA pattern
- **Commits**: Semantic messages (feat:, fix:, docs:, test:, refactor:)
- **PRs**: Link to issues, request review, wait for CI to pass

## Success Checklist

By the end of onboarding, you should be able to:

- [ ] Run `pnpm dev` and access all services locally
- [ ] Explain what a Tenant, Agent, Installation, and Run are
- [ ] Add a new field to a Zod schema
- [ ] Create a simple test with Vitest
- [ ] Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` without errors
- [ ] Navigate the repository and find any file mentioned in this guide
- [ ] Make a small change and create a pull request

Congratulations! You're ready to contribute to Agentmou.
