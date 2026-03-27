import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  real,
  uniqueIndex,
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
// User identities (OAuth / enterprise IdP)
// ---------------------------------------------------------------------------

/** Links a platform user to an external IdP subject (Google, Microsoft, SAML, etc.). */
export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    emailSnapshot: text('email_snapshot'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_identities_provider_subject_uidx').on(
      table.provider,
      table.providerSubject,
    ),
  ],
);

/** Short-lived OAuth state for B2C login (CSRF + return URL). */
export const userOauthStates = pgTable('user_oauth_states', {
  id: uuid('id').primaryKey().defaultRandom(),
  state: text('state').notNull().unique(),
  provider: text('provider').notNull(),
  returnUrl: text('return_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

/** One-time codes exchanged by the web app for a JWT after OAuth redirect. */
export const oauthLoginCodes = pgTable('oauth_login_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  codeHash: text('code_hash').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
});

/**
 * Tenant-level SSO configuration (SAML/OIDC via WorkOS, Auth0, or custom).
 * Schema placeholder; connection flows are documented in ADR.
 */
export const tenantSsoConnections = pgTable('tenant_sso_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  connectionType: text('connection_type').notNull(),
  providerKey: text('provider_key'),
  idpMetadataUrl: text('idp_metadata_url'),
  verifiedDomains: jsonb('verified_domains').default([]),
  enabled: boolean('enabled').notNull().default(false),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
// Internal Ops Agent Registry
// ---------------------------------------------------------------------------

/** Internal organizational agents used to run Agentmou itself. */
export const internalAgentProfiles = pgTable('internal_agent_profiles', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  roleTitle: text('role_title').notNull(),
  department: text('department').notNull(),
  mission: text('mission').notNull(),
  parentAgentId: text('parent_agent_id'),
  kpis: jsonb('kpis').default([]),
  allowedTools: jsonb('allowed_tools').default([]),
  allowedCapabilities: jsonb('allowed_capabilities').default([]),
  allowedWorkflowTags: jsonb('allowed_workflow_tags').default([]),
  memoryScope: text('memory_scope').notNull(),
  riskBudget: text('risk_budget').notNull().default('low'),
  participantBudget: integer('participant_budget').notNull().default(4),
  maxDelegationDepth: integer('max_delegation_depth').notNull().default(3),
  escalationPolicy: text('escalation_policy').notNull(),
  playbooks: jsonb('playbooks').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Hierarchical links between internal organizational agents. */
export const internalAgentRelationships = pgTable('internal_agent_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  parentAgentId: text('parent_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  childAgentId: text('child_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  relationship: text('relationship').notNull().default('manages'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Internal Ops Sessions And Objectives
// ---------------------------------------------------------------------------

/** Channel session state for the internal multi-agent operating system. */
export const internalConversationSessions = pgTable('internal_conversation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  channel: text('channel').notNull(),
  externalChatId: text('external_chat_id').notNull(),
  externalUserId: text('external_user_id').notNull(),
  status: text('status').notNull().default('active'),
  currentObjectiveId: uuid('current_objective_id'),
  openclawSessionId: text('openclaw_session_id'),
  lastMessage: text('last_message'),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Objectives tracked across internal multi-agent sessions. */
export const internalObjectives = pgTable('internal_objectives', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => internalConversationSessions.id),
  runId: uuid('run_id')
    .notNull()
    .references(() => executionRuns.id),
  ownerAgentId: text('owner_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  rootAgentId: text('root_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  openclawSessionId: text('openclaw_session_id'),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  status: text('status').notNull().default('active'),
  requestedBy: text('requested_by').notNull(),
  sourceMessage: text('source_message').notNull(),
  coherenceSummary: jsonb('coherence_summary').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// ---------------------------------------------------------------------------
// Internal Ops Delegations, Work Orders, Decisions
// ---------------------------------------------------------------------------

/** Delegations exchanged between internal organizational agents. */
export const internalDelegations = pgTable('internal_delegations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  objectiveId: uuid('objective_id')
    .notNull()
    .references(() => internalObjectives.id),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => internalConversationSessions.id),
  senderAgentId: text('sender_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  recipientAgentId: text('recipient_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  parentDelegationId: uuid('parent_delegation_id'),
  depth: integer('depth').notNull().default(0),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('created'),
  envelope: jsonb('envelope').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

/** Typed work orders emitted by the internal orchestrator for execution. */
export const internalWorkOrders = pgTable('internal_work_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  objectiveId: uuid('objective_id')
    .notNull()
    .references(() => internalObjectives.id),
  delegationId: uuid('delegation_id').references(() => internalDelegations.id),
  parentDelegationId: uuid('parent_delegation_id').references(
    () => internalDelegations.id
  ),
  agentId: text('agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  workType: text('work_type').notNull(),
  status: text('status').notNull().default('queued'),
  executionTarget: text('execution_target').notNull().default('native'),
  capabilityKey: text('capability_key'),
  openclawSessionId: text('openclaw_session_id'),
  executionRunId: uuid('execution_run_id').references(() => executionRuns.id),
  resumeFromWorkOrderId: uuid('resume_from_work_order_id'),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  approvalRequestId: uuid('approval_request_id'),
  payload: jsonb('payload').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

/** Decisions and review outcomes attached to internal objectives. */
export const internalDecisions = pgTable('internal_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  objectiveId: uuid('objective_id')
    .notNull()
    .references(() => internalObjectives.id),
  workOrderId: uuid('work_order_id').references(() => internalWorkOrders.id),
  agentId: text('agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  outcome: text('outcome').notNull(),
  summary: text('summary').notNull(),
  rationale: text('rationale').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Artifacts produced by internal work orders and review loops. */
export const internalArtifacts = pgTable('internal_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  objectiveId: uuid('objective_id')
    .notNull()
    .references(() => internalObjectives.id),
  workOrderId: uuid('work_order_id').references(() => internalWorkOrders.id),
  executionRunId: uuid('execution_run_id').references(() => executionRuns.id),
  agentId: text('agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  artifactType: text('artifact_type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Persisted protocol envelopes and coherence cycle outputs for auditability. */
export const internalProtocolEvents = pgTable('internal_protocol_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  sessionId: uuid('session_id').references(() => internalConversationSessions.id),
  objectiveId: uuid('objective_id').references(() => internalObjectives.id),
  delegationId: uuid('delegation_id').references(() => internalDelegations.id),
  remoteSessionId: text('remote_session_id'),
  source: text('source').notNull(),
  sourceEventId: text('source_event_id'),
  eventKey: text('event_key').unique(),
  eventType: text('event_type').notNull(),
  businessEnvelope: jsonb('business_envelope').default({}),
  coherenceArtifacts: jsonb('coherence_artifacts').default({}),
  traceReference: jsonb('trace_reference').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Structured memory entries for objectives, sessions, and agents. */
export const internalMemoryEntries = pgTable('internal_memory_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  objectiveId: uuid('objective_id').references(() => internalObjectives.id),
  sessionId: uuid('session_id').references(() => internalConversationSessions.id),
  agentId: text('agent_id').references(() => internalAgentProfiles.id),
  scope: text('scope').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Bound OpenClaw remote sessions for internal objectives. */
export const internalOpenClawSessions = pgTable('internal_openclaw_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  objectiveId: uuid('objective_id')
    .notNull()
    .references(() => internalObjectives.id),
  remoteSessionId: text('remote_session_id').notNull().unique(),
  status: text('status').notNull().default('active'),
  activeAgentId: text('active_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  primaryAgentId: text('primary_agent_id')
    .notNull()
    .references(() => internalAgentProfiles.id),
  traceReference: jsonb('trace_reference').default({}),
  metadata: jsonb('metadata').default({}),
  lastTurnAt: timestamp('last_turn_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Telegram message ledger for inbound and outbound operator communication. */
export const internalTelegramMessages = pgTable('internal_telegram_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  sessionId: uuid('session_id').references(() => internalConversationSessions.id),
  objectiveId: uuid('objective_id').references(() => internalObjectives.id),
  direction: text('direction').notNull(),
  mode: text('mode').notNull(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id'),
  updateId: integer('update_id'),
  messageId: integer('message_id'),
  callbackQueryId: text('callback_query_id'),
  dedupeKey: text('dedupe_key').notNull().unique(),
  payload: jsonb('payload').default({}),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Tenant-scoped bindings from internal capabilities to execution targets. */
export const internalCapabilityBindings = pgTable('internal_capability_bindings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  capabilityKey: text('capability_key').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  targetType: text('target_type').notNull(),
  agentInstallationId: uuid('agent_installation_id').references(
    () => agentInstallations.id
  ),
  workflowInstallationId: uuid('workflow_installation_id').references(
    () => workflowInstallations.id
  ),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  source: text('source'),
  sourceMetadata: jsonb('source_metadata').default({}),
  resumeToken: text('resume_token'),
  objectiveId: uuid('objective_id'),
  workOrderId: uuid('work_order_id'),
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
