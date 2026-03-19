import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  UsageHistoryResponseSchema,
  UsageLimitsResponseSchema,
  UsageSummaryResponseSchema,
} from '@agentmou/contracts';

import { UsageService } from './usage.service.js';

type TenantParams = { tenantId: string };
type UsageHistoryQuery = { period?: string };
type UsageExportQuery = {
  format?: string;
  startDate?: string;
  endDate?: string;
};

export async function usageRoutes(fastify: FastifyInstance) {
  const usageService = new UsageService(fastify);

  // Get current period usage
  fastify.get(
    '/tenants/:tenantId/usage',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const usage = await usageService.getUsage(tenantId);
      return reply.send(UsageSummaryResponseSchema.parse({ usage }));
    },
  );

  // Get usage breakdown
  fastify.get(
    '/tenants/:tenantId/usage/breakdown',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const breakdown = await usageService.getUsageBreakdown(tenantId);
      return reply.send({ breakdown });
    },
  );

  // Get usage history
  fastify.get(
    '/tenants/:tenantId/usage/history',
    async (
      request: FastifyRequest<{
        Params: TenantParams;
        Querystring: UsageHistoryQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const history = await usageService.getUsageHistory(
        tenantId,
        request.query.period,
      );
      return reply.send(UsageHistoryResponseSchema.parse({ history }));
    },
  );

  // Get limits
  fastify.get(
    '/tenants/:tenantId/usage/limits',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const limits = await usageService.getLimits(tenantId);
      return reply.send(UsageLimitsResponseSchema.parse({ limits }));
    },
  );

  // Export usage data
  fastify.get(
    '/tenants/:tenantId/usage/export',
    async (
      request: FastifyRequest<{
        Params: TenantParams;
        Querystring: UsageExportQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const export_ = await usageService.exportUsage(tenantId, request.query);
      return reply.send(export_);
    },
  );
}
