import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock('@agentmou/db', () => ({
  db: {
    insert: () => ({
      values: mockInsertValues,
    }),
    update: () => ({
      set: mockUpdateSet,
    }),
  },
  executionRuns: {},
  executionSteps: {},
}));

beforeEach(() => {
  mockInsertValues.mockReset();
  mockUpdateSet.mockReset();
  mockUpdateWhere.mockReset();

  mockInsertValues.mockResolvedValue(undefined);
  mockUpdateSet.mockReturnValue({
    where: mockUpdateWhere,
  });
  mockUpdateWhere.mockResolvedValue(undefined);
});

describe('RunLogger', () => {
  it('persists canonical success statuses for steps and runs', async () => {
    const { RunLogger } = await import('../run-logger');

    const logger = new RunLogger();
    await logger.startRun('run-1');
    await logger.startStep('run-1', {
      id: 'step-1',
      name: 'Read inbox',
      type: 'tool_call',
    });
    await logger.completeStep('run-1', 'step-1', { ok: true }, 12, 0.01);
    await logger.completeRun('run-1', 'success', {
      tokensUsed: 12,
      costEstimate: 0.01,
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'step-1',
        runId: 'run-1',
        status: 'running',
        type: 'tool_call',
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
        tokensUsed: 12,
        costEstimate: 0.01,
      })
    );
  });
});
