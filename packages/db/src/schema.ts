import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  real,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** Platform users that can belong to one or more tenants. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

/** Tenant records that scope platform data and memberships. */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull().default('business'),
  plan: text('plan').notNull().default('free'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Memberships (user ↔ tenant)
// ---------------------------------------------------------------------------

/** Join table linking users to tenants with a role. */
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  role: text('role').notNull().default('viewer'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Connector Accounts
// ---------------------------------------------------------------------------

/** Tenant-scoped OAuth and connector account records. */
export const connectorAccounts = pgTable('connector_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provider: text('provider').notNull(),
  status: text('status').notNull().default('disconnected'),
  scopes: jsonb('scopes').default([]),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  externalAccountId: text('external_account_id'),
  connectedAt: timestamp('connected_at'),
  lastTestAt: timestamp('last_test_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Connector OAuth States (CSRF protection during OAuth dance)
// ---------------------------------------------------------------------------

/** Short-lived OAuth state rows used during connector authorization. */
export const connectorOauthStates = pgTable('connector_oauth_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provider: text('provider').notNull(),
  state: text('state').notNull().unique(),
  redirectUrl: text('redirect_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

// ---------------------------------------------------------------------------
// Secret Envelopes
// ---------------------------------------------------------------------------

/** Encrypted secret values stored per tenant. */
export const secretEnvelopes = pgTable('secret_envelopes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  key: text('key').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  connectorAccountId: uuid('connector_account_id').references(
    () => connectorAccounts.id
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  rotatedAt: timestamp('rotated_at'),
});

// ---------------------------------------------------------------------------
// Agent Installations
// ---------------------------------------------------------------------------

/** Installed agent records created for a tenant. */
export const agentInstallations = pgTable('agent_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  templateId: text('template_id').notNull(),
  status: text('status').notNull().default('configuring'),
  config: jsonb('config').default({}),
  hitlEnabled: boolean('hitl_enabled').notNull().default(true),
  installedAt: timestamp('installed_at').defaultNow().notNull(),
  lastRunAt: timestamp('last_run_at'),
  runsTotal: integer('runs_total').notNull().default(0),
  runsSuccess: integer('runs_success').notNull().default(0),
});

// ---------------------------------------------------------------------------
// Workflow Installations
// ---------------------------------------------------------------------------

/** Installed workflow records created for a tenant. */
export const workflowInstallations = pgTable('workflow_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  templateId: text('template_id').notNull(),
  status: text('status').notNull().default('configuring'),
  config: jsonb('config').default({}),
  n8nWorkflowId: text('n8n_workflow_id'),
  installedAt: timestamp('installed_at').defaultNow().notNull(),
  lastRunAt: timestamp('last_run_at'),
  runsTotal: integer('runs_total').notNull().default(0),
  runsSuccess: integer('runs_success').notNull().default(0),
});

// ---------------------------------------------------------------------------
// Execution Runs
// ---------------------------------------------------------------------------

/** Top-level execution records for agent and workflow runs. */
export const executionRuns = pgTable('execution_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  agentInstallationId: uuid('agent_installation_id').references(
    () => agentInstallations.id
  ),
  workflowInstallationId: uuid('workflow_installation_id').references(
    () => workflowInstallations.id
  ),
  status: text('status').notNull().default('running'),
  triggeredBy: text('triggered_by').notNull().default('manual'),
  durationMs: integer('duration_ms'),
  costEstimate: real('cost_estimate').default(0),
  tokensUsed: integer('tokens_used').default(0),
  tags: jsonb('tags').default([]),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// ---------------------------------------------------------------------------
// Execution Steps
// ---------------------------------------------------------------------------

/** Step-level execution records belonging to a run. */
export const executionSteps = pgTable('execution_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => executionRuns.id),
  type: text('type').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('running'),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  tokenUsage: integer('token_usage'),
  cost: real('cost'),
  durationMs: integer('duration_ms'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// ---------------------------------------------------------------------------
// Approval Requests
// ---------------------------------------------------------------------------

/** Human approval requests linked to an execution run. */
export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  runId: uuid('run_id')
    .notNull()
    .references(() => executionRuns.id),
  agentInstallationId: uuid('agent_installation_id').references(
    () => agentInstallations.id
  ),
  actionType: text('action_type').notNull(),
  riskLevel: text('risk_level').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  payloadPreview: jsonb('payload_preview').default({}),
  context: jsonb('context').default({}),
  status: text('status').notNull().default('pending'),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  decidedAt: timestamp('decided_at'),
  decidedBy: uuid('decided_by').references(() => users.id),
  decisionReason: text('decision_reason'),
});

// ---------------------------------------------------------------------------
// Audit Events
// ---------------------------------------------------------------------------

/** Tenant audit log records for security and governance actions. */
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  category: text('category').notNull(),
  details: jsonb('details').default({}),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Schedules (cron-based triggers)
// ---------------------------------------------------------------------------

/** Cron-backed schedule definitions for installed assets. */
export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  targetType: text('target_type').notNull(),
  installationId: uuid('installation_id').notNull(),
  cron: text('cron').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Usage Events (metering)
// ---------------------------------------------------------------------------

/** Raw usage events captured for metering and reporting. */
export const usageEvents = pgTable('usage_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  metric: text('metric').notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Billing Accounts
// ---------------------------------------------------------------------------

/** Billing account configuration stored per tenant. */
export const billingAccounts = pgTable('billing_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id),
  provider: text('provider').notNull().default('stripe'),
  providerCustomerId: text('provider_customer_id'),
  billingEmail: text('billing_email'),
  portalUrl: text('portal_url'),
  status: text('status').notNull().default('not_configured'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Billing Subscriptions
// ---------------------------------------------------------------------------

/** Billing subscription state and entitlements per tenant. */
export const billingSubscriptions = pgTable('billing_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id),
  billingAccountId: uuid('billing_account_id').references(() => billingAccounts.id),
  providerSubscriptionId: text('provider_subscription_id'),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('not_configured'),
  interval: text('interval').notNull().default('month'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  includedRuns: integer('included_runs').notNull().default(0),
  includedAgents: integer('included_agents').notNull().default(0),
  includedTeamMembers: integer('included_team_members').notNull().default(0),
  logRetentionDays: integer('log_retention_days').notNull().default(30),
  overageUnitAmount: real('overage_unit_amount').notNull().default(0),
  baseAmount: real('base_amount').notNull().default(0),
  currency: text('currency').notNull().default('usd'),
  safetyCapAmount: real('safety_cap_amount').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Billing Invoices
// ---------------------------------------------------------------------------

/** Billing invoice records produced for a tenant. */
export const billingInvoices = pgTable('billing_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  billingAccountId: uuid('billing_account_id').references(() => billingAccounts.id),
  providerInvoiceId: text('provider_invoice_id').unique(),
  status: text('status').notNull().default('draft'),
  currency: text('currency').notNull().default('usd'),
  amount: real('amount').notNull().default(0),
  periodKey: text('period_key'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  invoiceDate: timestamp('invoice_date').defaultNow().notNull(),
  hostedInvoiceUrl: text('hosted_invoice_url'),
  pdfUrl: text('pdf_url'),
  items: jsonb('items').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Billable Usage Ledger
// ---------------------------------------------------------------------------

/** Metered ledger rows that can roll up into invoices. */
export const billableUsageLedger = pgTable('billable_usage_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  runId: uuid('run_id').references(() => executionRuns.id),
  source: text('source').notNull(),
  metric: text('metric').notNull(),
  quantity: real('quantity').notNull().default(0),
  unit: text('unit').notNull(),
  billable: boolean('billable').notNull().default(true),
  unitAmount: real('unit_amount').notNull().default(0),
  amount: real('amount').notNull().default(0),
  currency: text('currency').notNull().default('usd'),
  periodKey: text('period_key').notNull(),
  details: jsonb('details').default({}),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Webhook Events
// ---------------------------------------------------------------------------

/** Stored inbound webhook events from external providers. */
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  providerEventId: text('provider_event_id').notNull().unique(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  type: text('type').notNull(),
  status: text('status').notNull().default('received'),
  signature: text('signature'),
  payload: jsonb('payload').default({}),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

// ---------------------------------------------------------------------------
// Public Knowledge Corpus
// ---------------------------------------------------------------------------

/** Curated public knowledge documents used by retrieval-backed experiences. */
export const publicKnowledgeDocuments = pgTable('public_knowledge_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  sourcePath: text('source_path').notNull(),
  sourceType: text('source_type').notNull().default('curated'),
  summary: text('summary'),
  keywords: jsonb('keywords').default([]),
  content: text('content').notNull(),
  checksum: text('checksum'),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Chunks derived from public knowledge documents for retrieval workflows. */
export const publicKnowledgeChunks = pgTable('public_knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => publicKnowledgeDocuments.id),
  chunkIndex: integer('chunk_index').notNull(),
  heading: text('heading'),
  content: text('content').notNull(),
  keywords: jsonb('keywords').default([]),
  tokenCount: integer('token_count').notNull().default(0),
  embeddingModel: text('embedding_model'),
  embedding: jsonb('embedding').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
