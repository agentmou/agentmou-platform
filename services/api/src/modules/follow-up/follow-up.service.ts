import type {
  CloseGapBody,
  ConfirmationFilters,
  EscalateConfirmationBody,
  GapFilters,
  OfferGapBody,
  RemindConfirmationBody,
} from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { ClinicAutomationService } from '../clinic-shared/clinic-automation.service.js';
import {
  assertClinicModuleAvailable,
  assertClinicRole,
  getClinicListLimit,
} from '../clinic-shared/clinic-access.js';
import { mapConfirmationRequest, mapReminderJob } from '../clinic-shared/clinic.mapper.js';
import { FollowUpRepository } from './follow-up.repository.js';

export class FollowUpService {
  constructor(
    private readonly repository = new FollowUpRepository(),
    private readonly automation = new ClinicAutomationService()
  ) {}

  async listReminders(tenantId: string, limit = 50, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const reminders = await this.repository.listReminders(tenantId, getClinicListLimit(limit));
    return reminders.map(mapReminderJob);
  }

  async listConfirmations(tenantId: string, filters: ConfirmationFilters, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const confirmations = await this.repository.listConfirmations(tenantId, {
      ...filters,
      limit: getClinicListLimit(filters.limit),
    });
    return confirmations.map(mapConfirmationRequest);
  }

  async remindConfirmation(
    tenantId: string,
    confirmationId: string,
    body: RemindConfirmationBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const reminder = await this.repository.remindConfirmation(tenantId, confirmationId, body);
    if (!reminder) {
      return null;
    }

    await this.automation.scheduleReminderExecution(
      tenantId,
      reminder.id,
      new Date(reminder.scheduledFor)
    );

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.confirmation.reminded',
      category: 'approval',
      details: {
        confirmationId,
        reminderId: reminder.id,
      },
    });

    return mapReminderJob(reminder);
  }

  async escalateConfirmation(
    tenantId: string,
    confirmationId: string,
    body: EscalateConfirmationBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const confirmation = await this.repository.escalateConfirmation(tenantId, confirmationId, body);
    if (!confirmation) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.confirmation.escalated',
      category: 'approval',
      details: {
        confirmationId,
        assignedUserId: body.assignedUserId,
        reason: body.reason,
      },
    });

    return mapConfirmationRequest(confirmation);
  }

  async listGaps(tenantId: string, filters: GapFilters, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'growth');
    return this.repository.listGaps(tenantId, {
      ...filters,
      limit: getClinicListLimit(filters.limit),
    });
  }

  async offerGap(
    tenantId: string,
    gapId: string,
    body: OfferGapBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const result = await this.repository.offerGap(tenantId, gapId, body);
    if (!result) {
      return null;
    }

    await Promise.all(
      result.attemptIds.map((attemptId) => this.automation.scheduleGapOutreach(tenantId, attemptId))
    );

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.gap.offered',
      category: 'approval',
      details: {
        gapId,
        patientIds: body.patientIds,
      },
    });

    return result.gap;
  }

  async closeGap(
    tenantId: string,
    gapId: string,
    body: CloseGapBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const gap = await this.repository.closeGap(tenantId, gapId, body);
    if (!gap) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.gap.closed',
      category: 'approval',
      details: {
        gapId,
        status: body.status,
        note: body.note,
      },
    });

    return gap;
  }
}
