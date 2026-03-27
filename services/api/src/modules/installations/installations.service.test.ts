import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCleanupInstallationExternalResources = vi.fn();
const mockTransaction = vi.fn();
const mockSelectWhere = vi.fn();
const mockTxDeleteWhere = vi.fn();
const mockTxDelete = vi.fn();

const agentInstallationsTable = { table: 'agentInstallations' };
const workflowInstallationsTable = { table: 'workflowInstallations' };
const schedulesTable = { table: 'schedules' };

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({
      from: vi.fn(() => ({
        where: mockSelectWhere,
      })),
    }),
    transaction: mockTransaction,
  },
  agentInstallations: agentInstallationsTable,
  workflowInstallations: workflowInstallationsTable,
  schedules: schedulesTable,
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../../lib/external-installation-cleanup.js', () => ({
  cleanupInstallationExternalResources: mockCleanupInstallationExternalResources,
}));

function setSelectResults(results: unknown[]) {
  mockSelectWhere.mockReset();
  results.forEach((result) => {
    mockSelectWhere.mockResolvedValueOnce(result);
  });
}

describe('InstallationsService.uninstall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanupInstallationExternalResources.mockResolvedValue(undefined);
    mockTxDeleteWhere.mockResolvedValue(undefined);
    mockTxDelete.mockReturnValue({
      where: mockTxDeleteWhere,
    });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        delete: mockTxDelete,
      })
    );
  });

  it('removes remote workflows before deleting a workflow installation', async () => {
    const { InstallationsService } = await import('./installations.service.js');

    setSelectResults([
      [],
      [
        {
          id: 'wf-install-1',
          templateId: 'wf-01-auto-label-gmail',
          n8nWorkflowId: 'n8n-123',
        },
      ],
      [
        {
          id: 'sched-1',
          installationId: 'wf-install-1',
          targetType: 'workflow',
          cron: '0 * * * *',
        },
      ],
    ]);

    const service = new InstallationsService();
    await service.uninstall('tenant-1', 'wf-install-1');

    expect(mockCleanupInstallationExternalResources).toHaveBeenCalledWith({
      workflows: [
        {
          installationId: 'wf-install-1',
          templateId: 'wf-01-auto-label-gmail',
          n8nWorkflowId: 'n8n-123',
        },
      ],
      schedules: [
        {
          id: 'sched-1',
          installationId: 'wf-install-1',
          targetType: 'workflow',
          cron: '0 * * * *',
        },
      ],
    });
    expect(mockTxDelete).toHaveBeenNthCalledWith(1, schedulesTable);
    expect(mockTxDelete).toHaveBeenNthCalledWith(2, workflowInstallationsTable);
  }, 15000);

  it('removes repeatable schedules before deleting an agent installation', async () => {
    const { InstallationsService } = await import('./installations.service.js');

    setSelectResults([
      [
        {
          id: 'agent-install-1',
          templateId: 'inbox-triage',
        },
      ],
      [],
      [
        {
          id: 'sched-1',
          installationId: 'agent-install-1',
          targetType: 'agent',
          cron: '*/15 * * * *',
        },
      ],
    ]);

    const service = new InstallationsService();
    await service.uninstall('tenant-1', 'agent-install-1');

    expect(mockCleanupInstallationExternalResources).toHaveBeenCalledWith({
      workflows: [],
      schedules: [
        {
          id: 'sched-1',
          installationId: 'agent-install-1',
          targetType: 'agent',
          cron: '*/15 * * * *',
        },
      ],
    });
    expect(mockTxDelete).toHaveBeenNthCalledWith(1, schedulesTable);
    expect(mockTxDelete).toHaveBeenNthCalledWith(2, agentInstallationsTable);
  }, 15000);
});
