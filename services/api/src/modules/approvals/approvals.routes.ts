import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ApprovalsService } from './approvals.service';

export async function approvalRoutes(fastify: FastifyInstance) {
  const service = new ApprovalsService();

  fastify.get('/tenants/:tenantId/approvals', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { status } = request.query as { status?: string };
    const approvals = await service.listApprovals(tenantId, { status });
    return reply.send({ approvals });
  });

  fastify.get('/tenants/:tenantId/approvals/:approvalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, approvalId } = request.params as { tenantId: string; approvalId: string };
    const approval = await service.getApproval(tenantId, approvalId);
    if (!approval) return reply.status(404).send({ error: 'Approval not found' });
    return reply.send({ approval });
  });

  fastify.post('/tenants/:tenantId/approvals/:approvalId/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, approvalId } = request.params as { tenantId: string; approvalId: string };
    const { decidedBy, reason } = request.body as { decidedBy: string; reason?: string };
    const result = await service.approve(tenantId, approvalId, decidedBy, reason);
    if (!result) return reply.status(404).send({ error: 'Approval not found' });
    return reply.send({ approval: result });
  });

  fastify.post('/tenants/:tenantId/approvals/:approvalId/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, approvalId } = request.params as { tenantId: string; approvalId: string };
    const { decidedBy, reason } = request.body as { decidedBy: string; reason?: string };
    const result = await service.reject(tenantId, approvalId, decidedBy, reason);
    if (!result) return reply.status(404).send({ error: 'Approval not found' });
    return reply.send({ approval: result });
  });

  fastify.post('/tenants/:tenantId/approvals', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as {
      runId: string;
      agentInstallationId?: string;
      actionType: string;
      riskLevel: string;
      title: string;
      description?: string;
      payloadPreview?: Record<string, unknown>;
      context?: Record<string, unknown>;
    };
    const approval = await service.requestApproval(tenantId, body);
    return reply.status(201).send({ approval });
  });
}
