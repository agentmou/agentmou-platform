import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebhooksService } from './webhooks.service.js';

type TenantParams = { tenantId: string };
type WebhookParams = TenantParams & { webhookId: string };
type DeliveryParams = WebhookParams & { deliveryId: string };
type CreateWebhookBody = {
  url: string;
  events: string[];
  secret?: string;
};
type UpdateWebhookBody = Record<string, unknown>;

export async function webhookRoutes(fastify: FastifyInstance) {
  const webhooksService = new WebhooksService(fastify);

  // List webhooks
  fastify.get(
    '/tenants/:tenantId/webhooks',
    async (request: FastifyRequest<{ Params: TenantParams }>, reply: FastifyReply) => {
      const { tenantId } = request.params;
      const webhooks = await webhooksService.listWebhooks(tenantId);
      return reply.send({ webhooks });
    }
  );

  // Get webhook
  fastify.get(
    '/tenants/:tenantId/webhooks/:webhookId',
    async (request: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {
      const { tenantId, webhookId } = request.params;
      const webhook = await webhooksService.getWebhook(tenantId, webhookId);
      return reply.send({ webhook });
    }
  );

  // Create webhook
  fastify.post(
    '/tenants/:tenantId/webhooks',
    async (
      request: FastifyRequest<{
        Params: TenantParams;
        Body: CreateWebhookBody;
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = request.params;
      const { url, events, secret } = request.body;
      const webhook = await webhooksService.createWebhook(tenantId, {
        url,
        events,
        secret,
      });
      return reply.send({ webhook });
    }
  );

  // Update webhook
  fastify.put(
    '/tenants/:tenantId/webhooks/:webhookId',
    async (
      request: FastifyRequest<{
        Params: WebhookParams;
        Body: UpdateWebhookBody;
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId, webhookId } = request.params;
      const webhook = await webhooksService.updateWebhook(tenantId, webhookId, request.body);
      return reply.send({ webhook });
    }
  );

  // Delete webhook
  fastify.delete(
    '/tenants/:tenantId/webhooks/:webhookId',
    async (request: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {
      const { tenantId, webhookId } = request.params;
      await webhooksService.deleteWebhook(tenantId, webhookId);
      return reply.send({ success: true });
    }
  );

  // Get webhook deliveries
  fastify.get(
    '/tenants/:tenantId/webhooks/:webhookId/deliveries',
    async (request: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {
      const { tenantId, webhookId } = request.params;
      const deliveries = await webhooksService.getDeliveries(tenantId, webhookId);
      return reply.send({ deliveries });
    }
  );

  // Retry delivery
  fastify.post(
    '/tenants/:tenantId/webhooks/:webhookId/deliveries/:deliveryId/retry',
    async (request: FastifyRequest<{ Params: DeliveryParams }>, reply: FastifyReply) => {
      const { tenantId, webhookId, deliveryId } = request.params;
      const result = await webhooksService.retryDelivery(tenantId, webhookId, deliveryId);
      return reply.send(result);
    }
  );

  // Get webhook logs
  fastify.get(
    '/tenants/:tenantId/webhooks/:webhookId/logs',
    async (request: FastifyRequest<{ Params: WebhookParams }>, reply: FastifyReply) => {
      const { tenantId, webhookId } = request.params;
      const logs = await webhooksService.getLogs(tenantId, webhookId);
      return reply.send({ logs });
    }
  );
}

export async function stripeWebhookRoutes(fastify: FastifyInstance) {
  const webhooksService = new WebhooksService(fastify);

  fastify.post(
    '/webhooks/stripe',
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const signatureHeader = request.headers['stripe-signature'];
      const signature = Array.isArray(signatureHeader)
        ? signatureHeader.join(',')
        : (signatureHeader ?? null);

      const result = await webhooksService.handleStripeEvent(request.body, signature);
      return reply.send(result);
    }
  );
}
