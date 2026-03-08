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

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const InvoiceStatusSchema = z.enum(['paid', 'pending', 'overdue']);

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
  items: z.array(InvoiceItemSchema),
});

export type Invoice = z.infer<typeof InvoiceSchema>;
