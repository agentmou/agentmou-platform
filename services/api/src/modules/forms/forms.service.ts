import type {
  CompleteIntakeFormSubmissionBody,
  SendIntakeFormSubmissionBody,
  WaiveIntakeFormSubmissionBody,
} from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { ClinicAutomationService } from '../clinic-shared/clinic-automation.service.js';
import { assertClinicFeatureAvailable, assertClinicRole } from '../clinic-shared/clinic-access.js';
import { mapIntakeFormSubmission, mapIntakeFormTemplate } from '../clinic-shared/clinic.mapper.js';
import { FormsRepository } from './forms.repository.js';

export class FormsService {
  constructor(
    private readonly repository = new FormsRepository(),
    private readonly automation = new ClinicAutomationService()
  ) {}

  async listTemplates(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicFeatureAvailable(tenantId, 'forms', tenantRole);
    const templates = await this.repository.listTemplates(tenantId);
    return templates.map(mapIntakeFormTemplate);
  }

  async listSubmissions(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicFeatureAvailable(tenantId, 'forms', tenantRole);
    const submissions = await this.repository.listSubmissions(tenantId);
    return submissions.map(mapIntakeFormSubmission);
  }

  async getSubmission(tenantId: string, submissionId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicFeatureAvailable(tenantId, 'forms', tenantRole);
    const submission = await this.repository.getSubmission(tenantId, submissionId);
    return submission ? mapIntakeFormSubmission(submission) : null;
  }

  async sendSubmission(
    tenantId: string,
    submissionId: string,
    body: SendIntakeFormSubmissionBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicFeatureAvailable(tenantId, 'forms', tenantRole);
    const submission = await this.repository.sendSubmission(tenantId, submissionId, body);
    if (!submission) {
      return null;
    }

    await this.automation.scheduleFormSubmissionFollowUp(tenantId, submissionId, {
      channelType: body.channelType,
      messageTemplateKey: body.messageTemplateKey,
    });

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.form.sent',
      category: 'approval',
      details: {
        submissionId,
        channelType: body.channelType,
      },
    });

    return mapIntakeFormSubmission(submission);
  }

  async completeSubmission(
    tenantId: string,
    submissionId: string,
    body: CompleteIntakeFormSubmissionBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicFeatureAvailable(tenantId, 'forms', tenantRole);
    const submission = await this.repository.completeSubmission(tenantId, submissionId, body);
    if (!submission) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.form.completed',
      category: 'approval',
      details: {
        submissionId,
      },
    });

    return mapIntakeFormSubmission(submission);
  }

  async waiveSubmission(
    tenantId: string,
    submissionId: string,
    body: WaiveIntakeFormSubmissionBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicFeatureAvailable(tenantId, 'forms', tenantRole);
    const submission = await this.repository.waiveSubmission(tenantId, submissionId, body);
    if (!submission) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.form.waived',
      category: 'approval',
      details: {
        submissionId,
        reason: body.reason,
      },
    });

    return mapIntakeFormSubmission(submission);
  }
}
