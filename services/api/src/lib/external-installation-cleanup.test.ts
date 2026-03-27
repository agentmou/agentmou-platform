import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRemoveRepeatable, mockDeleteWorkflow } = vi.hoisted(() => ({
  mockRemoveRepeatable: vi.fn(),
  mockDeleteWorkflow: vi.fn(),
}));

vi.mock('@agentmou/queue', () => ({
  getQueue: vi.fn(() => ({
    removeRepeatable: mockRemoveRepeatable,
  })),
  getScheduleTriggerJobId: (scheduleId: string) => `schedule-${scheduleId}`,
  QUEUE_NAMES: {
    SCHEDULE_TRIGGER: 'schedule-trigger-queue',
  },
  SCHEDULE_TRIGGER_JOB_NAME: 'schedule-trigger',
}));

vi.mock('../modules/n8n/n8n.service.js', () => ({
  N8nService: vi.fn().mockImplementation(() => ({
    deleteWorkflow: mockDeleteWorkflow,
  })),
}));

describe('cleanupInstallationExternalResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWorkflow.mockResolvedValue(undefined);
    mockRemoveRepeatable.mockResolvedValue(undefined);
  });

  it('deletes remote workflows and repeatable schedules', async () => {
    const { cleanupInstallationExternalResources } = await import(
      './external-installation-cleanup.js'
    );

    await cleanupInstallationExternalResources({
      workflows: [
        {
          installationId: 'wf-install-1',
          templateId: 'wf-01',
          n8nWorkflowId: 'n8n-123',
        },
      ],
      schedules: [
        {
          id: 'sched-1',
          installationId: 'agent-install-1',
          targetType: 'agent',
          cron: '*/15 * * * *',
        },
      ],
    });

    expect(mockDeleteWorkflow).toHaveBeenCalledWith('n8n-123');
    expect(mockRemoveRepeatable).toHaveBeenCalledWith(
      'schedule-trigger',
      { pattern: '*/15 * * * *' },
      'schedule-sched-1'
    );
  });

  it('ignores missing n8n workflows as idempotent success', async () => {
    const { cleanupInstallationExternalResources } = await import(
      './external-installation-cleanup.js'
    );

    mockDeleteWorkflow.mockRejectedValueOnce({
      response: { status: 404 },
    });

    await expect(
      cleanupInstallationExternalResources({
        workflows: [
          {
            installationId: 'wf-install-1',
            templateId: 'wf-01',
            n8nWorkflowId: 'n8n-missing',
          },
        ],
        schedules: [],
      })
    ).resolves.toBeUndefined();
  });

  it('aborts on real n8n failures before touching BullMQ', async () => {
    const { cleanupInstallationExternalResources, ExternalInstallationCleanupError } = await import(
      './external-installation-cleanup.js'
    );

    mockDeleteWorkflow.mockRejectedValueOnce({
      response: { status: 500 },
      message: 'n8n offline',
    });

    await expect(
      cleanupInstallationExternalResources({
        workflows: [
          {
            installationId: 'wf-install-1',
            templateId: 'wf-01',
            n8nWorkflowId: 'n8n-123',
          },
        ],
        schedules: [
          {
            id: 'sched-1',
            installationId: 'agent-install-1',
            targetType: 'agent',
            cron: '*/15 * * * *',
          },
        ],
      })
    ).rejects.toBeInstanceOf(ExternalInstallationCleanupError);

    expect(mockRemoveRepeatable).not.toHaveBeenCalled();
  });

  it('aborts on BullMQ failures', async () => {
    const { cleanupInstallationExternalResources, ExternalInstallationCleanupError } = await import(
      './external-installation-cleanup.js'
    );

    mockRemoveRepeatable.mockRejectedValueOnce(new Error('redis down'));

    await expect(
      cleanupInstallationExternalResources({
        workflows: [],
        schedules: [
          {
            id: 'sched-1',
            installationId: 'agent-install-1',
            targetType: 'agent',
            cron: '*/15 * * * *',
          },
        ],
      })
    ).rejects.toBeInstanceOf(ExternalInstallationCleanupError);
  });
});
