import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  ApprovalRequestsResponseSchema,
  ApprovalResponseSchema,
} from '@agentmou/contracts';
import { ApprovalsService } from './approvals.service.js';
import {
  approvalDecisionBodySchema,
  approvalListQuerySchema,
  createApprovalBodySchema,
  type ApprovalDecisionBody,
  type ApprovalListQuery,
  type CreateApprovalBody,
} from './approvals.schema.js';

export async function approvalRoutes(fastify: FastifyInstance) {
  const service = new ApprovalsService();

  fastify.get(
    '/tenants/:tenantId/approvals',
    {
      schema: {
        querystring: approvalListQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.params as { tenantId: string };
      const { status } = request.query as ApprovalListQuery;
      const approvals = await service.listApprovals(tenantId, { status });
      return reply.send(ApprovalRequestsResponseSchema.parse({ approvals }));
    },
  );

  fastify.get('/tenants/:tenantId/approvals/:approvalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, approvalId } = request.params as { tenantId: string; approvalId: string };
    const approval = await service.getApproval(tenantId, approvalId);
    if (!approval) return reply.status(404).send({ error: 'Approval not found' });
    return reply.send(ApprovalResponseSchema.parse({ approval }));
  });

  fastify.post(
    '/tenants/:tenantId/approvals/:approvalId/approve',
    {
      schema: {
        body: approvalDecisionBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, approvalId } = request.params as { tenantId: string; approvalId: string };
      const body = request.body as ApprovalDecisionBody;

      if (!request.userId) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const result = await service.approve(tenantId, approvalId, request.userId, body.reason);
      if (!result) return reply.status(404).send({ error: 'Approval not found' });
      return reply.send(ApprovalResponseSchema.parse({ approval: result }));
    },
  );

  fastify.post(
    '/tenants/:tenantId/approvals/:approvalId/reject',
    {
      schema: {
        body: approvalDecisionBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, approvalId } = request.params as { tenantId: string; approvalId: string };
      const body = request.body as ApprovalDecisionBody;

      if (!request.userId) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      const result = await service.reject(tenantId, approvalId, request.userId, body.reason);
      if (!result) return reply.status(404).send({ error: 'Approval not found' });
      return reply.send(ApprovalResponseSchema.parse({ approval: result }));
    },
  );

  fastify.post(
    '/tenants/:tenantId/approvals',
    {
      schema: {
        body: createApprovalBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = request.params as { tenantId: string };
      const body = request.body as CreateApprovalBody;
      const approval = await service.requestApproval(tenantId, body);
      return reply.status(201).send(ApprovalResponseSchema.parse({ approval }));
    },
  );
}
