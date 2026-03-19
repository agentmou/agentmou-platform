import { z } from 'zod';

// ---------------------------------------------------------------------------
// Usage metrics
// ---------------------------------------------------------------------------

export const UsageMetricSchema = z.object({
  metric: z.string(),
  used: z.number(),
  limit: z.number().nullable(),
  unit: z.string(),
});

export type UsageMetric = z.infer<typeof UsageMetricSchema>;

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

export type PlanEntitlement = z.infer<typeof PlanEntitlementSchema>;

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

export type UsageSummary = z.infer<typeof UsageSummarySchema>;

export const UsageHistoryPointSchema = z.object({
  date: z.string(),
  runs: z.number(),
  successRuns: z.number(),
  failedRuns: z.number(),
  tokens: z.number(),
  cost: z.number(),
});

export type UsageHistoryPoint = z.infer<typeof UsageHistoryPointSchema>;

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

export type BillableUsageLedgerEntry = z.infer<typeof BillableUsageLedgerEntrySchema>;

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const InvoiceStatusSchema = z.enum([
  'draft',
  'open',
  'paid',
  'pending',
  'overdue',
  'void',
  'uncollectible',
]);

export const InvoiceItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

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

export type Invoice = z.infer<typeof InvoiceSchema>;

export const BillingSubscriptionStatusSchema = z.enum([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'not_configured',
]);

export type BillingSubscriptionStatus = z.infer<
  typeof BillingSubscriptionStatusSchema
>;

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

export type BillingSubscription = z.infer<typeof BillingSubscriptionSchema>;

export const BillingPaymentMethodSchema = z.object({
  id: z.string(),
  type: z.string(),
  brand: z.string().optional(),
  last4: z.string().optional(),
  expMonth: z.number().optional(),
  expYear: z.number().optional(),
  isDefault: z.boolean(),
});

export type BillingPaymentMethod = z.infer<typeof BillingPaymentMethodSchema>;

export const BillingOverviewSchema = z.object({
  subscription: BillingSubscriptionSchema,
  usage: UsageSummarySchema,
  invoices: z.array(InvoiceSchema),
  paymentMethods: z.array(BillingPaymentMethodSchema),
});

export type BillingOverview = z.infer<typeof BillingOverviewSchema>;

export const UsageSummaryResponseSchema = z.object({
  usage: UsageSummarySchema,
});

export const UsageHistoryResponseSchema = z.object({
  history: z.array(UsageHistoryPointSchema),
});

export const UsageLimitsResponseSchema = z.object({
  limits: PlanEntitlementSchema,
});

export const BillingSubscriptionResponseSchema = z.object({
  subscription: BillingSubscriptionSchema,
});

export const BillingInvoicesResponseSchema = z.object({
  invoices: z.array(InvoiceSchema),
});

export const BillingPaymentMethodsResponseSchema = z.object({
  methods: z.array(BillingPaymentMethodSchema),
});

export const BillingOverviewResponseSchema = z.object({
  overview: BillingOverviewSchema,
});
