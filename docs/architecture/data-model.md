# Data Model & Schema Architecture

## Overview

The Agentmou platform uses PostgreSQL 16 as the primary data store, with Drizzle ORM providing TypeScript bindings and compile-time safety. The schema is organized into **10 logical groups**, spanning **30+ tables** that support multi-tenancy, user identity, connector management, execution tracking, billing, and knowledge corpus.

**Key principles**:
- Hard multi-tenancy: Every business entity is filtered by `tenantId`
- Immutability-first: Runs, approvals, and audit logs are append-only
- Encryption at rest: Sensitive connector credentials stored encrypted
- Relationships via foreign keys: Referential integrity enforced at the database layer

---

## Schema Groups & Entity Relationships

### 1. Auth (6 tables)

Manages platform users, federated identity, and token lifecycle.

#### users
```typescript
{
  id: UUID (PK),
  email: TEXT UNIQUE (login identifier),
  name: TEXT (display name),
  passwordHash: TEXT (bcrypt hash, nullable for OAuth-only users),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- One user can belong to multiple tenants (via memberships)
- Email is globally unique across the platform

#### userIdentities
```typescript
{
  id: UUID (PK),
  userId: UUID (FK → users),
  provider: TEXT ('google' | 'microsoft' | 'github' | 'saml'),
  providerSubject: TEXT (provider's user ID),
  emailSnapshot: TEXT (email at time of identity link),
  metadata: JSONB (provider-specific claims),
  createdAt: TIMESTAMP DEFAULT now(),
}
```
- Maps external IdP subjects to platform users
- Unique constraint: (provider, providerSubject) — one provider identity per user

#### userOauthStates
```typescript
{
  id: UUID (PK),
  state: TEXT UNIQUE (CSRF token),
  provider: TEXT,
  returnUrl: TEXT (where to redirect after OAuth),
  createdAt: TIMESTAMP DEFAULT now(),
  expiresAt: TIMESTAMP (short-lived, ~5 min),
}
```
- Prevents CSRF during OAuth2 login flow
- Cleaned up via TTL index on expiresAt

#### oauthLoginCodes
```typescript
{
  id: UUID (PK),
  codeHash: TEXT UNIQUE (hashed one-time code),
  userId: UUID (FK → users),
  expiresAt: TIMESTAMP,
  consumedAt: TIMESTAMP (NULL until exchanged),
}
```
- One-time codes issued after successful OAuth authentication
- Exchanged by web app for JWT; consumed immediately
- Frontend receives code in callback, sends to API, receives JWT

#### passwordResetTokens
```typescript
{
  id: UUID (PK),
  userId: UUID (FK → users),
  tokenHash: TEXT UNIQUE,
  expiresAt: TIMESTAMP (24 hours),
  consumedAt: TIMESTAMP (NULL until used),
}
```
- Supports password recovery flow
- Tokens expire after use or time limit

#### tenantSsoConnections
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  connectionType: TEXT ('saml' | 'oidc'),
  providerKey: TEXT (WorkOS key, Auth0 client ID),
  idpMetadataUrl: TEXT (SAML IdP metadata),
  verifiedDomains: JSONB (email domains allowed),
  enabled: BOOLEAN,
  config: JSONB (provider-specific settings),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- Tenant-level SSO configuration (one per tenant)
- Allows enterprise customers to use own identity provider

---

### 2. Tenancy (2 tables)

Multi-tenant data scoping and membership management.

#### tenants
```typescript
{
  id: UUID (PK),
  name: TEXT (org name),
  type: TEXT DEFAULT 'business' ('business' | 'personal'),
  plan: TEXT DEFAULT 'free' (billing tier),
  ownerId: UUID (FK → users, creator),
  settings: JSONB (feature flags, preferences, and tenant experience flags),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- Top-level tenant record scoping all data
- One owner (creator); other members added via invites
- Persists the canonical tenant experience inputs (`activeVertical`,
  `isPlatformAdminTenant`, `settingsVersion`) while keeping
  `verticalClinicUi`, `clinicDentalMode`, and `internalPlatformVisible` as
  compatibility fields

#### memberships
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  userId: UUID (FK → users),
  role: TEXT DEFAULT 'viewer' ('owner' | 'admin' | 'operator' | 'viewer'),
  joinedAt: TIMESTAMP DEFAULT now(),
  lastActiveAt: TIMESTAMP DEFAULT now(),
}
```
- Join table linking users to tenants with a role
- Role-based access control (RBAC) for API endpoints
- Composite key: (tenantId, userId) unique
- Legacy stored `member` values are still accepted for compatibility, but API
  payloads and clinic entitlement checks normalize them to `operator`

---

### 3. Connectors (2 tables)

OAuth2 connector account management with state tracking.

#### connectorAccounts
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  provider: TEXT ('gmail' | 'slack' | 'github' | ...),
  status: TEXT DEFAULT 'disconnected' ('connected' | 'disconnected' | 'error'),
  scopes: JSONB (['read_emails', 'write_labels', ...]),
  accessToken: TEXT (encrypted, see secretEnvelopes),
  refreshToken: TEXT (encrypted),
  tokenExpiresAt: TIMESTAMP,
  externalAccountId: TEXT (provider's account ID),
  connectedAt: TIMESTAMP,
  lastTestAt: TIMESTAMP (health check),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- Tenant-scoped OAuth credentials
- Tokens stored in plaintext here but **typically encrypted in secretEnvelopes** (pattern: create here for quick access, rotate to secrets table)
- Health check on every use to detect token expiration

#### connectorOauthStates
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  provider: TEXT,
  state: TEXT UNIQUE (CSRF token),
  redirectUrl: TEXT (where to send user after OAuth),
  createdAt: TIMESTAMP DEFAULT now(),
  expiresAt: TIMESTAMP,
}
```
- CSRF protection during connector OAuth flow
- Separate from userOauthStates (connectors are per-tenant)

---

### 4. Secrets (1 table)

Encrypted secret storage for sensitive values.

#### secretEnvelopes
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  key: TEXT (secret name, e.g., 'gmail_access_token'),
  encryptedValue: TEXT (AES-256-GCM cipher),
  connectorAccountId: UUID (FK → connectorAccounts, optional link),
  createdAt: TIMESTAMP DEFAULT now(),
  rotatedAt: TIMESTAMP (last rotation),
}
```
- Secrets encrypted at rest using AES-256-GCM + unique IV per row
- Encryption key from environment (derived from master key)
- Used for: connector tokens, API keys, webhook secrets
- Example: instead of storing token in connectorAccounts, store reference + encrypted value here

---

### 5. Installations (2 tables)

Tenant-scoped agent and workflow installations from the catalog.

#### agentInstallations
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  templateId: TEXT (catalog agent ID, e.g., 'inbox-triage'),
  status: TEXT DEFAULT 'configuring' ('configuring' | 'active' | 'paused' | 'error'),
  config: JSONB (user input, connector refs, variables),
  hitlEnabled: BOOLEAN DEFAULT true,
  installedAt: TIMESTAMP DEFAULT now(),
  lastRunAt: TIMESTAMP,
  runsTotal: INTEGER DEFAULT 0,
  runsSuccess: INTEGER DEFAULT 0,
}
```
- Represents an installed agent ready to execute
- Config captures user-provided parameters (e.g., labels to apply, email filters)
- Metrics: runs_total, runs_success (for dashboard)
- No explicit deletion; status moved to 'paused' to preserve run history

