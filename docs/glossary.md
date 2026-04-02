# Glossary

A comprehensive reference of terms used throughout the Agentmou Platform.

## Core Domain Terms

### Agent
A pre-built, reusable AI automation unit that performs a specific task. Examples: inbox triage, lead scoring, email drafting. Defined by:
- **manifest.yaml** — Metadata (name, description, category, input/output schema)
- **prompt.md** — System prompt for the LLM (usually GPT-4o or GPT-4o-mini)
- **policy.yaml** — Approval/security policies and constraints

Agents are immutable once released. They run in the data plane (services/worker) and use the agent engine for orchestration.

### Installation
An instance of an agent or workflow deployed to a specific tenant. Encapsulates:
- Which agent/workflow is installed
- Which tenant owns it
- Configuration variables
- Status (active/disabled)
- Execution history

When a tenant installs an agent, they get their own installation with isolated execution logs and approvals.

### Run
A single execution of an installed agent. Tracks:
- Start/end timestamp
- Input data
- Output
- Execution state (pending, running, completed, failed, cancelled)
- Steps taken
- Approval state (if human-in-the-loop)

Runs are immutable once completed. Each run generates detailed logs for auditability.

### Step
An atomic operation within a run. Examples:
- Read email from Gmail
- Analyze with LLM
- Create Slack message
- Request human approval

Steps have:
- Type (tool call, decision, approval, etc.)
- Input/output
- Duration
- Status (pending, running, completed, failed)

### Workflow
A complex, multi-step automation orchestrated via n8n. Workflows can:
- Call agents
- Chain connector operations
- Include conditional branching
- Request human approvals
- Transform data

Unlike agents (single LLM call), workflows are deterministic and visible in the n8n editor.

### Pack
A curated bundle of agents and workflows addressing a specific business domain. Examples:
- **Sales Accelerator** — Lead scoring, email draft generation, CRM integration
- **Support Starter** — Ticket triage, FAQ matching, escalation routing

Packs can be featured in the marketplace and installed as a group.

## System Architecture Terms

### Control Plane
The UI and API for managing the Agentmou platform. Encompasses:
- **apps/web** — React UI for tenants and admins
- **services/api** — REST API for all control plane operations
- **packages/db** — PostgreSQL schema for state persistence

