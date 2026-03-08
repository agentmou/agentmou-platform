import { z } from 'zod';

// ---------------------------------------------------------------------------
// Dashboard metrics (derived/aggregated view)
// ---------------------------------------------------------------------------

export const DashboardPeriodSchema = z.enum(['day', 'week', 'month']);

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

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