#### workflowInstallations
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  templateId: TEXT (catalog workflow ID),
  status: TEXT DEFAULT 'configuring' ('configuring' | 'active' | 'paused' | 'error'),
  config: JSONB,
  n8nWorkflowId: TEXT (created workflow ID in n8n instance),
  installedAt: TIMESTAMP DEFAULT now(),
  lastRunAt: TIMESTAMP,
  runsTotal: INTEGER DEFAULT 0,
  runsSuccess: INTEGER DEFAULT 0,
}
```
- Installed n8n workflow per tenant
- n8nWorkflowId links to actual workflow in n8n database
- Allows per-tenant workflow instances (credentials, nodes)

---

### 6. Execution (2 tables)

Immutable execution run and step records.

#### executionRuns
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  agentInstallationId: UUID (FK → agentInstallations, optional),
  workflowInstallationId: UUID (FK → workflowInstallations, optional),
  status: TEXT DEFAULT 'running' ('running' | 'success' | 'failed' | 'pending_approval'),
  triggeredBy: TEXT DEFAULT 'manual' ('manual' | 'cron' | 'webhook' | 'api' | 'agent'),
  durationMs: INTEGER,
  costEstimate: REAL DEFAULT 0,
  tokensUsed: INTEGER DEFAULT 0,
  tags: JSONB (arbitrary labels for filtering),
  startedAt: TIMESTAMP DEFAULT now(),
  completedAt: TIMESTAMP,
}
```
- Top-level execution record for an agent or workflow run
- Only one of agentInstallationId or workflowInstallationId is set
- Cost calculated post-execution based on tokens + external API calls
- Append-only; never updated after completion

