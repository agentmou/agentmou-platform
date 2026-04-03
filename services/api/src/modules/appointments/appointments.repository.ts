import {
  appointmentEvents,
  appointments,
  confirmationRequests,
  db,
  gapOpportunities,
} from '@agentmou/db';
import type {
  AppointmentFilters,
  CancelAppointmentBody,
  ConfirmAppointmentBody,
  CreateAppointmentBody,
  RescheduleAppointmentBody,
  UpdateAppointmentBody,
} from '@agentmou/contracts';
import { and, asc, desc, eq } from 'drizzle-orm';

import { ClinicReadModelsRepository } from '../clinic-shared/clinic-read-models.repository.js';
import { mapAppointmentDetail, mapAppointmentEvent } from '../clinic-shared/clinic.mapper.js';

type DatabaseClient = typeof db;

export class AppointmentsRepository {
  private readonly readModels: ClinicReadModelsRepository;

  constructor(private readonly database: DatabaseClient = db) {
    this.readModels = new ClinicReadModelsRepository(database);
  }

  async listAppointments(tenantId: string, filters: AppointmentFilters) {
    const rows = await this.database
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, tenantId))
      .orderBy(asc(appointments.startsAt));

    const filtered = rows.filter((row) => matchesAppointmentFilters(row, filters));

    return {
      appointments: await this.readModels.loadAppointmentSummaries(
        tenantId,
        filtered.slice(0, filters.limit ?? 50)
      ),
      total: filtered.length,
    };
  }

  async getAppointmentDetail(tenantId: string, appointmentId: string) {
    const [appointment] = await this.database
      .select()
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .limit(1);

    if (!appointment) {
      return null;
    }

    const [summary, events] = await Promise.all([
      this.readModels.loadAppointmentSummaries(tenantId, [appointment]),
      this.database
        .select()
        .from(appointmentEvents)
        .where(
          and(
            eq(appointmentEvents.tenantId, tenantId),
            eq(appointmentEvents.appointmentId, appointmentId)
          )
        )
        .orderBy(desc(appointmentEvents.createdAt)),
    ]);

    return mapAppointmentDetail(appointment, {
      patient: summary[0]?.patient ?? null,
      service: summary[0]?.service ?? null,
      practitioner: summary[0]?.practitioner ?? null,
      location: summary[0]?.location ?? null,
      events: events.map(mapAppointmentEvent),
    });
  }

  async createAppointment(tenantId: string, body: CreateAppointmentBody) {
    const bookedAt = body.bookedAt ? new Date(body.bookedAt) : new Date();
    const [appointment] = await this.database
      .insert(appointments)
      .values({
        tenantId,
        patientId: body.patientId,
        serviceId: body.serviceId ?? null,
        practitionerId: body.practitionerId ?? null,
        locationId: body.locationId ?? null,
        threadId: body.threadId ?? null,
        status: body.status ?? 'scheduled',
        source: body.source ?? 'manual',
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        bookedAt,
        confirmationStatus: body.confirmationStatus ?? 'pending',
        reminderStatus: body.reminderStatus ?? 'pending',
        metadata: body.metadata ?? {},
      })
      .returning();

    await this.insertAppointmentEvent(tenantId, appointment.id, 'created', {
      status: appointment.status,
      source: appointment.source,
    });

    return appointment;
  }

  async updateAppointment(tenantId: string, appointmentId: string, body: UpdateAppointmentBody) {
    const [appointment] = await this.database
      .update(appointments)
      .set({
        serviceId: body.serviceId,
        practitionerId: body.practitionerId,
        locationId: body.locationId,
        threadId: body.threadId,
        status: body.status,
        source: body.source,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        bookedAt: body.bookedAt ? new Date(body.bookedAt) : undefined,
        confirmationStatus: body.confirmationStatus,
        reminderStatus: body.reminderStatus,
        metadata: body.metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .returning();

    if (!appointment) {
      return null;
    }

    await this.insertAppointmentEvent(tenantId, appointmentId, 'updated', body);
    return appointment;
  }

  async rescheduleAppointment(
    tenantId: string,
    appointmentId: string,
    body: RescheduleAppointmentBody
  ) {
    const [current] = await this.database
      .select()
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .limit(1);

    if (!current) {
      return null;
    }

    const [appointment] = await this.database
      .update(appointments)
      .set({
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        status: 'rescheduled',
        confirmationStatus: 'pending',
        reminderStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .returning();

    await this.insertAppointmentEvent(tenantId, appointmentId, 'rescheduled', {
      previousStartsAt: current.startsAt.toISOString(),
      previousEndsAt: current.endsAt.toISOString(),
      reason: body.reason,
    });
    await this.createGapFromAppointment(tenantId, current, 'reschedule');

    return appointment ?? null;
  }

  async cancelAppointment(tenantId: string, appointmentId: string, body: CancelAppointmentBody) {
    const [current] = await this.database
      .select()
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .limit(1);

    if (!current) {
      return null;
    }

    const [appointment] = await this.database
      .update(appointments)
      .set({
        status: 'cancelled',
        cancellationReason: body.cancellationReason,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .returning();

    await this.insertAppointmentEvent(tenantId, appointmentId, 'cancelled', {
      cancellationReason: body.cancellationReason,
    });
    await this.createGapFromAppointment(tenantId, current, 'cancellation');

    return appointment ?? null;
  }

  async confirmAppointment(tenantId: string, appointmentId: string, body: ConfirmAppointmentBody) {
    const respondedAt = body.respondedAt ? new Date(body.respondedAt) : new Date();

    const [appointment] = await this.database
      .update(appointments)
      .set({
        confirmationStatus: 'confirmed',
        status: 'confirmed',
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .returning();

    if (!appointment) {
      return null;
    }

    const [existingConfirmation] = await this.database
      .select()
      .from(confirmationRequests)
      .where(
        and(
          eq(confirmationRequests.tenantId, tenantId),
          eq(confirmationRequests.appointmentId, appointmentId)
        )
      )
      .orderBy(desc(confirmationRequests.createdAt))
      .limit(1);

    if (existingConfirmation) {
      await this.database
        .update(confirmationRequests)
        .set({
          status: 'confirmed',
          respondedAt,
          responsePayload: body.responsePayload ?? {},
          updatedAt: new Date(),
        })
        .where(eq(confirmationRequests.id, existingConfirmation.id));
    } else {
      await this.database.insert(confirmationRequests).values({
        tenantId,
        appointmentId,
        channelType: body.channelType ?? 'whatsapp',
        status: 'confirmed',
        requestedAt: respondedAt,
        dueAt: respondedAt,
        respondedAt,
        responsePayload: body.responsePayload ?? {},
      });
    }

    await this.insertAppointmentEvent(tenantId, appointmentId, 'confirmed', {
      channelType: body.channelType,
    });

    return appointment;
  }

  private async insertAppointmentEvent(
    tenantId: string,
    appointmentId: string,
    eventType: string,
    payload: Record<string, unknown>
  ) {
    await this.database.insert(appointmentEvents).values({
      tenantId,
      appointmentId,
      eventType,
      actorType: 'human',
      payload,
    });
  }

  private async createGapFromAppointment(
    tenantId: string,
    appointment: typeof appointments.$inferSelect,
    origin: 'cancellation' | 'reschedule'
  ) {
    await this.database.insert(gapOpportunities).values({
      tenantId,
      originAppointmentId: appointment.id,
      serviceId: appointment.serviceId,
      practitionerId: appointment.practitionerId,
      locationId: appointment.locationId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: 'open',
      origin,
    });
  }
}

function matchesAppointmentFilters(
  row: typeof appointments.$inferSelect,
  filters: AppointmentFilters
) {
  if (filters.date && row.startsAt.toISOString().slice(0, 10) !== filters.date) {
    return false;
  }

  if (filters.from && row.startsAt.toISOString() < filters.from) {
    return false;
  }

  if (filters.to && row.startsAt.toISOString() > filters.to) {
    return false;
  }

  if (filters.locationId && row.locationId !== filters.locationId) {
    return false;
  }

  if (filters.practitionerId && row.practitionerId !== filters.practitionerId) {
    return false;
  }

  if (filters.serviceId && row.serviceId !== filters.serviceId) {
    return false;
  }

  if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (filters.confirmationStatus && row.confirmationStatus !== filters.confirmationStatus) {
    return false;
  }

  if (filters.reminderStatus && row.reminderStatus !== filters.reminderStatus) {
    return false;
  }

  return true;
}
