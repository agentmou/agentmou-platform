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

export const connectorAccounts = pgTable('connector_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provider: text('provider').notNull(),
  status: text('status').notNull().default('disconnected'),
  scopes: jsonb('scopes').default([]),
  lastTestAt: timestamp('last_test_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Secret Envelopes
// ---------------------------------------------------------------------------

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
// Usage Events (metering)
// ---------------------------------------------------------------------------

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
