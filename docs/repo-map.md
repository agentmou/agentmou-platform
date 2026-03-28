# Repository Map: Complete Directory Structure

## Repository Root

```
agentmou-platform/
├── README.md                          Root project README
├── Makefile                          Development shortcuts
├── package.json                      Workspace root (pnpm)
├── pnpm-workspace.yaml               Workspace configuration
├── pnpm-lock.yaml                    Dependency lock file
├── turbo.json                        Turborepo build orchestration
├── tsconfig.base.json                Base TypeScript config (strict mode)
├── biome.json                        Code formatter/linter config
├── eslint.config.js                  ESLint rules
├── vitest.config.ts                  Test runner config
├── vitest.setup.ts                   Test setup/globals
├── .markdownlint.json                Markdown linting rules
├── .yamllint.yml                     YAML linting rules
│
├── apps/                             User-facing applications
├── packages/                         Shared libraries
├── services/                         Backend services
├── templates/                        Template starters
├── catalog/                          Catalog definitions (YAML)
├── infra/                            Infrastructure & deployment
├── scripts/                          Utility scripts
├── docs/                             Documentation
└── workflows/                        n8n workflow examples
```

---

## apps/

### apps/web

**Next.js 16 + React 19 application** — user-facing control panel.

```
apps/web/
├── app/                              Next.js App Router structure
│   ├── (marketing)/                  Public marketing pages (ungrouped)
│   │   ├── page.tsx                 Landing page
│   │   ├── pricing/
│   │   ├── agents/
│   │   └── blog/
│   │
│   ├── (auth)/                       Auth pages (ungrouped, no nav)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── oauth-callback/page.tsx
│   │
│   ├── app/                          Authenticated app (grouped)
│   │   ├── dashboard/page.tsx        Tenant dashboard home
│   │   ├── installations/            Manage agents/workflows
│   │   │   ├── page.tsx             List all installations
│   │   │   ├── [id]/edit.tsx        Configure installation
│   │   │   └── new/page.tsx         Install new agent
│   │   │
│   │   ├── runs/                     Execution history
│   │   │   ├── page.tsx             List runs
│   │   │   └── [id]/page.tsx        Run details + steps
│   │   │
│   │   ├── approvals/                HITL approval dashboard
│   │   │   ├── page.tsx             Pending approvals
│   │   │   └── [id]/page.tsx        Approval details
│   │   │
│   │   ├── connectors/               OAuth connector management
│   │   │   ├── page.tsx             Connected accounts
│   │   │   └── [provider]/connect.tsx OAuth flow
│   │   │
│   │   ├── settings/                 Tenant settings
│   │   │   ├── account/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   └── billing/page.tsx
│   │   │
│   │   ├── layout.tsx                App layout (nav, sidebar)
│   │   └── loading.tsx               Loading skeleton
│   │
│   ├── api/                          Next.js API routes (edge)
│   │   ├── auth/[...nextauth].ts     NextAuth integration (future)
│   │   ├── webhooks/stripe.ts        Stripe webhook receiver
│   │   └── webhooks/n8n.ts           n8n workflow callbacks
│   │
│   └── layout.tsx                    Root layout (fonts, providers)
│
├── components/                       React components (grouped by domain)
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── OAuthButton.tsx
│   │
│   ├── installations/
│   │   ├── InstallationCard.tsx
│   │   ├── InstallationForm.tsx
│   │   └── ConfigurationPanel.tsx
│   │
│   ├── runs/
│   │   ├── RunsTable.tsx
│   │   ├── RunDetails.tsx
│   │   ├── StepTimeline.tsx
│   │   └── RunCostBreakdown.tsx
│   │
│   ├── approvals/
│   │   ├── ApprovalCard.tsx
│   │   ├── ApprovalDialog.tsx
│   │   └── DecisionForm.tsx
│   │
│   ├── connectors/
│   │   ├── ConnectorCard.tsx
│   │   ├── OAuthFlow.tsx
│   │   └── ConnectorStatus.tsx
│   │
│   └── ui/                           Reusable UI components (shadcn)
│       ├── Button.tsx
│       ├── Dialog.tsx
│       ├── Table.tsx
│       ├── Card.tsx
│       └── [other components]
│
├── lib/                              Utilities & helpers
│   ├── api-client.ts                 Fetch wrapper for REST API
│   ├── auth.ts                       Auth utilities (JWT, cookies)
│   ├── hooks/                        React hooks
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts
│   │   ├── useInstallations.ts
│   │   └── useApprovals.ts
│   │
│   ├── demo-catalog/
│   │   ├── operational-ids.gen.json  Generated catalog (read-only)
│   │   └── featured.ts               Featured agents for marketing
│   │
│   └── utils.ts                      General utilities
│
├── styles/                           Global styles
│   └── globals.css                   Tailwind + custom styles
│
├── public/                           Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── next.config.js                    Next.js config (webpack, env)
├── tailwind.config.ts                Tailwind CSS config
├── postcss.config.js                 PostCSS plugins
├── package.json                      App-specific deps (React, Radix UI, etc.)
└── tsconfig.json                     App-specific TS config (extends base)
```

