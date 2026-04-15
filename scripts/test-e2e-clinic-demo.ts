#!/usr/bin/env tsx

import {
  CLINIC_QA_TENANT_NAME,
  FISIO_QA_TENANT_NAME,
  INTERNAL_QA_TENANT_NAME,
  QA_SEED_ADMIN_EMAIL,
  QA_SEED_ADMIN_PASSWORD,
} from '../packages/db/src/seed-blueprints.ts';

const DEMO_TENANT_ID = 'demo-workspace';

process.env.NODE_ENV ??= 'test';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.NEXT_PUBLIC_API_URL ??= 'http://127.0.0.1:3001';
process.env.MARKETING_PUBLIC_BASE_URL ??= 'http://localhost:3000';
process.env.APP_PUBLIC_BASE_URL ??= 'http://localhost:3000';
process.env.API_PUBLIC_BASE_URL ??= 'http://localhost:3001';
process.env.LOG_LEVEL ??= 'silent';

type UnknownRecord = Record<string, unknown>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function step(title: string) {
  process.stdout.write(`\n${title}\n`);
}

function log(message: string) {
  process.stdout.write(`   ${message}\n`);
}

function unwrapModule<T>(moduleNamespace: unknown): T {
  const moduleRecord = moduleNamespace as UnknownRecord;
  return (
    (moduleRecord.default as T | undefined) ??
    (moduleRecord['module.exports'] as T | undefined) ??
    (moduleNamespace as T)
  );
}

function readString(value: unknown, label: string): string {
  assert(typeof value === 'string', `Expected ${label} to be a string`);
  return value;
}

function readNumber(value: unknown, label: string): number {
  assert(typeof value === 'number', `Expected ${label} to be a number`);
  return value;
}

function readArray(value: unknown, label: string): unknown[] {
  assert(Array.isArray(value), `Expected ${label} to be an array`);
  return value;
}

function readRecord(value: unknown, label: string): UnknownRecord {
  assert(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    `Expected ${label} to be an object`
  );
  return value as UnknownRecord;
}

