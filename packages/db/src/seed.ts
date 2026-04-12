/**
 * Seed script — populates the database with demo data for local development.
 *
 * Usage:
 *   DATABASE_URL=postgres://agentmou:changeme@localhost:5432/agentmou pnpm db:seed
 */

import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { buildClinicDemoSeedFixture } from './clinic-demo-fixture';
import { getDatabaseUrl } from './config';
import * as schema from './schema';
import { buildTenantVerticalConfigSeedRows } from './tenant-vertical-config-fixture';

const DATABASE_URL = getDatabaseUrl();
const ADMIN_EMAIL = 'admin@agentmou.dev';
const ADMIN_PASSWORD = 'Demo1234!';
const ADMIN_PASSWORD_HASH =
  '10a4edfff587919abdfe1649f43cf23e:9f2cb2ca9bc9da1b7de5c0a59185530a55979fc722b9e58fc7767deaa45112b01fae2b27c759e7a29bed02329dc3e9bf4763e5d9a0ac2c26242b585df9d1d059';
const GENERIC_TENANT_NAME = 'Demo Workspace';
const CLINIC_TENANT_NAME = 'Dental Demo Clinic';
const FISIO_TENANT_NAME = 'Fisio Pilot Workspace';

type Database = ReturnType<typeof drizzle<typeof schema>>;

function print(message: string) {
  process.stdout.write(`${message}\n`);
}

async function ensureOne<T>(
  lookup: () => Promise<T | undefined>,
  create: () => Promise<T>
): Promise<T> {
  const existing = await lookup();
  if (existing) return existing;
  return create();
}

async function insertOne<T>(action: Promise<T[]>, errorMessage: string): Promise<T> {
  const [row] = await action;
  if (!row) throw new Error(errorMessage);
  return row;
}

async function ensureUser(db: Database) {
  const existing = (
    await db.select().from(schema.users).where(eq(schema.users.email, ADMIN_EMAIL)).limit(1)
  )[0];

  if (existing) {
    const [updated] = await db
      .update(schema.users)
      .set({
        name: 'Admin User',
        passwordHash: ADMIN_PASSWORD_HASH,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existing.id))
      .returning();

    if (!updated) {
      throw new Error('Failed to update seed user');
    }

    return updated;
  }

  return insertOne(
    db
      .insert(schema.users)
      .values({
        email: ADMIN_EMAIL,
        name: 'Admin User',
        passwordHash: ADMIN_PASSWORD_HASH,
      })
      .returning(),
    'Failed to create seed user'
  );
}

async function ensureTenant(
  db: Database,
  values: Pick<
    typeof schema.tenants.$inferInsert,
    'name' | 'type' | 'plan' | 'ownerId' | 'settings'
  >
) {
  return ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.tenants)
          .where(
            and(eq(schema.tenants.name, values.name), eq(schema.tenants.ownerId, values.ownerId))
          )
          .limit(1)
      )[0],
    async () =>
      insertOne(
        db.insert(schema.tenants).values(values).returning(),
        `Failed to create ${values.name}`
      )
  );
}

async function ensureTenantRecord(
  db: Database,
  values: Pick<
    typeof schema.tenants.$inferInsert,
    'name' | 'type' | 'plan' | 'ownerId' | 'settings'
  >
) {
  const existing = await ensureTenant(db, values);
  const [updated] = await db
    .update(schema.tenants)
    .set({
      type: values.type,
      plan: values.plan,
      settings: values.settings,
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, existing.id))
    .returning();

  if (!updated) {
    throw new Error(`Failed to update ${values.name}`);
  }

  return updated;
}

async function ensureMembership(db: Database, tenantId: string, userId: string, role: string) {
  return ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.memberships)
          .where(
            and(eq(schema.memberships.tenantId, tenantId), eq(schema.memberships.userId, userId))
          )
          .limit(1)
      )[0],
    async () =>
      insertOne(
        db
          .insert(schema.memberships)
          .values({
            tenantId,
            userId,
            role,
          })
          .returning(),
        'Failed to create membership'
      )
  );
}

