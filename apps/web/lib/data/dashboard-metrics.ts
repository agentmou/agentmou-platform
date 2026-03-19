import type { DashboardMetrics, ExecutionRun } from '@agentmou/contracts';

function dayCount(period: DashboardMetrics['period']) {
  if (period === 'day') return 1;
  if (period === 'month') return 30;
  return 7;
}

function buildDateRange(days: number) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(end);
    current.setUTCDate(end.getUTCDate() - (days - 1 - index));
    return current.toISOString().slice(0, 10);
  });
}

function dateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function topCounts(items: (string | undefined)[], maxItems: number) {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item) continue;
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);
}

export function buildDashboardMetrics(
  tenantId: string,
  runs: ExecutionRun[],
  period: DashboardMetrics['period'] = 'week',
): DashboardMetrics {
  const days = dayCount(period);
  const dateRange = buildDateRange(days);
  const visibleRuns = runs.filter((run) => dateRange.includes(dateKey(run.startedAt)));

  const runsTotal = visibleRuns.length;
  const runsSuccess = visibleRuns.filter((run) => run.status === 'success').length;
  const runsFailed = visibleRuns.filter((run) => run.status === 'failed').length;
  const avgLatencyMs = runsTotal
    ? Math.round(
        visibleRuns.reduce((sum, run) => sum + (run.durationMs || 0), 0) / runsTotal,
      )
    : 0;
  const totalCost = visibleRuns.reduce(
    (sum, run) => sum + (run.costEstimate || 0),
    0,
  );

  return {
    tenantId,
    period,
    runsTotal,
    runsSuccess,
    runsFailed,
    avgLatencyMs,
    totalCost,
    topAgents: topCounts(
      visibleRuns.map((run) => run.agentId),
      5,
    ).map(([agentId, count]) => ({
      agentId,
      runs: count,
    })),
    topWorkflows: topCounts(
      visibleRuns.map((run) => run.workflowId),
      5,
    ).map(([workflowId, count]) => ({
      workflowId,
      runs: count,
    })),
    costByDay: dateRange.map((date) => ({
      date,
      cost: Number(
        visibleRuns
          .filter((run) => dateKey(run.startedAt) === date)
          .reduce((sum, run) => sum + (run.costEstimate || 0), 0)
          .toFixed(4),
      ),
    })),
    runsByDay: dateRange.map((date) => ({
      date,
      count: visibleRuns.filter((run) => dateKey(run.startedAt) === date).length,
    })),
    errorsByType: [
      {
        type: 'Execution Failure',
        count: visibleRuns.filter((run) => run.status === 'failed').length,
      },
      {
        type: 'Timeout',
        count: visibleRuns.filter((run) => run.status === 'timeout').length,
      },
      {
        type: 'Pending Approval',
        count: visibleRuns.filter((run) => run.status === 'pending_approval').length,
      },
      {
        type: 'Rejected',
        count: visibleRuns.filter((run) => run.status === 'rejected').length,
      },
    ].filter((item) => item.count > 0),
  };
}
