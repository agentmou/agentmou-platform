/**
 * Seed script — populates the database with demo data for local development.
 *
 * Usage:
 *   DATABASE_URL=postgres://agentmou:changeme@localhost:5432/agentmou pnpm db:seed
 */

import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getDatabaseUrl } from './config';

const DATABASE_URL = getDatabaseUrl();
const ADMIN_EMAIL = 'admin@agentmou.dev';
const GENERIC_TENANT_NAME = 'Demo Workspace';
const CLINIC_TENANT_NAME = 'Dental Demo Clinic';

type Database = ReturnType<typeof drizzle<typeof schema>>;

function print(message: string) {
  process.stdout.write(`${message}\n`);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function setTime(date: Date, hours: number, minutes = 0) {
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
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
  return ensureOne(
    async () =>
      (await db.select().from(schema.users).where(eq(schema.users.email, ADMIN_EMAIL)).limit(1))[0],
    async () =>
      insertOne(
        db
          .insert(schema.users)
          .values({
            email: ADMIN_EMAIL,
            name: 'Admin User',
            passwordHash: '$2b$10$placeholder_hash_for_dev',
          })
          .returning(),
        'Failed to create seed user'
      )
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

async function seedGenericDemo(db: Database, userId: string) {
  const tenant = await ensureTenant(db, {
    name: GENERIC_TENANT_NAME,
    type: 'business',
    plan: 'pro',
    ownerId: userId,
    settings: {
      timezone: 'America/New_York',
      defaultHITL: true,
      logRetentionDays: 30,
      memoryRetentionDays: 7,
    },
  });

  await ensureMembership(db, tenant.id, userId, 'owner');

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

async function seedClinicDemo(db: Database, userId: string) {
  const tenant = await ensureTenant(db, {
    name: CLINIC_TENANT_NAME,
    type: 'business',
    plan: 'enterprise',
    ownerId: userId,
    settings: {
      timezone: 'Europe/Madrid',
      defaultHITL: true,
      logRetentionDays: 60,
      memoryRetentionDays: 30,
      verticalClinicUi: true,
      clinicDentalMode: true,
    },
  });

  await ensureMembership(db, tenant.id, userId, 'owner');

  const now = new Date();
  const todayNine = setTime(now, 9, 0);
  const todayEleven = setTime(now, 11, 0);
  const tomorrowTen = setTime(addDays(now, 1), 10, 30);
  const nextWeekTen = setTime(addDays(now, 7), 10, 0);

  const whatsappConnector = await ensureConnectorAccount(db, {
    tenantId: tenant.id,
    provider: 'twilio_whatsapp',
    status: 'connected',
    externalAccountId: 'seed-whatsapp-account',
    scopes: ['messages:read', 'messages:write'],
    connectedAt: addDays(now, -30),
  });

  const voiceConnector = await ensureConnectorAccount(db, {
    tenantId: tenant.id,
    provider: 'twilio_voice',
    status: 'connected',
    externalAccountId: 'seed-voice-account',
    scopes: ['calls:read', 'calls:write'],
    connectedAt: addDays(now, -30),
  });

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
            vertical: 'clinic_dental',
            specialty: 'implantology',
            displayName: 'Sonrisa Norte Dental',
            timezone: 'Europe/Madrid',
            businessHours: {
              monday: [{ start: '09:00', end: '18:30' }],
              tuesday: [{ start: '09:00', end: '18:30' }],
              wednesday: [{ start: '09:00', end: '18:30' }],
              thursday: [{ start: '09:00', end: '18:30' }],
              friday: [{ start: '09:00', end: '15:00' }],
            },
            defaultInboundChannel: 'whatsapp',
            requiresNewPatientForm: true,
            confirmationPolicy: {
              enabled: true,
              leadHours: 24,
              escalationDelayHours: 4,
              autoCancelOnDecline: false,
            },
            gapRecoveryPolicy: {
              enabled: true,
              lookaheadHours: 72,
              maxOffersPerGap: 5,
              prioritizeWaitlist: true,
            },
            reactivationPolicy: {
              enabled: true,
              inactivityThresholdDays: 180,
              cooldownDays: 30,
              defaultCampaignType: 'hygiene_recall',
            },
          })
          .returning(),
        'Failed to create clinic profile'
      )
  );

  const moduleRows = [
    {
      moduleKey: 'core_reception',
      status: 'enabled',
      visibleToClient: true,
      planLevel: 'starter',
      config: { primaryNav: true },
    },
    {
      moduleKey: 'voice',
      status: 'enabled',
      visibleToClient: true,
      planLevel: 'pro',
      config: { inboundOnly: false },
    },
    {
      moduleKey: 'growth',
      status: 'enabled',
      visibleToClient: true,
      planLevel: 'scale',
      config: { smartGapFill: true, reactivation: true },
    },
    {
      moduleKey: 'advanced_mode',
      status: 'hidden',
      visibleToClient: false,
      planLevel: 'enterprise',
      config: { internalOnly: false },
    },
    {
      moduleKey: 'internal_platform',
      status: 'hidden',
      visibleToClient: false,
      planLevel: 'enterprise',
      config: { internalOnly: true },
    },
  ] as const;

  for (const moduleRow of moduleRows) {
    await ensureOne(
      async () =>
        (
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
        )[0],
      async () =>
        insertOne(
          db
            .insert(schema.tenantModules)
            .values({
              tenantId: tenant.id,
              ...moduleRow,
            })
            .returning(),
          `Failed to create tenant module ${moduleRow.moduleKey}`
        )
    );
  }

  const whatsappChannel = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.clinicChannels)
          .where(
            and(
              eq(schema.clinicChannels.tenantId, tenant.id),
              eq(schema.clinicChannels.channelType, 'whatsapp'),
              eq(schema.clinicChannels.phoneNumber, '+34910000001')
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
            channelType: 'whatsapp',
            directionPolicy: {
              inboundEnabled: true,
              outboundEnabled: true,
              fallbackToHuman: true,
            },
            provider: 'twilio',
            connectorAccountId: whatsappConnector.id,
            status: 'active',
            phoneNumber: '+34910000001',
            config: {
              displayName: 'Sonrisa Norte WhatsApp',
            },
          })
          .returning(),
        'Failed to create WhatsApp channel'
      )
  );

  const voiceChannel = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.clinicChannels)
          .where(
            and(
              eq(schema.clinicChannels.tenantId, tenant.id),
              eq(schema.clinicChannels.channelType, 'voice'),
              eq(schema.clinicChannels.phoneNumber, '+34910000002')
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
            channelType: 'voice',
            directionPolicy: {
              inboundEnabled: true,
              outboundEnabled: true,
              fallbackToHuman: true,
              recordCalls: true,
            },
            provider: 'twilio',
            connectorAccountId: voiceConnector.id,
            status: 'active',
            phoneNumber: '+34910000002',
            config: {
              ivrProfile: 'front-desk',
            },
          })
          .returning(),
        'Failed to create voice channel'
      )
  );

  const service = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.clinicServices)
          .where(
            and(
              eq(schema.clinicServices.tenantId, tenant.id),
              eq(schema.clinicServices.slug, 'dental-cleaning')
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
            externalServiceId: 'svc-cleaning',
            name: 'Dental Cleaning',
            slug: 'dental-cleaning',
            durationMinutes: 45,
            active: true,
            metadata: {
              category: 'hygiene',
            },
          })
          .returning(),
        'Failed to create clinic service'
      )
  );

  const practitioner = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.practitioners)
          .where(
            and(
              eq(schema.practitioners.tenantId, tenant.id),
              eq(schema.practitioners.externalPractitionerId, 'dr-marta-solis')
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
            externalPractitionerId: 'dr-marta-solis',
            name: 'Dr. Marta Solis',
            specialty: 'Hygiene',
            active: true,
            metadata: {
              languages: ['es', 'en'],
            },
          })
          .returning(),
        'Failed to create practitioner'
      )
  );

  const location = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.clinicLocations)
          .where(
            and(
              eq(schema.clinicLocations.tenantId, tenant.id),
              eq(schema.clinicLocations.externalLocationId, 'madrid-centro')
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
            externalLocationId: 'madrid-centro',
            name: 'Madrid Centro',
            address: 'Calle Alcala 120, Madrid',
            phone: '+34910000003',
            active: true,
            metadata: {
              floor: '2A',
            },
          })
          .returning(),
        'Failed to create clinic location'
      )
  );

  const existingPatient = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.patients)
          .where(
            and(
              eq(schema.patients.tenantId, tenant.id),
              eq(schema.patients.externalPatientId, 'DENTAL-001')
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
            externalPatientId: 'DENTAL-001',
            status: 'existing',
            isExisting: true,
            firstName: 'Lucia',
            lastName: 'Perez',
            fullName: 'Lucia Perez',
            phone: '+34600111222',
            email: 'lucia@example.com',
            dateOfBirth: '1989-05-16',
            notes: 'Prefers morning appointments.',
            consentFlags: {
              whatsapp: true,
              voice: true,
              email: true,
              marketing: false,
            },
            source: 'import',
            lastInteractionAt: addHours(now, -5),
            nextSuggestedActionAt: addHours(now, 6),
          })
          .returning(),
        'Failed to create existing patient'
      )
  );

  const newLead = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.patients)
          .where(
            and(
              eq(schema.patients.tenantId, tenant.id),
              eq(schema.patients.externalPatientId, 'DENTAL-002')
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
            externalPatientId: 'DENTAL-002',
            status: 'intake_pending',
            isExisting: false,
            firstName: 'Carlos',
            lastName: 'Navarro',
            fullName: 'Carlos Navarro',
            phone: '+34600333444',
            email: 'carlos@example.com',
            notes: 'New patient asking about first cleaning visit.',
            consentFlags: {
              whatsapp: true,
              voice: true,
              email: true,
            },
            source: 'whatsapp_inbound',
            lastInteractionAt: addHours(now, -2),
            nextSuggestedActionAt: addHours(now, 2),
          })
          .returning(),
        'Failed to create new lead patient'
      )
  );

  const inactivePatient = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.patients)
          .where(
            and(
              eq(schema.patients.tenantId, tenant.id),
              eq(schema.patients.externalPatientId, 'DENTAL-003')
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
            externalPatientId: 'DENTAL-003',
            status: 'inactive',
            isExisting: true,
            firstName: 'Ana',
            lastName: 'Ruiz',
            fullName: 'Ana Ruiz',
            phone: '+34600555666',
            email: 'ana@example.com',
            dateOfBirth: '1977-09-10',
            notes: 'Due for hygiene recall after 9 months inactivity.',
            consentFlags: {
              whatsapp: true,
              voice: false,
              email: true,
              marketing: true,
            },
            source: 'import',
            lastInteractionAt: addDays(now, -210),
            nextSuggestedActionAt: addHours(now, 12),
          })
          .returning(),
        'Failed to create inactive patient'
      )
  );

  const identityRows = [
    { patientId: existingPatient.id, identityType: 'phone', identityValue: existingPatient.phone! },
    { patientId: existingPatient.id, identityType: 'email', identityValue: existingPatient.email! },
    { patientId: newLead.id, identityType: 'phone', identityValue: newLead.phone! },
    { patientId: inactivePatient.id, identityType: 'phone', identityValue: inactivePatient.phone! },
  ] as const;

  for (const identity of identityRows) {
    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.patientIdentities)
            .where(
              and(
                eq(schema.patientIdentities.tenantId, tenant.id),
                eq(schema.patientIdentities.patientId, identity.patientId),
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
              patientId: identity.patientId,
              identityType: identity.identityType,
              identityValue: identity.identityValue,
              isPrimary: true,
              confidenceScore: 1,
            })
            .returning(),
          `Failed to create patient identity ${identity.identityValue}`
        )
    );
  }

  const whatsappThread = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.conversationThreads)
          .where(
            and(
              eq(schema.conversationThreads.tenantId, tenant.id),
              eq(schema.conversationThreads.source, 'seed_whatsapp_thread')
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
            patientId: existingPatient.id,
            channelType: 'whatsapp',
            status: 'in_progress',
            intent: 'reschedule_appointment',
            priority: 'high',
            source: 'seed_whatsapp_thread',
            assignedUserId: null,
            lastMessageAt: addHours(now, -1),
            lastInboundAt: addHours(now, -1),
            lastOutboundAt: addHours(now, -0.5),
            requiresHumanReview: false,
            resolution: null,
          })
          .returning(),
        'Failed to create WhatsApp thread'
      )
  );

  const voiceThread = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.conversationThreads)
          .where(
            and(
              eq(schema.conversationThreads.tenantId, tenant.id),
              eq(schema.conversationThreads.source, 'seed_voice_thread')
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
            patientId: newLead.id,
            channelType: 'voice',
            status: 'pending_form',
            intent: 'new_patient',
            priority: 'normal',
            source: 'seed_voice_thread',
            assignedUserId: null,
            lastMessageAt: addHours(now, -2),
            lastInboundAt: addHours(now, -2),
            lastOutboundAt: addHours(now, -1.75),
            requiresHumanReview: true,
            resolution: null,
          })
          .returning(),
        'Failed to create voice thread'
      )
  );

  const messageRows = [
    {
      threadId: whatsappThread.id,
      patientId: existingPatient.id,
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Hola, necesito cambiar mi cita de hoy a primera hora de manana.',
      payload: { sourceChannelId: whatsappChannel.id },
      deliveryStatus: 'received',
      providerMessageId: 'seed-msg-001',
      sentAt: null,
      receivedAt: addHours(now, -1),
    },
    {
      threadId: whatsappThread.id,
      patientId: existingPatient.id,
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'template',
      body: 'Puedo ofrecerte manana a las 10:30. Te viene bien?',
      payload: { sourceChannelId: whatsappChannel.id },
      deliveryStatus: 'delivered',
      providerMessageId: 'seed-msg-002',
      sentAt: addHours(now, -0.5),
      receivedAt: null,
    },
  ] as const;

  for (const messageRow of messageRows) {
    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.conversationMessages)
            .where(
              and(
                eq(schema.conversationMessages.tenantId, tenant.id),
                eq(schema.conversationMessages.providerMessageId, messageRow.providerMessageId)
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
              ...messageRow,
            })
            .returning(),
          `Failed to create message ${messageRow.providerMessageId}`
        )
    );
  }

  const callSession = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.callSessions)
          .where(
            and(
              eq(schema.callSessions.tenantId, tenant.id),
              eq(schema.callSessions.providerCallId, 'seed-call-001')
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
            patientId: newLead.id,
            threadId: voiceThread.id,
            direction: 'inbound',
            status: 'callback_required',
            providerCallId: 'seed-call-001',
            fromNumber: newLead.phone!,
            toNumber: voiceChannel.phoneNumber!,
            startedAt: addHours(now, -2),
            endedAt: addHours(now, -1.95),
            durationSeconds: 180,
            summary: 'New patient asked about first cleaning appointment and insurance coverage.',
            transcript:
              'Hola, queria pedir una primera cita para limpieza y saber si aceptais mi seguro.',
            resolution: 'Needs intake form before booking.',
            requiresHumanReview: true,
          })
          .returning(),
        'Failed to create call session'
      )
  );

  const intakeTemplate = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.intakeFormTemplates)
          .where(
            and(
              eq(schema.intakeFormTemplates.tenantId, tenant.id),
              eq(schema.intakeFormTemplates.slug, 'new-patient-intake'),
              eq(schema.intakeFormTemplates.version, '1.0.0')
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
            name: 'New Patient Intake',
            slug: 'new-patient-intake',
            version: '1.0.0',
            schema: {
              fields: [
                { id: 'insurance', type: 'text', label: 'Insurance provider' },
                { id: 'allergies', type: 'textarea', label: 'Allergies' },
              ],
            },
            isActive: true,
          })
          .returning(),
        'Failed to create intake form template'
      )
  );

  const intakeSubmission = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.intakeFormSubmissions)
          .where(
            and(
              eq(schema.intakeFormSubmissions.tenantId, tenant.id),
              eq(schema.intakeFormSubmissions.templateId, intakeTemplate.id),
              eq(schema.intakeFormSubmissions.patientId, newLead.id)
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
            templateId: intakeTemplate.id,
            patientId: newLead.id,
            threadId: voiceThread.id,
            status: 'sent',
            answers: {},
            sentAt: addHours(now, -1.5),
            openedAt: null,
            completedAt: null,
            expiresAt: addDays(now, 2),
            requiredForBooking: true,
          })
          .returning(),
        'Failed to create intake form submission'
      )
  );

  const todayAppointment = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.appointments)
          .where(
            and(
              eq(schema.appointments.tenantId, tenant.id),
              eq(schema.appointments.externalAppointmentId, 'APPT-001')
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
            patientId: existingPatient.id,
            externalAppointmentId: 'APPT-001',
            serviceId: service.id,
            practitionerId: practitioner.id,
            locationId: location.id,
            threadId: whatsappThread.id,
            status: 'scheduled',
            source: 'whatsapp',
            startsAt: todayNine,
            endsAt: addMinutes(todayNine, 45),
            bookedAt: addDays(now, -7),
            confirmationStatus: 'pending',
            reminderStatus: 'scheduled',
            metadata: {
              room: 'Box 2',
            },
          })
          .returning(),
        'Failed to create same-day appointment'
      )
  );

  const confirmedAppointment = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.appointments)
          .where(
            and(
              eq(schema.appointments.tenantId, tenant.id),
              eq(schema.appointments.externalAppointmentId, 'APPT-002')
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
            patientId: existingPatient.id,
            externalAppointmentId: 'APPT-002',
            serviceId: service.id,
            practitionerId: practitioner.id,
            locationId: location.id,
            threadId: whatsappThread.id,
            status: 'confirmed',
            source: 'manual',
            startsAt: tomorrowTen,
            endsAt: addMinutes(tomorrowTen, 45),
            bookedAt: addDays(now, -3),
            confirmationStatus: 'confirmed',
            reminderStatus: 'sent',
            metadata: {
              note: 'Patient already confirmed via WhatsApp.',
            },
          })
          .returning(),
        'Failed to create confirmed appointment'
      )
  );

  const cancelledAppointment = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.appointments)
          .where(
            and(
              eq(schema.appointments.tenantId, tenant.id),
              eq(schema.appointments.externalAppointmentId, 'APPT-003')
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
            patientId: inactivePatient.id,
            externalAppointmentId: 'APPT-003',
            serviceId: service.id,
            practitionerId: practitioner.id,
            locationId: location.id,
            threadId: null,
            status: 'cancelled',
            source: 'manual',
            startsAt: todayEleven,
            endsAt: addMinutes(todayEleven, 45),
            bookedAt: addDays(now, -14),
            confirmationStatus: 'declined',
            reminderStatus: 'completed',
            cancellationReason: 'Patient requested reschedule',
            metadata: {
              cancelledBy: 'patient',
            },
          })
          .returning(),
        'Failed to create cancelled appointment'
      )
  );

  const reactivatedAppointment = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.appointments)
          .where(
            and(
              eq(schema.appointments.tenantId, tenant.id),
              eq(schema.appointments.externalAppointmentId, 'APPT-004')
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
            patientId: inactivePatient.id,
            externalAppointmentId: 'APPT-004',
            serviceId: service.id,
            practitionerId: practitioner.id,
            locationId: location.id,
            threadId: null,
            status: 'scheduled',
            source: 'campaign',
            startsAt: nextWeekTen,
            endsAt: addMinutes(nextWeekTen, 45),
            bookedAt: addHours(now, -6),
            confirmationStatus: 'pending',
            reminderStatus: 'pending',
            metadata: {
              bookedFromCampaign: true,
            },
          })
          .returning(),
        'Failed to create reactivated appointment'
      )
  );

  const appointmentEventRows = [
    {
      appointmentId: todayAppointment.id,
      eventType: 'scheduled',
      actorType: 'ai',
      payload: { threadId: whatsappThread.id },
    },
    {
      appointmentId: confirmedAppointment.id,
      eventType: 'confirmed',
      actorType: 'patient',
      payload: { channelType: 'whatsapp' },
    },
    {
      appointmentId: cancelledAppointment.id,
      eventType: 'cancelled',
      actorType: 'patient',
      payload: { reason: 'Patient requested reschedule' },
    },
    {
      appointmentId: reactivatedAppointment.id,
      eventType: 'booked_from_campaign',
      actorType: 'ai',
      payload: { campaignHint: 'spring-hygiene-recall' },
    },
  ] as const;

  for (const eventRow of appointmentEventRows) {
    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.appointmentEvents)
            .where(
              and(
                eq(schema.appointmentEvents.appointmentId, eventRow.appointmentId),
                eq(schema.appointmentEvents.eventType, eventRow.eventType)
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
              ...eventRow,
            })
            .returning(),
          `Failed to create appointment event ${eventRow.eventType}`
        )
    );
  }

  await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.reminderJobs)
          .where(
            and(
              eq(schema.reminderJobs.tenantId, tenant.id),
              eq(schema.reminderJobs.appointmentId, todayAppointment.id),
              eq(schema.reminderJobs.templateKey, 'appointment_reminder_24h')
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
            appointmentId: todayAppointment.id,
            channelType: 'whatsapp',
            status: 'scheduled',
            scheduledFor: addHours(now, 1),
            sentAt: null,
            templateKey: 'appointment_reminder_24h',
            attemptCount: 0,
            lastError: null,
          })
          .returning(),
        'Failed to create reminder job'
      )
  );

  await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.confirmationRequests)
          .where(
            and(
              eq(schema.confirmationRequests.tenantId, tenant.id),
              eq(schema.confirmationRequests.appointmentId, todayAppointment.id)
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
            appointmentId: todayAppointment.id,
            channelType: 'whatsapp',
            status: 'pending',
            requestedAt: addHours(now, -3),
            dueAt: addHours(now, 4),
            respondedAt: null,
            responsePayload: {},
          })
          .returning(),
        'Failed to create confirmation request'
      )
  );

  const waitlistRequest = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.waitlistRequests)
          .where(
            and(
              eq(schema.waitlistRequests.tenantId, tenant.id),
              eq(schema.waitlistRequests.patientId, newLead.id)
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
            patientId: newLead.id,
            serviceId: service.id,
            practitionerId: practitioner.id,
            locationId: location.id,
            preferredWindows: [
              { start: '09:00', end: '12:00', label: 'mornings' },
              { start: '16:00', end: '18:00', label: 'late-afternoon' },
            ],
            status: 'active',
            priorityScore: 0.82,
            notes: 'Happy to come earlier this week if a slot opens up.',
          })
          .returning(),
        'Failed to create waitlist request'
      )
  );

  const gapOpportunity = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.gapOpportunities)
          .where(
            and(
              eq(schema.gapOpportunities.tenantId, tenant.id),
              eq(schema.gapOpportunities.originAppointmentId, cancelledAppointment.id)
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
            originAppointmentId: cancelledAppointment.id,
            serviceId: service.id,
            practitionerId: practitioner.id,
            locationId: location.id,
            startsAt: cancelledAppointment.startsAt,
            endsAt: cancelledAppointment.endsAt,
            status: 'open',
            origin: 'cancellation',
          })
          .returning(),
        'Failed to create gap opportunity'
      )
  );

  await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.gapOutreachAttempts)
          .where(
            and(
              eq(schema.gapOutreachAttempts.tenantId, tenant.id),
              eq(schema.gapOutreachAttempts.gapOpportunityId, gapOpportunity.id),
              eq(schema.gapOutreachAttempts.patientId, waitlistRequest.patientId)
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
            gapOpportunityId: gapOpportunity.id,
            patientId: waitlistRequest.patientId,
            channelType: 'whatsapp',
            status: 'sent',
            sentAt: addHours(now, -0.75),
            respondedAt: null,
            result: 'Awaiting reply',
            metadata: {
              campaign: 'gap-fill',
            },
          })
          .returning(),
        'Failed to create gap outreach attempt'
      )
  );

  const reactivationCampaign = await ensureOne(
    async () =>
      (
        await db
          .select()
          .from(schema.reactivationCampaigns)
          .where(
            and(
              eq(schema.reactivationCampaigns.tenantId, tenant.id),
              eq(schema.reactivationCampaigns.name, 'Spring hygiene recall')
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
            name: 'Spring hygiene recall',
            campaignType: 'hygiene_recall',
            status: 'running',
            audienceDefinition: {
              inactiveDays: 180,
              serviceSlug: service.slug,
            },
            messageTemplate: {
              title: 'Time for your hygiene check',
              body: 'We have a few openings this week if you want to book your hygiene visit.',
            },
            channelPolicy: {
              primaryChannel: 'whatsapp',
              fallbackChannel: 'email',
            },
            scheduledAt: addDays(now, -1),
            startedAt: addHours(now, -12),
            completedAt: null,
          })
          .returning(),
        'Failed to create reactivation campaign'
      )
  );

  const recipientRows = [
    {
      patientId: inactivePatient.id,
      status: 'booked',
      lastContactAt: addHours(now, -8),
      lastResponseAt: addHours(now, -6),
      result: 'Booked hygiene recall',
      generatedAppointmentId: reactivatedAppointment.id,
      metadata: { sourceChannel: 'whatsapp' },
    },
    {
      patientId: existingPatient.id,
      status: 'contacted',
      lastContactAt: addHours(now, -4),
      lastResponseAt: null,
      result: 'Awaiting reply',
      generatedAppointmentId: null,
      metadata: { sourceChannel: 'email' },
    },
  ] as const;

  for (const recipientRow of recipientRows) {
    await ensureOne(
      async () =>
        (
          await db
            .select()
            .from(schema.reactivationRecipients)
            .where(
              and(
                eq(schema.reactivationRecipients.tenantId, tenant.id),
                eq(schema.reactivationRecipients.campaignId, reactivationCampaign.id),
                eq(schema.reactivationRecipients.patientId, recipientRow.patientId)
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
              campaignId: reactivationCampaign.id,
              ...recipientRow,
            })
            .returning(),
          `Failed to create campaign recipient ${recipientRow.patientId}`
        )
    );
  }

  return {
    tenant,
    clinicProfile,
    whatsappChannel,
    voiceChannel,
    service,
    practitioner,
    location,
    patients: [existingPatient, newLead, inactivePatient],
    whatsappThread,
    voiceThread,
    callSession,
    intakeSubmission,
    appointments: [
      todayAppointment,
      confirmedAppointment,
      cancelledAppointment,
      reactivatedAppointment,
    ],
    gapOpportunity,
    reactivationCampaign,
  };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function seed() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  print('Seeding database...');

  const user = await ensureUser(db);
  const genericTenant = await seedGenericDemo(db, user.id);
  const clinicDemo = await seedClinicDemo(db, user.id);

  print('Seed complete.');
  print(`  User:            ${user.id} (${ADMIN_EMAIL})`);
  print(`  Workspace demo:  ${genericTenant.id} (${genericTenant.name})`);
  print(`  Clinic demo:     ${clinicDemo.tenant.id} (${clinicDemo.tenant.name})`);
  print(`  Clinic profile:  ${clinicDemo.clinicProfile.displayName}`);
  print(`  Patients:        ${clinicDemo.patients.length}`);
  print(`  Threads:         2`);
  print(`  Appointments:    ${clinicDemo.appointments.length}`);
  print(`  Active gap:      ${clinicDemo.gapOpportunity.id}`);
  print(`  Campaign:        ${clinicDemo.reactivationCampaign.name}`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
