# Agentmou Platform: System Architecture Overview

## Platform Purpose and Positioning

The Agentmou platform is a **multi-tenant AI agents platform** designed to democratize AI-powered automation. It enables organizations to:

- **Discover and install** pre-built AI agents and workflows from a curated marketplace
- **Connect external systems** (Gmail, n8n, custom APIs) with secure OAuth and credential management
- **Execute deterministic workflows** using n8n's visual composition model
- **Deploy intelligent agents** powered by GPT-4o with human-in-the-loop (HITL) approval gates
- **Manage execution lifecycle** through job queues, logging, and audit trails
- **Track usage and billing** with metered pricing and subscription management

The platform bridges user-friendly configuration on the web with a robust execution layer, enabling non-technical users to compose powerful automations without code.

---

## System Shape: Component Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER-FACING LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  apps/web (Next.js 16)                                          │
│  - Browse marketplace (demo catalog + featured agents)          │
│  - Configure installations, manage connectors                   │
│  - View execution runs, approve HITL requests                   │
│  - Billing and account settings                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ REST + JWT
┌─────────────────────────────────────────────────────────────────┐
│                    CONTROL PLANE (API)                          │
├─────────────────────────────────────────────────────────────────┤
│  services/api (Fastify 5)                                       │
│  - Auth, tenancy, memberships (identity layer)                  │
│  - Connector OAuth management, secret encryption                │
│  - Catalog, installations, execution lifecycle                  │
│  - Queue orchestration: enqueue install/run/schedule jobs       │
│  - Billing sync (Stripe webhooks)                               │
│  - Approval HITL API for decision capture                       │
└─────────────────────────────────────────────────────────────────┘
                    ↓ Redis Queues (BullMQ)
    ┌──────────────────┬──────────────────┬─────────────┐
    ↓                  ↓                  ↓             ↓
┌─────────────┐  ┌──────────────┐  ┌──────────────┐ ┌────────────┐
│ run-agent   │  │run-workflow  │  │install-pack  │ │schedule-   │
│ (q)         │  │(q)           │  │(q)           │ │trigger (q) │
└─────────────┘  └──────────────┘  └──────────────┘ └────────────┘
    ↓                  ↓                  ↓             ↓
┌──────────────────────────────────────────────────────────────────┐
│                    DATA PLANE (Worker)                           │
├──────────────────────────────────────────────────────────────────┤
│  services/worker (Node.js + BullMQ consumers)                    │
│  - Dequeue and process install/run/schedule jobs                │
│  - Invoke agent-engine for agent execution                       │
│  - Invoke n8n HTTP adapter for workflow dispatch                │
│  - Write execution logs to database (steps, duration, errors)    │
│  - Trigger HITL approval gate manager                            │
│  - Handle retries and circuit breakers                           │
└──────────────────────────────────────────────────────────────────┘
    ↓ (when agent execution)
┌──────────────────────────────────────────────────────────────────┐
│               AGENT ENGINE (Runtime)                             │
├──────────────────────────────────────────────────────────────────┤
│  packages/agent-engine                                           │
│  - Planner: LLM-based plan generation (gpt-4o)                  │
│  - PolicyEngine: policy eval, constraint checking               │
│  - Toolkit: registered tools (gmail-read, gmail-label, etc)     │
│  - MemoryManager: conversation context, k-v store               │
│  - WorkflowDispatcher: n8n HTTP calls                           │
│  - ApprovalGateManager: HITL request creation                   │
│  - RunLogger: step-level logging to database                    │
│  - TemplatesManager: prompt loading + variable substitution     │
└──────────────────────────────────────────────────────────────────┘
    ↓ (Gmail operations) / ↓ (analyze-email endpoint)
