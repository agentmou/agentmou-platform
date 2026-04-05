import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @agentmou/db
// ---------------------------------------------------------------------------
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
const mockSelectWhere = vi.fn();

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({
      from: vi.fn().mockReturnValue({
        where: mockSelectWhere,
      }),
    }),
    insert: () => ({ values: mockInsertValues }),
    update: () => ({ set: mockUpdateSet }),
  },
  schedules: {},
  executionRuns: {},
  eq: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock @agentmou/queue
// ---------------------------------------------------------------------------
const mockQueueAdd = vi.fn().mockResolvedValue(undefined);

vi.mock('@agentmou/queue', () => ({
  getQueue: vi.fn(() => ({ add: mockQueueAdd })),
  QUEUE_NAMES: {
    RUN_AGENT: 'run-agent',
    RUN_WORKFLOW: 'run-workflow',
    CLINIC_REACTIVATION_CAMPAIGN: 'clinic-reactivation-campaign',
  },
}));

import { processScheduleTrigger } from '../schedule-trigger.job';

function createJob(data: Record<string, unknown>) {
  return { data } as any;
}

describe('processScheduleTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip when schedule is not found', async () => {
    mockSelectWhere.mockReturnValue({ limit: vi.fn().mockResolvedValue([]) });

    await processScheduleTrigger(
      createJob({
        tenantId: 't1',
        scheduleId: 'missing',
        targetType: 'agent',
        installationId: 'inst-1',
      })
    );

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('should skip when schedule is disabled', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 's1', enabled: false }]),
    });

    await processScheduleTrigger(
      createJob({
        tenantId: 't1',
        scheduleId: 's1',
        targetType: 'agent',
        installationId: 'inst-1',
      })
    );

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('should create a run and enqueue run-agent for agent targets', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 's1', enabled: true, cron: '*/15 * * * *' }]),
    });

    await processScheduleTrigger(
      createJob({
        tenantId: 't1',
        scheduleId: 's1',
        targetType: 'agent',
        installationId: 'inst-1',
      })
    );

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        agentInstallationId: 'inst-1',
        status: 'running',
        triggeredBy: 'cron',
      })
    );
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'run-agent',
      expect.objectContaining({
        tenantId: 't1',
        agentInstallationId: 'inst-1',
        triggeredBy: 'cron',
      }),
      expect.any(Object)
    );
  });

  it('should enqueue run-workflow for workflow targets', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 's1', enabled: true }]),
    });

    await processScheduleTrigger(
      createJob({
        tenantId: 't1',
        scheduleId: 's1',
        targetType: 'workflow',
        installationId: 'wf-inst-1',
      })
    );

    expect(mockQueueAdd).toHaveBeenCalledWith(
      'run-workflow',
      expect.objectContaining({
        workflowInstallationId: 'wf-inst-1',
        triggeredBy: 'cron',
      }),
      expect.any(Object)
    );
  });

  it('should enqueue clinic reactivation campaign jobs for clinic schedule targets', async () => {
    mockSelectWhere.mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 's1', enabled: true }]),
    });

    await processScheduleTrigger(
      createJob({
        tenantId: 't1',
        scheduleId: 's1',
        targetType: 'clinic_reactivation_campaign',
        installationId: 'campaign-1',
      })
    );

    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'clinic-reactivation-campaign',
      expect.objectContaining({
        tenantId: 't1',
        campaignId: 'campaign-1',
        triggeredBy: 'scheduled',
      }),
      expect.any(Object)
    );
  });
});
