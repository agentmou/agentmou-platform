import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WorkflowEngineStatusResponseSchema } from '@agentmou/contracts';

import { N8nService } from './n8n.service.js';

export async function n8nRoutes(fastify: FastifyInstance) {
  const n8nService = new N8nService();

  fastify.get('/tenants/:tenantId/n8n/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const status = await n8nService.getWorkflowEngineStatus(tenantId);
    return reply.send(WorkflowEngineStatusResponseSchema.parse({ status }));
  });

  fastify.get('/tenants/:tenantId/n8n/workflows', async (_request: FastifyRequest, reply: FastifyReply) => {
    const workflows = await n8nService.listWorkflows();
    return reply.send({ workflows });
  });

  fastify.get('/tenants/:tenantId/n8n/workflows/:workflowId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workflowId } = request.params as { workflowId: string };
    const workflow = await n8nService.getWorkflow(workflowId);
    return reply.send({ workflow });
  });

  fastify.post('/tenants/:tenantId/n8n/workflows/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workflowJson } = request.body as { workflowJson: Record<string, unknown> };
    const workflow = await n8nService.importWorkflow(workflowJson);
    return reply.send({ workflow });
  });

  fastify.get('/tenants/:tenantId/n8n/workflows/:workflowId/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workflowId } = request.params as { workflowId: string };
    const exported = await n8nService.exportWorkflow(workflowId);
    return reply.send(exported);
  });

  fastify.post('/tenants/:tenantId/n8n/workflows/:workflowId/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workflowId } = request.params as { workflowId: string };
    const { data } = request.body as { data?: unknown };
    const result = await n8nService.executeWorkflow(workflowId, data);
    return reply.send(result);
  });

  fastify.post('/tenants/:tenantId/n8n/workflows/:workflowId/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workflowId } = request.params as { workflowId: string };
    const result = await n8nService.activateWorkflow(workflowId);
    return reply.send(result);
  });

  fastify.post('/tenants/:tenantId/n8n/workflows/:workflowId/deactivate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workflowId } = request.params as { workflowId: string };
    const result = await n8nService.deactivateWorkflow(workflowId);
    return reply.send(result);
  });

  fastify.get('/tenants/:tenantId/n8n/test', async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await n8nService.testConnection();
    return reply.send(result);
  });
}
