import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateReactivationCampaignBodySchema,
  ReactivationCampaignResponseSchema,
  ReactivationCampaignsResponseSchema,
  ReactivationRecipientsResponseSchema,
  PauseReactivationCampaignBodySchema,
  ResumeReactivationCampaignBodySchema,
  StartReactivationCampaignBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  campaignFiltersSchema,
  campaignParamsSchema,
  reactivationRecipientsQuerySchema,
  tenantScopedParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { ReactivationService } from './reactivation.service.js';

export async function reactivationRoutes(fastify: FastifyInstance) {
  const service = new ReactivationService();

  fastify.get(
    '/tenants/:tenantId/reactivation/campaigns',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: campaignFiltersSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const result = await service.listCampaigns(tenantId, request.query as never, request.tenantRole);
        return reply.send(ReactivationCampaignsResponseSchema.parse(result));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/reactivation/campaigns/:campaignId',
    {
      schema: {
        params: campaignParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, campaignId } = request.params as {
          tenantId: string;
          campaignId: string;
        };
        const campaign = await service.getCampaign(tenantId, campaignId, request.tenantRole);
        if (!campaign) {
          return reply.status(404).send({ error: 'Reactivation campaign not found' });
        }
        return reply.send(ReactivationCampaignResponseSchema.parse({ campaign }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/reactivation/campaigns',
    {
      schema: {
        params: tenantScopedParamsSchema,
        body: CreateReactivationCampaignBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const campaign = await service.createCampaign(
          tenantId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        return reply.status(201).send(ReactivationCampaignResponseSchema.parse({ campaign }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/reactivation/campaigns/:campaignId/start',
    {
      schema: {
        params: campaignParamsSchema,
        body: StartReactivationCampaignBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, campaignId } = request.params as {
          tenantId: string;
          campaignId: string;
        };
        const campaign = await service.startCampaign(
          tenantId,
          campaignId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!campaign) {
          return reply.status(404).send({ error: 'Reactivation campaign not found' });
        }
        return reply.send(ReactivationCampaignResponseSchema.parse({ campaign }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/reactivation/campaigns/:campaignId/pause',
    {
      schema: {
        params: campaignParamsSchema,
        body: PauseReactivationCampaignBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, campaignId } = request.params as {
          tenantId: string;
          campaignId: string;
        };
        const campaign = await service.pauseCampaign(
          tenantId,
          campaignId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!campaign) {
          return reply.status(404).send({ error: 'Reactivation campaign not found' });
        }
        return reply.send(ReactivationCampaignResponseSchema.parse({ campaign }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/reactivation/campaigns/:campaignId/resume',
    {
      schema: {
        params: campaignParamsSchema,
        body: ResumeReactivationCampaignBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, campaignId } = request.params as {
          tenantId: string;
          campaignId: string;
        };
        const campaign = await service.resumeCampaign(
          tenantId,
          campaignId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!campaign) {
          return reply.status(404).send({ error: 'Reactivation campaign not found' });
        }
        return reply.send(ReactivationCampaignResponseSchema.parse({ campaign }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/reactivation/recipients',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: reactivationRecipientsQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const { limit } = request.query as { limit?: number };
        const recipients = await service.listRecipients(tenantId, limit, request.tenantRole);
        return reply.send(ReactivationRecipientsResponseSchema.parse({ recipients }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
