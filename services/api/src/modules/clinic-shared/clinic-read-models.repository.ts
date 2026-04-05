import {
  appointments,
  callSessions,
  clinicLocations,
  clinicServices,
  conversationMessages,
  conversationThreads,
  db,
  gapOpportunities,
  gapOutreachAttempts,
  intakeFormSubmissions,
  patientIdentities,
  patients,
  practitioners,
  reactivationCampaigns,
  reactivationRecipients,
  reminderJobs,
  waitlistRequests,
} from '@agentmou/db';
import { and, desc, eq, gte, inArray, ne } from 'drizzle-orm';

import {
  mapAppointmentSummary,
  mapCallSessionDetail,
  mapClinicLocation,
  mapClinicService,
  mapConversationMessage,
  mapConversationThread,
  mapConversationThreadDetail,
  mapConversationThreadListItem,
  mapGapOpportunityDetail,
  mapGapOutreachAttempt,
  mapPatient,
  mapPatientIdentity,
  mapPatientListItem,
  mapPractitioner,
  mapReactivationCampaignDetail,
  mapReactivationRecipient,
  mapWaitlistRequest,
} from './clinic.mapper.js';

type DatabaseClient = typeof db;
type PatientRow = typeof patients.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;
type CallRow = typeof callSessions.$inferSelect;
type ThreadRow = typeof conversationThreads.$inferSelect;
type GapRow = typeof gapOpportunities.$inferSelect;
type CampaignRow = typeof reactivationCampaigns.$inferSelect;

export class ClinicReadModelsRepository {
  constructor(private readonly database: DatabaseClient = db) {}

