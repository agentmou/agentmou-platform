import { getApiConfig } from '../../config.js';

const STRIPE_API_URL = 'https://api.stripe.com/v1';

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY;
}

function encodeForm(data: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    body.set(key, String(value));
  }

  return body;
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw Object.assign(new Error('Stripe is not configured'), {
      statusCode: 409,
    });
  }

  const response = await fetch(`${STRIPE_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw Object.assign(new Error(`Stripe ${response.status}: ${message}`), {
      statusCode: response.status,
    });
  }

  return response.json() as Promise<T>;
}

export class StripeBillingClient {
  async createCustomer(input: { email?: string | null; name?: string | null; tenantId: string }) {
    return stripeRequest<{ id: string }>('/customers', {
      method: 'POST',
      body: encodeForm({
        email: input.email ?? undefined,
        name: input.name ?? undefined,
        'metadata[tenantId]': input.tenantId,
      }),
    });
  }

  async listInvoices(customerId: string) {
    return stripeRequest<{
      data: Array<{
        id: string;
        amount_paid: number;
        amount_due: number;
        currency: string;
        status: string;
        hosted_invoice_url?: string | null;
        invoice_pdf?: string | null;
        created: number;
        period_start?: number;
        period_end?: number;
        lines?: {
          data: Array<{
            description?: string | null;
            amount: number;
          }>;
        };
      }>;
    }>(`/invoices?customer=${customerId}&limit=12`);
  }

  async listPaymentMethods(customerId: string) {
    return stripeRequest<{
      data: Array<{
        id: string;
        type: string;
        card?: {
          brand?: string;
          last4?: string;
          exp_month?: number;
          exp_year?: number;
        };
      }>;
    }>(`/customers/${customerId}/payment_methods?type=card`);
  }

  async getSubscription(subscriptionId: string) {
    return stripeRequest<{
      id: string;
      customer: string;
      status: string;
      cancel_at_period_end: boolean;
      current_period_start: number;
      current_period_end: number;
      items: {
        data: Array<{
          id: string;
          price: {
            id: string;
          };
        }>;
      };
    }>(`/subscriptions/${subscriptionId}`);
  }

  async updateSubscription(subscriptionId: string, priceId: string) {
    const subscription = await this.getSubscription(subscriptionId);
    const primaryItem = subscription.items.data[0];

    if (!primaryItem) {
      throw Object.assign(new Error('Stripe subscription has no items to update'), {
        statusCode: 409,
      });
    }

    return stripeRequest(`/subscriptions/${subscriptionId}`, {
      method: 'POST',
      body: encodeForm({
        'items[0][id]': primaryItem.id,
        'items[0][price]': priceId,
        proration_behavior: 'always_invoice',
      }),
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return stripeRequest(`/subscriptions/${subscriptionId}`, {
      method: 'POST',
      body: encodeForm({
        cancel_at_period_end: true,
      }),
    });
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string) {
    await stripeRequest(`/payment_methods/${paymentMethodId}/attach`, {
      method: 'POST',
      body: encodeForm({ customer: customerId }),
    });

    return stripeRequest(`/customers/${customerId}`, {
      method: 'POST',
      body: encodeForm({
        'invoice_settings[default_payment_method]': paymentMethodId,
      }),
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl?: string) {
    const { webAppBaseUrl } = getApiConfig();

    return stripeRequest<{ url: string }>('/billing_portal/sessions', {
      method: 'POST',
      body: encodeForm({
        customer: customerId,
        return_url: returnUrl ?? webAppBaseUrl,
      }),
    });
  }
}

export function hasStripeBillingConfig() {
  return Boolean(getStripeSecretKey());
}
