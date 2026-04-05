import { db, patients, reactivationCampaigns, reactivationRecipients } from '@agentmou/db';
import type {
  CampaignFilters,
  CreateReactivationCampaignBody,
  PauseReactivationCampaignBody,
  ResumeReactivationCampaignBody,
  StartReactivationCampaignBody,
} from '@agentmou/contracts';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { ClinicReadModelsRepository } from '../clinic-shared/clinic-read-models.repository.js';

type DatabaseClient = typeof db;

export class ReactivationRepository {
  private readonly readModels: ClinicReadModelsRepository;

  constructor(private readonly database: DatabaseClient = db) {
    this.readModels = new ClinicReadModelsRepository(database);
  }

  async listCampaigns(tenantId: string, filters: CampaignFilters) {
    const rows = await this.database
      .select()
      .from(reactivationCampaigns)
      .where(eq(reactivationCampaigns.tenantId, tenantId))
      .orderBy(desc(reactivationCampaigns.updatedAt));

    const campaigns = rows.filter((row) => matchesCampaignFilters(row, filters));

    return {
      campaigns: campaigns.slice(0, filters.limit ?? 50).map((row) => row),
      total: campaigns.length,
    };
  }

  async getCampaign(tenantId: string, campaignId: string) {
    const [campaign] = await this.database
      .select()
      .from(reactivationCampaigns)
      .where(
        and(eq(reactivationCampaigns.tenantId, tenantId), eq(reactivationCampaigns.id, campaignId))
      )
      .limit(1);

    if (!campaign) {
      return null;
    }

    return this.readModels.loadCampaignDetail(tenantId, campaign);
  }

  async createCampaign(tenantId: string, body: CreateReactivationCampaignBody) {
    const [campaign] = await this.database
      .insert(reactivationCampaigns)
      .values({
        tenantId,
        name: body.name,
        campaignType: body.campaignType,
        status: body.scheduledAt ? 'scheduled' : 'draft',
        audienceDefinition: body.audienceDefinition,
        messageTemplate: body.messageTemplate,
        channelPolicy: body.channelPolicy,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      })
      .returning();

    return campaign;
  }

  async startCampaign(tenantId: string, campaignId: string, body: StartReactivationCampaignBody) {
    const [campaign] = await this.database
      .update(reactivationCampaigns)
      .set({
        status: 'running',
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(reactivationCampaigns.tenantId, tenantId), eq(reactivationCampaigns.id, campaignId))
      )
      .returning();

    if (!campaign) {
      return null;
    }

    const existingRecipients = await this.database
      .select()
      .from(reactivationRecipients)
      .where(
        and(
          eq(reactivationRecipients.tenantId, tenantId),
          eq(reactivationRecipients.campaignId, campaignId)
        )
      )
      .limit(1);

    if (existingRecipients.length === 0) {
      const audiencePatients = await this.resolveAudiencePatients(
        tenantId,
        campaign.audienceDefinition
      );

      if (audiencePatients.length > 0) {
        await this.database.insert(reactivationRecipients).values(
          audiencePatients.map((patient) => ({
            tenantId,
            campaignId,
            patientId: patient.id,
            status: 'pending',
            metadata: {},
          }))
        );
      }
    }

    return campaign;
  }

  async pauseCampaign(tenantId: string, campaignId: string, _body: PauseReactivationCampaignBody) {
    const [campaign] = await this.database
      .update(reactivationCampaigns)
      .set({
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(
        and(eq(reactivationCampaigns.tenantId, tenantId), eq(reactivationCampaigns.id, campaignId))
      )
      .returning();

    return campaign ?? null;
  }

  async resumeCampaign(tenantId: string, campaignId: string, body: ResumeReactivationCampaignBody) {
    const [campaign] = await this.database
      .update(reactivationCampaigns)
      .set({
        status: 'running',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(reactivationCampaigns.tenantId, tenantId), eq(reactivationCampaigns.id, campaignId))
      )
      .returning();

    return campaign ?? null;
  }

  async listRecipients(tenantId: string, limit = 50) {
    return this.readModels.loadCampaignRecipients(tenantId, limit);
  }

  private async resolveAudiencePatients(tenantId: string, audienceDefinition: unknown) {
    const audience =
      typeof audienceDefinition === 'object' && audienceDefinition !== null
        ? (audienceDefinition as Record<string, unknown>)
        : {};

    const explicitPatientIds = Array.isArray(audience.patientIds)
      ? audience.patientIds.filter((value): value is string => typeof value === 'string')
      : [];

    if (explicitPatientIds.length > 0) {
      return this.database
        .select()
        .from(patients)
        .where(and(eq(patients.tenantId, tenantId), inArray(patients.id, explicitPatientIds)));
    }

    const rows = await this.database.select().from(patients).where(eq(patients.tenantId, tenantId));

    const statuses = Array.isArray(audience.statuses)
      ? audience.statuses.filter((value): value is string => typeof value === 'string')
      : ['inactive'];
    const isExisting = typeof audience.isExisting === 'boolean' ? audience.isExisting : undefined;
    const limit = typeof audience.limit === 'number' ? audience.limit : undefined;

    const filtered = rows.filter((patient) => {
      if (!statuses.includes(patient.status)) {
        return false;
      }

      if (typeof isExisting === 'boolean' && patient.isExisting !== isExisting) {
        return false;
      }

      return true;
    });

    return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
  }
}

function matchesCampaignFilters(
  row: typeof reactivationCampaigns.$inferSelect,
  filters: CampaignFilters
) {
  if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (filters.campaignType && row.campaignType !== filters.campaignType) {
    return false;
  }

  if (filters.scheduledAfter) {
    const scheduledAt = row.scheduledAt?.toISOString();
    if (!scheduledAt || scheduledAt < filters.scheduledAfter) {
      return false;
    }
  }

  if (filters.scheduledBefore) {
    const scheduledAt = row.scheduledAt?.toISOString();
    if (!scheduledAt || scheduledAt > filters.scheduledBefore) {
      return false;
    }
  }

  return true;
}