async function ensureConnectorAccount(
  db: Database,
  values: Pick<
    typeof schema.connectorAccounts.$inferInsert,
    'tenantId' | 'provider' | 'status' | 'externalAccountId' | 'scopes' | 'connectedAt'
  >
) {
  return ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.connectorAccounts)
          .where(
            values.externalAccountId
              ? and(
                  eq(schema.connectorAccounts.tenantId, values.tenantId),
                  eq(schema.connectorAccounts.provider, values.provider),
                  eq(schema.connectorAccounts.externalAccountId, values.externalAccountId)
                )
              : and(
                  eq(schema.connectorAccounts.tenantId, values.tenantId),
                  eq(schema.connectorAccounts.provider, values.provider),
                  isNull(schema.connectorAccounts.externalAccountId)
                )
          )
          .limit(1)
      )[0],
    async () =>
      insertOne(
        db.insert(schema.connectorAccounts).values(values).returning(),
        `Failed to create connector account ${values.provider}`
      )
  );
}

async function ensureTenantVerticalConfig(
  db: Database,
  values: Pick<
    typeof schema.tenantVerticalConfigs.$inferInsert,
    'tenantId' | 'verticalKey' | 'config'
  >
) {
  const existing = (
    await db
      .select()
      .from(schema.tenantVerticalConfigs)
      .where(
        and(
          eq(schema.tenantVerticalConfigs.tenantId, values.tenantId),
          eq(schema.tenantVerticalConfigs.verticalKey, values.verticalKey)
        )
      )
      .limit(1)
  )[0];

  if (!existing) {
    return insertOne(
      db.insert(schema.tenantVerticalConfigs).values(values).returning(),
      `Failed to create tenant vertical config ${values.verticalKey}`
    );
  }

  const [updated] = await db
    .update(schema.tenantVerticalConfigs)
    .set({
      config: values.config,
      updatedAt: new Date(),
    })
    .where(eq(schema.tenantVerticalConfigs.id, existing.id))
    .returning();

  if (!updated) {
    throw new Error(`Failed to update tenant vertical config ${values.verticalKey}`);
  }

  return updated;
}

async function seedGenericDemo(db: Database, userId: string) {
  const tenant = await ensureTenantRecord(db, {
    name: GENERIC_TENANT_NAME,
    type: 'business',
    plan: 'pro',
    ownerId: userId,
    settings: {
      timezone: 'America/New_York',
      defaultHITL: true,
      logRetentionDays: 30,
      memoryRetentionDays: 7,
      activeVertical: 'internal',
      isPlatformAdminTenant: true,
      settingsVersion: 2,
      verticalClinicUi: false,
      clinicDentalMode: false,
      internalPlatformVisible: false,
    },
  });

  await ensureMembership(db, tenant.id, userId, 'owner');
  for (const row of buildTenantVerticalConfigSeedRows({
    tenantId: tenant.id,
    activeVertical: 'internal',
    config: {
      label: 'control_plane',
      isPlatformAdminTenant: true,
    },
  })) {
    await ensureTenantVerticalConfig(db, row);
  }

  for (const provider of ['gmail', 'slack', 'notion']) {
    await ensureConnectorAccount(db, {
      tenantId: tenant.id,
      provider,
      status: 'disconnected',
      externalAccountId: null,
      scopes: [],
      connectedAt: null,
    });
  }

  return tenant;
}

async function seedFisioDemo(db: Database, userId: string) {
  const tenant = await ensureTenantRecord(db, {
    name: FISIO_TENANT_NAME,
    type: 'business',
    plan: 'starter',
    ownerId: userId,
    settings: {
      timezone: 'Europe/Madrid',
      defaultHITL: false,
      logRetentionDays: 30,
      memoryRetentionDays: 7,
      activeVertical: 'fisio',
      isPlatformAdminTenant: false,
      settingsVersion: 2,
      verticalClinicUi: false,
      clinicDentalMode: false,
      internalPlatformVisible: false,
    },
  });

  await ensureMembership(db, tenant.id, userId, 'admin');
  for (const row of buildTenantVerticalConfigSeedRows({
    tenantId: tenant.id,
    activeVertical: 'fisio',
    config: {
      specialty: 'sports_rehab',
      status: 'architecture_fixture',
    },
  })) {
    await ensureTenantVerticalConfig(db, row);
  }

  return tenant;
}