**Key Dependencies**:
- `next@16`: Framework
- `react@19`: UI library
- `react-hook-form@7`: Form handling
- `zod@3`: Form validation
- `zustand@5`: Client state management
- `@radix-ui/*`: Headless UI components
- `tailwindcss@4`: Styling
- `recharts@2`: Charts/graphs

**Key Features**:
- Server-side rendering (landing page, SEO)
- API routes for OAuth callbacks
- Real-time data fetching (polling approval dashboard)
- Responsive design (Tailwind)
- Dark mode support (next-themes)

---

## packages/

Shared libraries used across services and apps.

### packages/contracts

**Zod types & API contracts** — source of truth for all data models.

```
packages/contracts/
├── src/
│   ├── index.ts                      Re-exports all domains
│   ├── catalog.ts                    Agent/workflow/pack types
│   ├── tenancy.ts                    User, tenant, membership types
│   ├── installations.ts              Installation config types
│   ├── execution.ts                  Run, step, result types
│   ├── approvals.ts                  Approval request types
│   ├── connectors.ts                 Connector, OAuth state types
│   ├── security.ts                   Auth, token, SSO types
│   ├── billing.ts                    Subscription, invoice types
│   ├── dashboard.ts                  Analytics, metrics types
│   └── chat.ts                       Chat/knowledge types
│
├── package.json                      No external deps (only zod)
└── tsconfig.json                     Extends base
```

**Contents**:
- Zod schemas (runtime validation)
- TypeScript types (derived from schemas)
- Shared error types
- API request/response contracts

**Used by**: All services and apps (zero external deps, lightweight)

---

### packages/db

**Drizzle ORM schema & database utilities**.

```
packages/db/
├── src/
│   ├── index.ts                      Re-exports connection, schema
│   ├── db.ts                         Database connection (pg)
│   ├── schema.ts                     30+ table definitions (Drizzle)
│   └── seed.ts                       Demo data seeding
│
├── migrations/                       SQL migrations (auto-generated)
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_billing_tables.sql
│   └── [more migrations]
│
├── drizzle.config.ts                 Drizzle Kit config (migrations, schema)
├── package.json                      Dependencies: drizzle-orm, pg
└── tsconfig.json                     Extends base
```

**Tasks**:
- `db:generate`: Generate migrations from schema changes
- `db:migrate`: Apply pending migrations to database
- `db:studio`: Start Drizzle Studio (visual DB explorer)
- `db:seed`: Load demo data

**Schema Overview** (30+ tables):
- Auth (6): users, userIdentities, userOauthStates, oauthLoginCodes, passwordResetTokens, tenantSsoConnections
- Tenancy (2): tenants, memberships
- Connectors (2): connectorAccounts, connectorOauthStates
- Secrets (1): secretEnvelopes
- Installations (2): agentInstallations, workflowInstallations
- Execution (2): executionRuns, executionSteps
- Approvals (1): approvalRequests
- Billing (4): billingAccounts, billingSubscriptions, billingInvoices, billableUsageLedger
- Knowledge (2): publicKnowledgeDocuments, publicKnowledgeChunks
- Operations (4): schedules, usageEvents, auditEvents, webhookEvents

---

### packages/queue

**BullMQ queue definitions & typed payloads**.

```
packages/queue/
├── src/
│   ├── index.ts                      Re-exports
│   ├── connection.ts                 Redis client & pool options
│   └── queues.ts                     Queue names, payload types, helpers
│
├── package.json                      Dependencies: bullmq, ioredis
└── tsconfig.json
```

**Queue Names**:
- `install-pack`: Batch install agents/workflows
- `run-agent`: Execute an agent
- `run-workflow`: Execute a workflow
- `schedule-trigger`: Cron-triggered runs
- `approval-timeout`: Clean up expired approvals

