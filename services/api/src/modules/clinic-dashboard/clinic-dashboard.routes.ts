import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ClinicDashboardResponseSchema } from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import { tenantScopedParamsSchema } from '../clinic-shared/clinic.schema.js';
import { ClinicDashboardService } from './clinic-dashboard.service.js';

export async function clinicDashboardRoutes(fastify: FastifyInstance) {
  const service = new ClinicDashboardService();

  fastify.get(
    '/tenants/:tenantId/clinic/dashboard',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const dashboard = await service.getDashboard(tenantId, request.tenantRole);
        return reply.send(ClinicDashboardResponseSchema.parse({ dashboard }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
