import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TenantsService } from './tenants.service';
import { createTenantSchema, updateTenantSchema } from './tenants.schema';

export async function tenantRoutes(fastify: FastifyInstance) {
  const tenantsService = new TenantsService();

  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const tenants = await tenantsService.listTenants();
    return reply.send({ tenants });
  });

  fastify.post('/', {
    schema: { body: createTenantSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const tenant = await tenantsService.createTenant(request.body as any);
      return reply.send({ tenant });
    },
  });

  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenant = await tenantsService.getTenant(id);
    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }
    return reply.send({ tenant });
  });

  fastify.put('/:id', {
    schema: { body: updateTenantSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const tenant = await tenantsService.updateTenant(id, request.body as any);
      if (!tenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.send({ tenant });
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
    return reply.send({ settings });
  });

  fastify.put('/:id/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const settings = await tenantsService.updateTenantSettings(id, request.body as any);
    if (settings === null) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }
    return reply.send({ settings });
  });
}
