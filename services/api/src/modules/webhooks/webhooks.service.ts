import { FastifyInstance } from 'fastify';
import {
  billingAccounts,
  billingInvoices,
  billingSubscriptions,
  db,
  webhookEvents,
} from '@agentmou/db';
import { eq } from 'drizzle-orm';

import { recordAuditEvent } from '../../lib/audit.js';

export class WebhooksService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async listWebhooks(_tenantId: string) {
    return [];
  }

  async getWebhook(_tenantId: string, _webhookId: string) {
    return null;
  }

  async createWebhook(
    tenantId: string,
    config: { url: string; events: string[]; secret?: string }
  ) {
    return {
      id: `webhook-${Date.now()}`,
      tenantId,
      ...config,
      active: false,
      createdAt: new Date(),
    };
  }

  async updateWebhook(tenantId: string, webhookId: string, updates: Record<string, unknown>) {
    return {
      id: webhookId,
      tenantId,
      ...updates,
      updatedAt: new Date(),
    };
  }

  async deleteWebhook(_tenantId: string, _webhookId: string) {
    return { success: true };
  }

  async getDeliveries(_tenantId: string, _webhookId: string) {
    return [];
  }

  async retryDelivery(tenantId: string, webhookId: string, deliveryId: string) {
    return {
      id: deliveryId,
      status: 'pending',
      queuedAt: new Date(),
    };
  }

  async getLogs(_tenantId: string, _webhookId: string) {
    return [];
  }

  async triggerWebhook(_tenantId: string, _event: string, _payload: Record<string, unknown>) {
    return { triggered: 0 };
  }

  async handleStripeEvent(event: unknown, signature?: string | null) {
    if (!isStripeEvent(event)) {
      throw Object.assign(new Error('Invalid Stripe event payload'), {
        statusCode: 400,
      });
    }

    const [existing] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.providerEventId, event.id))
      .limit(1);

    if (existing) {
      return { ok: true, duplicate: true };
    }

    const tenantId = await this.resolveTenantId(event.data.object);

    const [created] = await db
      .insert(webhookEvents)
      .values({
        provider: 'stripe',
        providerEventId: event.id,
        tenantId,
        type: event.type,
        signature: signature ?? null,
        payload: event,
      })
      .returning();

    await this.syncStripeObject(tenantId, event.type, event.data.object);

    await db
      .update(webhookEvents)
      .set({
        status: 'processed',
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, created.id));

    if (tenantId) {
      await recordAuditEvent({
        tenantId,
        action: 'billing.webhook.processed',
        category: 'billing',
        details: {
          eventId: event.id,
          type: event.type,
        },
      });
    }

    return { ok: true, duplicate: false };
  }

  private async resolveTenantId(object: StripeEventObject) {
    const metadataTenantId =
      isRecord(object.metadata) && typeof object.metadata.tenantId === 'string'
        ? object.metadata.tenantId
        : null;

    if (metadataTenantId) {
      return metadataTenantId;
    }

    if (typeof object.customer === 'string') {
      const [account] = await db
        .select({
          tenantId: billingAccounts.tenantId,
        })
        .from(billingAccounts)
        .where(eq(billingAccounts.providerCustomerId, object.customer))
        .limit(1);
      return account?.tenantId ?? null;
    }

    return null;
  }

  private async syncStripeObject(tenantId: string | null, type: string, object: StripeEventObject) {
    if (!tenantId) {
      return;
    }

    if (type.startsWith('customer.subscription')) {
      const [account] = await db
        .select()
        .from(billingAccounts)
        .where(eq(billingAccounts.tenantId, tenantId))
        .limit(1);

      const [existing] = await db
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.tenantId, tenantId))
        .limit(1);

      const values = {
        tenantId,
        billingAccountId: account?.id ?? null,
        providerSubscriptionId: typeof object.id === 'string' ? object.id : null,
        status: typeof object.status === 'string' ? object.status : 'active',
        currentPeriodStart: fromStripeTimestamp(object.current_period_start),
        currentPeriodEnd: fromStripeTimestamp(object.current_period_end),
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end),
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(billingSubscriptions)
          .set(values)
          .where(eq(billingSubscriptions.id, existing.id));
      }
    }

    if (type.startsWith('invoice.')) {
      const [account] = await db
        .select()
        .from(billingAccounts)
        .where(eq(billingAccounts.tenantId, tenantId))
        .limit(1);

      if (!account || typeof object.id !== 'string') {
        return;
      }

      const values = {
        tenantId,
        billingAccountId: account.id,
        providerInvoiceId: object.id,
        status: typeof object.status === 'string' ? object.status : 'open',
        currency: typeof object.currency === 'string' ? object.currency : 'usd',
        amount: normalizeStripeAmount(object.amount_paid ?? object.amount_due),
        periodKey: fromStripeTimestamp(object.period_start)?.toISOString().slice(0, 7) ?? null,
        periodStart: fromStripeTimestamp(object.period_start),
        periodEnd: fromStripeTimestamp(object.period_end),
        invoiceDate: fromStripeTimestamp(object.created) ?? new Date(),
        hostedInvoiceUrl:
          typeof object.hosted_invoice_url === 'string' ? object.hosted_invoice_url : null,
        pdfUrl: typeof object.invoice_pdf === 'string' ? object.invoice_pdf : null,
        items: [],
        updatedAt: new Date(),
      };

      const [existing] = await db
        .select()
        .from(billingInvoices)
        .where(eq(billingInvoices.providerInvoiceId, object.id))
        .limit(1);

      if (existing) {
        await db.update(billingInvoices).set(values).where(eq(billingInvoices.id, existing.id));
      } else {
        await db.insert(billingInvoices).values(values);
      }
    }
  }
}

type StripeEventObject = Record<string, unknown> & {
  id?: unknown;
  metadata?: unknown;
  customer?: unknown;
  status?: unknown;
  current_period_start?: unknown;
  current_period_end?: unknown;
  cancel_at_period_end?: unknown;
  amount_paid?: unknown;
  amount_due?: unknown;
  currency?: unknown;
  period_start?: unknown;
  period_end?: unknown;
  created?: unknown;
  hosted_invoice_url?: unknown;
  invoice_pdf?: unknown;
};

function isStripeEvent(value: unknown): value is {
  id: string;
  type: string;
  data: {
    object: StripeEventObject;
  };
} {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    isRecord(value.data) &&
    isRecord(value.data.object)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fromStripeTimestamp(value: unknown) {
  return typeof value === 'number' ? new Date(value * 1000) : null;
}

function normalizeStripeAmount(value: unknown) {
  return typeof value === 'number' ? value / 100 : 0;
}
