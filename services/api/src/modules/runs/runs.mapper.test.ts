import { describe, expect, it } from 'vitest';
import { buildExecutionLogs, mapExecutionRun, mapExecutionStep } from './runs.mapper';

describe('runs.mapper', () => {
  it('normalizes legacy workflow step payloads', () => {
    const step = mapExecutionStep({
      id: 'step-1',
      runId: 'run-1',
      type: 'n8n-execution',
      name: 'Execute workflow',
      status: 'completed',
      input: { foo: 'bar' },
      output: { ok: true },
      error: null,
      tokenUsage: 42,
      cost: 0.01,
      durationMs: 1200,
      startedAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: new Date('2024-01-01T00:00:01Z'),
    });

    expect(step).toMatchObject({
      type: 'n8n_execution',
      status: 'success',
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:00:01.000Z',
    });
  });

  it('maps db runs into the public execution contract', () => {
    const run = mapExecutionRun(
      {
        id: 'run-1',
        tenantId: 'tenant-1',
        agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        workflowInstallationId: null,
        status: 'completed',
        triggeredBy: 'manual',
        durationMs: null,
        costEstimate: null,
        tokensUsed: null,
        tags: null,
        startedAt: new Date('2024-01-01T00:00:00Z'),
        completedAt: null,
      },
      {
        agentId: 'agent-inbox-triage',
        steps: [
          {
            id: 'step-1',
            runId: 'run-1',
            type: 'tool_call',
            name: 'Read inbox',
            status: 'running',
            input: null,
            output: null,
            error: null,
            tokenUsage: null,
            cost: null,
            durationMs: null,
            startedAt: new Date('2024-01-01T00:00:00Z'),
            completedAt: null,
          },
        ],
      },
    );

    expect(run).toMatchObject({
      agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      workflowInstallationId: null,
      agentId: 'agent-inbox-triage',
      status: 'success',
      durationMs: undefined,
      costEstimate: 0,
      tokensUsed: 0,
      tags: [],
    });
    expect(run.timeline).toHaveLength(1);
    expect(run.logs).toEqual([
      '[2024-01-01T00:00:00.000Z] RUNNING TOOL_CALL Read inbox',
    ]);
  });

  it('builds readable execution logs from steps', () => {
    const logs = buildExecutionLogs([
      {
        id: 'step-1',
        type: 'approval',
        name: 'Await approval',
        status: 'pending_approval',
        startedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'step-2',
        type: 'tool_call',
        name: 'Create ticket',
        status: 'failed',
        startedAt: '2024-01-01T00:00:02.000Z',
        error: 'Linear API timeout',
      },
    ]);

    expect(logs).toEqual([
      '[2024-01-01T00:00:00.000Z] PENDING_APPROVAL APPROVAL Await approval',
      '[2024-01-01T00:00:02.000Z] FAILED TOOL_CALL Create ticket - Linear API timeout',
    ]);
  });
});
