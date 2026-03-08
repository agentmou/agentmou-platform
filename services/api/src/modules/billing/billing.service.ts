import { FastifyInstance } from 'fastify';

export class BillingService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getSubscription(tenantId: string) {
    return {
      id: 'sub_1',
      tenantId,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    };
  }

  async updateSubscription(tenantId: string, plan: string) {
    return {
      id: 'sub_1',
      plan,
      updatedAt: new Date(),
      effectiveDate: new Date(),
    };
  }

  async getInvoices(tenantId: string) {
    return [
      {
        id: 'invoice_1',
        tenantId,
        amount: 4900,
        currency: 'usd',
        status: 'paid',
        period: '2026-02',
        createdAt: new Date(),
      },
    ];
  }

  async getInvoicePdf(tenantId: string, invoiceId: string) {
    return { url: `https://storage.example.com/invoices/${invoiceId}.pdf` };
  }

  async getPaymentMethods(tenantId: string) {
    return [
      {
        id: 'pm_1',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
      },
    ];
  }

  async addPaymentMethod(tenantId: string, paymentMethodId: string) {
    return { success: true };
  }

  async cancelSubscription(tenantId: string) {
    return {
      id: 'sub_1',
      status: 'canceled',
      canceledAt: new Date(),
      accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}
