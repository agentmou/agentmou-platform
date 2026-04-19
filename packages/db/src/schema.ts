import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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
  emailVerifiedAt: timestamp('email_verified_at'),
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
  status: text('status').notNull().default('active'),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Vertical-scoped configuration records for future multi-vertical shells. */
export const tenantVerticalConfigs = pgTable(
  'tenant_vertical_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    verticalKey: text('vertical_key').notNull(),
    config: jsonb('config').default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tenant_vertical_configs_tenant_vertical_uidx').on(
      table.tenantId,
      table.verticalKey
    ),
    index('tenant_vertical_configs_tenant_idx').on(table.tenantId),
  ]
);

// ---------------------------------------------------------------------------
// Memberships (user ↔ tenant)
// ---------------------------------------------------------------------------

/** Join table linking users to tenants with a role. */
export const memberships = pgTable(
  'memberships',
  {
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
  },
  (table) => [
    uniqueIndex('memberships_tenant_user_uidx').on(table.tenantId, table.userId),
    index('memberships_tenant_idx').on(table.tenantId),
    index('memberships_user_idx').on(table.userId),
  ]
);

// ---------------------------------------------------------------------------
// Admin impersonation sessions
// ---------------------------------------------------------------------------

/** Time-bounded admin impersonation sessions used for support/debug workflows. */
export const adminImpersonationSessions = pgTable(
  'admin_impersonation_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id),
    actorTenantId: uuid('actor_tenant_id')
      .notNull()
      .references(() => tenants.id),
    targetUserId: uuid('target_user_id')
      .notNull()
      .references(() => users.id),
    targetTenantId: uuid('target_tenant_id')
      .notNull()
      .references(() => tenants.id),
    reason: text('reason'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
    expiresAt: timestamp('expires_at').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
  },
  (table) => [
    index('admin_impersonation_sessions_actor_tenant_idx').on(table.actorTenantId),
    index('admin_impersonation_sessions_target_tenant_idx').on(table.targetTenantId),
    index('admin_impersonation_sessions_target_user_idx').on(table.targetUserId),
  ]
);

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
    uniqueIndex('user_identities_provider_subject_uidx').on(table.provider, table.providerSubject),
  ]
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

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionTokenHash: text('session_token_hash').notNull(),
    sessionType: text('session_type').notNull().default('standard'),
    adminImpersonationSessionId: uuid('admin_impersonation_session_id').references(
      () => adminImpersonationSessions.id,
      {
        onDelete: 'set null',
      }
    ),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_sessions_session_token_hash_uidx').on(table.sessionTokenHash),
    index('auth_sessions_user_idx').on(table.userId),
    index('auth_sessions_expires_idx').on(table.expiresAt),
    index('auth_sessions_impersonation_idx').on(table.adminImpersonationSessionId),
  ]
);

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
  connectorAccountId: uuid('connector_account_id').references(() => connectorAccounts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  rotatedAt: timestamp('rotated_at'),
});

// ---------------------------------------------------------------------------
// Clinic domain
// ---------------------------------------------------------------------------

/** Tenant-scoped clinic profile that powers the vertical product experience. */
export const clinicProfiles = pgTable(
  'clinic_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    vertical: text('vertical').notNull().default('clinic_dental'),
    specialty: text('specialty'),
    displayName: text('display_name').notNull(),
    timezone: text('timezone').notNull(),
    businessHours: jsonb('business_hours').default({}),
    defaultInboundChannel: text('default_inbound_channel'),
    requiresNewPatientForm: boolean('requires_new_patient_form').notNull().default(false),
    confirmationPolicy: jsonb('confirmation_policy').default({}),
    gapRecoveryPolicy: jsonb('gap_recovery_policy').default({}),
    reactivationPolicy: jsonb('reactivation_policy').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('clinic_profiles_tenant_uidx').on(table.tenantId),
    index('clinic_profiles_vertical_idx').on(table.vertical),
  ]
);

/** Product modules that can be enabled or hidden per tenant. */
export const tenantModules = pgTable(
  'tenant_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    moduleKey: text('module_key').notNull(),
    status: text('status').notNull().default('enabled'),
    visibleToClient: boolean('visible_to_client').notNull().default(true),
    planLevel: text('plan_level').notNull().default('free'),
    config: jsonb('config').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tenant_modules_tenant_key_uidx').on(table.tenantId, table.moduleKey),
    index('tenant_modules_tenant_status_idx').on(table.tenantId, table.status),
  ]
);

