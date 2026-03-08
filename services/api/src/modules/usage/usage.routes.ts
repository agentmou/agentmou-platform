import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UsageService } from './usage.service';

export async function usageRoutes(fastify: FastifyInstance) {
  const usageService = new UsageService(fastify);

  // Get current period usage
  fastify.get('/tenants/:tenantId/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const usage = await usageService.getUsage(tenantId);
    return reply.send({ usage });
  });

  // Get usage breakdown
  fastify.get('/tenants/:tenantId/usage/breakdown', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const breakdown = await usageService.getUsageBreakdown(tenantId);
    return reply.send({ breakdown });
  });

  // Get usage history
  fastify.get('/tenants/:tenantId/usage/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { period } = request.query as any;
    const history = await usageService.getUsageHistory(tenantId, period);
    return reply.send({ history });
  });

  // Get limits
  fastify.get('/tenants/:tenantId/usage/limits', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const limits = await usageService.getLimits(tenantId);
    return reply.send({ limits });
  });

  // Export usage data
  fastify.get('/tenants/:tenantId/usage/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { format, startDate, endDate } = request.query as any;
    const export_ = await usageService.exportUsage(tenantId, { format, startDate, endDate });
    return reply.send(export_);
  });
}