#### executionSteps
```typescript
{
  id: UUID (PK),
  runId: UUID (FK → executionRuns),
  type: TEXT ('tool_call' | 'approval' | 'condition' | 'delay'),
  name: TEXT (user-friendly step name),
  status: TEXT DEFAULT 'running' ('running' | 'success' | 'failed' | 'blocked'),
  input: JSONB,
  output: JSONB,
  error: TEXT,
  tokenUsage: INTEGER,
  cost: REAL,
  durationMs: INTEGER,
  startedAt: TIMESTAMP DEFAULT now(),
  completedAt: TIMESTAMP,
}
```
- Fine-grained execution records for debugging
- Tracks each tool invocation, approval pause, conditional branch
- Allows frontend to display step-by-step progress
- Indexed by runId for efficient queries

---

### 7. Approvals (1 table)

Human-in-the-loop (HITL) approval requests and decisions.

#### approvalRequests
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  runId: UUID (FK → executionRuns),
  agentInstallationId: UUID (FK → agentInstallations),
  actionType: TEXT ('send_email' | 'delete_record' | 'api_call'),
  riskLevel: TEXT ('low' | 'medium' | 'high'),
  title: TEXT (e.g., "Send reply to customer?"),
  description: TEXT,
  payloadPreview: JSONB (data to be acted upon),
  context: JSONB (agent state for decision-making),
  status: TEXT DEFAULT 'pending' ('pending' | 'approved' | 'denied' | 'expired'),
  source: TEXT ('policy_engine' | 'user_invoked'),
  sourceMetadata: JSONB,
  resumeToken: TEXT (token to resume execution),
  objectiveId: UUID (linked business object),
  workOrderId: UUID (linked work order),
  requestedAt: TIMESTAMP DEFAULT now(),
  decidedAt: TIMESTAMP,
  decidedBy: UUID (FK → users),
  decisionReason: TEXT,
}
```
- Created by ApprovalGateManager when policy requires human review
- Pauses execution until user approves or denies
- resumeToken used to resume execution after decision
- Audit trail of all approvals (who decided, when, why)

---

### 8. Billing (4 tables)

Subscription state, usage metering, and invoice tracking.

#### billingAccounts
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants, UNIQUE),
  provider: TEXT DEFAULT 'stripe',
  providerCustomerId: TEXT (Stripe customer ID),
  billingEmail: TEXT,
  portalUrl: TEXT (Stripe billing portal link),
  status: TEXT DEFAULT 'not_configured' ('not_configured' | 'active' | 'canceled'),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- Links tenant to Stripe account
- One billing account per tenant (UNIQUE tenantId)

#### billingSubscriptions
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants, UNIQUE),
  billingAccountId: UUID (FK → billingAccounts),
  providerSubscriptionId: TEXT (Stripe subscription ID),
  plan: TEXT DEFAULT 'free' ('free' | 'starter' | 'pro' | 'enterprise'),
  status: TEXT DEFAULT 'not_configured' ('not_configured' | 'active' | 'canceled'),
  interval: TEXT DEFAULT 'month' ('month' | 'year'),
  currentPeriodStart: TIMESTAMP,
  currentPeriodEnd: TIMESTAMP,
  cancelAtPeriodEnd: BOOLEAN DEFAULT false,
  includedRuns: INTEGER (monthly quota),
  includedAgents: INTEGER,
  includedTeamMembers: INTEGER,
  logRetentionDays: INTEGER DEFAULT 30,
  overageUnitAmount: REAL (price per additional run),
  baseAmount: REAL (plan base price),
  currency: TEXT DEFAULT 'usd',
  safetyCapAmount: REAL (max overage charge per month),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- Subscription entitlements and pricing
- Periodically synced from Stripe webhooks
- Usage against quotas tracked via billableUsageLedger

#### billingInvoices
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  billingAccountId: UUID (FK → billingAccounts),
  providerInvoiceId: TEXT UNIQUE (Stripe invoice ID),
  status: TEXT DEFAULT 'draft' ('draft' | 'sent' | 'paid' | 'failed'),
  currency: TEXT DEFAULT 'usd',
  amount: REAL DEFAULT 0,
  periodKey: TEXT (e.g., '2026-03', for month/year grouping),
  periodStart: TIMESTAMP,
  periodEnd: TIMESTAMP,
  invoiceDate: TIMESTAMP DEFAULT now(),
  hostedInvoiceUrl: TEXT (Stripe hosting URL),
  pdfUrl: TEXT,
  items: JSONB (line items),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- Invoices generated at billing cycle end
- Synced from Stripe; one-way writes (no updates after creation)

#### billableUsageLedger
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  runId: UUID (FK → executionRuns, optional),
  source: TEXT ('agent_run' | 'workflow_run' | 'api_call' | 'overage'),
  metric: TEXT ('tokens' | 'runs' | 'api_calls'),
  quantity: REAL DEFAULT 0,
  unit: TEXT ('count' | 'token'),
  billable: BOOLEAN DEFAULT true,
  unitAmount: REAL (price per unit),
  amount: REAL (total: quantity * unitAmount),
  currency: TEXT DEFAULT 'usd',
  periodKey: TEXT (e.g., '2026-03'),
  details: JSONB (agent ID, run details),
  recordedAt: TIMESTAMP DEFAULT now(),
}
```
- Metered usage records that roll up into invoices
- Recorded immediately after each run completes
- Amount calculated at record time based on current pricing
- Supports refunds by negative entries