async function main() {
  const dbIndexModule = unwrapModule<{
    and: typeof import('../packages/db/src/index.ts').and;
    eq: typeof import('../packages/db/src/index.ts').eq;
  }>(await import('../packages/db/src/index.ts'));

  const clinicReadModelModule = unwrapModule<{
    getClinicAppointment: (tenantId: string, appointmentId: string) => unknown;
    getClinicDashboard: (tenantId: string) => unknown;
    getClinicDemoFixtureSummary: (tenantId: string) => unknown;
    getClinicExperience: (tenantId: string) => unknown;
    getClinicFormSubmission: (tenantId: string, submissionId: string) => unknown;
    getClinicPatient: (tenantId: string, patientId: string) => unknown;
    getClinicReactivationCampaign: (tenantId: string, campaignId: string) => unknown;
    listClinicGaps: (tenantId: string, filters: { status: 'open' }) => unknown[];
  }>(await import('../apps/web/lib/demo/clinic-read-model.ts'));

  const clinicSeedFixtureModule = unwrapModule<{
    buildClinicDemoSeedFixture: (now: Date) => unknown;
  }>(await import('../packages/db/src/clinic-demo-fixture.ts'));

  const summary = readRecord(
    clinicReadModelModule.getClinicDemoFixtureSummary(DEMO_TENANT_ID),
    'frontend clinic demo summary'
  );
  const summaryCounts = readRecord(summary.counts, 'summary.counts');
  const journeys = readRecord(summary.journeys, 'summary.journeys');
  const dashboard = readRecord(
    clinicReadModelModule.getClinicDashboard(DEMO_TENANT_ID),
    'frontend clinic dashboard'
  );
  const experience = readRecord(
    clinicReadModelModule.getClinicExperience(DEMO_TENANT_ID),
    'frontend clinic experience'
  );
  const seedFixture = readRecord(
    clinicSeedFixtureModule.buildClinicDemoSeedFixture(new Date()),
    'seed blueprint'
  );

  step('1. Demo dataset inventory');
  assert(
    readNumber(summaryCounts.patients, 'summary.counts.patients') === 11,
    'Expected exactly 11 demo patients'
  );
  assert(
    readNumber(summaryCounts.whatsappThreads, 'summary.counts.whatsappThreads') === 7,
    'Expected exactly 7 WhatsApp threads'
  );
  assert(
    readNumber(summaryCounts.calls, 'summary.counts.calls') === 3,
    'Expected exactly 3 call sessions'
  );
  assert(
    readNumber(summaryCounts.forms, 'summary.counts.forms') === 3,
    'Expected exactly 3 form submissions'
  );
  assert(
    readNumber(summaryCounts.appointments, 'summary.counts.appointments') === 6,
    'Expected exactly 6 appointments'
  );
  assert(
    readNumber(summaryCounts.activeGaps, 'summary.counts.activeGaps') === 1,
    'Expected exactly 1 open gap'
  );
  assert(
    readNumber(summaryCounts.activeCampaigns, 'summary.counts.activeCampaigns') === 1,
    'Expected exactly 1 active campaign'
  );
  log(
    `patients=${summaryCounts.patients}, whatsappThreads=${summaryCounts.whatsappThreads}, calls=${summaryCounts.calls}`
  );

  step('2. New patient journey');
  const newPatientJourney = readRecord(journeys.newPatient, 'journeys.newPatient');
  const newPatient = readRecord(
    clinicReadModelModule.getClinicPatient(
      DEMO_TENANT_ID,
      readString(newPatientJourney.patientId, 'journeys.newPatient.patientId')
    ),
    'new patient'
  );
  const newPatientRecord = readRecord(newPatient.patient, 'newPatient.patient');
  const newPatientSubmission = readRecord(
    clinicReadModelModule.getClinicFormSubmission(
      DEMO_TENANT_ID,
      readString(newPatientJourney.submissionId, 'journeys.newPatient.submissionId')
    ),
    'new patient submission'
  );
  const newPatientAppointment = readRecord(
    clinicReadModelModule.getClinicAppointment(
      DEMO_TENANT_ID,
      readString(newPatientJourney.appointmentId, 'journeys.newPatient.appointmentId')
    ),
    'new patient appointment'
  );
  assert(
    readString(newPatientRecord.fullName, 'new patient fullName') === 'Ana Garcia',
    'New patient journey patient mismatch'
  );
  assert(
    readString(newPatientSubmission.status, 'new patient submission status') === 'completed',
    'Expected completed intake form'
  );
  assert(
    readString(newPatientAppointment.status, 'new patient appointment status') === 'scheduled',
    'Expected booked appointment'
  );
  log(`${newPatientRecord.fullName} -> form completed -> appointment booked`);

  step('3. Reschedule and confirmation journeys');
  const rescheduleJourney = readRecord(journeys.reschedule, 'journeys.reschedule');
  const rescheduledAppointment = readRecord(
    clinicReadModelModule.getClinicAppointment(
      DEMO_TENANT_ID,
      readString(rescheduleJourney.appointmentId, 'journeys.reschedule.appointmentId')
    ),
    'rescheduled appointment'
  );
  const pendingConfirmations = readArray(
    dashboard.pendingConfirmations,
    'dashboard.pendingConfirmations'
  );
  assert(
    readString(rescheduledAppointment.status, 'rescheduled appointment status') === 'rescheduled',
    'Expected rescheduled appointment'
  );
  assert(
    pendingConfirmations.length ===
      readNumber(summaryCounts.confirmationsPending, 'summary.counts.confirmationsPending'),
    'Pending confirmation KPI drifted from queue length'
  );
  log(
    `rescheduled=${readString(rescheduledAppointment.id, 'rescheduled appointment id')}, pendingConfirmations=${pendingConfirmations.length}`
  );

  step('4. Cancellation and gap recovery');
  const gapRecoveryJourney = readRecord(journeys.gapRecovery, 'journeys.gapRecovery');
  const gaps = clinicReadModelModule.listClinicGaps(DEMO_TENANT_ID, { status: 'open' });
  const gap = gaps.find((item) => {
    const record = readRecord(item, 'gap item');
    return (
      readString(record.id, 'gap.id') ===
      readString(gapRecoveryJourney.gapId, 'journeys.gapRecovery.gapId')
    );
  });
  assert(gap, 'Expected open gap for cancellation journey');
  const gapRecord = readRecord(gap, 'gap record');
  const outreachAttempts = readArray(gapRecord.outreachAttempts, 'gap.outreachAttempts');
  assert(
    outreachAttempts.some((attempt) => {
      const record = readRecord(attempt, 'gap outreach attempt');
      return (
        readString(record.id, 'gap outreach attempt id') ===
          readString(
            gapRecoveryJourney.outreachAttemptId,
            'journeys.gapRecovery.outreachAttemptId'
          ) && readString(record.status, 'gap outreach attempt status') === 'sent'
      );
    }),
    'Expected sent gap outreach attempt'
  );
  log(`gap=${readString(gapRecord.id, 'gap.id')}, outreachAttempts=${outreachAttempts.length}`);

  step('5. Reactivation journey');
  const reactivationJourney = readRecord(journeys.reactivation, 'journeys.reactivation');
  const campaign = readRecord(
    clinicReadModelModule.getClinicReactivationCampaign(
      DEMO_TENANT_ID,
      readString(reactivationJourney.campaignId, 'journeys.reactivation.campaignId')
    ),
    'reactivation campaign'
  );
  const recipients = readArray(campaign.recipients, 'campaign.recipients');
  assert(
    recipients.some(
      (recipient) =>
        readString(readRecord(recipient, 'recipient').status, 'recipient.status') === 'booked'
    ),
    'Expected booked reactivation recipient'
  );
  assert(
    recipients.some(
      (recipient) =>
        readString(readRecord(recipient, 'recipient').status, 'recipient.status') === 'failed'
    ),
    'Expected failed reactivation recipient'
  );
  log(
    `campaign=${readString(campaign.name, 'campaign.name')}, recipientStatuses=${recipients
      .map((recipient) => readString(readRecord(recipient, 'recipient').status, 'recipient.status'))
      .join(', ')}`
  );

  step('6. Demo vs internal tenant expectations');
  const flags = readRecord(experience.flags, 'experience.flags');
  const tenantSettings = readRecord(seedFixture.tenantSettings, 'seedFixture.tenantSettings');
  assert(flags.internalPlatformVisible === false, 'Demo workspace must hide internal mode');
  assert(
    tenantSettings.internalPlatformVisible === false,
    'Seeded clinic fixture must keep internal mode hidden'
  );
  log(
    'demo and seeded clinic both hide internal mode; internal access belongs to the admin workspace'
  );

  await runDatabaseSmoke(summary, seedFixture, dbIndexModule);
  await runApiSmoke(summary);

  step('Done');
  process.stdout.write('Clinic demo + QA seed smoke checks passed.\n');
}

