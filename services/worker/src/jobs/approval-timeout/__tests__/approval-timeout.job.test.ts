import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockSelectWhere = vi.fn();
const mockUpdateSet = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockQueueAdd = vi.fn().mockResolvedValue(undefined);

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({
      from: vi.fn().mockReturnValue({ where: mockSelectWhere }),
    }),
    update: () => ({
      set: mockUpdateSet,
    }),
    insert: () => ({ values: mockInsertValues }),
  },
  approvalRequests: {},
  executionRuns: {},
  auditEvents: {},
  eq: vi.fn(),
}));

vi.mock('@agentmou/queue', () => ({
  getQueue: vi.fn(() => ({ add: mockQueueAdd })),
  QUEUE_NAMES: { RUN_AGENT: 'run-agent' },
}));

import { processApprovalTimeout } from '../approval-timeout.job';

function createJob(data: Record<string, unknown>) {
  return { data } as any;
}

describe('processApprovalTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  });

  it('should skip when approval is not found', async () => {
    mockSelectWhere.mockReturnValue({ limit: vi.fn().mockResolvedValue([]) });

    await processApprovalTimeout(
      createJob({
        tenantId: 't1',
        approvalId: 'missing',
        runId: 'run-1',
        actionOnTimeout: 'auto_approve',
      })
    );

    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('should skip when approval is already resolved', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 'a1', status: 'approved' }]),
    });

    await processApprovalTimeout(
      createJob({
        tenantId: 't1',
        approvalId: 'a1',
        runId: 'run-1',
        actionOnTimeout: 'auto_approve',
      })
    );

    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('should auto-approve and resume the run', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([
        { id: 'a1', status: 'pending', agentInstallationId: 'inst-1' },
      ]),
    });

    await processApprovalTimeout(
      createJob({
        tenantId: 't1',
        approvalId: 'a1',
        runId: 'run-1',
        actionOnTimeout: 'auto_approve',
      })
    );

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'run-agent',
      expect.objectContaining({ agentInstallationId: 'inst-1' }),
    );
    expect(mockInsertValues).toHaveBeenCalled(); // audit event
  });

  it('should auto-reject and fail the run', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 'a1', status: 'pending' }]),
    });

    await processApprovalTimeout(
      createJob({
        tenantId: 't1',
        approvalId: 'a1',
        runId: 'run-1',
        actionOnTimeout: 'auto_reject',
      })
    );

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' })
    );
    expect(mockInsertValues).toHaveBeenCalled();
  });

  it('should escalate with a note', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 'a1', status: 'pending' }]),
    });

    await processApprovalTimeout(
      createJob({
        tenantId: 't1',
        approvalId: 'a1',
        runId: 'run-1',
        actionOnTimeout: 'escalate',
        escalationNote: 'Needs manager review',
      })
    );

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionReason: 'Escalated: Needs manager review',
      })
    );
  });
});