/** Channel configuration for WhatsApp and voice connectivity. */
export const clinicChannels = pgTable(
  'clinic_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    channelType: text('channel_type').notNull(),
    directionPolicy: jsonb('direction_policy').default({}),
    provider: text('provider').notNull(),
    connectorAccountId: uuid('connector_account_id').references(() => connectorAccounts.id),
    status: text('status').notNull().default('inactive'),
    phoneNumber: text('phone_number'),
    config: jsonb('config').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('clinic_channels_tenant_idx').on(table.tenantId),
    index('clinic_channels_tenant_status_idx').on(table.tenantId, table.status),
    index('clinic_channels_tenant_phone_idx').on(table.tenantId, table.phoneNumber),
    index('clinic_channels_tenant_type_status_idx').on(
      table.tenantId,
      table.channelType,
      table.status
    ),
  ]
);

/** Canonical patient records surfaced to clinic staff. */
export const patients = pgTable(
  'patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    externalPatientId: text('external_patient_id'),
    status: text('status').notNull().default('new_lead'),
    isExisting: boolean('is_existing').notNull().default(false),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone'),
    email: text('email'),
    dateOfBirth: date('date_of_birth', { mode: 'string' }),
    notes: text('notes'),
    consentFlags: jsonb('consent_flags').default({}),
    source: text('source').notNull().default('manual'),
    lastInteractionAt: timestamp('last_interaction_at'),
    nextSuggestedActionAt: timestamp('next_suggested_action_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('patients_tenant_external_uidx').on(table.tenantId, table.externalPatientId),
    index('patients_tenant_status_idx').on(table.tenantId, table.status),
    index('patients_tenant_phone_idx').on(table.tenantId, table.phone),
    index('patients_tenant_last_inter_idx').on(table.tenantId, table.lastInteractionAt),
    index('patients_tenant_next_action_idx').on(table.tenantId, table.nextSuggestedActionAt),
  ]
);

/** Alternate identities used to match inbound traffic to patients. */
export const patientIdentities = pgTable(
  'patient_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    identityType: text('identity_type').notNull(),
    identityValue: text('identity_value').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    confidenceScore: real('confidence_score').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('patient_identities_value_uidx').on(
      table.tenantId,
      table.patientId,
      table.identityType,
      table.identityValue
    ),
    index('patient_identities_match_idx').on(
      table.tenantId,
      table.identityType,
      table.identityValue
    ),
    index('patient_identities_patient_idx').on(table.patientId),
  ]
);

/** Omnichannel inbox threads that group messages and operational actions. */
export const conversationThreads = pgTable(
  'conversation_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    patientId: uuid('patient_id').references(() => patients.id),
    channelType: text('channel_type').notNull(),
    status: text('status').notNull().default('new'),
    intent: text('intent').notNull().default('general_inquiry'),
    priority: text('priority').notNull().default('normal'),
    source: text('source').notNull().default('system'),
    assignedUserId: uuid('assigned_user_id').references(() => users.id),
    lastMessageAt: timestamp('last_message_at'),
    lastInboundAt: timestamp('last_inbound_at'),
    lastOutboundAt: timestamp('last_outbound_at'),
    requiresHumanReview: boolean('requires_human_review').notNull().default(false),
    resolution: text('resolution'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('conversation_threads_tenant_status_idx').on(table.tenantId, table.status),
    index('conversation_threads_tenant_last_msg_idx').on(table.tenantId, table.lastMessageAt),
    index('conversation_threads_tenant_type_status_idx').on(
      table.tenantId,
      table.channelType,
      table.status
    ),
    index('conversation_threads_patient_idx').on(table.patientId),
  ]
);

/** Individual messages and system events captured inside a conversation thread. */
export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => conversationThreads.id),
    patientId: uuid('patient_id').references(() => patients.id),
    direction: text('direction').notNull(),
    channelType: text('channel_type').notNull(),
    messageType: text('message_type').notNull().default('text'),
    body: text('body').notNull().default(''),
    payload: jsonb('payload').default({}),
    deliveryStatus: text('delivery_status').notNull().default('received'),
    providerMessageId: text('provider_message_id'),
    sentAt: timestamp('sent_at'),
    receivedAt: timestamp('received_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('conversation_messages_provider_uidx').on(table.tenantId, table.providerMessageId),
    index('conversation_messages_thread_idx').on(table.threadId),
    index('conversation_messages_tenant_thread_idx').on(table.tenantId, table.threadId),
    index('conversation_messages_tenant_status_idx').on(table.tenantId, table.deliveryStatus),
  ]
);

