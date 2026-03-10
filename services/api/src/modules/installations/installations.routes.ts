import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InstallationsService } from './installations.service.js';
import { getQueue, QUEUE_NAMES, type InstallPackPayload } from '@agentmou/queue';

export async function installationRoutes(fastify: FastifyInstance) {
  const service = new InstallationsService();

  fastify.get('/tenants/:tenantId/installations', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const [agents, workflows] = await Promise.all([
      service.listAgentInstallations(tenantId),
      service.listWorkflowInstallations(tenantId),
    ]);
    return reply.send({ installations: { agents, workflows } });
  });

  fastify.get('/tenants/:tenantId/installations/:installationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, installationId } = request.params as { tenantId: string; installationId: string };
    const installation = await service.getInstallation(tenantId, installationId);
    if (!installation) return reply.status(404).send({ error: 'Installation not found' });
    return reply.send({ installation });
  });

  fastify.post('/tenants/:tenantId/installations/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { templateId, config } = request.body as { templateId: string; config?: Record<string, unknown> };
    const installation = await service.installAgent(tenantId, templateId, config);
    return reply.status(201).send({ installation });
  });

  fastify.post('/tenants/:tenantId/installations/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { templateId, config } = request.body as { templateId: string; config?: Record<string, unknown> };
    const installation = await service.installWorkflow(tenantId, templateId, config);
    return reply.status(201).send({ installation });
  });

  fastify.post('/tenants/:tenantId/installations/packs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { packId, config } = request.body as { packId: string; config?: Record<string, unknown> };

    const queue = getQueue(QUEUE_NAMES.INSTALL_PACK);
    const job = await queue.add('install-pack', {
      tenantId,
      packId,
      config,
    } satisfies InstallPackPayload);

    return reply.status(202).send({
      jobId: job.id,
      status: 'queued',
      message: `Pack "${packId}" installation queued`,
    });
  });

  fastify.delete('/tenants/:tenantId/installations/:installationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, installationId } = request.params as { tenantId: string; installationId: string };
    await service.uninstall(tenantId, installationId);
    return reply.send({ success: true });
  });
}
