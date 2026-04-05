import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  ClinicModulesResponseSchema,
  TenantModuleResponseSchema,
  UpdateTenantModuleBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  tenantModuleParamsSchema,
  tenantScopedParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { ClinicModulesService } from './clinic-modules.service.js';

export async function clinicModulesRoutes(fastify: FastifyInstance) {
  const service = new ClinicModulesService();

  fastify.get(
    '/tenants/:tenantId/clinic/modules',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const modules = await service.listModules(tenantId, request.tenantRole);
        return reply.send(ClinicModulesResponseSchema.parse({ modules }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.put(
    '/tenants/:tenantId/clinic/modules/:moduleKey',
    {
      schema: {
        params: tenantModuleParamsSchema,
        body: UpdateTenantModuleBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, moduleKey } = request.params as { tenantId: string; moduleKey: never };
        const module = await service.updateModule(
          tenantId,
          moduleKey,
          request.body as never,
          request.userId,
          request.tenantRole
        );

        if (!module) {
          return reply.status(404).send({ error: 'Clinic module not found' });
        }

        return reply.send(TenantModuleResponseSchema.parse({ module }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
