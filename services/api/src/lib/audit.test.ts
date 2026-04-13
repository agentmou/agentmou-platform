import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertMock, valuesMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  valuesMock: vi.fn(),
}));

vi.mock('@agentmou/db', () => ({
  db: {
    insert: insertMock,
  },
  auditEvents: {},
}));

describe('recordAdminAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    valuesMock.mockResolvedValue(undefined);
    insertMock.mockReturnValue({
      values: valuesMock,
    });
  });

  it('writes a target and mirror event when actor and target tenants differ', async () => {
    const { recordAdminAuditEvent } = await import('./audit.js');

    await recordAdminAuditEvent({
      actorId: 'user-1',
      actorTenantId: 'tenant-admin',
      targetTenantId: 'tenant-target',
      action: 'admin.user.created',
      details: {
        targetUserId: 'user-2',
      },
    });

    expect(valuesMock).toHaveBeenCalledTimes(2);
    expect(valuesMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: 'tenant-target',
        actorId: 'user-1',
        action: 'admin.user.created',
        category: 'admin',
        details: expect.objectContaining({
          targetTenantId: 'tenant-target',
          targetUserId: 'user-2',
        }),
      })
    );
    expect(valuesMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tenantId: 'tenant-admin',
        actorId: 'user-1',
        action: 'admin.user.created',
        category: 'admin',
      })
    );
  });

  it('writes a single event when actor and target tenants are the same', async () => {
    const { recordAdminAuditEvent } = await import('./audit.js');

    await recordAdminAuditEvent({
      actorId: 'user-1',
      actorTenantId: 'tenant-admin',
      targetTenantId: 'tenant-admin',
      action: 'admin.impersonation.stopped',
    });

    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-admin',
        action: 'admin.impersonation.stopped',
      })
    );
  });
});
