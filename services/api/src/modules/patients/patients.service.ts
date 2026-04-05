import {
  type CreatePatientBody,
  type CreateWaitlistRequestBody,
  type PatientFilters,
  type ReactivatePatientBody,
  type UpdatePatientBody,
} from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import {
  assertClinicModuleAvailable,
  assertClinicRole,
  getClinicListLimit,
} from '../clinic-shared/clinic-access.js';
import { mapWaitlistRequest } from '../clinic-shared/clinic.mapper.js';
import { PatientsRepository } from './patients.repository.js';

export class PatientsService {
  constructor(private readonly repository = new PatientsRepository()) {}

  async listPatients(tenantId: string, filters: PatientFilters, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    return this.repository.listPatients(tenantId, {
      ...filters,
      limit: getClinicListLimit(filters.limit),
    });
  }

  async getPatient(tenantId: string, patientId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    return this.repository.getPatientDetail(tenantId, patientId);
  }

  async createPatient(
    tenantId: string,
    body: CreatePatientBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const patient = await this.repository.createPatient(tenantId, body);

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.patient.created',
      category: 'security',
      details: {
        patientId: patient.id,
        source: patient.source,
      },
    });

    return this.repository.getPatientDetail(tenantId, patient.id);
  }

  async updatePatient(
    tenantId: string,
    patientId: string,
    body: UpdatePatientBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const patient = await this.repository.updatePatient(tenantId, patientId, body);
    if (!patient) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.patient.updated',
      category: 'security',
      details: {
        patientId,
      },
    });

    return this.repository.getPatientDetail(tenantId, patient.id);
  }

  async reactivatePatient(
    tenantId: string,
    patientId: string,
    body: ReactivatePatientBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const patient = await this.repository.reactivatePatient(tenantId, patientId, body);
    if (!patient) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.patient.reactivated',
      category: 'security',
      details: {
        patientId,
        campaignId: body.campaignId,
        source: body.source,
      },
    });

    return this.repository.getPatientDetail(tenantId, patient.id);
  }

  async createWaitlistRequest(
    tenantId: string,
    patientId: string,
    body: CreateWaitlistRequestBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const waitlistRequest = await this.repository.createWaitlistRequest(tenantId, patientId, body);

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.waitlist.created',
      category: 'security',
      details: {
        patientId,
        waitlistRequestId: waitlistRequest.id,
      },
    });

    return mapWaitlistRequest(waitlistRequest);
  }
}