**Payload Types**:
- `InstallPackPayload`: { tenantId, packId, config }
- `RunAgentPayload`: { tenantId, agentInstallationId, runId, input, triggeredBy }
- `RunWorkflowPayload`: { tenantId, workflowInstallationId, runId, input, triggeredBy }
- `ScheduleTriggerPayload`: { tenantId, scheduleId, targetType, installationId }

---

### packages/auth

**JWT authentication & identity management**.

```
packages/auth/
├── src/
│   ├── index.ts                      Re-exports
│   ├── jwt.ts                        Token generation/verification (jose)
│   ├── crypto.ts                     Hash, compare, random token generation
│   ├── oauth.ts                      OAuth state management
│   └── types.ts                      Auth-specific types
│
├── package.json                      Dependencies: jose
└── tsconfig.json
```

**Exports**:
- `issueJWT(payload)`: Create JWT with claims
- `verifyJWT(token)`: Validate & decode token
- `hashPassword(pwd)`: Bcrypt hashing
- `comparePassword(pwd, hash)`: Verify password
- `generateSecureToken()`: Random crypto token

---

### packages/connectors

**Connector integrations (OAuth, API clients)**.

```
packages/connectors/
├── src/
│   ├── index.ts                      Re-exports
│   ├── gmail/
│   │   ├── client.ts                 Gmail API wrapper
│   │   ├── oauth.ts                  OAuth2 flow
│   │   ├── types.ts                  Gmail-specific types
│   │   └── index.ts
│   │
│   ├── slack/                        (future)
│   ├── github/                       (future)
│   │
│   └── types.ts                      Common connector interface
│
├── package.json                      Dependencies: google-auth-library, googleapis
└── tsconfig.json
```

**Exports**:
- `GmailConnector`: Class with methods (listMessages, sendMessage, applyLabel)
- `OAuthFlow`: Redirect URI, exchange, refresh token
- `normalizeConnectorError()`: Map provider errors to app errors

---

### packages/agent-engine

**Core AI agent execution runtime** (covered in separate doc).

```
packages/agent-engine/
├── src/
│   ├── index.ts                      Main exports
│   ├── agent-engine.ts               AgentEngine class
│   │
│   ├── planner/
│   │   ├── planner.ts               LLM-based plan generation
│   │   └── index.ts
│   │
│   ├── policies/
│   │   ├── policies.ts              Policy evaluation engine
│   │   └── index.ts
│   │
│   ├── tools/
│   │   ├── tools.ts                 Tool registry & executor
│   │   ├── gmail-read.ts            Gmail read tool
│   │   ├── gmail-label.ts           Gmail label tool
│   │   ├── analyze-email.ts         Sidecar API tool
│   │   └── index.ts
│   │
│   ├── memory/
│   │   ├── memory.ts                Conversation & state manager
│   │   └── index.ts
│   │
│   ├── workflow-dispatch/
│   │   ├── dispatcher.ts            n8n HTTP adapter
│   │   └── index.ts
│   │
│   ├── approval-gates/
│   │   ├── gates.ts                 HITL request creation
│   │   └── index.ts
│   │
│   ├── run-logger/
│   │   ├── logger.ts                Step & run logging
│   │   └── index.ts
│   │
│   ├── templates/
│   │   ├── templates.ts             Catalog manifest loading
│   │   └── index.ts
│   │
│   └── __tests__/                    Unit tests (colocated)
│
├── package.json                      Dependencies: openai
└── tsconfig.json
```

**Entry Point**: `AgentEngine` class

---

### packages/catalog-sdk

**Catalog manifest parsing & template loading**.

```
packages/catalog-sdk/
├── src/
│   ├── index.ts                      Re-exports
│   ├── loader.ts                     Load manifest.yaml, prompt.md, policy.yaml
│   ├── validator.ts                  Validate manifest schema
│   ├── types.ts                      Manifest types
│   └── templates.ts                  Template resolution
│
├── package.json                      Dependencies: yaml, zod
└── tsconfig.json
```

**Exports**:
- `loadAgentManifest(templateId)`: Parse catalog/agents/{id}/manifest.yaml
- `loadPrompt(templateId)`: Read prompt.md
- `loadPolicy(templateId)`: Parse policy.yaml
- `validateManifest(data)`: Zod validation

---

### packages/n8n-client

