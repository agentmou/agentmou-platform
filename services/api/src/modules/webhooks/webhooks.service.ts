import { FastifyInstance } from 'fastify';

export class WebhooksService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async listWebhooks(tenantId: string) {
    return [
      {
        id: 'webhook_1',
        tenantId,
        url: 'https://example.com/webhook',
        events: ['agent.completed', 'agent.failed'],
        active: true,
        createdAt: new Date(),
      },
    ];
  }

  async getWebhook(tenantId: string, webhookId: string) {
    return {
      id: webhookId,
      tenantId,
      url: 'https://example.com/webhook',
      events: ['agent.completed', 'agent.failed'],
      active: true,
      secret: 'whsec_****',
      createdAt: new Date(),
    };
  }

  async createWebhook(tenantId: string, config: { url: string; events: string[]; secret?: string }) {
    return {
      id: 'webhook_' + Date.now(),
      tenantId,
      ...config,
      secret: config.secret || 'whsec_' + Date.now(),
      active: true,
      createdAt: new Date(),
    };
  }

  async updateWebhook(tenantId: string, webhookId: string, updates: any) {
    return {
      id: webhookId,
      ...updates,
      updatedAt: new Date(),
    };
  }

  async deleteWebhook(tenantId: string, webhookId: string) {
    return { success: true };
  }

  async getDeliveries(tenantId: string, webhookId: string) {
    return [
      {
        id: 'delivery_1',
        webhookId,
        eventId: 'event_1',
        status: 'success',
        statusCode: 200,
        attempts: 1,
        deliveredAt: new Date(),
      },
    ];
  }

  async retryDelivery(tenantId: string, webhookId: string, deliveryId: string) {
    return {
      id: deliveryId,
      status: 'pending',
      queuedAt: new Date(),
    };
  }

  async getLogs(tenantId: string, webhookId: string) {
    return [
      { timestamp: new Date(), event: 'webhook.triggered', data: { eventId: 'event_1' } },
      { timestamp: new Date(), event: 'webhook.delivered', data: { statusCode: 200 } },
    ];
  }

  async triggerWebhook(tenantId: string, event: string, payload: any) {
    // Trigger all active webhooks subscribed to this event
    return { triggered: 1 };
  }
}