async function seedClinicDemo(db: Database, userId: string) {
  const fixture = buildClinicDemoSeedFixture(new Date());

  const tenant = await ensureTenantRecord(db, {
    name: CLINIC_TENANT_NAME,
    type: 'business',
    plan: 'enterprise',
    ownerId: userId,
    settings: fixture.tenantSettings,
  });

  await ensureMembership(db, tenant.id, userId, 'owner');
  for (const row of fixture.verticalConfigs.flatMap((config) =>
    buildTenantVerticalConfigSeedRows({
      tenantId: tenant.id,
      activeVertical: config.verticalKey,
      config: config.config,
    })
  )) {
    await ensureTenantVerticalConfig(db, row);
  }

  const connectorAccounts = new Map<string, typeof schema.connectorAccounts.$inferSelect>();
  for (const connector of fixture.connectorAccounts) {
    const row = await ensureConnectorAccount(db, {
      tenantId: tenant.id,
      provider: connector.provider,
      status: 'connected',
      externalAccountId: connector.externalAccountId,
      scopes: connector.scopes,
      connectedAt: connector.connectedAt,
    });
    connectorAccounts.set(connector.key, row);
  }

  const clinicProfile = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.clinicProfiles)
          .where(eq(schema.clinicProfiles.tenantId, tenant.id))
          .limit(1)
      )[0],
    async () =>
      insertOne(
        db
          .insert(schema.clinicProfiles)
          .values({
            tenantId: tenant.id,
            ...fixture.clinicProfile,
          })
          .returning(),
        'Failed to create clinic profile'
      )
  );

  for (const moduleRow of fixture.modules) {
    const existingModule = (
      await db
        .select()
        .from(schema.tenantModules)
        .where(
          and(
            eq(schema.tenantModules.tenantId, tenant.id),
            eq(schema.tenantModules.moduleKey, moduleRow.moduleKey)
          )
        )
        .limit(1)
    )[0];

    if (!existingModule) {
      await insertOne(
        db
          .insert(schema.tenantModules)
          .values({
            tenantId: tenant.id,
            ...moduleRow,
          })
          .returning(),
        `Failed to create tenant module ${moduleRow.moduleKey}`
      );
      continue;
    }

    await insertOne(
      db
        .update(schema.tenantModules)
        .set({
          status: moduleRow.status,
          visibleToClient: moduleRow.visibleToClient,
          planLevel: moduleRow.planLevel,
          config: moduleRow.config,
          updatedAt: new Date(),
        })
        .where(eq(schema.tenantModules.id, existingModule.id))
        .returning(),
      `Failed to update tenant module ${moduleRow.moduleKey}`
    );
  }

  const channelRows = new Map<string, typeof schema.clinicChannels.$inferSelect>();
  for (const channel of fixture.channels) {
    const connectorAccount = connectorAccounts.get(channel.key);
    if (!connectorAccount) {
      throw new Error(`Missing connector account for channel ${channel.key}`);
    }

    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.clinicChannels)
            .where(
              and(
                eq(schema.clinicChannels.tenantId, tenant.id),
                eq(schema.clinicChannels.channelType, channel.channelType),
                eq(schema.clinicChannels.phoneNumber, channel.phoneNumber)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.clinicChannels)
            .values({
              tenantId: tenant.id,
              channelType: channel.channelType,
              directionPolicy: channel.directionPolicy,
              provider: channel.provider,
              connectorAccountId: connectorAccount.id,
              status: channel.status,
              phoneNumber: channel.phoneNumber,
              config: channel.config,
            })
            .returning(),
          `Failed to create clinic channel ${channel.channelType}`
        )
    );
    channelRows.set(channel.key, row);
  }

  const serviceRows = new Map<string, typeof schema.clinicServices.$inferSelect>();
  for (const service of fixture.services) {
    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.clinicServices)
            .where(
              and(
                eq(schema.clinicServices.tenantId, tenant.id),
                eq(schema.clinicServices.slug, service.slug)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.clinicServices)
            .values({
              tenantId: tenant.id,
              externalServiceId: service.externalServiceId,
              name: service.name,
              slug: service.slug,
              durationMinutes: service.durationMinutes,
              active: true,
              metadata: service.metadata,
            })
            .returning(),
          `Failed to create clinic service ${service.slug}`
        )
    );
    serviceRows.set(service.key, row);
  }

  const practitionerRows = new Map<string, typeof schema.practitioners.$inferSelect>();
  for (const practitioner of fixture.practitioners) {
    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.practitioners)
            .where(
              and(
                eq(schema.practitioners.tenantId, tenant.id),
                eq(schema.practitioners.externalPractitionerId, practitioner.externalPractitionerId)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.practitioners)
            .values({
              tenantId: tenant.id,
              externalPractitionerId: practitioner.externalPractitionerId,
              name: practitioner.name,
              specialty: practitioner.specialty,
              active: true,
              metadata: practitioner.metadata,
            })
            .returning(),
          `Failed to create practitioner ${practitioner.externalPractitionerId}`
        )
    );
    practitionerRows.set(practitioner.key, row);
  }

  const locationRows = new Map<string, typeof schema.clinicLocations.$inferSelect>();
  for (const location of fixture.locations) {
    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.clinicLocations)
            .where(
              and(
                eq(schema.clinicLocations.tenantId, tenant.id),
                eq(schema.clinicLocations.externalLocationId, location.externalLocationId)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.clinicLocations)
            .values({
              tenantId: tenant.id,
              externalLocationId: location.externalLocationId,
              name: location.name,
              address: location.address,
              phone: location.phone,
              active: true,
              metadata: location.metadata,
            })
            .returning(),
          `Failed to create clinic location ${location.externalLocationId}`
        )
    );
    locationRows.set(location.key, row);
  }

  const patientRows = new Map<string, typeof schema.patients.$inferSelect>();
  for (const patient of fixture.patients) {
    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.patients)
            .where(
              and(
                eq(schema.patients.tenantId, tenant.id),
                eq(schema.patients.externalPatientId, patient.externalPatientId)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.patients)
            .values({
              tenantId: tenant.id,
              externalPatientId: patient.externalPatientId,
              status: patient.status,
              isExisting: patient.isExisting,
              firstName: patient.firstName,
              lastName: patient.lastName,
              fullName: patient.fullName,
              phone: patient.phone,
              email: patient.email,
              dateOfBirth: patient.dateOfBirth,
              notes: patient.notes,
              consentFlags: patient.consentFlags,
              source: patient.source,
              lastInteractionAt: patient.lastInteractionAt,
              nextSuggestedActionAt: patient.nextSuggestedActionAt,
            })
            .returning(),
          `Failed to create patient ${patient.externalPatientId}`
        )
    );
    patientRows.set(patient.key, row);
  }

  for (const identity of fixture.patientIdentities) {
    const patient = patientRows.get(identity.patientKey);
    if (!patient) throw new Error(`Missing patient for identity ${identity.patientKey}`);

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.patientIdentities)
            .where(
              and(
                eq(schema.patientIdentities.tenantId, tenant.id),
                eq(schema.patientIdentities.patientId, patient.id),
                eq(schema.patientIdentities.identityType, identity.identityType),
                eq(schema.patientIdentities.identityValue, identity.identityValue)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.patientIdentities)
            .values({
              tenantId: tenant.id,
              patientId: patient.id,
              identityType: identity.identityType,
              identityValue: identity.identityValue,
              isPrimary: identity.isPrimary,
              confidenceScore: identity.confidenceScore,
            })
            .returning(),
          `Failed to create patient identity ${identity.identityValue}`
        )
    );
  }

  const threadRows = new Map<string, typeof schema.conversationThreads.$inferSelect>();
  for (const thread of fixture.threads) {
    const patient = patientRows.get(thread.patientKey);
    if (!patient) throw new Error(`Missing patient for thread ${thread.key}`);

    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.conversationThreads)
            .where(
              and(
                eq(schema.conversationThreads.tenantId, tenant.id),
                eq(schema.conversationThreads.source, thread.source)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.conversationThreads)
            .values({
              tenantId: tenant.id,
              patientId: patient.id,
              channelType: thread.channelType,
              status: thread.status,
              intent: thread.intent,
              priority: thread.priority,
              source: thread.source,
              assignedUserId: thread.assignedUserId,
              lastMessageAt: thread.lastMessageAt,
              lastInboundAt: thread.lastInboundAt,
              lastOutboundAt: thread.lastOutboundAt,
              requiresHumanReview: thread.requiresHumanReview,
              resolution: thread.resolution,
            })
            .returning(),
          `Failed to create thread ${thread.key}`
        )
    );
    threadRows.set(thread.key, row);
  }

  for (const message of fixture.messages) {
    const patient = patientRows.get(message.patientKey);
    const thread = threadRows.get(message.threadKey);
    if (!patient || !thread) {
      throw new Error(`Missing relation for message ${message.key}`);
    }

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.conversationMessages)
            .where(
              and(
                eq(schema.conversationMessages.tenantId, tenant.id),
                eq(schema.conversationMessages.providerMessageId, message.providerMessageId)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.conversationMessages)
            .values({
              tenantId: tenant.id,
              threadId: thread.id,
              patientId: patient.id,
              direction: message.direction,
              channelType: message.channelType,
              messageType: message.messageType,
              body: message.body,
              payload: message.payload,
              deliveryStatus: message.deliveryStatus,
              providerMessageId: message.providerMessageId,
              sentAt: message.sentAt,
              receivedAt: message.receivedAt,
            })
            .returning(),
          `Failed to create message ${message.providerMessageId}`
        )
    );
  }

  const callRows = new Map<string, typeof schema.callSessions.$inferSelect>();
  for (const call of fixture.calls) {
    const patient = patientRows.get(call.patientKey);
    const thread = threadRows.get(call.threadKey);
    if (!patient || !thread) throw new Error(`Missing relation for call ${call.key}`);

    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.callSessions)
            .where(
              and(
                eq(schema.callSessions.tenantId, tenant.id),
                eq(schema.callSessions.providerCallId, call.providerCallId)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.callSessions)
            .values({
              tenantId: tenant.id,
              patientId: patient.id,
              threadId: thread.id,
              direction: call.direction,
              status: call.status,
              providerCallId: call.providerCallId,
              fromNumber: call.fromNumber,
              toNumber: call.toNumber,
              startedAt: call.startedAt,
              endedAt: call.endedAt,
              durationSeconds: call.durationSeconds,
              summary: call.summary,
              transcript: call.transcript,
              resolution: call.resolution,
              requiresHumanReview: call.requiresHumanReview,
            })
            .returning(),
          `Failed to create call ${call.providerCallId}`
        )
    );
    callRows.set(call.key, row);
  }

  const templateRows = new Map<string, typeof schema.intakeFormTemplates.$inferSelect>();
  for (const template of fixture.formTemplates) {
    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.intakeFormTemplates)
            .where(
              and(
                eq(schema.intakeFormTemplates.tenantId, tenant.id),
                eq(schema.intakeFormTemplates.slug, template.slug),
                eq(schema.intakeFormTemplates.version, template.version)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.intakeFormTemplates)
            .values({
              tenantId: tenant.id,
              name: template.name,
              slug: template.slug,
              version: template.version,
              schema: template.schema,
              isActive: true,
            })
            .returning(),
          `Failed to create intake form template ${template.slug}`
        )
    );
    templateRows.set(template.key, row);
  }

  for (const submission of fixture.formSubmissions) {
    const patient = patientRows.get(submission.patientKey);
    const thread = threadRows.get(submission.threadKey);
    const template = templateRows.get(submission.templateKey);
    if (!patient || !thread || !template) {
      throw new Error(`Missing relation for form submission ${submission.key}`);
    }

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.intakeFormSubmissions)
            .where(
              and(
                eq(schema.intakeFormSubmissions.tenantId, tenant.id),
                eq(schema.intakeFormSubmissions.templateId, template.id),
                eq(schema.intakeFormSubmissions.patientId, patient.id)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.intakeFormSubmissions)
            .values({
              tenantId: tenant.id,
              templateId: template.id,
              patientId: patient.id,
              threadId: thread.id,
              status: submission.status,
              answers: submission.answers,
              sentAt: submission.sentAt,
              openedAt: submission.openedAt,
              completedAt: submission.completedAt,
              expiresAt: submission.expiresAt,
              requiredForBooking: submission.requiredForBooking,
            })
            .returning(),
          `Failed to create intake form submission ${submission.key}`
        )
    );
  }

  const appointmentRows = new Map<string, typeof schema.appointments.$inferSelect>();
  for (const appointment of fixture.appointments) {
    const patient = patientRows.get(appointment.patientKey);
    const service = serviceRows.get(appointment.serviceKey);
    const practitioner = practitionerRows.get(appointment.practitionerKey);
    const location = locationRows.get(appointment.locationKey);
    const thread = appointment.threadKey ? threadRows.get(appointment.threadKey) : null;

    if (!patient || !service || !practitioner || !location) {
      throw new Error(`Missing relation for appointment ${appointment.key}`);
    }

    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.appointments)
            .where(
              and(
                eq(schema.appointments.tenantId, tenant.id),
                eq(schema.appointments.externalAppointmentId, appointment.externalAppointmentId)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.appointments)
            .values({
              tenantId: tenant.id,
              patientId: patient.id,
              externalAppointmentId: appointment.externalAppointmentId,
              serviceId: service.id,
              practitionerId: practitioner.id,
              locationId: location.id,
              threadId: thread?.id ?? null,
              status: appointment.status,
              source: appointment.source,
              startsAt: appointment.startsAt,
              endsAt: appointment.endsAt,
              bookedAt: appointment.bookedAt,
              confirmationStatus: appointment.confirmationStatus,
              reminderStatus: appointment.reminderStatus,
              cancellationReason: appointment.cancellationReason,
              metadata: appointment.metadata,
            })
            .returning(),
          `Failed to create appointment ${appointment.externalAppointmentId}`
        )
    );
    appointmentRows.set(appointment.key, row);
  }

  for (const event of fixture.appointmentEvents) {
    const appointment = appointmentRows.get(event.appointmentKey);
    if (!appointment) throw new Error(`Missing appointment for event ${event.eventType}`);

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.appointmentEvents)
            .where(
              and(
                eq(schema.appointmentEvents.appointmentId, appointment.id),
                eq(schema.appointmentEvents.eventType, event.eventType)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.appointmentEvents)
            .values({
              tenantId: tenant.id,
              appointmentId: appointment.id,
              eventType: event.eventType,
              actorType: event.actorType,
              payload: event.payload,
            })
            .returning(),
          `Failed to create appointment event ${event.eventType}`
        )
    );
  }

  for (const reminder of fixture.reminders) {
    const appointment = appointmentRows.get(reminder.appointmentKey);
    if (!appointment) throw new Error(`Missing appointment for reminder ${reminder.templateKey}`);

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.reminderJobs)
            .where(
              and(
                eq(schema.reminderJobs.tenantId, tenant.id),
                eq(schema.reminderJobs.appointmentId, appointment.id),
                eq(schema.reminderJobs.templateKey, reminder.templateKey)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.reminderJobs)
            .values({
              tenantId: tenant.id,
              appointmentId: appointment.id,
              channelType: reminder.channelType,
              status: reminder.status,
              scheduledFor: reminder.scheduledFor,
              sentAt: reminder.sentAt,
              templateKey: reminder.templateKey,
              attemptCount: reminder.attemptCount,
              lastError: reminder.lastError,
            })
            .returning(),
          `Failed to create reminder ${reminder.templateKey}`
        )
    );
  }

  for (const confirmation of fixture.confirmations) {
    const appointment = appointmentRows.get(confirmation.appointmentKey);
    if (!appointment) throw new Error(`Missing appointment for confirmation`);

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.confirmationRequests)
            .where(
              and(
                eq(schema.confirmationRequests.tenantId, tenant.id),
                eq(schema.confirmationRequests.appointmentId, appointment.id)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.confirmationRequests)
            .values({
              tenantId: tenant.id,
              appointmentId: appointment.id,
              channelType: confirmation.channelType,
              status: confirmation.status,
              requestedAt: confirmation.requestedAt,
              dueAt: confirmation.dueAt,
              respondedAt: confirmation.respondedAt,
              responsePayload: confirmation.responsePayload,
            })
            .returning(),
          'Failed to create confirmation request'
        )
    );
  }

  const waitlistRows = new Map<string, typeof schema.waitlistRequests.$inferSelect>();
  for (const waitlist of fixture.waitlistRequests) {
    const patient = patientRows.get(waitlist.patientKey);
    const service = serviceRows.get(waitlist.serviceKey);
    const practitioner = practitionerRows.get(waitlist.practitionerKey);
    const location = locationRows.get(waitlist.locationKey);
    if (!patient || !service || !practitioner || !location) {
      throw new Error(`Missing relation for waitlist ${waitlist.key}`);
    }

    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.waitlistRequests)
            .where(
              and(
                eq(schema.waitlistRequests.tenantId, tenant.id),
                eq(schema.waitlistRequests.patientId, patient.id)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.waitlistRequests)
            .values({
              tenantId: tenant.id,
              patientId: patient.id,
              serviceId: service.id,
              practitionerId: practitioner.id,
              locationId: location.id,
              preferredWindows: waitlist.preferredWindows,
              status: waitlist.status,
              priorityScore: waitlist.priorityScore,
              notes: waitlist.notes,
            })
            .returning(),
          `Failed to create waitlist ${waitlist.key}`
        )
    );
    waitlistRows.set(waitlist.key, row);
  }

  const gapRows = new Map<string, typeof schema.gapOpportunities.$inferSelect>();
  for (const gap of fixture.gaps) {
    const appointment = appointmentRows.get(gap.originAppointmentKey);
    const service = serviceRows.get(gap.serviceKey);
    const practitioner = practitionerRows.get(gap.practitionerKey);
    const location = locationRows.get(gap.locationKey);
    if (!appointment || !service || !practitioner || !location) {
      throw new Error(`Missing relation for gap ${gap.key}`);
    }

    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.gapOpportunities)
            .where(
              and(
                eq(schema.gapOpportunities.tenantId, tenant.id),
                eq(schema.gapOpportunities.originAppointmentId, appointment.id)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.gapOpportunities)
            .values({
              tenantId: tenant.id,
              originAppointmentId: appointment.id,
              serviceId: service.id,
              practitionerId: practitioner.id,
              locationId: location.id,
              startsAt: gap.startsAt,
              endsAt: gap.endsAt,
              status: gap.status,
              origin: gap.origin,
            })
            .returning(),
          `Failed to create gap ${gap.key}`
        )
    );
    gapRows.set(gap.key, row);
  }

  for (const outreach of fixture.gapOutreachAttempts) {
    const gap = gapRows.get(outreach.gapKey);
    const patient = patientRows.get(outreach.patientKey);
    if (!gap || !patient) throw new Error(`Missing relation for gap outreach ${outreach.key}`);

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.gapOutreachAttempts)
            .where(
              and(
                eq(schema.gapOutreachAttempts.tenantId, tenant.id),
                eq(schema.gapOutreachAttempts.gapOpportunityId, gap.id),
                eq(schema.gapOutreachAttempts.patientId, patient.id)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.gapOutreachAttempts)
            .values({
              tenantId: tenant.id,
              gapOpportunityId: gap.id,
              patientId: patient.id,
              channelType: outreach.channelType,
              status: outreach.status,
              sentAt: outreach.sentAt,
              respondedAt: outreach.respondedAt,
              result: outreach.result,
              metadata: outreach.metadata,
            })
            .returning(),
          `Failed to create gap outreach ${outreach.key}`
        )
    );
  }

  const campaignRows = new Map<string, typeof schema.reactivationCampaigns.$inferSelect>();
  for (const campaign of fixture.campaigns) {
    const row = await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.reactivationCampaigns)
            .where(
              and(
                eq(schema.reactivationCampaigns.tenantId, tenant.id),
                eq(schema.reactivationCampaigns.name, campaign.name)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.reactivationCampaigns)
            .values({
              tenantId: tenant.id,
              name: campaign.name,
              campaignType: campaign.campaignType,
              status: campaign.status,
              audienceDefinition: campaign.audienceDefinition,
              messageTemplate: campaign.messageTemplate,
              channelPolicy: campaign.channelPolicy,
              scheduledAt: campaign.scheduledAt,
              startedAt: campaign.startedAt,
              completedAt: campaign.completedAt,
            })
            .returning(),
          `Failed to create campaign ${campaign.name}`
        )
    );
    campaignRows.set(campaign.key, row);
  }

  for (const recipient of fixture.recipients) {
    const campaign = campaignRows.get(recipient.campaignKey);
    const patient = patientRows.get(recipient.patientKey);
    const generatedAppointment = recipient.generatedAppointmentKey
      ? appointmentRows.get(recipient.generatedAppointmentKey)
      : null;
    if (!campaign || !patient) throw new Error(`Missing relation for recipient ${recipient.key}`);

    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.reactivationRecipients)
            .where(
              and(
                eq(schema.reactivationRecipients.tenantId, tenant.id),
                eq(schema.reactivationRecipients.campaignId, campaign.id),
                eq(schema.reactivationRecipients.patientId, patient.id)
              )
            )
            .limit(1)
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.reactivationRecipients)
            .values({
              tenantId: tenant.id,
              campaignId: campaign.id,
              patientId: patient.id,
              status: recipient.status,
              lastContactAt: recipient.lastContactAt,
              lastResponseAt: recipient.lastResponseAt,
              result: recipient.result,
              generatedAppointmentId: generatedAppointment?.id ?? null,
              metadata: recipient.metadata,
            })
            .returning(),
          `Failed to create campaign recipient ${recipient.key}`
        )
    );
  }

  return {
    tenant,
    clinicProfile,
    summary: fixture.summary,
  };
}

