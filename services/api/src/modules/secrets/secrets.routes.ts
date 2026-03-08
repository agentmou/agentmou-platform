import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SecretsService } from './secrets.service';

export async function secretRoutes(fastify: FastifyInstance) {
  const service = new SecretsService();

  fastify.get('/tenants/:tenantId/secrets', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const secrets = await service.listSecrets(tenantId);
    return reply.send({ secrets });
  });

  fastify.post('/tenants/:tenantId/secrets', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as { key: string; encryptedValue: string; connectorAccountId?: string };
    const secret = await service.createSecret(tenantId, body);
    return reply.status(201).send({ secret });
  });

  fastify.delete('/tenants/:tenantId/secrets/:secretId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, secretId } = request.params as { tenantId: string; secretId: string };
    await service.deleteSecret(tenantId, secretId);
    return reply.send({ success: true });
  });
}
