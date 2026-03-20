import { z } from 'zod';

// ---------------------------------------------------------------------------
// Usage metrics
// ---------------------------------------------------------------------------

/** Single usage metric with its current usage and configured limit. */
export const UsageMetricSchema = z.object({
  metric: z.string(),
  used: z.number(),
  limit: z.number().nullable(),
  unit: z.string(),
});

/** TypeScript shape for a usage metric. */
export type UsageMetric = z.infer<typeof UsageMetricSchema>;

/** Plan entitlement record used for billing and limits screens. */
export const PlanEntitlementSchema = z.object({
  plan: z.string(),
  includedRuns: z.number().nullable(),
  includedAgents: z.number().nullable(),
  includedTeamMembers: z.number().nullable(),
  logRetentionDays: z.number(),
  monthlyBaseAmount: z.number(),
  overageRunPrice: z.number(),
  currency: z.string(),
  softLimit: z.boolean(),
});

/** TypeScript shape for plan entitlements. */
export type PlanEntitlement = z.infer<typeof PlanEntitlementSchema>;

/** Summary of tenant usage for the current billing window. */
export const UsageSummarySchema = z.object({
  tenantId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  includedRuns: z.number().nullable(),
  billableRuns: z.number(),
  overageRuns: z.number(),
  totalTokens: z.number(),
  totalCostEstimate: z.number(),
  overageAmount: z.number(),
  currency: z.string(),
  metrics: z.array(UsageMetricSchema),
});

/** TypeScript shape for a usage summary. */
export type UsageSummary = z.infer<typeof UsageSummarySchema>;

/** Daily billing history point for charts and reports. */
export const UsageHistoryPointSchema = z.object({
  date: z.string(),
  runs: z.number(),
  successRuns: z.number(),
  failedRuns: z.number(),
  tokens: z.number(),
  cost: z.number(),
});

/** TypeScript shape for a usage history point. */
export type UsageHistoryPoint = z.infer<typeof UsageHistoryPointSchema>;

/** Billable ledger row used for metering and invoice generation. */
export const BillableUsageLedgerEntrySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  runId: z.string().optional(),
  source: z.string(),
  metric: z.string(),
  quantity: z.number(),
  unit: z.string(),
  billable: z.boolean(),
  unitAmount: z.number(),
  amount: z.number(),
  currency: z.string(),
  periodKey: z.string(),
  recordedAt: z.string(),
  details: z.record(z.unknown()).default({}),
});

/** TypeScript shape for a billable usage ledger entry. */
export type BillableUsageLedgerEntry = z.infer<typeof BillableUsageLedgerEntrySchema>;

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

/** Invoice lifecycle states reported to the UI. */
export const InvoiceStatusSchema = z.enum([
  'draft',
  'open',
  'paid',
  'pending',
  'overdue',
  'void',
  'uncollectible',
]);

/** Single invoice line item. */
export const InvoiceItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

/** Invoice record returned by billing endpoints. */
export const InvoiceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  date: z.string(),
  amount: z.number(),
  status: InvoiceStatusSchema,
  currency: z.string().default('usd'),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  hostedInvoiceUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  items: z.array(InvoiceItemSchema),
});

/** TypeScript shape for an invoice. */
export type Invoice = z.infer<typeof InvoiceSchema>;

/** Subscription lifecycle states exposed to the billing UI. */
export const BillingSubscriptionStatusSchema = z.enum([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'not_configured',
]);

/** TypeScript view of billing subscription statuses. */
export type BillingSubscriptionStatus = z.infer<
  typeof BillingSubscriptionStatusSchema
>;

/** Subscription record returned by billing endpoints. */
export const BillingSubscriptionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  provider: z.string(),
  providerCustomerId: z.string().optional(),
  providerSubscriptionId: z.string().optional(),
  plan: z.string(),
  status: BillingSubscriptionStatusSchema,
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
  cancelAtPeriodEnd: z.boolean(),
  entitlements: PlanEntitlementSchema,
  usage: z.object({
    billableRuns: z.number(),
    includedRuns: z.number().nullable(),
    overageRuns: z.number(),
  }),
  monthlyBaseAmount: z.number(),
  overageAmount: z.number(),
  currency: z.string(),
  portalUrl: z.string().optional(),
});

/** TypeScript shape for a billing subscription. */
export type BillingSubscription = z.infer<typeof BillingSubscriptionSchema>;

/** Saved payment method summary returned by billing endpoints. */
export const BillingPaymentMethodSchema = z.object({
  id: z.string(),
  type: z.string(),
  brand: z.string().optional(),
  last4: z.string().optional(),
  expMonth: z.number().optional(),
  expYear: z.number().optional(),
  isDefault: z.boolean(),
});

/** TypeScript shape for a billing payment method. */
export type BillingPaymentMethod = z.infer<typeof BillingPaymentMethodSchema>;

/** Aggregate billing overview returned to the tenant UI. */
export const BillingOverviewSchema = z.object({
  subscription: BillingSubscriptionSchema,
  usage: UsageSummarySchema,
  invoices: z.array(InvoiceSchema),
  paymentMethods: z.array(BillingPaymentMethodSchema),
});

/** TypeScript shape for the billing overview payload. */
export type BillingOverview = z.infer<typeof BillingOverviewSchema>;

/** Response payload for usage summary endpoints. */
export const UsageSummaryResponseSchema = z.object({
  usage: UsageSummarySchema,
});

/** Response payload for usage history endpoints. */
export const UsageHistoryResponseSchema = z.object({
  history: z.array(UsageHistoryPointSchema),
});

/** Response payload for usage limit endpoints. */
export const UsageLimitsResponseSchema = z.object({
  limits: PlanEntitlementSchema,
});

/** Response payload for subscription detail endpoints. */
export const BillingSubscriptionResponseSchema = z.object({
  subscription: BillingSubscriptionSchema,
});

/** Response payload for invoice list endpoints. */
export const BillingInvoicesResponseSchema = z.object({
  invoices: z.array(InvoiceSchema),
});

/** Response payload for payment method list endpoints. */
export const BillingPaymentMethodsResponseSchema = z.object({
  methods: z.array(BillingPaymentMethodSchema),
});

/** Response payload for the aggregate billing overview endpoint. */
export const BillingOverviewResponseSchema = z.object({
  overview: BillingOverviewSchema,
});