  async loadPatientListItemMap(tenantId: string, patientRows: PatientRow[]) {
    const patientIds = uniqueIds(patientRows.map((patient) => patient.id));

    if (patientIds.length === 0) {
      return new Map<string, ReturnType<typeof mapPatientListItem>>();
    }

    const [upcomingAppointments, pendingForms] = await Promise.all([
      this.database
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            inArray(appointments.patientId, patientIds),
            gte(appointments.startsAt, new Date()),
            ne(appointments.status, 'cancelled')
          )
        ),
      this.database
        .select({
          id: intakeFormSubmissions.id,
          patientId: intakeFormSubmissions.patientId,
        })
        .from(intakeFormSubmissions)
        .where(
          and(
            eq(intakeFormSubmissions.tenantId, tenantId),
            inArray(intakeFormSubmissions.patientId, patientIds)
          )
        ),
    ]);

    const upcomingCount = new Map<string, number>();
    for (const appointment of upcomingAppointments) {
      upcomingCount.set(appointment.patientId, (upcomingCount.get(appointment.patientId) ?? 0) + 1);
    }

    const pendingFormPatients = new Set(
      pendingForms
        .filter((submission) => Boolean(submission.patientId))
        .map((submission) => submission.patientId as string)
    );

    return new Map(
      patientRows.map((patient) => [
        patient.id,
        mapPatientListItem(patient, {
          upcomingAppointmentCount: upcomingCount.get(patient.id) ?? 0,
          hasPendingForm: pendingFormPatients.has(patient.id),
          isReactivationCandidate: patient.status === 'inactive',
        }),
      ])
    );
  }

  async loadAppointmentSummaries(tenantId: string, appointmentRows: AppointmentRow[]) {
    const patientIds = uniqueIds(appointmentRows.map((row) => row.patientId));
    const serviceIds = uniqueIds(appointmentRows.map((row) => row.serviceId));
    const practitionerIds = uniqueIds(appointmentRows.map((row) => row.practitionerId));
    const locationIds = uniqueIds(appointmentRows.map((row) => row.locationId));

    const [patientRows, serviceRows, practitionerRows, locationRows] = await Promise.all([
      patientIds.length === 0
        ? Promise.resolve([] as PatientRow[])
        : this.database.select().from(patients).where(inArray(patients.id, patientIds)),
      serviceIds.length === 0
        ? Promise.resolve([] as Array<typeof clinicServices.$inferSelect>)
        : this.database.select().from(clinicServices).where(inArray(clinicServices.id, serviceIds)),
      practitionerIds.length === 0
        ? Promise.resolve([] as Array<typeof practitioners.$inferSelect>)
        : this.database
            .select()
            .from(practitioners)
            .where(inArray(practitioners.id, practitionerIds)),
      locationIds.length === 0
        ? Promise.resolve([] as Array<typeof clinicLocations.$inferSelect>)
        : this.database
            .select()
            .from(clinicLocations)
            .where(inArray(clinicLocations.id, locationIds)),
    ]);

    const patientMap = await this.loadPatientListItemMap(tenantId, patientRows);
    const serviceMap = new Map(serviceRows.map((row) => [row.id, mapClinicService(row)]));
    const practitionerMap = new Map(practitionerRows.map((row) => [row.id, mapPractitioner(row)]));
    const locationMap = new Map(locationRows.map((row) => [row.id, mapClinicLocation(row)]));

    return appointmentRows.map((row) =>
      mapAppointmentSummary(row, {
        patient: patientMap.get(row.patientId) ?? null,
        service: row.serviceId ? (serviceMap.get(row.serviceId) ?? null) : null,
        practitioner: row.practitionerId ? (practitionerMap.get(row.practitionerId) ?? null) : null,
        location: row.locationId ? (locationMap.get(row.locationId) ?? null) : null,
      })
    );
  }

  async loadConversationListItems(tenantId: string, threadRows: ThreadRow[]) {
    const patientIds = uniqueIds(threadRows.map((row) => row.patientId));
    const threadIds = uniqueIds(threadRows.map((row) => row.id));

    const [patientRows, messageRows] = await Promise.all([
      patientIds.length === 0
        ? Promise.resolve([] as PatientRow[])
        : this.database.select().from(patients).where(inArray(patients.id, patientIds)),
      threadIds.length === 0
        ? Promise.resolve([] as Array<typeof conversationMessages.$inferSelect>)
        : this.database
            .select()
            .from(conversationMessages)
            .where(
              and(
                eq(conversationMessages.tenantId, tenantId),
                inArray(conversationMessages.threadId, threadIds)
              )
            )
            .orderBy(desc(conversationMessages.createdAt)),
    ]);

    const patientMap = await this.loadPatientListItemMap(tenantId, patientRows);
    const messagesByThread = groupBy(messageRows, (row) => row.threadId);

    return threadRows.map((row) => {
      const messages = messagesByThread.get(row.id) ?? [];
      const lastMessage = messages[0];
      const unreadCount = messages.filter((message) => {
        if (message.direction !== 'inbound') {
          return false;
        }

        if (!row.lastOutboundAt) {
          return true;
        }

        return message.createdAt > row.lastOutboundAt;
      }).length;

      return mapConversationThreadListItem(row, {
        patient: row.patientId ? (patientMap.get(row.patientId) ?? null) : null,
        lastMessagePreview: lastMessage?.body ?? '',
        nextSuggestedAction: getNextSuggestedAction(row),
        unreadCount,
      });
    });
  }

  async loadConversationDetail(tenantId: string, threadRow: ThreadRow) {
    const [patientRow, messageRows] = await Promise.all([
      threadRow.patientId
        ? this.database
            .select()
            .from(patients)
            .where(and(eq(patients.tenantId, tenantId), eq(patients.id, threadRow.patientId)))
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      this.database
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.tenantId, tenantId),
            eq(conversationMessages.threadId, threadRow.id)
          )
        )
        .orderBy(conversationMessages.createdAt),
    ]);

    return mapConversationThreadDetail(threadRow, {
      patient: patientRow ? mapPatient(patientRow) : null,
      messages: messageRows.map(mapConversationMessage),
    });
  }

  async loadCallDetail(tenantId: string, callRow: CallRow) {
    const [patientRow, threadRow] = await Promise.all([
      callRow.patientId
        ? this.database
            .select()
            .from(patients)
            .where(and(eq(patients.tenantId, tenantId), eq(patients.id, callRow.patientId)))
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      callRow.threadId
        ? this.database
            .select()
            .from(conversationThreads)
            .where(
              and(
                eq(conversationThreads.tenantId, tenantId),
                eq(conversationThreads.id, callRow.threadId)
              )
            )
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
    ]);

    return mapCallSessionDetail(callRow, {
      patient: patientRow ? mapPatient(patientRow) : null,
      thread: threadRow ? mapConversationThread(threadRow) : null,
    });
  }

  async loadGapDetails(tenantId: string, gapRows: GapRow[]) {
    const gapIds = uniqueIds(gapRows.map((row) => row.id));

    const outreachRows =
      gapIds.length === 0
        ? []
        : await this.database
            .select()
            .from(gapOutreachAttempts)
            .where(
              and(
                eq(gapOutreachAttempts.tenantId, tenantId),
                inArray(gapOutreachAttempts.gapOpportunityId, gapIds)
              )
            )
            .orderBy(desc(gapOutreachAttempts.createdAt));

    const outreachByGap = groupBy(outreachRows, (row) => row.gapOpportunityId);

    return gapRows.map((row) =>
      mapGapOpportunityDetail(row, (outreachByGap.get(row.id) ?? []).map(mapGapOutreachAttempt))
    );
  }

  async loadCampaignDetail(tenantId: string, campaignRow: CampaignRow) {
    const recipients = await this.database
      .select()
      .from(reactivationRecipients)
      .where(
        and(
          eq(reactivationRecipients.tenantId, tenantId),
          eq(reactivationRecipients.campaignId, campaignRow.id)
        )
      )
      .orderBy(desc(reactivationRecipients.createdAt));

    return mapReactivationCampaignDetail(campaignRow, recipients.map(mapReactivationRecipient));
  }

  async loadPatientDetail(tenantId: string, patientRow: PatientRow) {
    const [identityRows, appointmentRows, waitlistRows] = await Promise.all([
      this.database
        .select()
        .from(patientIdentities)
        .where(
          and(
            eq(patientIdentities.tenantId, tenantId),
            eq(patientIdentities.patientId, patientRow.id)
          )
        ),
      this.database
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.patientId, patientRow.id),
            gte(appointments.startsAt, new Date())
          )
        )
        .orderBy(appointments.startsAt),
      this.database
        .select()
        .from(waitlistRequests)
        .where(
          and(
            eq(waitlistRequests.tenantId, tenantId),
            eq(waitlistRequests.patientId, patientRow.id)
          )
        )
        .orderBy(desc(waitlistRequests.createdAt)),
    ]);

    return {
      patient: mapPatient(patientRow),
      identities: identityRows.map(mapPatientIdentity),
      upcomingAppointments: await this.loadAppointmentSummaries(tenantId, appointmentRows),
      waitlistRequests: waitlistRows.map(mapWaitlistRequest),
    };
  }

  async loadCampaignRecipients(tenantId: string, limit = 50) {
    const rows = await this.database
      .select()
      .from(reactivationRecipients)
      .where(eq(reactivationRecipients.tenantId, tenantId))
      .orderBy(desc(reactivationRecipients.createdAt))
      .limit(limit);

    return rows.map(mapReactivationRecipient);
  }

  async loadReminderJobs(tenantId: string, limit = 50) {
    const rows = await this.database
      .select()
      .from(reminderJobs)
      .where(eq(reminderJobs.tenantId, tenantId))
      .orderBy(desc(reminderJobs.scheduledFor))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
    }));
  }
}

function groupBy<TItem, TKey>(items: TItem[], getKey: (item: TItem) => TKey) {
  const grouped = new Map<TKey, TItem[]>();

  for (const item of items) {
    const key = getKey(item);
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  return grouped;
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getNextSuggestedAction(row: ThreadRow) {
  if (row.requiresHumanReview || row.status === 'pending_human' || row.status === 'escalated') {
    return 'Assign to reception';
  }

  if (row.status === 'pending_form') {
    return 'Follow up on intake form';
  }

  if (row.intent === 'book_appointment') {
    return 'Offer appointment options';
  }

  if (row.intent === 'cancel_appointment') {
    return 'Confirm cancellation outcome';
  }

  return 'Reply to patient';
}
