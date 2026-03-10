import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BillingService } from './billing.service.js';

export async function billingRoutes(fastify: FastifyInstance) {
  const billingService = new BillingService(fastify);

  // Get subscription
  fastify.get('/tenants/:tenantId/billing/subscription', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const subscription = await billingService.getSubscription(tenantId);
    return reply.send({ subscription });
  });

  // Update subscription
  fastify.put('/tenants/:tenantId/billing/subscription', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { plan } = request.body as any;
    const result = await billingService.updateSubscription(tenantId, plan);
    return reply.send(result);
  });

  // Get invoices
  fastify.get('/tenants/:tenantId/billing/invoices', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const invoices = await billingService.getInvoices(tenantId);
    return reply.send({ invoices });
  });

  // Get invoice PDF
  fastify.get('/tenants/:tenantId/billing/invoices/:invoiceId/pdf', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, invoiceId } = request.params as { tenantId: string; invoiceId: string };
    const pdf = await billingService.getInvoicePdf(tenantId, invoiceId);
    return reply.send(pdf);
  });

  // Get payment methods
  fastify.get('/tenants/:tenantId/billing/payment-methods', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const methods = await billingService.getPaymentMethods(tenantId);
    return reply.send({ methods });
  });

  // Add payment method
  fastify.post('/tenants/:tenantId/billing/payment-methods', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { paymentMethodId } = request.body as any;
    const result = await billingService.addPaymentMethod(tenantId, paymentMethodId);
    return reply.send(result);
  });

  // Cancel subscription
  fastify.post('/tenants/:tenantId/billing/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const result = await billingService.cancelSubscription(tenantId);
    return reply.send(result);
  });
}
