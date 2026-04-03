import {
  appointments,
  confirmationRequests,
  conversationThreads,
  db,
  gapOpportunities,
  gapOutreachAttempts,
  reminderJobs,
} from '@agentmou/db';
import type {
  CloseGapBody,
  ConfirmationFilters,
  EscalateConfirmationBody,
  GapFilters,
  OfferGapBody,
  RemindConfirmationBody,
} from '@agentmou/contracts';
import { and, asc, desc, eq } from 'drizzle-orm';

import { ClinicReadModelsRepository } from '../clinic-shared/clinic-read-models.repository.js';

type DatabaseClient = typeof db;

export class FollowUpRepository {
  private readonly readModels: ClinicReadModelsRepository;

  constructor(private readonly database: DatabaseClient = db) {
    this.readModels = new ClinicReadModelsRepository(database);
  }

  async listReminders(tenantId: string, limit = 50) {
    return this.database
      .select()
      .from(reminderJobs)
      .where(eq(reminderJobs.tenantId, tenantId))
      .orderBy(desc(reminderJobs.scheduledFor))
      .limit(limit);
  }

  async listConfirmations(tenantId: string, filters: ConfirmationFilters) {
    const rows = await this.database
      .select()
      .from(confirmationRequests)
      .where(eq(confirmationRequests.tenantId, tenantId))
      .orderBy(asc(confirmationRequests.dueAt));

    return rows
      .filter((row) => matchesConfirmationFilters(row, filters))
      .slice(0, filters.limit ?? 50);
  }

  async remindConfirmation(
    tenantId: string,
    confirmationId: string,
    body: RemindConfirmationBody
  ) {
    const [confirmation] = await this.database
      .select()
      .from(confirmationRequests)
      .where(
        and(
          eq(confirmationRequests.tenantId, tenantId),
          eq(confirmationRequests.id, confirmationId)
        )
      )
      .limit(1);

    if (!confirmation) {
      return null;
    }

    const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : new Date();

    const [reminder] = await this.database
      .insert(reminderJobs)
      .values({
        tenantId,
        appointmentId: confirmation.appointmentId,
        channelType: confirmation.channelType,
        status: 'scheduled',
        scheduledFor,
        templateKey: body.templateKey ?? 'confirmation-reminder',
        attemptCount: 0,
      })
      .returning();

    await this.database
      .update(appointments)
      .set({
        reminderStatus: 'scheduled',
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, confirmation.appointmentId)));

    return reminder;
  }

  async escalateConfirmation(
    tenantId: string,
    confirmationId: string,
    body: EscalateConfirmationBody
  ) {
    const [confirmation] = await this.database
      .update(confirmationRequests)
      .set({
        status: 'escalated',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(confirmationRequests.tenantId, tenantId),
          eq(confirmationRequests.id, confirmationId)
        )
      )
      .returning();

    if (!confirmation) {
      return null;
    }

    const [appointment] = await this.database
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.id, confirmation.appointmentId)
        )
      )
      .limit(1);

    if (appointment?.threadId) {
      await this.database
        .update(conversationThreads)
        .set({
          assignedUserId: body.assignedUserId ?? null,
          status: 'pending_human',
          requiresHumanReview: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversationThreads.tenantId, tenantId),
            eq(conversationThreads.id, appointment.threadId)
          )
        );
    }

    return confirmation;
  }

  async listGaps(tenantId: string, filters: GapFilters) {
    const rows = await this.database
      .select()
      .from(gapOpportunities)
      .where(eq(gapOpportunities.tenantId, tenantId))
      .orderBy(asc(gapOpportunities.startsAt));

    const filtered = rows.filter((row) => matchesGapFilters(row, filters));
    return this.readModels.loadGapDetails(tenantId, filtered.slice(0, filters.limit ?? 50));
  }

  async offerGap(tenantId: string, gapId: string, body: OfferGapBody) {
    const [gap] = await this.database
      .update(gapOpportunities)
      .set({
        status: 'offered',
        updatedAt: new Date(),
      })
      .where(and(eq(gapOpportunities.tenantId, tenantId), eq(gapOpportunities.id, gapId)))
      .returning();

    if (!gap) {
      return null;
    }

    const now = new Date();

    for (const patientId of body.patientIds) {
      await this.database.insert(gapOutreachAttempts).values({
        tenantId,
        gapOpportunityId: gapId,
        patientId,
        channelType: body.channelType,
        status: 'sent',
        sentAt: now,
        result: body.templateKey ?? 'gap_offer_sent',
        metadata: {},
      });
    }

    const [detail] = await this.readModels.loadGapDetails(tenantId, [gap]);
    return detail ?? null;
  }

  async closeGap(tenantId: string, gapId: string, body: CloseGapBody) {
    const [gap] = await this.database
      .update(gapOpportunities)
      .set({
        status: body.status,
        updatedAt: new Date(),
      })
      .where(and(eq(gapOpportunities.tenantId, tenantId), eq(gapOpportunities.id, gapId)))
      .returning();

    if (!gap) {
      return null;
    }

    const [detail] = await this.readModels.loadGapDetails(tenantId, [gap]);
    return detail ?? null;
  }
}

function matchesConfirmationFilters(
  row: typeof confirmationRequests.$inferSelect,
  filters: ConfirmationFilters
) {
  if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (filters.channelType && row.channelType !== filters.channelType) {
    return false;
  }

  if (filters.dueBefore && row.dueAt.toISOString() > filters.dueBefore) {
    return false;
  }

  if (filters.appointmentId && row.appointmentId !== filters.appointmentId) {
    return false;
  }

  return true;
}

function matchesGapFilters(row: typeof gapOpportunities.$inferSelect, filters: GapFilters) {
  if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (filters.serviceId && row.serviceId !== filters.serviceId) {
    return false;
  }

  if (filters.practitionerId && row.practitionerId !== filters.practitionerId) {
    return false;
  }

  if (filters.locationId && row.locationId !== filters.locationId) {
    return false;
  }

  if (filters.from && row.startsAt.toISOString() < filters.from) {
    return false;
  }

  if (filters.to && row.startsAt.toISOString() > filters.to) {
    return false;
  }

  return true;
}
