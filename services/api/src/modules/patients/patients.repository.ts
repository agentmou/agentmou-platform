import {
  db,
  patientIdentities,
  patients,
  reactivationRecipients,
  waitlistRequests,
} from '@agentmou/db';
import type {
  CreatePatientBody,
  CreateWaitlistRequestBody,
  PatientFilters,
  ReactivatePatientBody,
  UpdatePatientBody,
} from '@agentmou/contracts';
import { and, desc, eq } from 'drizzle-orm';

import { ClinicReadModelsRepository } from '../clinic-shared/clinic-read-models.repository.js';

type DatabaseClient = typeof db;

export class PatientsRepository {
  private readonly readModels: ClinicReadModelsRepository;

  constructor(private readonly database: DatabaseClient = db) {
    this.readModels = new ClinicReadModelsRepository(database);
  }

  async listPatients(tenantId: string, filters: PatientFilters) {
    const rows = await this.database
      .select()
      .from(patients)
      .where(eq(patients.tenantId, tenantId))
      .orderBy(desc(patients.updatedAt), desc(patients.createdAt));

    const filtered = rows.filter((row) => matchesPatientFilters(row, filters));
    const patientMap = await this.readModels.loadPatientListItemMap(tenantId, filtered);
    const enriched = filtered
      .map((row) => patientMap.get(row.id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .filter((row) => matchesDerivedPatientFilters(row, filters));

    return {
      patients: enriched.slice(0, filters.limit ?? 50),
      total: enriched.length,
    };
  }

  async getPatientDetail(tenantId: string, patientId: string) {
    const [patient] = await this.database
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)))
      .limit(1);

    if (!patient) {
      return null;
    }

    return this.readModels.loadPatientDetail(tenantId, patient);
  }

  async createPatient(tenantId: string, body: CreatePatientBody) {
    const [patient] = await this.database
      .insert(patients)
      .values({
        tenantId,
        externalPatientId: body.externalPatientId ?? null,
        status: body.status ?? 'new_lead',
        isExisting: body.isExisting ?? false,
        firstName: body.firstName,
        lastName: body.lastName,
        fullName: `${body.firstName} ${body.lastName}`.trim(),
        phone: body.phone ?? null,
        email: body.email ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        notes: body.notes ?? null,
        consentFlags: body.consentFlags ?? {},
        source: body.source ?? 'manual',
      })
      .returning();

    await this.syncPatientIdentities(tenantId, patient.id, body.phone, body.email);
    return patient;
  }

  async updatePatient(tenantId: string, patientId: string, body: UpdatePatientBody) {
    const [current] = await this.database
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)))
      .limit(1);

    if (!current) {
      return null;
    }

    const firstName = body.firstName ?? current.firstName;
    const lastName = body.lastName ?? current.lastName;

    const [patient] = await this.database
      .update(patients)
      .set({
        externalPatientId: body.externalPatientId ?? current.externalPatientId,
        status: body.status ?? current.status,
        isExisting: body.isExisting ?? current.isExisting,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        phone: body.phone ?? current.phone,
        email: body.email ?? current.email,
        dateOfBirth: body.dateOfBirth ?? current.dateOfBirth,
        notes: body.notes ?? current.notes,
        consentFlags: body.consentFlags ?? current.consentFlags,
        source: body.source ?? current.source,
        nextSuggestedActionAt: body.nextSuggestedActionAt
          ? new Date(body.nextSuggestedActionAt)
          : current.nextSuggestedActionAt,
        updatedAt: new Date(),
      })
      .where(and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)))
      .returning();

    await this.syncPatientIdentities(tenantId, patient.id, patient.phone ?? undefined, patient.email ?? undefined);
    return patient;
  }

  async reactivatePatient(
    tenantId: string,
    patientId: string,
    body: ReactivatePatientBody
  ) {
    const [patient] = await this.database
      .update(patients)
      .set({
        status: 'reactivated',
        source: body.source,
        nextSuggestedActionAt: null,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(patients.tenantId, tenantId), eq(patients.id, patientId)))
      .returning();

    if (!patient) {
      return null;
    }

    if (body.campaignId) {
      await this.database
        .update(reactivationRecipients)
        .set({
          status: 'responded',
          lastResponseAt: new Date(),
          result: body.note ?? 'patient_reactivated',
        })
        .where(
          and(
            eq(reactivationRecipients.tenantId, tenantId),
            eq(reactivationRecipients.campaignId, body.campaignId),
            eq(reactivationRecipients.patientId, patientId)
          )
        );
    }

    return patient;
  }

  async createWaitlistRequest(
    tenantId: string,
    patientId: string,
    body: CreateWaitlistRequestBody
  ) {
    const [waitlistRequest] = await this.database
      .insert(waitlistRequests)
      .values({
        tenantId,
        patientId,
        serviceId: body.serviceId ?? null,
        practitionerId: body.practitionerId ?? null,
        locationId: body.locationId ?? null,
        preferredWindows: body.preferredWindows,
        priorityScore: body.priorityScore ?? 0,
        notes: body.notes ?? null,
        status: 'active',
      })
      .returning();

    return waitlistRequest;
  }

  private async syncPatientIdentities(
    tenantId: string,
    patientId: string,
    phone?: string,
    email?: string
  ) {
    const identities = [
      phone
        ? {
            tenantId,
            patientId,
            identityType: 'phone',
            identityValue: phone,
            isPrimary: true,
            confidenceScore: 1,
          }
        : null,
      email
        ? {
            tenantId,
            patientId,
            identityType: 'email',
            identityValue: email,
            isPrimary: phone ? false : true,
            confidenceScore: 1,
          }
        : null,
    ].filter((value): value is NonNullable<typeof value> => Boolean(value));

    if (identities.length === 0) {
      return;
    }

    for (const identity of identities) {
      const existing = await this.database
        .select()
        .from(patientIdentities)
        .where(
          and(
            eq(patientIdentities.tenantId, tenantId),
            eq(patientIdentities.patientId, patientId),
            eq(patientIdentities.identityType, identity.identityType),
            eq(patientIdentities.identityValue, identity.identityValue)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await this.database.insert(patientIdentities).values(identity);
      }
    }
  }
}

function matchesPatientFilters(row: typeof patients.$inferSelect, filters: PatientFilters) {
  if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (typeof filters.isExisting === 'boolean' && row.isExisting !== filters.isExisting) {
    return false;
  }

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = [row.fullName, row.phone ?? '', row.email ?? ''].join(' ').toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  return true;
}

function matchesDerivedPatientFilters(
  row: Awaited<ReturnType<ClinicReadModelsRepository['loadPatientListItemMap']>> extends Map<
    string,
    infer TItem
  >
    ? TItem
    : never,
  filters: PatientFilters
) {
  if (
    typeof filters.isReactivationCandidate === 'boolean' &&
    row.isReactivationCandidate !== filters.isReactivationCandidate
  ) {
    return false;
  }

  if (typeof filters.hasPendingForm === 'boolean' && row.hasPendingForm !== filters.hasPendingForm) {
    return false;
  }

  if (
    typeof filters.hasUpcomingAppointment === 'boolean' &&
    (row.upcomingAppointmentCount ?? 0) > 0 !== filters.hasUpcomingAppointment
  ) {
    return false;
  }

  return true;
}
