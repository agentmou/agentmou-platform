import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CallResponseSchema,
  CallsResponseSchema,
  CallbackCallBodySchema,
  ResolveCallBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  callFiltersSchema,
  callParamsSchema,
  tenantScopedParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { CallsService } from './calls.service.js';

export async function callRoutes(fastify: FastifyInstance) {
  const service = new CallsService();

  fastify.get(
    '/tenants/:tenantId/calls',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: callFiltersSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const result = await service.listCalls(
          tenantId,
          request.query as never,
          request.tenantRole
        );
        return reply.send(CallsResponseSchema.parse(result));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/calls/:callId',
    {
      schema: {
        params: callParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, callId } = request.params as { tenantId: string; callId: string };
        const call = await service.getCall(tenantId, callId, request.tenantRole);
        if (!call) {
          return reply.status(404).send({ error: 'Call not found' });
        }
        return reply.send(CallResponseSchema.parse({ call }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/calls/:callId/callback',
    {
      schema: {
        params: callParamsSchema,
        body: CallbackCallBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, callId } = request.params as { tenantId: string; callId: string };
        const call = await service.scheduleCallback(
          tenantId,
          callId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!call) {
          return reply.status(404).send({ error: 'Call not found' });
        }
        return reply.send(CallResponseSchema.parse({ call }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/calls/:callId/resolve',
    {
      schema: {
        params: callParamsSchema,
        body: ResolveCallBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, callId } = request.params as { tenantId: string; callId: string };
        const call = await service.resolveCall(
          tenantId,
          callId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!call) {
          return reply.status(404).send({ error: 'Call not found' });
        }
        return reply.send(CallResponseSchema.parse({ call }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
