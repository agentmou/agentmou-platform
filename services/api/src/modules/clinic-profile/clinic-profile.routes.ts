import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ClinicProfileResponseSchema, UpdateClinicProfileBodySchema } from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import { tenantScopedParamsSchema } from '../clinic-shared/clinic.schema.js';
import { ClinicProfileService } from './clinic-profile.service.js';

export async function clinicProfileRoutes(fastify: FastifyInstance) {
  const service = new ClinicProfileService();

  fastify.get(
    '/tenants/:tenantId/clinic/profile',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const profile = await service.getProfile(tenantId, request.tenantRole);
        if (!profile) {
          return reply.status(404).send({ error: 'Clinic profile not found' });
        }
        return reply.send(ClinicProfileResponseSchema.parse({ profile }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.put(
    '/tenants/:tenantId/clinic/profile',
    {
      schema: {
        params: tenantScopedParamsSchema,
        body: UpdateClinicProfileBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const profile = await service.updateProfile(
          tenantId,
          request.body as never,
          request.tenantRole
        );
        if (!profile) {
          return reply.status(404).send({ error: 'Clinic profile not found' });
        }
        return reply.send(ClinicProfileResponseSchema.parse({ profile }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
