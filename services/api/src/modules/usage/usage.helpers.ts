import {
  agentInstallations,
  billableUsageLedger,
  db,
  executionRuns,
  tenants,
  workflowInstallations,
} from '@agentmou/db';
import type {
  PlanEntitlement,
  UsageHistoryPoint,
  UsageMetric,
  UsageSummary,
} from '@agentmou/contracts';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';

import { getPlanEntitlements } from '../billing/plan-config.js';

type ExecutionRunRow = typeof executionRuns.$inferSelect;
type BillableUsageLedgerRow = typeof billableUsageLedger.$inferSelect;

export interface TenantUsageSnapshot {
  plan: string;
  entitlements: PlanEntitlement;
  period: {
    start: Date;
    end: Date;
    key: string;
  };
  runs: ExecutionRunRow[];
  ledger: BillableUsageLedgerRow[];
  usage: UsageSummary;
}

export function getCurrentBillingPeriod(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  return {
    start,
    end,
    key: start.toISOString().slice(0, 7),
  };
}

export function isBillableRun(run: ExecutionRunRow) {
  return run.status === 'success' && run.triggeredBy !== 'system';
}

export async function computeTenantUsage(
  tenantId: string,
  date = new Date(),
): Promise<TenantUsageSnapshot> {
  const period = getCurrentBillingPeriod(date);
  const [tenant] = await db
    .select({
      plan: tenants.plan,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const plan = tenant?.plan ?? 'free';
  const entitlements = getPlanEntitlements(plan);

  const [runs, ledger] = await Promise.all([
    db
      .select()
      .from(executionRuns)
      .where(
        and(
          eq(executionRuns.tenantId, tenantId),
          gte(executionRuns.startedAt, period.start),
          lt(executionRuns.startedAt, period.end),
        ),
      ),
    db
      .select()
      .from(billableUsageLedger)
      .where(
        and(
          eq(billableUsageLedger.tenantId, tenantId),
          eq(billableUsageLedger.periodKey, period.key),
        ),
      ),
  ]);

  const totalTokens = runs.reduce((sum, run) => sum + (run.tokensUsed ?? 0), 0);
  const totalCostEstimate = runs.reduce(
    (sum, run) => sum + (run.costEstimate ?? 0),
    0,
  );

  const billableRunsFromLedger = ledger
    .filter((entry) => entry.metric === 'billable_run' && entry.billable)
    .reduce((sum, entry) => sum + entry.quantity, 0);

  const billableRuns =
    billableRunsFromLedger > 0
      ? billableRunsFromLedger
      : runs.filter(isBillableRun).length;

  const includedRuns = entitlements.includedRuns;
  const overageRuns =
    includedRuns === null ? 0 : Math.max(billableRuns - includedRuns, 0);
  const overageAmount = Number(
    (overageRuns * entitlements.overageRunPrice).toFixed(4),
  );

  const metrics: UsageMetric[] = [
    {
      metric: 'agent_runs',
      used: runs.filter((run) => Boolean(run.agentInstallationId)).length,
      limit: includedRuns,
      unit: 'runs',
    },
    {
      metric: 'workflow_executions',
      used: runs.filter((run) => Boolean(run.workflowInstallationId)).length,
      limit: null,
      unit: 'runs',
    },
    {
      metric: 'llm_tokens',
      used: totalTokens,
      limit: null,
      unit: 'tokens',
    },
    {
      metric: 'llm_cost_estimate',
      used: Number(totalCostEstimate.toFixed(4)),
      limit: null,
      unit: entitlements.currency,
    },
  ];

  return {
    plan,
    entitlements,
    period,
    runs,
    ledger,
    usage: {
      tenantId,
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      includedRuns,
      billableRuns,
      overageRuns,
      totalTokens,
      totalCostEstimate: Number(totalCostEstimate.toFixed(4)),
      overageAmount,
      currency: entitlements.currency,
      metrics,
    },
  };
}

export async function buildUsageBreakdown(tenantId: string, runs: ExecutionRunRow[]) {
  const agentInstallationIds = [
    ...new Set(
      runs
        .map((run) => run.agentInstallationId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const workflowInstallationIds = [
    ...new Set(
      runs
        .map((run) => run.workflowInstallationId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [agents, workflows] = await Promise.all([
    agentInstallationIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: agentInstallations.id,
            templateId: agentInstallations.templateId,
          })
          .from(agentInstallations)
          .where(inArray(agentInstallations.id, agentInstallationIds)),
    workflowInstallationIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: workflowInstallations.id,
            templateId: workflowInstallations.templateId,
          })
          .from(workflowInstallations)
          .where(inArray(workflowInstallations.id, workflowInstallationIds)),
  ]);

  const agentMap = new Map(agents.map((agent) => [agent.id, agent.templateId]));
  const workflowMap = new Map(
    workflows.map((workflow) => [workflow.id, workflow.templateId]),
  );

  return {
    byAgent: summarizeCounts(
      runs
        .map((run) => run.agentInstallationId)
        .filter((id): id is string => Boolean(id))
        .map((id) => agentMap.get(id) ?? id),
      'agentId',
      'runs',
    ),
    byWorkflow: summarizeCounts(
      runs
        .map((run) => run.workflowInstallationId)
        .filter((id): id is string => Boolean(id))
        .map((id) => workflowMap.get(id) ?? id),
      'workflowId',
      'executions',
    ),
    byUser: summarizeCounts(
      runs.map((run) => run.triggeredBy),
      'userId',
      'runs',
    ),
  };
}

export function buildUsageHistory(
  runs: ExecutionRunRow[],
  days = 30,
): UsageHistoryPoint[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(end);
    current.setUTCDate(end.getUTCDate() - (days - 1 - index));
    const dateKey = current.toISOString().slice(0, 10);
    const dayRuns = runs.filter(
      (run) => run.startedAt.toISOString().slice(0, 10) === dateKey,
    );

    return {
      date: dateKey,
      runs: dayRuns.length,
      successRuns: dayRuns.filter((run) => run.status === 'success').length,
      failedRuns: dayRuns.filter((run) => run.status === 'failed').length,
      tokens: dayRuns.reduce((sum, run) => sum + (run.tokensUsed ?? 0), 0),
      cost: Number(
        dayRuns
          .reduce((sum, run) => sum + (run.costEstimate ?? 0), 0)
          .toFixed(4),
      ),
    };
  });
}

function summarizeCounts<
  TItem extends Record<string, string | number>,
  TLabel extends string,
  TValue extends string,
>(
  values: string[],
  labelKey: TLabel,
  valueKey: TValue,
) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      [labelKey]: value,
      [valueKey]: count,
    })) as Array<TItem & Record<TLabel, string> & Record<TValue, number>>;
}