async function runDatabaseSmoke(
  summary: UnknownRecord,
  seedFixture: UnknownRecord,
  dbIndexModule: {
    and: typeof import('../packages/db/src/index.ts').and;
    eq: typeof import('../packages/db/src/index.ts').eq;
  }
) {
  step('7. Seed database smoke');

  if (!process.env.DATABASE_URL) {
    log('skipped (DATABASE_URL not set)');
    return;
  }

  const dbClientModule = unwrapModule<{
    createDb: (url?: string) => { db: unknown; close: () => Promise<unknown> };
  }>(await import('../packages/db/src/client.ts'));
  const schema = unwrapModule<UnknownRecord>(await import('../packages/db/src/schema.ts'));
  const { and, eq } = dbIndexModule;

  const { db, close } = dbClientModule.createDb(process.env.DATABASE_URL);
  const typedDb = db as {
    select: (...args: unknown[]) => {
      from: (table: unknown) => {
        where: (condition: unknown) => { limit: (count: number) => Promise<UnknownRecord[]> };
        limit: (count: number) => Promise<UnknownRecord[]>;
      };
    };
  };

  try {
    const tenants = readRecord(schema.tenants, 'schema.tenants');
    const memberships = readRecord(schema.memberships, 'schema.memberships');
    const tenantVerticalConfigs = readRecord(
      schema.tenantVerticalConfigs,
      'schema.tenantVerticalConfigs'
    );
    const patients = readRecord(schema.patients, 'schema.patients');
    const conversationThreads = readRecord(
      schema.conversationThreads,
      'schema.conversationThreads'
    );
    const callSessions = readRecord(schema.callSessions, 'schema.callSessions');
    const intakeFormSubmissions = readRecord(
      schema.intakeFormSubmissions,
      'schema.intakeFormSubmissions'
    );
    const appointments = readRecord(schema.appointments, 'schema.appointments');
    const confirmationRequests = readRecord(
      schema.confirmationRequests,
      'schema.confirmationRequests'
    );
    const gapOpportunities = readRecord(schema.gapOpportunities, 'schema.gapOpportunities');
    const gapOutreachAttempts = readRecord(
      schema.gapOutreachAttempts,
      'schema.gapOutreachAttempts'
    );
    const reactivationCampaigns = readRecord(
      schema.reactivationCampaigns,
      'schema.reactivationCampaigns'
    );
    const reactivationRecipients = readRecord(
      schema.reactivationRecipients,
      'schema.reactivationRecipients'
    );

    const [clinicTenant] = await typedDb
      .select()
      .from(tenants)
      .where(eq(tenants.name, CLINIC_QA_TENANT_NAME))
      .limit(1);

    assert(clinicTenant, 'Expected seeded clinic tenant to exist');
    const clinicTenantSettings = readRecord(clinicTenant.settings, 'clinicTenant.settings');
    assert(
      clinicTenantSettings.internalPlatformVisible === false,
      'Expected seeded clinic tenant to keep internal mode hidden'
    );

    const clinicTenantId = readString(clinicTenant.id, 'clinicTenant.id');
    const [internalTenant] = await typedDb
      .select()
      .from(tenants)
      .where(eq(tenants.name, INTERNAL_QA_TENANT_NAME))
      .limit(1);
    assert(internalTenant, 'Expected seeded internal admin tenant to exist');
    const internalTenantSettings = readRecord(internalTenant.settings, 'internalTenant.settings');
    assert(
      readString(
        internalTenantSettings.activeVertical,
        'internalTenant.settings.activeVertical'
      ) === 'internal',
      'Expected internal seed workspace activeVertical=internal'
    );
    assert(
      internalTenantSettings.isPlatformAdminTenant === true,
      'Expected internal seed workspace to stay platform-admin enabled'
    );
    const [fisioTenant] = await typedDb
      .select()
      .from(tenants)
      .where(eq(tenants.name, FISIO_QA_TENANT_NAME))
      .limit(1);
    assert(fisioTenant, 'Expected seeded fisio tenant to exist');
    const fisioTenantSettings = readRecord(fisioTenant.settings, 'fisioTenant.settings');
    assert(
      readString(fisioTenantSettings.activeVertical, 'fisioTenant.settings.activeVertical') ===
        'fisio',
      'Expected fisio seed workspace activeVertical=fisio'
    );

    const [internalMembership] = await typedDb
      .select()
      .from(memberships)
      .where(eq(memberships.tenantId, readString(internalTenant.id, 'internalTenant.id')))
      .limit(5);
    assert(internalMembership, 'Expected membership for internal seed workspace');
    assert(
      readString(internalMembership.role, 'internalMembership.role') === 'owner',
      'Expected internal seed workspace to keep owner membership'
    );
    const [fisioMembership] = await typedDb
      .select()
      .from(memberships)
      .where(eq(memberships.tenantId, readString(fisioTenant.id, 'fisioTenant.id')))
      .limit(5);
    assert(fisioMembership, 'Expected membership for fisio seed workspace');
    assert(
      readString(fisioMembership.role, 'fisioMembership.role') === 'admin',
      'Expected fisio seed workspace to keep admin membership'
    );

    const [internalVerticalConfig] = await typedDb
      .select()
      .from(tenantVerticalConfigs)
      .where(eq(tenantVerticalConfigs.tenantId, readString(internalTenant.id, 'internalTenant.id')))
      .limit(5);
    assert(internalVerticalConfig, 'Expected internal seed tenant vertical config');
    assert(
      readString(internalVerticalConfig.verticalKey, 'internalVerticalConfig.verticalKey') ===
        'internal',
      'Expected internal vertical config row'
    );
    const [fisioVerticalConfig] = await typedDb
      .select()
      .from(tenantVerticalConfigs)
      .where(eq(tenantVerticalConfigs.tenantId, readString(fisioTenant.id, 'fisioTenant.id')))
      .limit(5);
    assert(fisioVerticalConfig, 'Expected fisio seed tenant vertical config');
    assert(
      readString(fisioVerticalConfig.verticalKey, 'fisioVerticalConfig.verticalKey') === 'fisio',
      'Expected fisio vertical config row'
    );

    const summaryCounts = readRecord(summary.counts, 'summary.counts');
    const seedSummary = readRecord(seedFixture.summary, 'seedFixture.summary');
    const seedSummaryCounts = readRecord(seedSummary.counts, 'seedFixture.summary.counts');
    const seedJourneys = readRecord(seedSummary.journeys, 'seedFixture.summary.journeys');
    const fixturePatients = readArray(seedFixture.patients, 'seedFixture.patients');
    const fixtureAppointments = readArray(seedFixture.appointments, 'seedFixture.appointments');
    const fixtureCampaigns = readArray(seedFixture.campaigns, 'seedFixture.campaigns');

    assert(
      readNumber(seedSummaryCounts.patients, 'seedFixture.summary.counts.patients') ===
        readNumber(summaryCounts.patients, 'summary.counts.patients'),
      'Seed patient summary drifted from frontend summary'
    );
    assert(
      readNumber(
        seedSummaryCounts.whatsappThreads,
        'seedFixture.summary.counts.whatsappThreads'
      ) === readNumber(summaryCounts.whatsappThreads, 'summary.counts.whatsappThreads'),
      'Seed WhatsApp summary drifted from frontend summary'
    );
    assert(
      readNumber(seedSummaryCounts.calls, 'seedFixture.summary.counts.calls') ===
        readNumber(summaryCounts.calls, 'summary.counts.calls'),
      'Seed call summary drifted from frontend summary'
    );
    assert(
      readNumber(
        seedSummaryCounts.formSubmissions,
        'seedFixture.summary.counts.formSubmissions'
      ) === readNumber(summaryCounts.forms, 'summary.counts.forms'),
      'Seed form summary drifted from frontend summary'
    );

    const dbPatients = await typedDb
      .select()
      .from(patients)
      .where(eq(patients.tenantId, clinicTenantId))
      .limit(100);
    const dbThreads = await typedDb
      .select()
      .from(conversationThreads)
      .where(eq(conversationThreads.tenantId, clinicTenantId))
      .limit(100);
    const dbCalls = await typedDb
      .select()
      .from(callSessions)
      .where(eq(callSessions.tenantId, clinicTenantId))
      .limit(100);
    const dbSubmissions = await typedDb
      .select()
      .from(intakeFormSubmissions)
      .where(eq(intakeFormSubmissions.tenantId, clinicTenantId))
      .limit(100);
    const dbAppointments = await typedDb
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, clinicTenantId))
      .limit(100);
    const dbConfirmations = await typedDb
      .select()
      .from(confirmationRequests)
      .where(eq(confirmationRequests.tenantId, clinicTenantId))
      .limit(100);
    const dbGaps = await typedDb
      .select()
      .from(gapOpportunities)
      .where(eq(gapOpportunities.tenantId, clinicTenantId))
      .limit(100);
    const dbCampaigns = await typedDb
      .select()
      .from(reactivationCampaigns)
      .where(eq(reactivationCampaigns.tenantId, clinicTenantId))
      .limit(100);

    assert(
      dbPatients.length ===
        readNumber(seedSummaryCounts.patients, 'seedFixture.summary.counts.patients'),
      'Seed patient count drifted'
    );
    assert(
      dbThreads.length ===
        readNumber(
          seedSummaryCounts.whatsappThreads,
          'seedFixture.summary.counts.whatsappThreads'
        ) +
          readNumber(seedSummaryCounts.voiceThreads, 'seedFixture.summary.counts.voiceThreads'),
      'Seed thread count drifted'
    );
    assert(
      dbCalls.length === readNumber(seedSummaryCounts.calls, 'seedFixture.summary.counts.calls'),
      'Seed call count drifted'
    );
    assert(
      dbSubmissions.length ===
        readNumber(seedSummaryCounts.formSubmissions, 'seedFixture.summary.counts.formSubmissions'),
      'Seed form submission count drifted'
    );
    assert(
      dbAppointments.length ===
        readNumber(seedSummaryCounts.appointments, 'seedFixture.summary.counts.appointments'),
      'Seed appointment count drifted'
    );
    assert(
      dbConfirmations.filter((item) => item.status === 'pending').length ===
        readNumber(
          seedSummaryCounts.pendingConfirmations,
          'seedFixture.summary.counts.pendingConfirmations'
        ),
      'Seed pending confirmation count drifted'
    );
    assert(
      dbGaps.filter((item) => item.status === 'open').length ===
        readNumber(seedSummaryCounts.activeGaps, 'seedFixture.summary.counts.activeGaps'),
      'Seed gap count drifted'
    );
    assert(
      dbCampaigns.filter((item) => item.status === 'running').length ===
        readNumber(seedSummaryCounts.activeCampaigns, 'seedFixture.summary.counts.activeCampaigns'),
      'Seed active campaign count drifted'
    );

    const newPatientJourney = readRecord(
      seedJourneys.newPatient,
      'seedFixture.summary.journeys.newPatient'
    );
    const newPatientFixture = fixturePatients.find((patient) => {
      const record = readRecord(patient, 'seed patient');
      return (
        readString(record.key, 'seed patient key') ===
        readString(
          newPatientJourney.patientKey,
          'seedFixture.summary.journeys.newPatient.patientKey'
        )
      );
    });
    assert(newPatientFixture, 'Missing seed patient fixture for new-patient journey');
    const newPatientFixtureRecord = readRecord(newPatientFixture, 'new patient fixture');
    const [seedNewPatient] = await typedDb
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, clinicTenantId),
          eq(
            patients.externalPatientId,
            readString(newPatientFixtureRecord.externalPatientId, 'new patient external id')
          )
        )
      )
      .limit(1);
    assert(seedNewPatient, 'Expected seeded Ana Garcia patient');

    const gapRecoveryJourney = readRecord(
      seedJourneys.gapRecovery,
      'seedFixture.summary.journeys.gapRecovery'
    );
    const cancelledAppointmentFixture = fixtureAppointments.find((appointment) => {
      const record = readRecord(appointment, 'seed appointment');
      return (
        readString(record.key, 'seed appointment key') ===
        readString(
          gapRecoveryJourney.cancelledAppointmentKey,
          'seedFixture.summary.journeys.gapRecovery.cancelledAppointmentKey'
        )
      );
    });
    assert(cancelledAppointmentFixture, 'Missing cancelled appointment fixture');
    const cancelledAppointmentFixtureRecord = readRecord(
      cancelledAppointmentFixture,
      'cancelled appointment fixture'
    );
    const [cancelledAppointment] = await typedDb
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, clinicTenantId),
          eq(
            appointments.externalAppointmentId,
            readString(
              cancelledAppointmentFixtureRecord.externalAppointmentId,
              'cancelled appointment external id'
            )
          )
        )
      )
      .limit(1);
    assert(cancelledAppointment, 'Expected cancelled appointment in seeded DB');

    const [gap] = await typedDb
      .select()
      .from(gapOpportunities)
      .where(
        and(
          eq(gapOpportunities.tenantId, clinicTenantId),
          eq(
            gapOpportunities.originAppointmentId,
            readString(cancelledAppointment.id, 'cancelled appointment id')
          )
        )
      )
      .limit(1);
    assert(gap, 'Expected gap linked to cancelled appointment');

    const candidateFixture = fixturePatients.find((patient) => {
      const record = readRecord(patient, 'seed patient');
      return (
        readString(record.key, 'seed patient key') ===
        readString(
          gapRecoveryJourney.candidatePatientKey,
          'seedFixture.summary.journeys.gapRecovery.candidatePatientKey'
        )
      );
    });
    assert(candidateFixture, 'Missing gap-recovery candidate fixture');
    const candidateFixtureRecord = readRecord(candidateFixture, 'candidate patient fixture');
    const [candidatePatient] = await typedDb
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, clinicTenantId),
          eq(
            patients.externalPatientId,
            readString(candidateFixtureRecord.externalPatientId, 'candidate external patient id')
          )
        )
      )
      .limit(1);
    assert(candidatePatient, 'Expected seeded candidate patient for gap recovery');

    const [gapOutreach] = await typedDb
      .select()
      .from(gapOutreachAttempts)
      .where(
        and(
          eq(gapOutreachAttempts.tenantId, clinicTenantId),
          eq(gapOutreachAttempts.gapOpportunityId, readString(gap.id, 'gap.id')),
          eq(gapOutreachAttempts.patientId, readString(candidatePatient.id, 'candidatePatient.id'))
        )
      )
      .limit(1);
    assert(gapOutreach, 'Expected gap outreach attempt for candidate patient');
    assert(
      readString(gapOutreach.status, 'gap outreach status') === 'sent',
      'Expected sent gap outreach'
    );

    const reactivationJourney = readRecord(
      seedJourneys.reactivation,
      'seedFixture.summary.journeys.reactivation'
    );
    const campaignFixture = fixtureCampaigns.find((campaign) => {
      const record = readRecord(campaign, 'seed campaign');
      return (
        readString(record.key, 'seed campaign key') ===
        readString(
          reactivationJourney.campaignKey,
          'seedFixture.summary.journeys.reactivation.campaignKey'
        )
      );
    });
    assert(campaignFixture, 'Missing reactivation campaign fixture');
    const campaignFixtureRecord = readRecord(campaignFixture, 'campaign fixture');
    const [campaign] = await typedDb
      .select()
      .from(reactivationCampaigns)
      .where(
        and(
          eq(reactivationCampaigns.tenantId, clinicTenantId),
          eq(
            reactivationCampaigns.name,
            readString(campaignFixtureRecord.name, 'campaign fixture name')
          )
        )
      )
      .limit(1);
    assert(campaign, 'Expected seeded reactivation campaign');

    const dbRecipients = await typedDb
      .select()
      .from(reactivationRecipients)
      .where(
        and(
          eq(reactivationRecipients.tenantId, clinicTenantId),
          eq(reactivationRecipients.campaignId, readString(campaign.id, 'campaign.id'))
        )
      )
      .limit(20);
    const recipientStatuses = dbRecipients.map((recipient) =>
      readString(recipient.status, 'reactivation recipient status')
    );
    assert(recipientStatuses.includes('booked'), 'Expected booked reactivation recipient');
    assert(recipientStatuses.includes('contacted'), 'Expected contacted reactivation recipient');
    assert(recipientStatuses.includes('failed'), 'Expected failed reactivation recipient');

    log(
      `clinic=${clinicTenantId}, internal=${readString(internalTenant.id, 'internalTenant.id')}, fisio=${readString(fisioTenant.id, 'fisioTenant.id')}`
    );
  } finally {
    await close();
  }
}

