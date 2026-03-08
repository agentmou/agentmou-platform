import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RunsService } from './runs.service';

export async function runRoutes(fastify: FastifyInstance) {
  const service = new RunsService();

  fastify.get('/tenants/:tenantId/runs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const runs = await service.listRuns(tenantId);
    return reply.send({ runs });
  });

  fastify.get('/tenants/:tenantId/runs/:runId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, runId } = request.params as { tenantId: string; runId: string };
    const run = await service.getRun(tenantId, runId);
    if (!run) return reply.status(404).send({ error: 'Run not found' });
    return reply.send({ run });
  });

  fastify.get('/tenants/:tenantId/runs/:runId/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, runId } = request.params as { tenantId: string; runId: string };
    const logs = await service.getRunLogs(tenantId, runId);
    return reply.send({ logs });
  });
}
