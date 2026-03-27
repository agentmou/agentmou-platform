import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  InstallationResponseSchema,
  InstallationsResponseSchema,
  InstallPackQueuedResponseSchema,
} from '@agentmou/contracts';
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
    return reply.send(
      InstallationsResponseSchema.parse({
        installations: { agents, workflows },
      }),
    );
  });

  fastify.get('/tenants/:tenantId/installations/:installationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, installationId } = request.params as { tenantId: string; installationId: string };
    const installation = await service.getInstallation(tenantId, installationId);
    if (!installation) return reply.status(404).send({ error: 'Installation not found' });
    return reply.send(InstallationResponseSchema.parse({ installation }));
  });

  fastify.post('/tenants/:tenantId/installations/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { templateId, config } = request.body as { templateId: string; config?: Record<string, unknown> };
    const installation = await service.installAgent(tenantId, templateId, config);
    return reply.status(201).send(
      InstallationResponseSchema.parse({
        installation: { ...installation, type: 'agent' },
      }),
    );
  });

  fastify.post('/tenants/:tenantId/installations/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { templateId, config } = request.body as { templateId: string; config?: Record<string, unknown> };
    try {
      const installation = await service.installWorkflow(tenantId, templateId, config);
      return reply.status(201).send(
        InstallationResponseSchema.parse({
          installation: { ...installation, type: 'workflow' },
        }),
      );
    } catch (error) {
      const statusCode = getStatusCode(error) || 500;
      const message = error instanceof Error ? error.message : 'Workflow installation failed';
      return reply.status(statusCode).send({ error: message });
    }
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

    return reply.status(202).send(
      InstallPackQueuedResponseSchema.parse({
        jobId: job.id,
        status: 'queued',
        message: `Pack "${packId}" installation queued`,
      }),
    );
  });

  fastify.delete('/tenants/:tenantId/installations/:installationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, installationId } = request.params as { tenantId: string; installationId: string };
    await service.uninstall(tenantId, installationId);
    return reply.send({ success: true });
  });
}

function getStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}