/** Voice sessions linked to patients and inbox threads when available. */
export const callSessions = pgTable(
  'call_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    patientId: uuid('patient_id').references(() => patients.id),
    threadId: uuid('thread_id').references(() => conversationThreads.id),
    direction: text('direction').notNull(),
    status: text('status').notNull().default('received'),
    provider: text('provider'),
    providerCallId: text('provider_call_id'),
    externalCallId: text('external_call_id'),
    fromNumber: text('from_number').notNull(),
    toNumber: text('to_number').notNull(),
    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    summary: text('summary'),
    transcript: text('transcript'),
    resolution: text('resolution'),
    metadata: jsonb('metadata').default({}),
    requiresHumanReview: boolean('requires_human_review').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('call_sessions_provider_uidx').on(table.tenantId, table.providerCallId),
    index('call_sessions_tenant_status_idx').on(table.tenantId, table.status),
    index('call_sessions_tenant_started_idx').on(table.tenantId, table.startedAt),
    index('call_sessions_patient_idx').on(table.patientId),
    index('call_sessions_thread_idx').on(table.threadId),
  ]
);

/** Reusable intake form templates sent to patients as part of booking flows. */
export const intakeFormTemplates = pgTable(
  'intake_form_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    version: text('version').notNull(),
    schema: jsonb('schema').default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('intake_form_templates_uidx').on(table.tenantId, table.slug, table.version),
    index('intake_form_templates_tenant_active_idx').on(table.tenantId, table.isActive),
  ]
);

/** Individual form deliveries and submission states for a patient or thread. */
export const intakeFormSubmissions = pgTable(
  'intake_form_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    templateId: uuid('template_id')
      .notNull()
      .references(() => intakeFormTemplates.id),
    patientId: uuid('patient_id').references(() => patients.id),
    threadId: uuid('thread_id').references(() => conversationThreads.id),
    status: text('status').notNull().default('pending'),
    answers: jsonb('answers').default({}),
    sentAt: timestamp('sent_at'),
    openedAt: timestamp('opened_at'),
    completedAt: timestamp('completed_at'),
    expiresAt: timestamp('expires_at'),
    requiredForBooking: boolean('required_for_booking').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('intake_form_submissions_tenant_status_idx').on(table.tenantId, table.status),
    index('intake_form_submissions_patient_idx').on(table.patientId),
    index('intake_form_submissions_thread_idx').on(table.threadId),
    index('intake_form_submissions_template_idx').on(table.templateId),
  ]
);

/** Service catalog visible to the clinic for booking and waitlist workflows. */
export const clinicServices = pgTable(
  'clinic_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    externalServiceId: text('external_service_id'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    active: boolean('active').notNull().default(true),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('clinic_services_tenant_slug_uidx').on(table.tenantId, table.slug),
    uniqueIndex('clinic_services_tenant_ext_uidx').on(table.tenantId, table.externalServiceId),
    index('clinic_services_tenant_active_idx').on(table.tenantId, table.active),
  ]
);

/** Provider catalog used for appointment routing and queue filtering. */
export const practitioners = pgTable(
  'practitioners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    externalPractitionerId: text('external_practitioner_id'),
    name: text('name').notNull(),
    specialty: text('specialty'),
    active: boolean('active').notNull().default(true),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('practitioners_tenant_ext_uidx').on(table.tenantId, table.externalPractitionerId),
    index('practitioners_tenant_active_idx').on(table.tenantId, table.active),
  ]
);

/** Clinic locations used for multi-site scheduling and future enterprise support. */
export const clinicLocations = pgTable(
  'clinic_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    externalLocationId: text('external_location_id'),
    name: text('name').notNull(),
    address: text('address'),
    phone: text('phone'),
    active: boolean('active').notNull().default(true),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('clinic_locations_tenant_ext_uidx').on(table.tenantId, table.externalLocationId),
    index('clinic_locations_tenant_active_idx').on(table.tenantId, table.active),
  ]
);

