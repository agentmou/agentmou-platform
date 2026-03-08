import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConnectorsService } from './connectors.service';

export async function connectorRoutes(fastify: FastifyInstance) {
  const service = new ConnectorsService();

  fastify.get('/tenants/:tenantId/connectors', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const connectors = await service.listConnectors(tenantId);
    return reply.send({ connectors });
  });

  fastify.get('/tenants/:tenantId/connectors/:connectorId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, connectorId } = request.params as { tenantId: string; connectorId: string };
    const connector = await service.getConnector(tenantId, connectorId);
    if (!connector) return reply.status(404).send({ error: 'Connector not found' });
    return reply.send({ connector });
  });

  fastify.post('/tenants/:tenantId/connectors', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { provider, scopes } = request.body as { provider: string; scopes?: string[] };
    const connector = await service.createConnector(tenantId, provider, scopes);
    return reply.status(201).send({ connector });
  });

  fastify.delete('/tenants/:tenantId/connectors/:connectorId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, connectorId } = request.params as { tenantId: string; connectorId: string };
    await service.deleteConnector(tenantId, connectorId);
    return reply.send({ success: true });
  });

  fastify.post('/tenants/:tenantId/connectors/:connectorId/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, connectorId } = request.params as { tenantId: string; connectorId: string };
    const result = await service.testConnection(tenantId, connectorId);
    return reply.send(result);
  });
}