async function seed() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  print('Seeding database...');

  const user = await ensureUser(db);
  const genericTenant = await seedGenericDemo(db, user.id);
  const fisioTenant = await seedFisioDemo(db, user.id);
  const clinicDemo = await seedClinicDemo(db, user.id);

  print('Seed complete.');
  print(`  User:            ${user.id} (${ADMIN_EMAIL})`);
  print(`  Password:        ${ADMIN_PASSWORD}`);
  print(`  Workspace demo:  ${genericTenant.id} (${genericTenant.name})`);
  print(`  Fisio fixture:   ${fisioTenant.id} (${fisioTenant.name})`);
  print(`  Clinic demo:     ${clinicDemo.tenant.id} (${clinicDemo.tenant.name})`);
  print(`  Clinic profile:  ${clinicDemo.clinicProfile.displayName}`);
  print(`  Patients:        ${clinicDemo.summary.counts.patients}`);
  print(
    `  Threads:         ${
      clinicDemo.summary.counts.whatsappThreads + clinicDemo.summary.counts.voiceThreads
    }`
  );
  print(`  Calls:           ${clinicDemo.summary.counts.calls}`);
  print(`  Forms:           ${clinicDemo.summary.counts.formSubmissions}`);
  print(`  Appointments:    ${clinicDemo.summary.counts.appointments}`);
  print(`  Active gap:      ${clinicDemo.summary.journeys.gapRecovery.gapKey}`);
  print(`  Campaign:        ${clinicDemo.summary.journeys.reactivation.campaignKey}`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
