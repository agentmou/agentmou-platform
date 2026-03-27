import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  TenantsResponseSchema,
  TenantResponseSchema,
  TenantSettingsResponseSchema,
} from '@agentmou/contracts';
import { TenantsService } from './tenants.service.js';
import {
  createTenantSchema,
  tenantSettingsSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type TenantSettingsInput,
  type UpdateTenantInput,
} from './tenants.schema.js';

export async function tenantRoutes(fastify: FastifyInstance) {
  const tenantsService = new TenantsService();

  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const tenants = await tenantsService.listTenants();
    return reply.send(TenantsResponseSchema.parse({ tenants }));
  });

  fastify.post('/', {
    schema: { body: createTenantSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const tenant = await tenantsService.createTenant(request.body as CreateTenantInput);
      return reply.send(TenantResponseSchema.parse({ tenant }));
    },
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenant = await tenantsService.getTenant(id);
    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }
    return reply.send(TenantResponseSchema.parse({ tenant }));
  });

  fastify.put('/:id', {
    schema: { body: updateTenantSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const tenant = await tenantsService.updateTenant(id, request.body as UpdateTenantInput);
      if (!tenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.send(TenantResponseSchema.parse({ tenant }));
    },
  });

  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const result = await tenantsService.deleteTenant(id);
    return reply.send(result);
  });

  fastify.get('/:id/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const settings = await tenantsService.getTenantSettings(id);
    if (settings === null) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }
    return reply.send(TenantSettingsResponseSchema.parse({ settings }));
  });

  fastify.put(
    '/:id/settings',
    {
      schema: { body: tenantSettingsSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const settings = await tenantsService.updateTenantSettings(
        id,
        request.body as TenantSettingsInput
      );
      if (settings === null) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.send(TenantSettingsResponseSchema.parse({ settings }));
    }
  );
}
