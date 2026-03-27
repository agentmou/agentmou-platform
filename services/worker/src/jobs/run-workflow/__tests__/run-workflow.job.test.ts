import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'wf-install-1',
            tenantId: 'tenant-1',
            templateId: 'wf-01',
            n8nWorkflowId: 'n8n-123',
            runsTotal: 3,
          },
        ]),
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
    update: () => ({
      set: mockUpdateSet,
    }),
  },
  executionRuns: {},
  executionSteps: {},
  workflowInstallations: {},
  usageEvents: {},
  billableUsageLedger: {},
}));

const mockExecuteWorkflow = vi.fn();

vi.mock('@agentmou/n8n-client', () => ({
  N8nClient: vi.fn().mockImplementation(() => ({
    executeWorkflow: mockExecuteWorkflow,
  })),
}));

beforeEach(() => {
  mockInsertValues.mockReset();
  mockUpdateSet.mockReset();
  mockUpdateWhere.mockReset();
  mockExecuteWorkflow.mockReset();

  mockInsertValues.mockResolvedValue(undefined);
  mockUpdateSet.mockReturnValue({
    where: mockUpdateWhere,
  });
  mockUpdateWhere.mockResolvedValue(undefined);
});

describe('processRunWorkflow', () => {
  it('persists canonical workflow step types and success statuses', async () => {
    const { processRunWorkflow } = await import('../run-workflow.job');

    mockExecuteWorkflow.mockResolvedValue({
      finished: true,
      data: { ok: true },
    });

    const job = {
      data: {
        tenantId: 'tenant-1',
        workflowInstallationId: 'wf-install-1',
        runId: 'run-1',
        input: { foo: 'bar' },
      },
      updateProgress: vi.fn().mockResolvedValue(undefined),
    } as const;

    await processRunWorkflow(job as never);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        type: 'n8n_execution',
        status: 'running',
      })
    );
    expect(mockUpdateSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: 'success',
        output: { ok: true },
      })
    );
    expect(mockUpdateSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'success',
      })
    );
  }, 15000);
});