---

### 9. Operations (4 tables)

Scheduling, usage analytics, audit trails, and webhook handling.

#### schedules
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  targetType: TEXT ('agent' | 'workflow'),
  installationId: UUID (agent or workflow installation ID),
  cron: TEXT (standard cron format, e.g., '*/15 * * * *'),
  enabled: BOOLEAN DEFAULT true,
  lastTriggeredAt: TIMESTAMP,
  createdAt: TIMESTAMP DEFAULT now(),
}
```
- Cron-based trigger definitions
- Worker uses BullMQ repeatable jobs (mapped to these schedules)
- Example: Inbox Triage every 15 minutes → cron: `*/15 * * * *`

#### usageEvents
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  metric: TEXT ('run_count' | 'token_usage' | 'api_calls' | 'memory_usage'),
  value: REAL,
  unit: TEXT ('count' | 'token' | 'MB'),
  recordedAt: TIMESTAMP DEFAULT now(),
}
```
- Raw usage events for analytics and quota tracking
- Distinct from billableUsageLedger (analytics vs. accounting)

#### auditEvents
```typescript
{
  id: UUID (PK),
  tenantId: UUID (FK → tenants),
  actorId: UUID (FK → users),
  action: TEXT ('login' | 'install_agent' | 'approve_request' | 'delete_secret'),
  category: TEXT ('auth' | 'installation' | 'approval' | 'security'),
  details: JSONB (context-specific data),
  timestamp: TIMESTAMP DEFAULT now(),
}
```
- Security audit trail for compliance
- Captures who did what, when, with what result
- Immutable; never deleted