┌──────────────────────────────────────────────────────────────────┐
│              EXTERNAL + SIDECAR SERVICES                         │
├──────────────────────────────────────────────────────────────────┤
│  - OpenAI API (gpt-4o planning + analysis)                      │
│  - Gmail Connector (OAuth2 + API, email read/label/send)        │
│  - n8n Workflow Engine (deterministic composition)               │
│  - services/agents (Python FastAPI) — AI sidecar                │
│    POST /analyze-email — email classification for Inbox Triage  │
│  - Stripe Webhooks — subscription/invoice sync                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                     STORAGE & STATE                              │
├──────────────────────────────────────────────────────────────────┤
│  PostgreSQL 16 (Drizzle ORM)                                     │
│  - 30+ tables across 10 schema groups (see data-model.md)       │
│  - pgvector for knowledge embeddings (public knowledge corpus)  │
│                                                                   │
│  Redis 7 (Cache + Queues)                                       │
│  - BullMQ queues: install-pack, run-agent, run-workflow, etc    │
│  - Session cache, rate limiting, temp secrets                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE (Docker)                        │
├──────────────────────────────────────────────────────────────────┤
│  infra/compose/docker-compose.{local,prod}.yml                  │
│  - Traefik (reverse proxy, TLS termination)                      │
│  - Postgres, Redis containers                                    │
│  - API, Worker, Agents services                                  │
│  - n8n Workflow Engine instance                                  │
│  - Environment-specific .env configuration                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### User-Facing Layer

**apps/web** (Next.js 16)
- **Purpose**: Browser-based control panel for non-technical users
- **Key Features**:
  - Marketplace browsing with catalog filtering (category, tier)
  - Installation configuration (select connectors, input config)
  - Execution run history with step-level logs
  - Connector OAuth initialization and status
  - Approval dashboard for HITL decisions
  - Billing portal and usage analytics
- **Authentication**: JWT tokens from API, stored in secure cookies
- **API Integration**: RESTful calls to `services/api` with Bearer tokens
- **Why Next.js?**: Built-in SSR for SEO (marketing pages), API routes for OAuth callbacks, fast page transitions with React 19

---

### Control Plane

**services/api** (Fastify 5 + TypeScript)
- **Purpose**: Single source of truth for all mutable state; API gateway and job orchestrator
- **Key Modules**:
  - **Auth**: User signup/login, JWT issuance, OAuth state management
  - **Tenancy**: Tenant creation, user membership management
  - **Connectors**: OAuth flow orchestration (Gmail, future providers)
  - **Secrets**: Encrypted secret storage (connector tokens with AES-256-GCM)
  - **Installations**: Agent/workflow installation CRUD, config persistence
  - **Runs**: Execution run tracking, step queries, cost aggregation
  - **Approvals**: HITL request APIs (fetch pending, decide with reason)
  - **Catalog**: Demo catalog endpoint (full agent/workflow inventory)
  - **Billing**: Subscription state, invoice retrieval, usage sync from Stripe
  - **Webhooks**: Inbound processing (Stripe, n8n notifications, future connectors)
  - **Security**: Rate limiting, audit logging, CORS policies
- **Why Fastify?**: High performance, schema validation, lightweight, TypeScript-friendly
- **Queue Role**: Publisher only — enqueues jobs to Redis; never consumes them

---

### Data Plane

**services/worker** (Node.js + BullMQ)
- **Purpose**: Reliable job processor for async execution; handles scale-out naturally
- **Key Responsibilities**:
  - **Queue Consumers**: Listen to `install-pack`, `run-agent`, `run-workflow`, `schedule-trigger`
  - **Agent Execution**: Dequeue run-agent → load agent-engine → invoke agents → capture logs
  - **Workflow Dispatch**: Dequeue run-workflow → call n8n HTTP API → capture workflow output
  - **Installation Setup**: Dequeue install-pack → catalog manifest loading → connector validation
  - **Schedule Triggers**: Cron-based job scheduling (via BullMQ repeatable jobs)
  - **Durability**: Dead-letter queues, exponential backoff, job state persistence in Redis
  - **Logging**: All runs + steps written to `executionRuns`, `executionSteps` tables
  - **Scale Model**: Stateless horizontal scaling; multiple worker instances read from same Redis
