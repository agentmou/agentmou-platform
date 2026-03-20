import { z } from 'zod';

// ---------------------------------------------------------------------------
// Dashboard metrics (derived/aggregated view)
// ---------------------------------------------------------------------------

/** Supported time windows for dashboard aggregation. */
export const DashboardPeriodSchema = z.enum(['day', 'week', 'month']);

/** Aggregate metrics returned for the tenant dashboard. */
export const DashboardMetricsSchema = z.object({
  tenantId: z.string(),
  period: DashboardPeriodSchema,
  runsTotal: z.number(),
  runsSuccess: z.number(),
  runsFailed: z.number(),
  avgLatencyMs: z.number(),
  totalCost: z.number(),
  topAgents: z.array(
    z.object({
      agentId: z.string(),
      runs: z.number(),
    })
  ),
  topWorkflows: z.array(
    z.object({
      workflowId: z.string(),
      runs: z.number(),
    })
  ),
  costByDay: z.array(
    z.object({
      date: z.string(),
      cost: z.number(),
    })
  ),
  runsByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    })
  ),
  errorsByType: z.array(
    z.object({
      type: z.string(),
      count: z.number(),
    })
  ),
});

/** TypeScript shape for the aggregated dashboard metrics response. */
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