/** Canonical appointment records for the clinic-facing control center. */
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    externalAppointmentId: text('external_appointment_id'),
    serviceId: uuid('service_id').references(() => clinicServices.id),
    practitionerId: uuid('practitioner_id').references(() => practitioners.id),
    locationId: uuid('location_id').references(() => clinicLocations.id),
    threadId: uuid('thread_id').references(() => conversationThreads.id),
    status: text('status').notNull().default('draft'),
    source: text('source').notNull().default('manual'),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),
    bookedAt: timestamp('booked_at').notNull().defaultNow(),
    confirmationStatus: text('confirmation_status').notNull().default('pending'),
    reminderStatus: text('reminder_status').notNull().default('pending'),
    cancellationReason: text('cancellation_reason'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('appointments_tenant_ext_uidx').on(table.tenantId, table.externalAppointmentId),
    index('appointments_tenant_status_idx').on(table.tenantId, table.status),
    index('appointments_tenant_starts_at_idx').on(table.tenantId, table.startsAt),
    index('appointments_tenant_conf_idx').on(table.tenantId, table.confirmationStatus),
    index('appointments_patient_idx').on(table.patientId),
  ]
);

/** Immutable appointment event log for auditability and timeline rendering. */
export const appointmentEvents = pgTable(
  'appointment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    eventType: text('event_type').notNull(),
    actorType: text('actor_type').notNull(),
    payload: jsonb('payload').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('appointment_events_appt_idx').on(table.appointmentId),
    index('appointment_events_tenant_event_idx').on(table.tenantId, table.eventType),
  ]
);

/** Scheduled reminder attempts for upcoming appointments. */
export const reminderJobs = pgTable(
  'reminder_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    channelType: text('channel_type').notNull(),
    status: text('status').notNull().default('scheduled'),
    scheduledFor: timestamp('scheduled_for').notNull(),
    sentAt: timestamp('sent_at'),
    templateKey: text('template_key').notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('reminder_jobs_tenant_status_idx').on(table.tenantId, table.status),
    index('reminder_jobs_tenant_sched_idx').on(table.tenantId, table.scheduledFor),
    index('reminder_jobs_appt_idx').on(table.appointmentId),
  ]
);

/** Confirmation workflows linked to specific appointments. */
export const confirmationRequests = pgTable(
  'confirmation_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id),
    channelType: text('channel_type').notNull(),
    status: text('status').notNull().default('pending'),
    requestedAt: timestamp('requested_at').notNull().defaultNow(),
    dueAt: timestamp('due_at').notNull(),
    respondedAt: timestamp('responded_at'),
    responsePayload: jsonb('response_payload').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('confirmation_requests_tenant_status_idx').on(table.tenantId, table.status),
    index('confirmation_requests_tenant_due_idx').on(table.tenantId, table.dueAt),
    index('confirmation_requests_appt_idx').on(table.appointmentId),
  ]
);

/** Patient waitlist preferences used to fill gaps proactively. */
export const waitlistRequests = pgTable(
  'waitlist_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    serviceId: uuid('service_id').references(() => clinicServices.id),
    practitionerId: uuid('practitioner_id').references(() => practitioners.id),
    locationId: uuid('location_id').references(() => clinicLocations.id),
    preferredWindows: jsonb('preferred_windows').default([]),
    status: text('status').notNull().default('active'),
    priorityScore: real('priority_score').notNull().default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('waitlist_requests_tenant_status_idx').on(table.tenantId, table.status),
    index('waitlist_requests_patient_idx').on(table.patientId),
  ]
);

/** Open schedule gaps that can be offered to the waitlist or reactivated patients. */
export const gapOpportunities = pgTable(
  'gap_opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    originAppointmentId: uuid('origin_appointment_id').references(() => appointments.id),
    serviceId: uuid('service_id').references(() => clinicServices.id),
    practitionerId: uuid('practitioner_id').references(() => practitioners.id),
    locationId: uuid('location_id').references(() => clinicLocations.id),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),
    status: text('status').notNull().default('open'),
    origin: text('origin').notNull().default('cancellation'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('gap_opps_tenant_status_idx').on(table.tenantId, table.status),
    index('gap_opps_tenant_starts_idx').on(table.tenantId, table.startsAt),
    index('gap_opps_origin_appt_idx').on(table.originAppointmentId),
  ]
);