- **Why BullMQ?**: Reliable job queue backed by Redis, built-in retries, CQRS-friendly

---

### Agent Execution Runtime

**packages/agent-engine** (TypeScript)
- **Purpose**: Orchestrate AI agent execution; implements agent loop and policy enforcement
- **Component Structure**:

  1. **Planner** (AI planning)
     - Takes system prompt + input
     - Calls GPT-4o to generate an execution plan
     - Plan is a sequence of `PlanStep` objects (tool calls, conditionals, loops)
     - Why LLM? Flexible task decomposition without pre-coded step sequences

  2. **PolicyEngine** (governance)
     - Evaluates if a tool call or action is allowed (policy rules + constraints)
     - Reads policy config from manifest.yaml `policy` field
     - Examples: "Gmail can only read, not send", "No external API calls"
     - Supports risk levels (low, medium, high)
     - Can trigger HITL approval if risky

  3. **Toolkit** (extensible interface)
     - Registry of tools available to the agent
     - Built-in tools: `gmail-read`, `gmail-label`, `analyze-email` (sidecar), `invoke-workflow`
     - Each tool has a definition (inputs, outputs, description) and executor function
     - Tool context carries tenantId, userId, runId, connectors

  4. **MemoryManager** (context & state)
     - Conversation history for multi-turn interactions
     - K-V store for agent state between steps
     - Prompt variable substitution ({{variable}} patterns)

  5. **WorkflowDispatcher** (n8n integration)
     - Calls n8n HTTP API to execute workflows
     - Deterministic workflow composition (visual builder)
     - Returns workflow output to agent as a tool result

  6. **ApprovalGateManager** (HITL)
     - Creates approval requests when policy requires human decision
     - Pauses execution until user approves/denies
     - Captures decision + reason in database
     - Resumes with decision context

  7. **RunLogger** (telemetry)
     - Records each step: start time, inputs, outputs, tokens, duration, cost
     - Tracks run-level metrics: success/failure, total tokens, total cost
     - Writes to `executionRuns`, `executionSteps` tables

  8. **TemplatesManager** (catalog runtime)
     - Loads agent template manifest from catalog/
     - Resolves prompt.md + policy.yaml
     - Variable substitution for tenant-specific config

- **Execution Flow**:
  ```
  input → Planner → plan (steps)
                       ↓
                   PolicyEngine.evaluate(step)
                       ↓ (allowed)
                   Toolkit.executeTool(step)
                       ↓
                   RunLogger.recordStep(step)
                       ↓
                   output
  ```

---

### Sidecar Services

**services/agents** (Python FastAPI)
- **Purpose**: Specialized AI tasks not suitable for the main agent loop
- **Current Endpoint**:
  - `POST /analyze-email` — Email classification for Inbox Triage agent
  - Input: subject, content, sender
  - Output: priority, category, action, labels, confidence
- **Why separate?** Pure NLP processing; can scale independently; language flexibility (Python)

---

### Catalog & Template System

