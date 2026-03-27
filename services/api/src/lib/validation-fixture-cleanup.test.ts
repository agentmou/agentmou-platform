import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildUserDeletionDecision,
  executeValidationFixtureCleanup,
  isValidationFixtureCandidate,
} from './validation-fixture-cleanup.js';

const { mockCleanupInstallationExternalResources } = vi.hoisted(() => ({
  mockCleanupInstallationExternalResources: vi.fn(),
}));

vi.mock('./external-installation-cleanup.js', () => ({
  cleanupInstallationExternalResources: mockCleanupInstallationExternalResources,
}));

function createValidationFixtureDb(options?: {
  workflowInstallations?: Array<{
    id: string;
    templateId: string;
    n8nWorkflowId: string | null;
  }>;
  schedules?: Array<{
    id: string;
    installationId: string;
    targetType: string;
    cron: string;
  }>;
  transactionError?: Error;
}) {
  const results: unknown[] = [
    [
      {
        id: 'tenant-1',
        name: "OAuth Validation's Workspace",
        plan: 'free',
        ownerId: 'user-1',
      },
    ],
    [
      {
        id: 'user-1',
        email: 'oauth-check-1773956802@example.com',
        name: 'OAuth Validation',
      },
    ],
    [{ id: 'membership-1', userId: 'user-1' }],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    options?.workflowInstallations ?? [],
    options?.schedules ?? [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
  ];

  const txDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const txDelete = vi.fn().mockReturnValue({
    where: txDeleteWhere,
  });
  const tx = { delete: txDelete };

  return {
    db: {
      select: () => ({
        from: vi.fn(() => ({
          where: vi.fn().mockImplementation(() => Promise.resolve(results.shift() ?? [])),
        })),
      }),
      transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => {
        if (options?.transactionError) {
          throw options.transactionError;
        }
        return callback(tx);
      }),
    },
    txDelete,
  };
}

describe('validation fixture cleanup helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanupInstallationExternalResources.mockResolvedValue(undefined);
  });

  it('accepts the March 19 OAuth validation fixture identity markers', () => {
    expect(
      isValidationFixtureCandidate({
        tenantName: "OAuth Check's Workspace",
        tenantPlan: 'free',
        userEmail: 'oauth-check-1773956802@example.com',
        userName: 'OAuth Check',
      })
    ).toBe(true);
  });

  it('rejects production-looking identities', () => {
    expect(
      isValidationFixtureCandidate({
        tenantName: 'Tim Workspace',
        tenantPlan: 'pro',
        userEmail: 'tim@agentmou.io',
        userName: 'Tim',
      })
    ).toBe(false);
  });

  it('deletes the user only when no other references remain', () => {
    expect(
      buildUserDeletionDecision({
        otherOwnedTenants: 0,
        otherMemberships: 0,
        otherAuditEvents: 0,
        otherApprovalDecisions: 0,
      })
    ).toEqual({
      willDelete: true,
      blockers: [],
    });
  });

  it('retains the user and reports the blocking references when other links remain', () => {
    expect(
      buildUserDeletionDecision({
        otherOwnedTenants: 1,
        otherMemberships: 2,
        otherAuditEvents: 0,
        otherApprovalDecisions: 1,
      })
    ).toEqual({
      willDelete: false,
      blockers: [
        {
          label: 'other owned tenants',
          count: 1,
        },
        {
          label: 'other memberships',
          count: 2,
        },
        {
          label: 'other approval decisions',
          count: 1,
        },
      ],
    });
  });

  it('fails closed before the DB transaction when external cleanup fails', async () => {
    const { db } = createValidationFixtureDb({
      workflowInstallations: [
        {
          id: 'wf-install-1',
          templateId: 'wf-01-auto-label-gmail',
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

    mockCleanupInstallationExternalResources.mockRejectedValueOnce(new Error('n8n offline'));

    await expect(
      executeValidationFixtureCleanup(db as never, {
        tenantId: 'tenant-1',
        userEmail: 'oauth-check-1773956802@example.com',
      })
    ).rejects.toThrow('n8n offline');

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
          installationId: 'agent-install-1',
          targetType: 'agent',
          cron: '*/15 * * * *',
        },
      ],
    });
    expect((db as { transaction: ReturnType<typeof vi.fn> }).transaction).not.toHaveBeenCalled();
  });

  it('reports explicit partial cleanup when DB deletion fails after external cleanup', async () => {
    const { db } = createValidationFixtureDb({
      workflowInstallations: [
        {
          id: 'wf-install-1',
          templateId: 'wf-01-auto-label-gmail',
          n8nWorkflowId: 'n8n-123',
        },
      ],
      transactionError: new Error('db write failed'),
    });

    await expect(
      executeValidationFixtureCleanup(db as never, {
        tenantId: 'tenant-1',
        userEmail: 'oauth-check-1773956802@example.com',
      })
    ).rejects.toThrow(
      'External cleanup succeeded but database deletion failed for tenant tenant-1.'
    );

    expect(mockCleanupInstallationExternalResources).toHaveBeenCalledTimes(1);
    expect((db as { transaction: ReturnType<typeof vi.fn> }).transaction).toHaveBeenCalledTimes(1);
  });
});
