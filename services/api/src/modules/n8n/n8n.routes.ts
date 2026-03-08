import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { N8nService } from './n8n.service';

export async function n8nRoutes(fastify: FastifyInstance) {
  const n8nService = new N8nService(fastify);

  // List n8n workflows
  fastify.get('/tenants/:tenantId/n8n/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const workflows = await n8nService.listWorkflows(tenantId);
    return reply.send({ workflows });
  });

  // Get workflow
  fastify.get('/tenants/:tenantId/n8n/workflows/:workflowId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, workflowId } = request.params as { tenantId: string; workflowId: string };
    const workflow = await n8nService.getWorkflow(tenantId, workflowId);
    return reply.send({ workflow });
  });

  // Import workflow
  fastify.post('/tenants/:tenantId/n8n/workflows/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { workflowJson } = request.body as any;
    const workflow = await n8nService.importWorkflow(tenantId, workflowJson);
    return reply.send({ workflow });
  });

  // Export workflow
  fastify.get('/tenants/:tenantId/n8n/workflows/:workflowId/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, workflowId } = request.params as { tenantId: string; workflowId: string };
    const export_ = await n8nService.exportWorkflow(tenantId, workflowId);
    return reply.send(export_);
  });

  // Execute workflow
  fastify.post('/tenants/:tenantId/n8n/workflows/:workflowId/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, workflowId } = request.params as { tenantId: string; workflowId: string };
    const { data } = request.body as any;
    const result = await n8nService.executeWorkflow(tenantId, workflowId, data);
    return reply.send(result);
  });

  // Get workflow executions
  fastify.get('/tenants/:tenantId/n8n/workflows/:workflowId/executions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, workflowId } = request.params as { tenantId: string; workflowId: string };
    const executions = await n8nService.getExecutions(tenantId, workflowId);
    return reply.send({ executions });
  });

  // Activate workflow
  fastify.post('/tenants/:tenantId/n8n/workflows/:workflowId/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, workflowId } = request.params as { tenantId: string; workflowId: string };
    const result = await n8nService.activateWorkflow(tenantId, workflowId);
    return reply.send(result);
  });

  // Deactivate workflow
  fastify.post('/tenants/:tenantId/n8n/workflows/:workflowId/deactivate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, workflowId } = request.params as { tenantId: string; workflowId: string };
    const result = await n8nService.deactivateWorkflow(tenantId, workflowId);
    return reply.send(result);
  });

  // Get n8n credentials status
  fastify.get('/tenants/:tenantId/n8n/credentials', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const status = await n8nService.getCredentialsStatus(tenantId);
    return reply.send({ status });
  });

  // Test n8n connection
  fastify.get('/tenants/:tenantId/n8n/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const result = await n8nService.testConnection(tenantId);
    return reply.send(result);
  });
}
