import type {
  AppointmentFilters,
  CancelAppointmentBody,
  ConfirmAppointmentBody,
  CreateAppointmentBody,
  RescheduleAppointmentBody,
  UpdateAppointmentBody,
} from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { assertClinicModuleAvailable, assertClinicRole, getClinicListLimit } from '../clinic-shared/clinic-access.js';
import { AppointmentsRepository } from './appointments.repository.js';

export class AppointmentsService {
  constructor(private readonly repository = new AppointmentsRepository()) {}

  async listAppointments(tenantId: string, filters: AppointmentFilters, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    return this.repository.listAppointments(tenantId, {
      ...filters,
      limit: getClinicListLimit(filters.limit),
    });
  }

  async getAppointment(tenantId: string, appointmentId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    return this.repository.getAppointmentDetail(tenantId, appointmentId);
  }

  async createAppointment(
    tenantId: string,
    body: CreateAppointmentBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const appointment = await this.repository.createAppointment(tenantId, body);

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.appointment.created',
      category: 'approval',
      details: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
      },
    });

    return this.repository.getAppointmentDetail(tenantId, appointment.id);
  }

  async updateAppointment(
    tenantId: string,
    appointmentId: string,
    body: UpdateAppointmentBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const appointment = await this.repository.updateAppointment(tenantId, appointmentId, body);
    if (!appointment) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.appointment.updated',
      category: 'approval',
      details: {
        appointmentId,
      },
    });

    return this.repository.getAppointmentDetail(tenantId, appointmentId);
  }

  async rescheduleAppointment(
    tenantId: string,
    appointmentId: string,
    body: RescheduleAppointmentBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const appointment = await this.repository.rescheduleAppointment(tenantId, appointmentId, body);
    if (!appointment) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.appointment.rescheduled',
      category: 'approval',
      details: {
        appointmentId,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      },
    });

    return this.repository.getAppointmentDetail(tenantId, appointmentId);
  }

  async cancelAppointment(
    tenantId: string,
    appointmentId: string,
    body: CancelAppointmentBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const appointment = await this.repository.cancelAppointment(tenantId, appointmentId, body);
    if (!appointment) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.appointment.cancelled',
      category: 'approval',
      details: {
        appointmentId,
        cancellationReason: body.cancellationReason,
      },
    });

    return this.repository.getAppointmentDetail(tenantId, appointmentId);
  }

  async confirmAppointment(
    tenantId: string,
    appointmentId: string,
    body: ConfirmAppointmentBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const appointment = await this.repository.confirmAppointment(tenantId, appointmentId, body);
    if (!appointment) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.appointment.confirmed',
      category: 'approval',
      details: {
        appointmentId,
        channelType: body.channelType,
      },
    });

    return this.repository.getAppointmentDetail(tenantId, appointmentId);
  }
}
