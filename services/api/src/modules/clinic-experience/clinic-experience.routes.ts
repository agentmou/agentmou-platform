import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ClinicExperienceResponseSchema,
  TenantExperienceResponseSchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import { tenantScopedParamsSchema } from '../clinic-shared/clinic.schema.js';
import { ClinicExperienceService } from './clinic-experience.service.js';

export async function clinicExperienceRoutes(fastify: FastifyInstance) {
  const service = new ClinicExperienceService();

  fastify.get(
    '/tenants/:tenantId/experience',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const experience = await service.getTenantExperience(tenantId, request.tenantRole);

        if (!experience) {
          return reply.status(404).send({ error: 'Tenant experience not found' });
        }

        return reply.send(TenantExperienceResponseSchema.parse({ experience }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/clinic/experience',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const experience = await service.getClinicExperience(tenantId, request.tenantRole);

        if (!experience) {
          return reply.status(404).send({ error: 'Clinic experience not found' });
        }

        return reply.send(ClinicExperienceResponseSchema.parse({ experience }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
