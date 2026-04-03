import type {
  CampaignFilters,
  CreateReactivationCampaignBody,
  PauseReactivationCampaignBody,
  ResumeReactivationCampaignBody,
  StartReactivationCampaignBody,
} from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { assertClinicModuleAvailable, assertClinicRole, getClinicListLimit } from '../clinic-shared/clinic-access.js';
import { mapReactivationCampaign } from '../clinic-shared/clinic.mapper.js';
import { ReactivationRepository } from './reactivation.repository.js';

export class ReactivationService {
  constructor(private readonly repository = new ReactivationRepository()) {}

  async listCampaigns(tenantId: string, filters: CampaignFilters, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const result = await this.repository.listCampaigns(tenantId, {
      ...filters,
      limit: getClinicListLimit(filters.limit),
    });

    return {
      campaigns: result.campaigns.map(mapReactivationCampaign),
      total: result.total,
    };
  }

  async getCampaign(tenantId: string, campaignId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'growth');
    return this.repository.getCampaign(tenantId, campaignId);
  }

  async createCampaign(
    tenantId: string,
    body: CreateReactivationCampaignBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'manage');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const campaign = await this.repository.createCampaign(tenantId, body);

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.reactivation.created',
      category: 'approval',
      details: {
        campaignId: campaign.id,
        campaignType: campaign.campaignType,
      },
    });

    return this.repository.getCampaign(tenantId, campaign.id);
  }

  async startCampaign(
    tenantId: string,
    campaignId: string,
    body: StartReactivationCampaignBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'manage');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const campaign = await this.repository.startCampaign(tenantId, campaignId, body);
    if (!campaign) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.reactivation.started',
      category: 'approval',
      details: {
        campaignId,
      },
    });

    return this.repository.getCampaign(tenantId, campaignId);
  }

  async pauseCampaign(
    tenantId: string,
    campaignId: string,
    body: PauseReactivationCampaignBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'manage');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const campaign = await this.repository.pauseCampaign(tenantId, campaignId, body);
    if (!campaign) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.reactivation.paused',
      category: 'approval',
      details: {
        campaignId,
        reason: body.reason,
      },
    });

    return this.repository.getCampaign(tenantId, campaignId);
  }

  async resumeCampaign(
    tenantId: string,
    campaignId: string,
    body: ResumeReactivationCampaignBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'manage');
    await assertClinicModuleAvailable(tenantId, 'growth');
    const campaign = await this.repository.resumeCampaign(tenantId, campaignId, body);
    if (!campaign) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.reactivation.resumed',
      category: 'approval',
      details: {
        campaignId,
        scheduledAt: body.scheduledAt,
      },
    });

    return this.repository.getCampaign(tenantId, campaignId);
  }

  async listRecipients(tenantId: string, limit = 50, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'growth');
    return this.repository.listRecipients(tenantId, getClinicListLimit(limit));
  }
}
