import { billableUsageLedger, db, usageEvents } from '@agentmou/db';

interface RecordRunUsageInput {
  tenantId: string;
  runId: string;
  status: string;
  source: 'agent_run' | 'workflow_run';
  tokensUsed?: number;
  costEstimate?: number;
  recordedAt?: Date;
}

export async function recordRunUsage(input: RecordRunUsageInput) {
  const recordedAt = input.recordedAt ?? new Date();
  const periodKey = recordedAt.toISOString().slice(0, 7);

  await db.insert(usageEvents).values([
    {
      tenantId: input.tenantId,
      metric: `${input.source}.count`,
      value: 1,
      unit: 'run',
      recordedAt,
    },
    {
      tenantId: input.tenantId,
      metric: `${input.source}.tokens`,
      value: input.tokensUsed ?? 0,
      unit: 'tokens',
      recordedAt,
    },
    {
      tenantId: input.tenantId,
      metric: `${input.source}.cost_estimate`,
      value: input.costEstimate ?? 0,
      unit: 'usd',
      recordedAt,
    },
  ]);

  await db.insert(billableUsageLedger).values({
    tenantId: input.tenantId,
    runId: input.runId,
    source: input.source,
    metric: 'billable_run',
    quantity: 1,
    unit: 'run',
    billable: input.status === 'success',
    unitAmount: 0,
    amount: 0,
    currency: 'usd',
    periodKey,
    details: {
      status: input.status,
    },
    recordedAt,
  });
}