async function runApiSmoke(summary: UnknownRecord) {
  step('8. API in-process smoke');

  if (!process.env.DATABASE_URL) {
    log('skipped (DATABASE_URL not set)');
    return;
  }

  const apiModule = unwrapModule<{
    buildApp: () => {
      ready: () => Promise<void>;
      close: () => Promise<void>;
      inject: (options: {
        method: string;
        url: string;
        payload?: UnknownRecord;
        headers?: Record<string, string>;
      }) => Promise<{
        statusCode: number;
        json: () => unknown;
        body: string;
      }>;
    };
  }>(await import('../services/api/src/app.ts'));

  const app = apiModule.buildApp();

  try {
    await app.ready();

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: QA_SEED_ADMIN_EMAIL,
        password: QA_SEED_ADMIN_PASSWORD,
      },
      headers: {
        'content-type': 'application/json',
      },
    });
    assert(
      loginResponse.statusCode === 200,
      `Expected seeded login to succeed, received ${loginResponse.statusCode}: ${loginResponse.body}`
    );
    const loginBody = readRecord(loginResponse.json(), 'login response');
    const token = readString(loginBody.token, 'login token');
    const tenants = readArray(loginBody.tenants, 'login tenants');
    const clinicTenant = tenants.find((tenant) => {
      const record = readRecord(tenant, 'login tenant');
      return readString(record.name, 'login tenant name') === CLINIC_QA_TENANT_NAME;
    });
    assert(clinicTenant, 'Expected seeded login to expose Dental Demo Clinic');
    const clinicTenantId = readString(
      readRecord(clinicTenant, 'clinic tenant').id,
      'clinic tenant id'
    );
    const internalTenant = tenants.find((tenant) => {
      const record = readRecord(tenant, 'login tenant');
      return readString(record.name, 'login tenant name') === INTERNAL_QA_TENANT_NAME;
    });
    assert(internalTenant, 'Expected seeded login to expose the internal admin workspace');
    const internalTenantId = readString(
      readRecord(internalTenant, 'internal tenant').id,
      'internal tenant id'
    );
    const fisioTenant = tenants.find((tenant) => {
      const record = readRecord(tenant, 'login tenant');
      return readString(record.name, 'login tenant name') === FISIO_QA_TENANT_NAME;
    });
    assert(fisioTenant, 'Expected seeded login to expose the fisio workspace');
    const fisioTenantId = readString(readRecord(fisioTenant, 'fisio tenant').id, 'fisio tenant id');

    const authHeaders = {
      authorization: `Bearer ${token}`,
    };

    const experienceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/clinic/experience`,
      headers: authHeaders,
    });
    assert(
      experienceResponse.statusCode === 200,
      `Expected clinic experience route to succeed, received ${experienceResponse.statusCode}`
    );
    const experienceBody = readRecord(experienceResponse.json(), 'experience response');
    const experience = readRecord(experienceBody.experience, 'experience');
    const flags = readRecord(experience.flags, 'experience.flags');
    const permissions = readArray(experience.permissions, 'experience.permissions');
    assert(
      readString(experience.defaultMode, 'experience.defaultMode') === 'clinic',
      'Expected clinic tenant default mode'
    );
    assert(
      flags.internalPlatformVisible === false,
      'Expected seeded clinic tenant to hide internal mode'
    );
    assert(
      !permissions.includes('view_internal_platform'),
      'Expected seeded clinic tenant to stay out of the internal platform'
    );

    const internalExperienceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${internalTenantId}/experience`,
      headers: authHeaders,
    });
    assert(
      internalExperienceResponse.statusCode === 200,
      `Expected internal tenant experience route to succeed, received ${internalExperienceResponse.statusCode}`
    );
    const internalExperienceBody = readRecord(
      internalExperienceResponse.json(),
      'internal experience response'
    );
    const internalExperience = readRecord(internalExperienceBody.experience, 'internal experience');
    assert(
      readString(internalExperience.activeVertical, 'internal experience.activeVertical') ===
        'internal',
      'Expected internal seed workspace activeVertical=internal'
    );
    assert(
      readString(internalExperience.shellKey, 'internal experience.shellKey') ===
        'platform_internal',
      'Expected internal seed workspace to keep the internal shell'
    );
    assert(
      readArray(
        internalExperience.allowedNavigation,
        'internal experience.allowedNavigation'
      ).includes('admin_console'),
      'Expected internal seed workspace to expose admin navigation'
    );
    assert(
      internalExperience.canAccessAdminConsole === true,
      'Expected internal seed workspace to access the admin console'
    );

    const fisioExperienceResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${fisioTenantId}/experience`,
      headers: authHeaders,
    });
    assert(
      fisioExperienceResponse.statusCode === 200,
      `Expected fisio tenant experience route to succeed, received ${fisioExperienceResponse.statusCode}`
    );
    const fisioExperienceBody = readRecord(
      fisioExperienceResponse.json(),
      'fisio experience response'
    );
    const fisioExperience = readRecord(fisioExperienceBody.experience, 'fisio experience');
    assert(
      readString(fisioExperience.activeVertical, 'fisio experience.activeVertical') === 'fisio',
      'Expected fisio seed workspace activeVertical=fisio'
    );
    assert(
      readString(fisioExperience.shellKey, 'fisio experience.shellKey') === 'fisio',
      'Expected fisio seed workspace to resolve the shared fisio shell'
    );
    assert(
      readArray(fisioExperience.settingsSections, 'fisio experience.settingsSections').join(',') ===
        [
          'general',
          'team',
          'integrations',
          'plan',
          'security',
          'care_profile',
          'care_schedule',
        ].join(','),
      'Expected fisio seed workspace to expose only the prepared settings subset'
    );

    const adminTenantsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/tenants?limit=10',
      headers: {
        ...authHeaders,
        'x-tenant-id': internalTenantId,
      },
    });
    assert(
      adminTenantsResponse.statusCode === 200,
      `Expected admin tenants route to succeed for the internal workspace, received ${adminTenantsResponse.statusCode}`
    );
    const adminTenantsBody = readRecord(adminTenantsResponse.json(), 'admin tenants response');
    const adminTenantItems = readArray(adminTenantsBody.tenants, 'admin tenants');
    assert(
      adminTenantItems.some(
        (tenant) =>
          readString(readRecord(tenant, 'admin tenant').name, 'admin tenant.name') ===
          CLINIC_QA_TENANT_NAME
      ),
      'Expected admin tenants list to include the seeded clinic workspace'
    );

    const forbiddenAdminResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/tenants?limit=10',
      headers: {
        ...authHeaders,
        'x-tenant-id': fisioTenantId,
      },
    });
    assert(
      forbiddenAdminResponse.statusCode === 403,
      `Expected fisio tenant to be rejected by admin routes, received ${forbiddenAdminResponse.statusCode}`
    );

    const dashboardResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/clinic/dashboard`,
      headers: authHeaders,
    });
    assert(
      dashboardResponse.statusCode === 200,
      `Expected clinic dashboard route to succeed, received ${dashboardResponse.statusCode}`
    );
    const dashboardBody = readRecord(dashboardResponse.json(), 'dashboard response');
    const dashboard = readRecord(dashboardBody.dashboard, 'dashboard');
    const dashboardKpis = readRecord(dashboard.kpis, 'dashboard.kpis');
    assert(
      readNumber(dashboardKpis.pendingConfirmations, 'dashboard.kpis.pendingConfirmations') ===
        readNumber(
          readRecord(summary.counts, 'summary.counts').confirmationsPending,
          'summary.counts.confirmationsPending'
        ),
      'Expected dashboard KPI to match fixture confirmation count'
    );

    const patientsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/patients?limit=20`,
      headers: authHeaders,
    });
    assert(
      patientsResponse.statusCode === 200,
      `Expected patients route to succeed, received ${patientsResponse.statusCode}`
    );
    const patientsBody = readRecord(patientsResponse.json(), 'patients response');
    const patientItems = readArray(patientsBody.patients, 'patients response items');
    assert(
      patientItems.length === 11,
      `Expected 11 patients from API, received ${patientItems.length}`
    );
    assert(
      patientItems.some(
        (patient) =>
          readString(readRecord(patient, 'patient item').fullName, 'patient fullName') ===
          'Ana Garcia'
      ),
      'Expected Ana Garcia in API patients response'
    );

    const conversationsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/conversations?limit=20`,
      headers: authHeaders,
    });
    assert(
      conversationsResponse.statusCode === 200,
      `Expected conversations route to succeed, received ${conversationsResponse.statusCode}`
    );
    const conversationsBody = readRecord(conversationsResponse.json(), 'conversations response');
    const threads = readArray(conversationsBody.threads, 'conversation threads');
    assert(threads.length === 10, `Expected 10 seeded inbox threads, received ${threads.length}`);
    assert(
      threads.some((thread) => {
        const patient = readRecord(readRecord(thread, 'thread').patient, 'thread.patient');
        return readString(patient.fullName, 'thread.patient.fullName') === 'Lucia Perez';
      }),
      'Expected Lucia Perez reschedule thread in API response'
    );

    const appointmentsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/appointments?limit=20`,
      headers: authHeaders,
    });
    assert(
      appointmentsResponse.statusCode === 200,
      `Expected appointments route to succeed, received ${appointmentsResponse.statusCode}`
    );
    const appointmentsBody = readRecord(appointmentsResponse.json(), 'appointments response');
    const appointments = readArray(appointmentsBody.appointments, 'appointments');
    assert(
      appointments.length === 6,
      `Expected 6 seeded appointments, received ${appointments.length}`
    );
    assert(
      appointments.some(
        (appointment) =>
          readString(readRecord(appointment, 'appointment').status, 'appointment.status') ===
          'rescheduled'
      ),
      'Expected one rescheduled appointment in API response'
    );

    const confirmationsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/follow-up/confirmations?status=pending`,
      headers: authHeaders,
    });
    assert(
      confirmationsResponse.statusCode === 200,
      `Expected confirmations route to succeed, received ${confirmationsResponse.statusCode}`
    );
    const confirmationsBody = readRecord(confirmationsResponse.json(), 'confirmations response');
    const confirmations = readArray(confirmationsBody.confirmations, 'confirmations');
    assert(
      confirmations.length === 2,
      `Expected 2 pending confirmations, received ${confirmations.length}`
    );

    const gapsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/follow-up/gaps?status=open`,
      headers: authHeaders,
    });
    assert(
      gapsResponse.statusCode === 200,
      `Expected gaps route to succeed, received ${gapsResponse.statusCode}`
    );
    const gapsBody = readRecord(gapsResponse.json(), 'gaps response');
    const gaps = readArray(gapsBody.gaps, 'gaps');
    assert(gaps.length === 1, `Expected 1 open gap, received ${gaps.length}`);
    assert(
      readArray(readRecord(gaps[0], 'gap').outreachAttempts, 'gap.outreachAttempts').some(
        (attempt) =>
          readString(readRecord(attempt, 'gap outreach').status, 'gap outreach status') === 'sent'
      ),
      'Expected sent outreach attempt in API gap response'
    );

    const campaignsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/reactivation/campaigns?limit=10`,
      headers: authHeaders,
    });
    assert(
      campaignsResponse.statusCode === 200,
      `Expected campaigns route to succeed, received ${campaignsResponse.statusCode}`
    );
    const campaignsBody = readRecord(campaignsResponse.json(), 'campaigns response');
    const campaigns = readArray(campaignsBody.campaigns, 'campaigns');
    assert(
      campaigns.length === 1,
      `Expected 1 seeded reactivation campaign, received ${campaigns.length}`
    );

    const campaignId = readString(readRecord(campaigns[0], 'campaign').id, 'campaign id');
    const campaignResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/tenants/${clinicTenantId}/reactivation/campaigns/${campaignId}`,
      headers: authHeaders,
    });
    assert(
      campaignResponse.statusCode === 200,
      `Expected campaign detail route to succeed, received ${campaignResponse.statusCode}`
    );
    const campaignBody = readRecord(campaignResponse.json(), 'campaign detail response');
    const campaign = readRecord(campaignBody.campaign, 'campaign detail');
    const recipients = readArray(campaign.recipients, 'campaign recipients');
    const recipientStatuses = recipients.map((recipient) =>
      readString(readRecord(recipient, 'campaign recipient').status, 'campaign recipient status')
    );
    assert(
      recipientStatuses.includes('booked'),
      'Expected booked reactivation recipient in API response'
    );
    assert(
      recipientStatuses.includes('contacted'),
      'Expected contacted reactivation recipient in API response'
    );
    assert(
      recipientStatuses.includes('failed'),
      'Expected failed reactivation recipient in API response'
    );

    log(
      `clinic=${clinicTenantId}, internal=${internalTenantId}, fisio=${fisioTenantId}, patients=${patientItems.length}`
    );
  } finally {
    await app.close();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Clinic demo smoke failed:', error);
    process.exit(1);
  });
