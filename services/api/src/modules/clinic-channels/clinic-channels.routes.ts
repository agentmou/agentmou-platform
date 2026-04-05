import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ClinicChannelResponseSchema,
  ClinicChannelsResponseSchema,
  UpdateClinicChannelBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  tenantChannelParamsSchema,
  tenantScopedParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { ClinicChannelsService } from './clinic-channels.service.js';

export async function clinicChannelsRoutes(fastify: FastifyInstance) {
  const service = new ClinicChannelsService();

  fastify.get(
    '/tenants/:tenantId/clinic/channels',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const channels = await service.listChannels(tenantId, request.tenantRole);
        return reply.send(ClinicChannelsResponseSchema.parse({ channels }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.put(
    '/tenants/:tenantId/clinic/channels/:channelType',
    {
      schema: {
        params: tenantChannelParamsSchema,
        body: UpdateClinicChannelBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, channelType } = request.params as {
          tenantId: string;
          channelType: never;
        };
        const channel = await service.updateChannel(
          tenantId,
          channelType,
          request.body as never,
          request.userId,
          request.tenantRole
        );

        if (!channel) {
          return reply.status(404).send({ error: 'Clinic channel not found' });
        }

        return reply.send(ClinicChannelResponseSchema.parse({ channel }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