#### webhookEvents
```typescript
{
  id: UUID (PK),
  provider: TEXT ('stripe' | 'n8n' | 'github'),
  providerEventId: TEXT UNIQUE (Stripe event ID),
  tenantId: UUID (FK → tenants, optional for webhook-less events),
  type: TEXT ('invoice.created' | 'charge.succeeded'),
  status: TEXT DEFAULT 'received' ('received' | 'processed' | 'failed'),
  signature: TEXT (HMAC signature from provider),
  payload: JSONB (full webhook body),
  receivedAt: TIMESTAMP DEFAULT now(),
  processedAt: TIMESTAMP,
}
```
- Inbound webhook event log
- Signature verified against provider's public key
- Processed asynchronously by worker

---

### 10. Knowledge (2 tables)

Public knowledge corpus for retrieval-augmented generation (RAG).

#### publicKnowledgeDocuments
```typescript
{
  id: UUID (PK),
  slug: TEXT UNIQUE (URL-friendly identifier),
  title: TEXT (document title),
  sourcePath: TEXT (where document came from),
  sourceType: TEXT DEFAULT 'curated' ('curated' | 'generated'),
  summary: TEXT,
  keywords: JSONB,
  content: TEXT (full markdown),
  checksum: TEXT (SHA256 for change detection),
  publishedAt: TIMESTAMP DEFAULT now(),
  createdAt: TIMESTAMP DEFAULT now(),
  updatedAt: TIMESTAMP DEFAULT now(),
}
```
- Shared knowledge documents (available to all tenants)
- Used for semantic search in agent prompts
- Example: "How to use Gmail API", "Company policies"

#### publicKnowledgeChunks
```typescript
{
  id: UUID (PK),
  documentId: UUID (FK → publicKnowledgeDocuments),
  chunkIndex: INTEGER,
  heading: TEXT (section title),
  content: TEXT (chunk body),
  keywords: JSONB,
  tokenCount: INTEGER,
  embeddingModel: TEXT (e.g., 'text-embedding-3-small'),
  embedding: JSONB (vector, pgvector format [0.123, 0.456, ...]),
  createdAt: TIMESTAMP DEFAULT now(),
}
```
- Chunked knowledge for semantic search
- Embedding stored as pgvector for similarity search
- Example query: find chunks similar to agent's question

---

## Entity Relationships Diagram

```
users (1) ──────────────────── (many) memberships ──────────────── (1) tenants
   ↓
   └─ (1) userIdentities (1..0)
   ├─ (1) userOauthStates (1..0)
   ├─ (1) oauthLoginCodes (1..0)
   ├─ (1) passwordResetTokens (1..0)
   └─ (1) approvalRequests (decided_by) (1..0)

tenants (1) ──────────────────────────────────────────────────────────────┬─ (many) connectorAccounts
           ├─ (many) agentInstallations (1) ──── (many) executionRuns (1) ──── (many) executionSteps
           ├─ (many) workflowInstallations (1) ──┘
           ├─ (many) approvalRequests
           ├─ (many) schedules
           ├─ (many) usageEvents
           ├─ (many) auditEvents
           ├─ (many) webhookEvents
           ├─ (1) billingAccounts ────────── (1) billingSubscriptions
           ├─ (many) billingInvoices
           ├─ (many) billableUsageLedger
           ├─ (many) secretEnvelopes
           ├─ (many) connectorOauthStates
           └─ (1) tenantSsoConnections

executionRuns (1) ──────────────────┬─ (many) executionSteps
                   ├─ (many) billableUsageLedger
                   └─ (many) approvalRequests

connectorAccounts (1) ────────────── (many) secretEnvelopes

publicKnowledgeDocuments (1) ────── (many) publicKnowledgeChunks
```

---

## Migration System (Drizzle Kit)

### How Migrations Work

1. **Defining Schema**: Edit `packages/db/src/schema.ts` with Drizzle definitions
2. **Generating Migration**: `pnpm db:generate` produces SQL in `packages/db/drizzle/`
3. **Reviewing**: Inspect generated SQL for correctness
4. **Applying**: `pnpm db:migrate` executes pending migrations against database
5. **Seeding**: `pnpm db:seed` loads demo users, tenants, and clinic-domain fixtures

### Example: Adding a Column

