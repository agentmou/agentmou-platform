import { FastifyInstance } from 'fastify';
import {
  billingAccounts,
  billingInvoices,
  billingSubscriptions,
  db,
  tenants,
  users,
} from '@agentmou/db';
import type {
  BillingOverview,
  BillingPaymentMethod,
  BillingSubscription,
  Invoice,
} from '@agentmou/contracts';
import { and, eq } from 'drizzle-orm';

import { recordAuditEvent } from '../../lib/audit.js';
import { computeTenantUsage } from '../usage/usage.helpers.js';
import { getPlanEntitlements } from './plan-config.js';
import {
  hasStripeBillingConfig,
  StripeBillingClient,
} from './stripe-billing.client.js';

const PRICE_ID_BY_PLAN: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
  scale: process.env.STRIPE_PRICE_SCALE_MONTHLY,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
};

type BillingAccountRow = typeof billingAccounts.$inferSelect;

export class BillingService {
  private fastify: FastifyInstance;
  private stripe: StripeBillingClient | null;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.stripe = hasStripeBillingConfig() ? new StripeBillingClient() : null;
  }

  async getOverview(tenantId: string): Promise<BillingOverview> {
    const [subscription, paymentMethods, invoices, usageSnapshot] =
      await Promise.all([
        this.getSubscription(tenantId),
        this.getPaymentMethods(tenantId),
        this.getInvoices(tenantId),
        computeTenantUsage(tenantId),
      ]);

    return {
      subscription,
      usage: usageSnapshot.usage,
      invoices,
      paymentMethods,
    };
  }

  async getSubscription(tenantId: string): Promise<BillingSubscription> {
    const tenant = await this.getTenantRecord(tenantId);
    const usageSnapshot = await computeTenantUsage(tenantId);
    const account = await this.ensureBillingAccount(tenantId);
    let localSubscription = await this.ensureLocalSubscription(
      tenantId,
      account?.id ?? null,
      tenant.plan,
    );

    if (
      this.stripe &&
      localSubscription.providerSubscriptionId &&
      account?.providerCustomerId
    ) {
      try {
        const remote = await this.stripe.getSubscription(
          localSubscription.providerSubscriptionId,
        );
        localSubscription = await this.syncLocalSubscription({
          tenantId,
          billingAccountId: account.id,
          subscriptionId: localSubscription.id,
          plan: tenant.plan,
          status: remote.status,
          providerSubscriptionId: remote.id,
          currentPeriodStart: fromEpochSeconds(remote.current_period_start),
          currentPeriodEnd: fromEpochSeconds(remote.current_period_end),
          cancelAtPeriodEnd: remote.cancel_at_period_end,
        });
      } catch (error) {
        this.fastify.log.warn(error, 'Failed to sync Stripe subscription');
      }
    }

    const entitlements = getPlanEntitlements(localSubscription.plan);

    return {
      id: localSubscription.id,
      tenantId,
      provider: account?.provider ?? 'stripe',
      providerCustomerId: account?.providerCustomerId ?? undefined,
      providerSubscriptionId:
        localSubscription.providerSubscriptionId ?? undefined,
      plan: localSubscription.plan,
      status: normalizeSubscriptionStatus(localSubscription.status),
      currentPeriodStart: localSubscription.currentPeriodStart?.toISOString(),
      currentPeriodEnd: localSubscription.currentPeriodEnd?.toISOString(),
      cancelAtPeriodEnd: localSubscription.cancelAtPeriodEnd,
      entitlements,
      usage: {
        billableRuns: usageSnapshot.usage.billableRuns,
        includedRuns: usageSnapshot.usage.includedRuns,
        overageRuns: usageSnapshot.usage.overageRuns,
      },
      monthlyBaseAmount: entitlements.monthlyBaseAmount,
      overageAmount: usageSnapshot.usage.overageAmount,
      currency: entitlements.currency,
      portalUrl: account?.portalUrl ?? undefined,
    };
  }

  async updateSubscription(tenantId: string, plan: string, actorId?: string) {
    const tenant = await this.getTenantRecord(tenantId);
    const account = await this.ensureBillingAccount(tenantId);
    const currentSubscription = await this.ensureLocalSubscription(
      tenantId,
      account?.id ?? null,
      tenant.plan,
    );

    if (
      this.stripe &&
      currentSubscription.providerSubscriptionId &&
      PRICE_ID_BY_PLAN[plan]
    ) {
      await this.stripe.updateSubscription(
        currentSubscription.providerSubscriptionId,
        PRICE_ID_BY_PLAN[plan]!,
      );
    }

    await db
      .update(tenants)
      .set({
        plan,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    await this.syncLocalSubscription({
      tenantId,
      billingAccountId: account?.id ?? null,
      subscriptionId: currentSubscription.id,
      plan,
      status: this.stripe ? 'active' : currentSubscription.status,
      providerSubscriptionId: currentSubscription.providerSubscriptionId ?? null,
      currentPeriodStart: currentSubscription.currentPeriodStart ?? new Date(),
      currentPeriodEnd:
        currentSubscription.currentPeriodEnd ?? addDays(new Date(), 30),
      cancelAtPeriodEnd: false,
    });

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'billing.subscription.updated',
      category: 'billing',
      details: {
        fromPlan: tenant.plan,
        toPlan: plan,
      },
    });

    return this.getSubscription(tenantId);
  }

  async getInvoices(tenantId: string): Promise<Invoice[]> {
    const account = await this.ensureBillingAccount(tenantId);
    if (this.stripe && account?.providerCustomerId) {
      try {
        const invoices = await this.stripe.listInvoices(account.providerCustomerId);
        await Promise.all(
          invoices.data.map((invoice) =>
            this.upsertInvoice(tenantId, account.id, invoice),
          ),
        );
      } catch (error) {
        this.fastify.log.warn(error, 'Failed to sync Stripe invoices');
      }
    }

    const rows = await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.tenantId, tenantId));

    return rows
      .sort(
        (a, b) =>
          b.invoiceDate.getTime() - a.invoiceDate.getTime(),
      )
      .map((row) => ({
        id: row.providerInvoiceId ?? row.id,
        tenantId: row.tenantId,
        date: row.invoiceDate.toISOString(),
        amount: row.amount,
        status: normalizeInvoiceStatus(row.status),
        currency: row.currency,
        periodStart: row.periodStart?.toISOString(),
        periodEnd: row.periodEnd?.toISOString(),
        hostedInvoiceUrl: row.hostedInvoiceUrl ?? undefined,
        pdfUrl: row.pdfUrl ?? undefined,
        items: normalizeInvoiceItems(row.items),
      }));
  }

  async getInvoicePdf(tenantId: string, invoiceId: string) {
    const [invoice] = await db
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.tenantId, tenantId),
          eq(billingInvoices.providerInvoiceId, invoiceId),
        ),
      )
      .limit(1);

    return {
      url: invoice?.pdfUrl ?? invoice?.hostedInvoiceUrl ?? null,
    };
  }

  async getPaymentMethods(tenantId: string): Promise<BillingPaymentMethod[]> {
    const account = await this.ensureBillingAccount(tenantId);
    if (!this.stripe || !account?.providerCustomerId) {
      return [];
    }

    const response = await this.stripe.listPaymentMethods(
      account.providerCustomerId,
    );

    return response.data.map((method, index) => ({
      id: method.id,
      type: method.type,
      brand: method.card?.brand,
      last4: method.card?.last4,
      expMonth: method.card?.exp_month,
      expYear: method.card?.exp_year,
      isDefault: index === 0,
    }));
  }

  async addPaymentMethod(
    tenantId: string,
    paymentMethodId: string,
    actorId?: string,
  ) {
    const account = await this.ensureBillingAccount(tenantId);
    if (!this.stripe || !account?.providerCustomerId) {
      throw Object.assign(
        new Error('Stripe billing is not configured for this tenant'),
        { statusCode: 409 },
      );
    }

    await this.stripe.attachPaymentMethod(
      account.providerCustomerId,
      paymentMethodId,
    );

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'billing.payment_method.attached',
      category: 'billing',
      details: {
        paymentMethodId,
      },
    });

    return { success: true };
  }

  async cancelSubscription(tenantId: string, actorId?: string) {
    const account = await this.ensureBillingAccount(tenantId);
    const subscription = await this.ensureLocalSubscription(
      tenantId,
      account?.id ?? null,
      (await this.getTenantRecord(tenantId)).plan,
    );

    if (this.stripe && subscription.providerSubscriptionId) {
      await this.stripe.cancelSubscription(subscription.providerSubscriptionId);
    }

    const updated = await this.syncLocalSubscription({
      tenantId,
      billingAccountId: account?.id ?? null,
      subscriptionId: subscription.id,
      plan: subscription.plan,
      status: 'canceled',
      providerSubscriptionId: subscription.providerSubscriptionId ?? null,
      currentPeriodStart: subscription.currentPeriodStart ?? new Date(),
      currentPeriodEnd:
        subscription.currentPeriodEnd ?? addDays(new Date(), 30),
      cancelAtPeriodEnd: true,
    });

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'billing.subscription.canceled',
      category: 'billing',
      details: {
        subscriptionId: updated.id,
      },
    });

    return {
      id: updated.id,
      status: 'canceled',
      canceledAt: new Date(),
      accessUntil: updated.currentPeriodEnd ?? addDays(new Date(), 30),
    };
  }

  private async getTenantRecord(tenantId: string) {
    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        plan: tenants.plan,
        ownerId: tenants.ownerId,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw Object.assign(new Error(`Tenant ${tenantId} not found`), {
        statusCode: 404,
      });
    }

    return tenant;
  }

  private async ensureBillingAccount(tenantId: string): Promise<BillingAccountRow | null> {
    const [existing] = await db
      .select()
      .from(billingAccounts)
      .where(eq(billingAccounts.tenantId, tenantId))
      .limit(1);

    if (existing) {
      return existing;
    }

    const tenant = await this.getTenantRecord(tenantId);
    const [owner] = await db
      .select({
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, tenant.ownerId))
      .limit(1);

    let providerCustomerId: string | null = null;
    if (this.stripe) {
      try {
        const customer = await this.stripe.createCustomer({
          tenantId,
          email: owner?.email ?? null,
          name: owner?.name ?? tenant.name,
        });
        providerCustomerId = customer.id;
      } catch (error) {
        this.fastify.log.warn(error, 'Failed to create Stripe customer');
      }
    }

    const [created] = await db
      .insert(billingAccounts)
      .values({
        tenantId,
        provider: 'stripe',
        providerCustomerId,
        billingEmail: owner?.email ?? null,
        status: providerCustomerId ? 'configured' : 'not_configured',
      })
      .returning();

    return created ?? null;
  }

  private async ensureLocalSubscription(
    tenantId: string,
    billingAccountId: string | null,
    plan: string,
  ) {
    const [existing] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.tenantId, tenantId))
      .limit(1);

    if (existing) {
      return existing;
    }

    const entitlements = getPlanEntitlements(plan);
    const [created] = await db
      .insert(billingSubscriptions)
      .values({
        tenantId,
        billingAccountId,
        plan,
        status: this.stripe ? 'active' : 'not_configured',
        currentPeriodStart: new Date(),
        currentPeriodEnd: addDays(new Date(), 30),
        includedRuns: entitlements.includedRuns ?? 0,
        includedAgents: entitlements.includedAgents ?? 0,
        includedTeamMembers: entitlements.includedTeamMembers ?? 0,
        logRetentionDays: entitlements.logRetentionDays,
        overageUnitAmount: entitlements.overageRunPrice,
        baseAmount: entitlements.monthlyBaseAmount,
        currency: entitlements.currency,
        safetyCapAmount: 500,
      })
      .returning();

    return created;
  }

  private async syncLocalSubscription(input: {
    tenantId: string;
    billingAccountId: string | null;
    subscriptionId: string;
    plan: string;
    status: string;
    providerSubscriptionId: string | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  }) {
    const entitlements = getPlanEntitlements(input.plan);

    const [updated] = await db
      .update(billingSubscriptions)
      .set({
        billingAccountId: input.billingAccountId,
        plan: input.plan,
        status: input.status,
        providerSubscriptionId: input.providerSubscriptionId,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        includedRuns: entitlements.includedRuns ?? 0,
        includedAgents: entitlements.includedAgents ?? 0,
        includedTeamMembers: entitlements.includedTeamMembers ?? 0,
        logRetentionDays: entitlements.logRetentionDays,
        overageUnitAmount: entitlements.overageRunPrice,
        baseAmount: entitlements.monthlyBaseAmount,
        currency: entitlements.currency,
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.id, input.subscriptionId))
      .returning();

    if (!updated) {
      throw Object.assign(
        new Error(`Billing subscription ${input.subscriptionId} not found`),
        { statusCode: 404 },
      );
    }

    return updated;
  }

  private async upsertInvoice(
    tenantId: string,
    billingAccountId: string,
    invoice: {
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
    },
  ) {
    const [existing] = await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.providerInvoiceId, invoice.id))
      .limit(1);

    const values = {
      tenantId,
      billingAccountId,
      providerInvoiceId: invoice.id,
      status: invoice.status,
      currency: invoice.currency,
      amount: invoice.amount_paid > 0 ? invoice.amount_paid / 100 : invoice.amount_due / 100,
      periodKey: invoice.period_start
        ? fromEpochSeconds(invoice.period_start).toISOString().slice(0, 7)
        : null,
      periodStart: invoice.period_start
        ? fromEpochSeconds(invoice.period_start)
        : null,
      periodEnd: invoice.period_end ? fromEpochSeconds(invoice.period_end) : null,
      invoiceDate: fromEpochSeconds(invoice.created),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
      items:
        invoice.lines?.data.map((line) => ({
          description: line.description ?? 'Stripe invoice item',
          amount: line.amount / 100,
        })) ?? [],
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(billingInvoices)
        .set(values)
        .where(eq(billingInvoices.id, existing.id));
      return;
    }

    await db.insert(billingInvoices).values(values);
  }
}

function normalizeSubscriptionStatus(status: string): BillingSubscription['status'] {
  if (
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due' ||
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'not_configured'
  ) {
    return status;
  }

  return 'not_configured';
}

function normalizeInvoiceStatus(status: string): Invoice['status'] {
  if (
    status === 'draft' ||
    status === 'open' ||
    status === 'paid' ||
    status === 'pending' ||
    status === 'overdue' ||
    status === 'void' ||
    status === 'uncollectible'
  ) {
    return status;
  }

  return 'pending';
}

function normalizeInvoiceItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(
      (item): item is { description?: unknown; amount?: unknown } =>
        typeof item === 'object' && item !== null,
    )
    .map((item) => ({
      description:
        typeof item.description === 'string'
          ? item.description
          : 'Usage charge',
      amount: typeof item.amount === 'number' ? item.amount : 0,
    }));
}

function fromEpochSeconds(value: number) {
  return new Date(value * 1000);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}