**HTTP client adapter for n8n workflows**.

```
packages/n8n-client/
├── src/
│   ├── index.ts                      Re-exports
│   ├── client.ts                     HTTP client (axios)
│   ├── types.ts                      n8n API types
│   └── workflows.ts                  Workflow dispatch
│
├── package.json                      Dependencies: axios
└── tsconfig.json
```

**Exports**:
- `N8nClient(baseUrl, apiKey)`: Initialize client
- `executeWorkflow(workflowId, input)`: Trigger workflow
- `getWorkflowStatus(executionId)`: Poll execution status

---

### packages/observability

**Centralized logging & metrics**.

```
packages/observability/
├── src/
│   ├── index.ts                      Re-exports
│   ├── logger.ts                     Pino logger factory
│   ├── tracing.ts                    Request ID propagation
│   └── metrics.ts                    (Future: OpenTelemetry)
│
├── package.json                      Dependencies: pino
└── tsconfig.json
```

**Exports**:
- `createLogger(name)`: Pino instance per service
- `withRequestId(middleware)`: Express/Fastify middleware
- `instrumentSpan(name, fn)`: Tracing (future)

---

## services/

Backend services (execution, API, AI sidecars).

### services/api

**Fastify REST API** — control plane.

```
services/api/
├── src/
│   ├── index.ts                      Server bootstrap
│   ├── app.ts                        Fastify app setup
│   ├── config.ts                     Environment config
│   │
│   ├── middleware/
│   │   ├── auth.ts                   JWT verification
│   │   ├── tenant-access.ts          Tenant scoping
│   │   └── index.ts
│   │
│   ├── modules/                      Feature modules (vertical slices)
│   │   ├── auth/
│   │   │   ├── auth.routes.ts       Routes (POST /login, /signup, /oauth)
│   │   │   ├── auth.service.ts      Business logic
│   │   │   └── index.ts
│   │   │
│   │   ├── tenants/
│   │   │   ├── tenants.routes.ts
│   │   │   ├── tenants.service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── memberships/
│   │   ├── installations/
│   │   ├── runs/
│   │   ├── approvals/
│   │   ├── connectors/
│   │   ├── secrets/
│   │   ├── billing/
│   │   ├── catalog/
│   │   ├── n8n/
│   │   ├── webhooks/
│   │   ├── security/
│   │   ├── usage/
│   │   ├── public-chat/
│   │   └── [more modules]
│   │
│   ├── lib/
│   │   ├── audit.ts                  Audit event logging
│   │   ├── validation-fixture-cleanup.ts
│   │   └── external-installation-cleanup.ts
│   │
│   └── __tests__/                    Integration tests
│
├── package.json                      Dependencies: fastify, zod, drizzle-orm
└── tsconfig.json                     Extends base
```

**Routes** (example: installations):
- `GET /api/installations` — List tenant's installations
- `POST /api/installations` — Install new agent/workflow
- `GET /api/installations/{id}` — Get details
- `PUT /api/installations/{id}` — Update config
- `POST /api/installations/{id}/run` — Trigger manual run
- `DELETE /api/installations/{id}` — Uninstall

**Authentication**: JWT middleware validates token; extracts userId + tenantId

**Tenant Scoping**: All queries filtered by `tenantId` from token