```bash
# 1. Edit schema.ts
# agentInstallations: add maximumRunsPerDay?: integer

# 2. Generate migration
pnpm db:generate
# → creates drizzle/0003_add_max_runs_per_day.sql

# 3. Review SQL
cat packages/db/drizzle/0003_add_max_runs_per_day.sql
# → ALTER TABLE agent_installations ADD COLUMN maximum_runs_per_day INTEGER DEFAULT 100;

# 4. Apply
pnpm db:migrate
```

---

## Clinic Domain Foundation

The schema now includes a clinic-domain layer that coexists with the original
platform control-plane tables.

### Clinic configuration

- `clinic_profiles`
- `tenant_modules`
- `clinic_channels`

`tenant_modules` now behaves as a plan-aware entitlement layer rather than a
simple set of UI toggles: the backend starts from the tenant plan baseline and
then applies persisted tenant overrides for status, visibility, and config.

### Patients and inbox

- `patients`
- `patient_identities`
- `conversation_threads`
- `conversation_messages`
- `call_sessions`

### Forms and scheduling catalogs

- `intake_form_templates`
- `intake_form_submissions`
- `clinic_services`
- `practitioners`
- `clinic_locations`

### Appointments and follow-up

- `appointments`
- `appointment_events`
- `reminder_jobs`
- `confirmation_requests`

### Recovery and growth workflows

- `waitlist_requests`
- `gap_opportunities`
- `gap_outreach_attempts`
- `reactivation_campaigns`
- `reactivation_recipients`

These tables are all tenant-scoped and now back the active clinic API families
in `services/api`. The same model now also backs the clinic tenant shell in
`apps/web`; later phases add deeper vertical endpoints and richer management
surfaces, not the initial clinic UI foundation.

---

## Encryption at Rest

### Connector Tokens (AES-256-GCM)

When a user connects a Gmail account:

1. OAuth flow completes → API receives accessToken, refreshToken
2. Before storing in `connectorAccounts`:
   - Generate random IV (16 bytes)
   - Encrypt with AES-256-GCM (master key from env: `ENCRYPTION_KEY`)
   - Store: `{ encryptedValue, iv, tag }` as cipher text
3. On read (when executing agent):
   - Decrypt using IV + key
   - Verify authentication tag
   - Return plaintext token to toolkit

### Key Rotation

- Master key (ENCRYPTION_KEY) rotated annually
- Re-encrypts all secretEnvelopes with new key (batch job)
- Old secrets marked with rotatedAt timestamp

---

## Seed Data

Initial data loaded via `pnpm db:seed`:

1. **Admin User**: `admin@agentmou.dev`
2. **Generic Tenant**: `Demo Workspace`
3. **Clinic Tenant**: `Dental Demo Clinic`
4. **Clinic Fixtures**: clinic profile, enabled modules, WhatsApp and voice
   channels, seeded patients, conversation threads, call session, intake form
   template/submission, appointments, reminder/confirmation state, an open gap,
   and a running reactivation campaign

---

## Query Patterns & Optimization

### Common Query: Fetch all runs for a tenant

```typescript
const runs = db
  .select()
  .from(executionRuns)
  .where(eq(executionRuns.tenantId, tenantId))
  .orderBy(desc(executionRuns.startedAt))
  .limit(50);

// Indexed by (tenantId, startedAt) for efficient sorting
```

### Common Query: Approval pending for user

```typescript
const pending = db
  .select()
  .from(approvalRequests)
  .where(
    and(
      eq(approvalRequests.tenantId, userTenantId),
      eq(approvalRequests.status, 'pending')
    )
  )
  .orderBy(desc(approvalRequests.requestedAt));

// Indexed by (tenantId, status)
```

### Performance Considerations

- **Composite indexes**: (tenantId, status), (tenantId, createdAt)
- **Partial indexes**: For pending approvals only (WHERE status = 'pending')
- **Denormalization**: runsTotal, runsSuccess cached in agentInstallations (no GROUP BY)
- **Partitioning**: executionSteps partitioned by month (archive old steps to cold storage)

---

## Related Documentation

- **[Architecture Overview](./overview.md)**: System topology and data flow
- **[Agent Engine](./agent-engine.md)**: How execution steps are logged
- **[Repository Map](../repo-map.md)**: db/ package structure