/** Outreach attempts made to fill a gap with a specific patient. */
export const gapOutreachAttempts = pgTable(
  'gap_outreach_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    gapOpportunityId: uuid('gap_opportunity_id')
      .notNull()
      .references(() => gapOpportunities.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    channelType: text('channel_type').notNull(),
    status: text('status').notNull().default('pending'),
    sentAt: timestamp('sent_at'),
    respondedAt: timestamp('responded_at'),
    result: text('result'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('gap_outreach_tenant_status_idx').on(table.tenantId, table.status),
    index('gap_outreach_gap_idx').on(table.gapOpportunityId),
    index('gap_outreach_patient_idx').on(table.patientId),
  ]
);

/** Reactivation campaigns that target inactive patients or follow-up cohorts. */
export const reactivationCampaigns = pgTable(
  'reactivation_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    campaignType: text('campaign_type').notNull(),
    status: text('status').notNull().default('draft'),
    audienceDefinition: jsonb('audience_definition').default({}),
    messageTemplate: jsonb('message_template').default({}),
    channelPolicy: jsonb('channel_policy').default({}),
    scheduledAt: timestamp('scheduled_at'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('reactivation_campaigns_tenant_status_idx').on(table.tenantId, table.status),
    index('reactivation_campaigns_tenant_sched_idx').on(table.tenantId, table.scheduledAt),
  ]
);

/** Per-patient campaign delivery state and resulting outcomes. */
export const reactivationRecipients = pgTable(
  'reactivation_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => reactivationCampaigns.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    status: text('status').notNull().default('pending'),
    lastContactAt: timestamp('last_contact_at'),
    lastResponseAt: timestamp('last_response_at'),
    result: text('result'),
    generatedAppointmentId: uuid('generated_appointment_id').references(() => appointments.id),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('reactivation_recipients_tenant_campaign_idx').on(table.tenantId, table.campaignId),
    index('reactivation_recipients_tenant_status_idx').on(table.tenantId, table.status),
    index('reactivation_recipients_patient_idx').on(table.patientId),
  ]
);

// ---------------------------------------------------------------------------
// Clinic AI Configuration
// ---------------------------------------------------------------------------

/** Tenant-scoped AI receptionist configuration. */
export const clinicAiConfigs = pgTable(
  'clinic_ai_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    enabled: boolean('enabled').notNull().default(false),
    persona: text('persona'),
    languages: jsonb('languages').default(['es']),
    businessRules: jsonb('business_rules').default({}),
    toolsPolicy: jsonb('tools_policy').default({}),
    modelWhatsapp: text('model_whatsapp').notNull().default('gpt-4.1-mini'),
    modelVoice: text('model_voice').notNull().default('gpt-4.1-mini'),
    retellAgentId: text('retell_agent_id'),
    knowledgeBaseEnabled: boolean('knowledge_base_enabled').notNull().default(false),
    handoffRules: jsonb('handoff_rules').default({}),
    dailyTokenBudget: integer('daily_token_budget').notNull().default(500000),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('clinic_ai_configs_tenant_uidx').on(table.tenantId),
  ]
);

// ---------------------------------------------------------------------------
// Clinic AI Tool Invocations
// ---------------------------------------------------------------------------

/** Audit records for AI receptionist tool invocations. */
export const clinicAiToolInvocations = pgTable(
  'clinic_ai_tool_invocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    threadId: uuid('thread_id').references(() => conversationThreads.id),
    runId: text('run_id'),
    toolName: text('tool_name').notNull(),
    args: jsonb('args').default({}),
    result: jsonb('result').default({}),
    status: text('status').notNull().default('success'),
    durationMs: integer('duration_ms').notNull().default(0),
    tokensUsed: integer('tokens_used').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('clinic_ai_tool_invocations_tenant_idx').on(table.tenantId),
    index('clinic_ai_tool_invocations_thread_idx').on(table.threadId),
    index('clinic_ai_tool_invocations_tenant_created_idx').on(table.tenantId, table.createdAt),
  ]
);

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
  agentInstallationId: uuid('agent_installation_id').references(() => agentInstallations.id),
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
  agentInstallationId: uuid('agent_installation_id').references(() => agentInstallations.id),
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
