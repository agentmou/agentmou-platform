import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CloseGapBodySchema,
  ConfirmationRequestResponseSchema,
  ConfirmationRequestsResponseSchema,
  GapOpportunitiesResponseSchema,
  GapOpportunityResponseSchema,
  OfferGapBodySchema,
  ReminderJobResponseSchema,
  ReminderJobsResponseSchema,
  RemindConfirmationBodySchema,
  EscalateConfirmationBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  clinicListQuerySchema,
  confirmationFiltersSchema,
  confirmationParamsSchema,
  gapFiltersSchema,
  gapParamsSchema,
  tenantScopedParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { FollowUpService } from './follow-up.service.js';

export async function followUpRoutes(fastify: FastifyInstance) {
  const service = new FollowUpService();

  fastify.get(
    '/tenants/:tenantId/follow-up/reminders',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: clinicListQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const { limit } = request.query as { limit?: number };
        const reminders = await service.listReminders(tenantId, limit, request.tenantRole);
        return reply.send(ReminderJobsResponseSchema.parse({ reminders }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/follow-up/confirmations',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: confirmationFiltersSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const confirmations = await service.listConfirmations(
          tenantId,
          request.query as never,
          request.tenantRole
        );
        return reply.send(ConfirmationRequestsResponseSchema.parse({ confirmations }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/follow-up/confirmations/:confirmationId/remind',
    {
      schema: {
        params: confirmationParamsSchema,
        body: RemindConfirmationBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, confirmationId } = request.params as {
          tenantId: string;
          confirmationId: string;
        };
        const reminder = await service.remindConfirmation(
          tenantId,
          confirmationId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!reminder) {
          return reply.status(404).send({ error: 'Confirmation request not found' });
        }
        return reply.send(ReminderJobResponseSchema.parse({ reminder }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/follow-up/confirmations/:confirmationId/escalate',
    {
      schema: {
        params: confirmationParamsSchema,
        body: EscalateConfirmationBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, confirmationId } = request.params as {
          tenantId: string;
          confirmationId: string;
        };
        const confirmation = await service.escalateConfirmation(
          tenantId,
          confirmationId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!confirmation) {
          return reply.status(404).send({ error: 'Confirmation request not found' });
        }
        return reply.send(ConfirmationRequestResponseSchema.parse({ confirmation }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/follow-up/gaps',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: gapFiltersSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const gaps = await service.listGaps(tenantId, request.query as never, request.tenantRole);
        return reply.send(GapOpportunitiesResponseSchema.parse({ gaps }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/follow-up/gaps/:gapId/offer',
    {
      schema: {
        params: gapParamsSchema,
        body: OfferGapBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, gapId } = request.params as { tenantId: string; gapId: string };
        const gap = await service.offerGap(
          tenantId,
          gapId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!gap) {
          return reply.status(404).send({ error: 'Gap not found' });
        }
        return reply.send(GapOpportunityResponseSchema.parse({ gap }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/follow-up/gaps/:gapId/close',
    {
      schema: {
        params: gapParamsSchema,
        body: CloseGapBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, gapId } = request.params as { tenantId: string; gapId: string };
        const gap = await service.closeGap(
          tenantId,
          gapId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!gap) {
          return reply.status(404).send({ error: 'Gap not found' });
        }
        return reply.send(GapOpportunityResponseSchema.parse({ gap }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