The control plane is stateless and horizontally scalable. It handles authentication, authorization, and business logic but does not execute agents (that's the data plane).

### Data Plane
The execution layer where agents and workflows actually run. Comprises:
- **services/worker** — BullMQ consumer processing execution jobs
- **services/agents** — Python FastAPI sidecar for specialized AI tasks (email analysis)
- **n8n** — Workflow orchestration engine
- External APIs (Gmail, Slack, etc.)

The data plane is asynchronous and event-driven. Jobs are enqueued in the control plane and consumed here.

### Tenant
An isolated organization or customer using Agentmou. Each tenant has:
- Unique ID (UUID)
- Separate user namespace
- Own installed agents/workflows
- Isolated execution logs and data
- Separate connectors and credentials

Tenancy is enforced at the API and database levels via `tenant_id` foreign keys.

### Membership
A user's relationship to a tenant. Types:
- **Owner** — Full administrative rights
- **Admin** — Manage agents, approvals, settings
- **Member** — View installations and runs
- **Guest** — Read-only access

Membership controls API access via middleware.

### Connector
A secure integration with an external service. Manages:
- OAuth flows and credential exchange
- Encryption of tokens at rest (AES-256-GCM)
- API communication
- Refresh logic

Examples: Gmail, Slack, Salesforce. Each connector has its own OAuth flow and encryption.

### Catalog
The library of all available agents, workflows, and packs. Stored in:
- `catalog/agents/` — Agent definitions
- `catalog/packs/` — Pack manifests
- `catalog/categories.yaml` — Category taxonomy

The catalog is versioned in Git and loaded into the database during setup. Admins can preview catalog items before installing.

### Marketplace
The UI for browsing and installing agents/workflows from the catalog. Located at:
- `/app/[tenantId]/marketplace` in the web app

Tenants browse, read details, and click "Install" to create an installation.

### Fleet
A dashboard showing all installations for a tenant. Located at:
- `/app/[tenantId]/fleet` in the web app

Tenants see:
- All installed agents/workflows
- Recent runs
- Quick actions (disable, delete, settings)

## Execution & Processing Terms

### HITL (Human-in-the-Loop)
Any process requiring human review/approval during execution. Agentmou supports HITL at multiple points:
- **Execution gates** — Policies requiring approval before running
- **Tool gates** — Approval before calling specific tools (email send, delete, etc.)
- **Manual steps** — Explicit workflow steps waiting for human decision

When HITL is triggered, an approval request is created and awaits admin action.

### Approval
A human review request during execution. Approvals have:
- Approval request ID
- Associated run and step
- Tenant and requester
- Description of what needs approval
- Action (approve/reject) with optional comment
- TTL (auto-reject if not reviewed within timeout)

Approvals are critical for safety. They prevent agents from taking dangerous actions (sending emails, deleting records) without human verification.

### Policy
A set of rules governing agent behavior. Defined in `policy.yaml` for each agent. Policies can:
- Require approval for certain tools
- Restrict action scope (e.g., only triage emails from specific sender)
- Set rate limits
- Define automatic escalation triggers

Policies are enforced by the PolicyEngine in the agent engine.

### Queue
A Redis-backed job queue using BullMQ. Queues in Agentmou:
- **INSTALL_PACK** — Package installation
- **RUN_AGENT** — Agent execution
- **RUN_WORKFLOW** — Workflow execution
- **SCHEDULE_TRIGGER** — Scheduled workflow trigger
- **APPROVAL_TIMEOUT** — Approval auto-rejection

Jobs have exponential backoff retry, priority levels, and visibility into the worker.

### Job
A unit of work enqueued for processing. Jobs have:
- Type (install, run, trigger, etc.)
- Payload (input data)
- Status (waiting, active, completed, failed)
- Retries and backoff
- Created/completed timestamps

Jobs are dequeued by services/worker and processed asynchronously.

### Schedule
A cron-like trigger for workflows. Schedules have:
- Cron expression (e.g., `0 9 * * *` for 9 AM daily)
- Timezone
- Associated workflow
- Enabled/disabled state
- Execution history

When a schedule fires, a SCHEDULE_TRIGGER job is enqueued.

## Technical Terms

### Schema
In Agentmou, schemas are defined in two places:

1. **Database schema** — Drizzle ORM table definitions in `packages/db/src/schema.ts`. Defines the PostgreSQL structure.
2. **Validation schema** — Zod schemas in `packages/contracts/src/`. Define shape and validation of runtime data.

Both are essential for type safety and correctness.

### Manifest
A YAML file describing an agent or pack. Contains:
- Metadata (name, description, version, category)
- Input schema (what data the agent accepts)
- Output schema (what the agent produces)
- Required connectors (Gmail, Slack, etc.)
- Variables (configuration options for the tenant)

`manifest.yaml` is the source of truth for agent capabilities.

### Prompt
The system prompt injected into the LLM. Defined in `prompt.md` for each agent. The prompt:
- Explains the agent's role and constraints
- Describes available tools
- Provides examples
- Sets tone (professional, creative, etc.)

The agent engine inserts the prompt into the LLM request.

### Toolkit
The set of tools (functions) available to an agent during execution. Examples:
- `read_email` — Fetch email from Gmail
- `send_email` — Send email via Gmail
- `create_ticket` — Create in Jira
- `approve` — Request human approval

Tools are defined by connectors and the catalog. The agent engine passes tool definitions to the LLM.

### Memory
State persisted across agent steps within a single run. The MemoryManager in the agent engine:
- Stores intermediate outputs
- Tracks decision paths
- Maintains conversation history (if multi-turn)
- Limits size to prevent LLM context overflow

Memory is isolated per run and deleted after completion.

### Encryption
Credentials (OAuth tokens, API keys) are encrypted at rest using **AES-256-GCM**. The encryption key is:
- Derived from `CONNECTOR_ENCRYPTION_KEY` environment variable
- Never logged or exposed
- Rotated periodically (manual process)

Encrypted values are stored in `secret_envelopes` table with metadata (algorithm, IV, auth tag).

### Authentication
Agentmou uses **JWT (JSON Web Tokens)** for API authentication. Process:
1. User logs in with email/password or OAuth
2. API issues a JWT signed with `JWT_SECRET`
3. Client includes JWT in `Authorization: Bearer <token>` header
4. API verifies JWT and extracts user claims
5. Middleware enforces tenant access control

JWTs expire after 24 hours (configurable).

### Authorization
Access control enforced after authentication. Agentmou has:
- **User-level** — Logged-in users can access their own profile
- **Tenant-level** — Members can only access their tenant's data
- **Role-level** — Admins can approve runs, members cannot

Middleware (`requireAuth`, `requireTenantAccess`) enforces these rules on every API call.

## Data Terms

### Audit
A complete record of all system actions for compliance. Audit events include:
- User login/logout
- Installation creation/deletion
- Run execution
- Approval action
- Configuration change

Audit events are immutable and indexed by timestamp and tenant.

### Usage
Metrics for billing and monitoring. Tracked:
- Runs executed (per agent, per tenant)
- API calls
- Connector operations (email sent, etc.)
- LLM tokens consumed

Usage is aggregated into `usageEvents` and billed monthly.

### Billing
Stripe integration for payment processing. Includes:
- Subscription management
- Invoice generation
- Usage-based overage charges
- Refund handling

Billing data is synced with Stripe and audited for accuracy.

### Knowledge Base
Vector embeddings of documentation for AI search. Uses:
- pgvector extension in PostgreSQL
- Chunked document storage
- Cosine similarity for retrieval
- Public and tenant-specific knowledge

The knowledge base powers the public chat and contextual help in agents.

## Process Terms

### Versioning
Agentmou uses **semantic versioning** for releases:
- **MAJOR** — Breaking changes to the API or schema
- **MINOR** — New features (backwards compatible)
- **PATCH** — Bug fixes

Agents and packs in the catalog also have versions. Installations track which version is installed.

### Migration
Database schema changes managed by Drizzle. Process:
1. Edit `packages/db/src/schema.ts`
2. Run `pnpm db:generate` to create migration file
3. Review `packages/db/drizzle/*.sql`
4. Run `pnpm db:migrate` to apply

Migrations are version-controlled and ordered by timestamp.

### Seeding
Populating the database with initial/test data. The seed script:
- Creates the admin development user
- Creates the generic `Demo Workspace`
- Creates the `Dental Demo Clinic`
- Seeds clinic-domain demo data such as modules, channels, patients,
  conversations, appointments, confirmations, gaps, and reactivation state

Run with `pnpm db:seed`. Idempotent by default.

### Deployment
Releasing Agentmou to production. Steps:
1. Build Docker images for each service
2. Push to registry (ECR, Docker Hub, etc.)
3. Update infrastructure (Kubernetes, Docker Swarm, etc.)
4. Run migrations
5. Verify health
6. Smoke test critical paths

See [Deployment Guide](./runbooks/deployment.md) for detailed instructions.

## Acronyms

| Acronym | Meaning |
| ------- | ------- |
| AAA | Arrange-Act-Assert (testing pattern) |
| API | Application Programming Interface |
| AES | Advanced Encryption Standard |
| B2C | Business-to-Consumer (marketing login) |
| CORS | Cross-Origin Resource Sharing |
| CI/CD | Continuous Integration / Continuous Deployment |
| DB | Database |
| DTOs | Data Transfer Objects |
| ESLint | JavaScript linter |
| GCM | Galois/Counter Mode (encryption) |
| HITL | Human-in-the-Loop |
| HTTP | HyperText Transfer Protocol |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| ORM | Object-Relational Mapping |
| OAuth | Open Authorization (3rd party auth) |
| PR | Pull Request |
| REST | Representational State Transfer |
| SDK | Software Development Kit |
| TTL | Time To Live |
| UUID | Universally Unique Identifier |
| YAML | YAML Ain't Markup Language |
| Zod | TypeScript-first schema validation |

## Related Documents

- [Onboarding Guide](./onboarding.md) — First steps for new developers
- [Architecture Overview](./architecture/overview.md) — System design and components
- [Testing Guide](./testing.md) — Testing conventions and patterns
- [API Routes](./api-routes.md) — REST API endpoint reference
