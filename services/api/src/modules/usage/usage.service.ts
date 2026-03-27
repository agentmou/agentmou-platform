import { FastifyInstance } from 'fastify';

import { buildUsageBreakdown, buildUsageHistory, computeTenantUsage } from './usage.helpers.js';

export class UsageService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getUsage(tenantId: string) {
    const snapshot = await computeTenantUsage(tenantId);
    return snapshot.usage;
  }

  async getUsageBreakdown(tenantId: string) {
    const snapshot = await computeTenantUsage(tenantId);
    return buildUsageBreakdown(tenantId, snapshot.runs);
  }

  async getUsageHistory(tenantId: string, period?: string) {
    const snapshot = await computeTenantUsage(tenantId);
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    return buildUsageHistory(snapshot.runs, days);
  }

  async getLimits(tenantId: string) {
    const snapshot = await computeTenantUsage(tenantId);
    return snapshot.entitlements;
  }

  async exportUsage(
    tenantId: string,
    options: { format?: string; startDate?: string; endDate?: string }
  ) {
    const snapshot = await computeTenantUsage(tenantId);
    const history = buildUsageHistory(snapshot.runs, 30);

    return {
      tenantId,
      format: options.format || 'json',
      generatedAt: new Date().toISOString(),
      usage: snapshot.usage,
      history,
    };
  }
}
