import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebhooksService } from './webhooks.service.js';

export async function webhookRoutes(fastify: FastifyInstance) {
  const webhooksService = new WebhooksService(fastify);

  // List webhooks
  fastify.get('/tenants/:tenantId/webhooks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const webhooks = await webhooksService.listWebhooks(tenantId);
    return reply.send({ webhooks });
  });

  // Get webhook
  fastify.get('/tenants/:tenantId/webhooks/:webhookId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, webhookId } = request.params as { tenantId: string; webhookId: string };
    const webhook = await webhooksService.getWebhook(tenantId, webhookId);
    return reply.send({ webhook });
  });

  // Create webhook
  fastify.post('/tenants/:tenantId/webhooks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { url, events, secret } = request.body as any;
    const webhook = await webhooksService.createWebhook(tenantId, { url, events, secret });
    return reply.send({ webhook });
  });

  // Update webhook
  fastify.put('/tenants/:tenantId/webhooks/:webhookId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, webhookId } = request.params as { tenantId: string; webhookId: string };
    const updates = request.body as any;
    const webhook = await webhooksService.updateWebhook(tenantId, webhookId, updates);
    return reply.send({ webhook });
  });

  // Delete webhook
  fastify.delete('/tenants/:tenantId/webhooks/:webhookId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, webhookId } = request.params as { tenantId: string; webhookId: string };
    await webhooksService.deleteWebhook(tenantId, webhookId);
    return reply.send({ success: true });
  });

  // Get webhook deliveries
  fastify.get('/tenants/:tenantId/webhooks/:webhookId/deliveries', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, webhookId } = request.params as { tenantId: string; webhookId: string };
    const deliveries = await webhooksService.getDeliveries(tenantId, webhookId);
    return reply.send({ deliveries });
  });

  // Retry delivery
  fastify.post('/tenants/:tenantId/webhooks/:webhookId/deliveries/:deliveryId/retry', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, webhookId, deliveryId } = request.params as { tenantId: string; webhookId: string; deliveryId: string };
    const result = await webhooksService.retryDelivery(tenantId, webhookId, deliveryId);
    return reply.send(result);
  });

  // Get webhook logs
  fastify.get('/tenants/:tenantId/webhooks/:webhookId/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, webhookId } = request.params as { tenantId: string; webhookId: string };
    const logs = await webhooksService.getLogs(tenantId, webhookId);
    return reply.send({ logs });
  });
}
