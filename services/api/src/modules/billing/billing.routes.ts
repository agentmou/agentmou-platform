import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  BillingInvoicesResponseSchema,
  BillingOverviewResponseSchema,
  BillingPaymentMethodsResponseSchema,
  BillingSubscriptionResponseSchema,
} from '@agentmou/contracts';

import { BillingService } from './billing.service.js';

type TenantParams = { tenantId: string };
type InvoiceParams = TenantParams & { invoiceId: string };
type UpdateSubscriptionBody = { plan: string };
type AddPaymentMethodBody = { paymentMethodId: string };

export async function billingRoutes(fastify: FastifyInstance) {
  const billingService = new BillingService(fastify);

  fastify.get(
    '/tenants/:tenantId/billing/overview',
    async (request: FastifyRequest<{ Params: TenantParams }>, reply: FastifyReply) => {
      const { tenantId } = request.params;
      const overview = await billingService.getOverview(tenantId);
      return reply.send(BillingOverviewResponseSchema.parse({ overview }));
    }
  );

  // Get subscription
  fastify.get(
    '/tenants/:tenantId/billing/subscription',
    async (request: FastifyRequest<{ Params: TenantParams }>, reply: FastifyReply) => {
      const { tenantId } = request.params;
      const subscription = await billingService.getSubscription(tenantId);
      return reply.send(BillingSubscriptionResponseSchema.parse({ subscription }));
    }
  );

  // Update subscription
  fastify.put(
    '/tenants/:tenantId/billing/subscription',
    async (
      request: FastifyRequest<{
        Params: TenantParams;
        Body: UpdateSubscriptionBody;
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = request.params;
      const { plan } = request.body;
      const result = await billingService.updateSubscription(tenantId, plan, request.userId);
      return reply.send(BillingSubscriptionResponseSchema.parse({ subscription: result }));
    }
  );

  // Get invoices
  fastify.get(
    '/tenants/:tenantId/billing/invoices',
    async (request: FastifyRequest<{ Params: TenantParams }>, reply: FastifyReply) => {
      const { tenantId } = request.params;
      const invoices = await billingService.getInvoices(tenantId);
      return reply.send(BillingInvoicesResponseSchema.parse({ invoices }));
    }
  );

  // Get invoice PDF
  fastify.get(
    '/tenants/:tenantId/billing/invoices/:invoiceId/pdf',
    async (request: FastifyRequest<{ Params: InvoiceParams }>, reply: FastifyReply) => {
      const { tenantId, invoiceId } = request.params;
      const pdf = await billingService.getInvoicePdf(tenantId, invoiceId);
      return reply.send(pdf);
    }
  );

  // Get payment methods
  fastify.get(
    '/tenants/:tenantId/billing/payment-methods',
    async (request: FastifyRequest<{ Params: TenantParams }>, reply: FastifyReply) => {
      const { tenantId } = request.params;
      const methods = await billingService.getPaymentMethods(tenantId);
      return reply.send(BillingPaymentMethodsResponseSchema.parse({ methods }));
    }
  );

  // Add payment method
  fastify.post(
    '/tenants/:tenantId/billing/payment-methods',
    async (
      request: FastifyRequest<{
        Params: TenantParams;
        Body: AddPaymentMethodBody;
      }>,
      reply: FastifyReply
    ) => {
      const { tenantId } = request.params;
      const { paymentMethodId } = request.body;
      const result = await billingService.addPaymentMethod(
        tenantId,
        paymentMethodId,
        request.userId
      );
      return reply.send(result);
    }
  );

  // Cancel subscription
  fastify.post(
    '/tenants/:tenantId/billing/cancel',
    async (request: FastifyRequest<{ Params: TenantParams }>, reply: FastifyReply) => {
      const { tenantId } = request.params;
      const result = await billingService.cancelSubscription(tenantId, request.userId);
      return reply.send(result);
    }
  );
}
