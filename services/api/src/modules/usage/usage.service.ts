import { FastifyInstance } from 'fastify';

export class UsageService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getUsage(tenantId: string) {
    return {
      tenantId,
      period: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      agentRuns: { current: 450, limit: 1000 },
      workflowExecutions: { current: 120, limit: 500 },
      apiCalls: { current: 5000, limit: 10000 },
      storage: { current: 2.5, limit: 10, unit: 'GB' },
    };
  }

  async getUsageBreakdown(tenantId: string) {
    return {
      byAgent: [
        { agentId: 'inbox-triage', runs: 300 },
        { agentId: 'ticket-classifier', runs: 150 },
      ],
      byWorkflow: [
        { workflowId: 'wf-01', executions: 100 },
      ],
      byUser: [
        { userId: 'user_1', runs: 200 },
      ],
    };
  }

  async getUsageHistory(tenantId: string, period?: string) {
    return [
      { date: '2026-03-01', runs: 50, executions: 20 },
      { date: '2026-03-02', runs: 45, executions: 18 },
      { date: '2026-03-03', runs: 60, executions: 25 },
    ];
  }

  async getLimits(tenantId: string) {
    return {
      plan: 'pro',
      agentRuns: 1000,
      workflowExecutions: 500,
      apiCalls: 10000,
      storage: 10,
      teamMembers: 10,
    };
  }

  async exportUsage(tenantId: string, options: any) {
    return {
      url: `https://storage.example.com/usage/${tenantId}.${options.format || 'csv'}`,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }
}