**catalog/** (YAML manifests + markdown)
- **Purpose**: Single source of truth for agent/workflow/pack definitions
- **Structure**:
  - `catalog/agents/{agent-id}/manifest.yaml` — metadata + capabilities
  - `catalog/agents/{agent-id}/prompt.md` — system prompt for agent
  - `catalog/agents/{agent-id}/policy.yaml` — policies + rules
  - `catalog/packs/` — bundled installations (multiple agents + workflows)
- **Three Catalog Layers**:
  1. **Operational**: Actual installable definitions in catalog/ (source of truth)
  2. **Demo**: Generated JSON in `apps/web/lib/demo-catalog/` (read-only, from operational)
  3. **Marketing**: Featured agents on landing pages (curated subset)
- **Availability Tiers**: planned, preview, available

---

## Data Flow: End-to-End Example (Agent Trigger → Execution → Approval)

### Scenario: User triggers Inbox Triage agent manually

```
1. Web UI: User clicks "Run Agent" on inbox-triage installation
   → POST /api/installations/{id}/run
   → { agentInstallationId, tenantId }

2. API (Control Plane)
   → Auth check: user in tenant, has permission
   → Create executionRun { status: 'running', triggeredBy: 'manual' }
   → Enqueue run-agent job to Redis
     { tenantId, agentInstallationId, runId, input: {...} }
   → Return runId to frontend (for polling)

3. Worker (Data Plane)
   → Dequeue run-agent job
   → Load agent template from catalog: inbox-triage/manifest.yaml
   → Load prompt: inbox-triage/prompt.md
   → Load policy: inbox-triage/policy.yaml
   → Instantiate AgentEngine with policy config

4. AgentEngine.execute()
   → RunLogger.startRun(runId)
   → PolicyEngine.loadPolicyConfig(policy)
   → Planner.createPlan(systemPrompt, { input, availableTools })
     → calls OpenAI gpt-4o
     → returns plan: [ step1: tool_call(gmail-read), step2: tool_call(analyze-email), ... ]

5. For each step in plan:
   a. PolicyEngine.evaluate(tool_call) → allowed?
      → if gmail-read && policy says read-only → allowed
      → if gmail-send && policy says read-only → denied (policy block)

   b. If high-risk action (e.g., send email):
      → ApprovalGateManager.createApprovalRequest()
      → INSERT approval_requests { status: 'pending', ... }
      → Execution PAUSES (awaiting decision)

   c. If allowed:
      → RunLogger.startStep(stepId, { name, type })
      → Toolkit.executeTool(toolName, toolInput, toolContext)
        → for 'gmail-read': use GmailConnector.readMessages()
        → for 'analyze-email': POST to services/agents /analyze-email
      → RunLogger.completeStep(stepId, output)

6. All steps complete OR blocked by approval:
   → RunLogger.completeRun(runId, 'success'|'pending_approval', { tokensUsed, cost })

7. API polls run status:
   → GET /api/runs/{runId} → { status: 'pending_approval', steps: [...] }

8. Approval Dashboard
   → Displays pending approval: "Send auto-reply to customer?"
   → User reviews context, clicks Approve/Deny
   → POST /api/approvals/{id}/decide { decision: 'approved', reason: '...' }

9. API
   → UPDATE approval_requests { status: 'approved', decidedAt, decidedBy, decisionReason }
   → If approved: Enqueue run-agent again with approvalDecision context
   → Worker resumes execution from paused step

10. Worker (resumed)
    → Continues from last completed step
    → Executes gmail-send (now approved)
    → Complete run

11. Web UI
    → Polls GET /api/runs/{runId}
    → Detects status: 'success'
    → Displays final output, step breakdown, cost
```

---

## Authentication & Authorization Model

### Authentication (Identity)

1. **User Identity**:
   - Email + password (local account)
   - OAuth2 (Google, Microsoft, GitHub)
   - SSO via SAML/OIDC (enterprise)
   - All stored in `users` table (one record per unique email)

2. **Token Flow**:
   - Web UI → POST `/auth/login` or OAuth redirect → API validates
   - API issues JWT (via jose library) with claims: `{ userId, email, tenantId (primary) }`
   - Frontend stores JWT in httpOnly cookie
   - Every API request includes `Authorization: Bearer {jwt}`

3. **OAuth2 State Management**:
   - `userOauthStates` table: CSRF token + return URL (short-lived)
   - `oauthLoginCodes` table: one-time code exchanged for JWT (consumed)

### Authorization (Access Control)

1. **Tenant Scoping**:
   - Every request includes tenant context (from JWT or query param)
   - Middleware validates user is a member of that tenant
   - All queries filtered by tenantId (data isolation)

2. **Roles** (in `memberships` table):
   - `admin`: full access, can invite members, manage billing
   - `editor`: can configure installations, run agents, view execution
   - `viewer`: read-only access to runs and catalog

3. **Connector Permissions**:
   - Connectors are tenant-scoped (`connectorAccounts.tenantId`)
   - Using a connector requires `connectorAccounts` row with valid tokens
   - Secret tokens stored encrypted in `secretEnvelopes` (AES-256-GCM)

---

## Multi-Tenancy Model

### Data Isolation

- **Hard boundary**: Every table with business data has `tenantId` column (foreign key to `tenants`)
- **Query pattern**: `WHERE tenantId = ? AND ...` on every query (defense in depth)
- **Enforcement**: Middleware validates JWT tenantId matches request tenantId

### Shared Resources (Single-Tenant View)

- **Catalog** is shared across all tenants (demo + operational)
- **n8n instance** is shared; workflows namespaced by tenant (via installation.n8nWorkflowId)
- **OpenAI API** is shared; tokens burned per run are metered and billed per tenant

### Schema Groups

1. **Auth** (6 tables): users, userIdentities, userOauthStates, oauthLoginCodes, passwordResetTokens, tenantSsoConnections
2. **Tenancy** (2): tenants, memberships
3. **Connectors** (2): connectorAccounts, connectorOauthStates
4. **Secrets** (1): secretEnvelopes
5. **Installations** (2): agentInstallations, workflowInstallations
6. **Execution** (2): executionRuns, executionSteps
7. **Approvals** (1): approvalRequests
8. **Billing** (4): billingAccounts, billingSubscriptions, billingInvoices, billableUsageLedger
9. **Knowledge** (2): publicKnowledgeDocuments, publicKnowledgeChunks
10. **Operations** (4): schedules, usageEvents, auditEvents, webhookEvents

---

## Key Design Decisions

### 1. Why Redis Queues (BullMQ) for Worker Jobs?

- **Reliability**: Jobs persisted in Redis; survive worker restarts
- **FIFO ordering**: Fair scheduling across tenants
- **Scaling**: Horizontal scaling; multiple workers consume same queue
- **Observability**: Job metadata (status, attempts, duration) queryable
- **Alternative considered**: Long-polling in Fastify; rejected (increased API latency, CPU usage)

### 2. Why Agent Engine as a Library (not a service)?

- **Low latency**: Loaded in worker process; no HTTP overhead
- **State sharing**: Can access database, connectors, queues directly
- **Testability**: Easier to unit test plan generation, policy evaluation
- **Alternative considered**: gRPC microservice; rejected (complexity, network hops)

### 3. Why Python Sidecar for Email Analysis?

- **Simplicity**: Pure NLP task; no need for orchestration
- **Language fit**: Python libraries (transformers, spacy) for text processing
- **Scale**: Can scale independently via Docker replicas
- **Alternative considered**: Inline in agent-engine; rejected (adds Node deps, slow)

### 4. Why n8n for Workflows (not custom builder)?

- **Visual composition**: Non-technical users can drag nodes
- **Determinism**: Workflows are static graphs (not LLM-generated plans)
- **Integration library**: 500+ pre-built integrations
- **Separation of concerns**: Agent = AI-driven; Workflow = deterministic pipeline
- **Alternative considered**: Custom DAG engine; rejected (reinvents wheel)

### 5. Why Drizzle ORM (not Prisma)?

- **SQL-first**: Full control over queries, indexes
- **Lightweight**: No code generation; type-safe at compile time
- **Migrations**: Human-readable SQL (Drizzle Kit)
- **Postgres features**: Native pgvector support for embeddings
- **Alternative considered**: Prisma; rejected (slower queries, harder to optimize)

### 6. Why Zod for Schemas (not TypeScript interfaces)?

- **Dual-use**: Runtime validation + static types
- **Data integrity**: Validates API input, database reads, queue payloads
- **Tree-shakeable**: Contracts package keeps type definitions small
- **DX**: Excellent error messages for API clients
- **Alternative considered**: JSON Schema + Ajv; rejected (less ergonomic)

---

## Communication Patterns

### Synchronous (Request-Response)

- **Web → API**: REST over HTTPS (JWT in Authorization header)
- **API → OpenAI**: HTTP/JSON (API key in header)
- **API ↔ Connectors**: OAuth2 flow (redirect URIs, callback handling)
- **Worker → Services/Agents**: HTTP/JSON (X-API-Key header)
- **Worker → n8n**: HTTP/JSON (webhook + status poll)

### Asynchronous (Event-Driven)

- **API → Worker**: Redis queue jobs (run-agent, run-workflow, install-pack, schedule-trigger)
- **Worker → Database**: Insert execution logs, approvals, audit events (no backpressure)
- **External Webhooks → API**: Stripe billing events, n8n workflow completions
- **API → Stripe**: HTTP calls to billing API (not webhook-based)

### Database Writes (Eventual Consistency)

- **RunLogger** writes step details to `executionSteps` as they complete (allows real-time polling from API)
- **ApprovalGateManager** inserts approval request immediately (frontend polls for user action)
- **Billing** writes usage ledger on run completion; reconciles with Stripe periodically

---

## Error Handling & Resilience

### Worker Job Failures

- **Automatic retries**: BullMQ exponential backoff (3 attempts, 1s → 3s → 9s)
- **Dead-letter queue**: Jobs exceeding retries moved to failure queue (manual review)
- **Circuit breaker**: If OpenAI API down, worker pauses and waits (doesn't keep failing)

### Policy Violations

- **Soft block**: Policy engine returns `{ allowed: false, reason: '...' }` → step logged as failed, run continues
- **Hard block**: HITL approval required → execution pauses, awaits user decision

### External Service Timeouts

- **OpenAI**: 30-second timeout; if exceeded, run fails with error message
- **Gmail API**: Exponential backoff on rate limits; fail after 5 attempts
- **n8n**: 60-second timeout; webhook callback for async completion

---

## Observability

### Logging

- **Application logs** (Pino): API & Worker write to stdout (Docker logs)
- **Execution logs**: Each run's steps + duration + errors in `executionSteps` table
- **Audit logs**: User actions (login, installation, approval) in `auditEvents` table

### Metrics

- **Queue depth**: BullMQ job count (AlertManager)
- **Run success rate**: Count `executionRuns WHERE status = 'success'` / total
- **Avg execution time**: Mean of `durationMs` per agent template
- **Token usage**: Sum of `tokensUsed` per tenant (billing metric)
- **Cost**: Sum of `costEstimate` per run (price model)

### Tracing

- **RequestId**: Generated in API middleware; propagated to Worker via queue job metadata
- **TraceId**: Included in logs for request correlation

---

## Future Architecture Considerations

1. **Scaling**: Add Redis Cluster for HA; multi-worker deployment behind load balancer
2. **Caching**: Add Redis cache layer for catalog, user sessions, policy configs
3. **Rate Limiting**: Token bucket per tenant (control costs, prevent abuse)
4. **Webhooks**: Native webhook dispatch from worker (vs. polling)
5. **Knowledge Retrieval**: RAG pipeline for agent prompts (pgvector → embeddings → semantic search)
6. **Multi-LLM**: Support Claude, Llama, Gemini (abstraction layer)
7. **Workflow Versioning**: Immutable workflow snapshots (audit trail)
8. **Regional Deployment**: Multi-region with data residency compliance

---

## Related Documentation

- **[Data Model](./data-model.md)**: Detailed schema, relationships, migrations
- **[Agent Engine](./agent-engine.md)**: Deep dive into execution, policies, approval gates
- **[Catalog System](./catalog-system.md)**: Marketplace, templates, availability tiers
- **[Conventions](./conventions.md)**: Naming, import patterns, error handling standards
- **[Repository Map](../repo-map.md)**: Complete directory structure and dependencies