**Queue Publishing**: Enqueues jobs to Redis (doesn't consume)

---

### services/worker

**BullMQ consumer for async jobs** — data plane.

```
services/worker/
├── src/
│   ├── index.ts                      Worker bootstrap
│   ├── config.ts                     Environment config
│   │
│   ├── queues/
│   │   ├── install-pack.ts           Consumer: install-pack queue
│   │   ├── run-agent.ts              Consumer: run-agent queue
│   │   ├── run-workflow.ts           Consumer: run-workflow queue
│   │   ├── schedule-trigger.ts       Consumer: schedule-trigger queue
│   │   └── [more consumers]
│   │
│   ├── services/
│   │   ├── agent-executor.ts         Invoke AgentEngine
│   │   ├── workflow-executor.ts      Invoke n8n
│   │   ├── installation-service.ts   Setup validations
│   │   └── logging-service.ts        Metrics aggregation
│   │
│   └── __tests__/                    Unit tests
│
├── package.json                      Dependencies: bullmq, @agentmou/agent-engine
└── tsconfig.json
```

**Job Processors**:
1. Dequeue job from Redis
2. Validate payload
3. Load dependencies (DB, connectors, catalogs)
4. Invoke appropriate executor (AgentEngine, n8n, etc.)
5. Handle errors (retry, dead-letter)
6. Log results to database

**Scalability**: Multiple worker instances read from same Redis queue (FIFO fairness)

---

### services/agents

**Python FastAPI sidecar** — specialized AI tasks.

```
services/agents/
├── main.py                           FastAPI app
├── test_main.py                      Unit tests
├── requirements.txt                  Python dependencies
└── Dockerfile                        Container definition
```

**Endpoints**:
- `GET /health` — Health check (no auth)
- `POST /health/deep` — Test OpenAI connectivity (X-API-Key)
- `POST /analyze-email` — Email classification (X-API-Key)
  - Input: { subject, content, sender }
  - Output: { priority, category, action, labels, confidence, summary }

**Authentication**: X-API-Key header (simple; suitable for internal microservice)

**Runtime**: Python 3.11+, FastAPI, OpenAI SDK

---

## catalog/

Agent, workflow, and pack definitions (YAML + markdown).

```
catalog/
├── agents/                           Agent definitions
│   ├── inbox-triage/
│   │   ├── manifest.yaml            Metadata, capabilities, runtime config
│   │   ├── prompt.md                System prompt (template)
│   │   ├── policy.yaml              Governance rules
│   │   └── README.md                User documentation
│   │
│   ├── sales-pipeline-analyzer/
│   ├── [more agents...]
│   └── [more agents...]
│
├── packs/                            Bundle definitions
│   ├── support-bundle/
│   │   ├── manifest.yaml
│   │   ├── includes.yaml            List agents + workflows
│   │   └── README.md
│   │
│   └── [more packs...]
│
├── categories.yaml                   Category taxonomy
└── README.md                         Catalog guidelines
```

**Source of Truth**: catalog/ contains operational definitions

**Updates**: Via Git pull request (reviewed, tested before merge)

**Generated**: `pnpm demo-catalog:generate` creates operational-ids.gen.json

---

## infra/

Deployment infrastructure & configuration.

```
infra/
├── compose/
│   ├── docker-compose.local.yml     Local development stack
│   ├── docker-compose.prod.yml      Production stack
│   ├── .env.example                 Environment template
│   └── .env.local                   Local overrides (git-ignored)
│
├── traefik/
│   ├── traefik.yml                  Reverse proxy config
│   ├── dynamic-config.yml           Dynamic routing rules
│   └── certs/                       TLS certificates
│
├── scripts/
│   ├── setup.sh                     Initial setup
│   ├── deploy.sh                    Deploy to VPS
│   ├── backup.sh                    Database backups
│   ├── migrate.sh                   Run migrations
│   └── health-check.sh              Health checks
│
├── README.md                        Infra documentation
└── backups/                         Database backup storage
```

**Compose Services**:
- `postgres`: PostgreSQL 16 database
- `redis`: Redis 7 cache + queues
- `api`: Fastify API service
- `worker`: BullMQ worker
- `agents`: Python FastAPI sidecar
- `n8n`: n8n workflow engine
- `traefik`: Reverse proxy + TLS

**Deployment**: Docker Compose on VPS; Traefik routes traffic

---

## templates/

Starter templates for new agents/workflows.

```
templates/
├── product-agent-simple/
│   ├── manifest.yaml                Template manifest
│   ├── prompt.md                    Template prompt
│   ├── policy.yaml                  Template policy
│   └── README.md
│
├── n8n-workflow-simple/
│   ├── manifest.yaml
│   ├── workflow.json               n8n schema
│   └── README.md
│
└── agent-workflow-hybrid/
    ├── agent/
    ├── workflow/
    └── README.md
```

**Usage**: Copy template → edit → commit to catalog/

---

## scripts/

Utility scripts for development & operations.

```
scripts/
├── generate-operational-catalog-ids.ts   Generate demo-catalog
├── cleanup-validation-tenant.ts          Remove test tenant
└── [more scripts...]
```

**Usage**: `tsx scripts/{name}.ts`

---

## docs/

Documentation (Markdown).

```
docs/
├── architecture/                    Architecture documentation
│   ├── overview.md                 System design
│   ├── data-model.md               Database schema
│   ├── agent-engine.md             Runtime deep dive
│   ├── catalog-system.md           Marketplace system
│   └── conventions.md              Coding standards
│
├── api/                            API documentation (future: OpenAPI)
├── deployment/                     Deployment guides
├── contributing.md                 Contribution guidelines
└── README.md                       Docs index
```

---

## workflows/

Example n8n workflows (bundled in repo for reference).

```
workflows/
├── wf-01-auto-label-gmail/         Auto-label Gmail workflow
├── wf-02-slack-notification/       Send Slack notification
└── [more workflows...]
```

**Note**: Actual workflows live in n8n database; these are examples/backups

---

## Root Configuration Files

### pnpm-workspace.yaml

Defines workspace packages:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

### turbo.json

Build task orchestration:
```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": { "cache": false }
  }
}
```

### tsconfig.base.json

Base TypeScript config (strict mode):
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "declaration": true
  }
}
```

### biome.json

Code formatting & linting (replaces Prettier + ESLint):
```json
{
  "organizeImports": true,
  "formatter": { "indentStyle": "space", "indentSize": 2 },
  "linter": { "rules": { "style": { "noImplicitAny": "error" } } }
}
```

### package.json (Root)

Key scripts:
- `pnpm dev` — Run all services (Turbo managed)
- `pnpm build` — Build all packages
- `pnpm lint` — Lint + format check
- `pnpm test` — Run all tests
- `pnpm db:generate` — Generate migrations
- `pnpm db:migrate` — Apply migrations
- `pnpm demo-catalog:generate` — Regenerate catalog JSON
- `pnpm demo-catalog:check` — CI check (fail if out of sync)

---

## Dependency Flow

```
apps/web
  ↓ (REST calls)
  ↓
services/api
  ├─ → packages/contracts
  ├─ → packages/db
  ├─ → packages/auth
  ├─ → packages/queue
  ├─ → packages/connectors
  ├─ → packages/catalog-sdk
  ├─ → packages/n8n-client
  └─ → packages/observability

services/worker
  ├─ → packages/contracts
  ├─ → packages/db
  ├─ → packages/queue
  ├─ → packages/agent-engine
  │    ├─ → packages/contracts
  │    ├─ → packages/db (for logging)
  │    ├─ → packages/connectors
  │    ├─ → packages/catalog-sdk
  │    ├─ → packages/n8n-client
  │    └─ → packages/observability
  ├─ → packages/catalog-sdk
  ├─ → packages/observability
  └─ → (HTTP to services/agents)

services/agents (Python)
  ├─ → OpenAI API
  └─ (standalone, no TS deps)
```

---

## Entrypoints & Runtime

| Process | Entrypoint | Language | Port | Role |
|---------|-----------|----------|------|------|
| **Web** | apps/web/next.config.js | TypeScript | 3000 | UI |
| **API** | services/api/src/index.ts | TypeScript | 3001 | REST, queue publisher |
| **Worker** | services/worker/src/index.ts | TypeScript | (none, console) | Job processor |
| **Agents** | services/agents/main.py | Python | 5000 | NLP sidecar |
| **n8n** | n8n/dist/index.js | Node | 5678 | Workflows |
| **Traefik** | traefik.yml | YAML | 80/443 | Reverse proxy |

---

## How to Build

```bash
# Install dependencies
pnpm install

# Run everything (dev mode, Turbo orchestration)
pnpm dev
  ├─ apps/web: next dev (http://localhost:3000)
  ├─ services/api: tsx watch src/index.ts (http://localhost:3001)
  ├─ services/worker: tsx watch src/index.ts (logs to console)
  ├─ services/agents: python -m uvicorn main:app --reload
  ├─ PostgreSQL: docker-compose up postgres
  ├─ Redis: docker-compose up redis
  └─ n8n: docker-compose up n8n

# Type-check
pnpm typecheck

# Format + lint
pnpm format
pnpm lint

# Test
pnpm test

# Build (for production)
pnpm build
  ├─ apps/web: next build
  ├─ packages/*: tsc
  └─ services/*: tsc

# Database
pnpm db:generate    # Generate migrations
pnpm db:migrate     # Apply migrations
pnpm db:seed        # Load demo data
```

---

## Related Documentation

- **[Architecture Overview](./architecture/overview.md)**: System design
- **[Data Model](./architecture/data-model.md)**: Schema details
- **[Agent Engine](./architecture/agent-engine.md)**: Runtime component
- **[Catalog System](./architecture/catalog-system.md)**: Marketplace
- **[Conventions](./architecture/conventions.md)**: Code standards
