import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminService } from './admin.service.js';

function createRepositoryMock() {
  return {
    listTenants: vi.fn(),
    getTenantDetail: vi.fn(),
    updateTenantStatus: vi.fn(),
    updateTenantActiveVertical: vi.fn(),
    ensureTenantVerticalConfig: vi.fn(),
    listTenantEnabledVerticals: vi.fn(),
    setTenantEnabledVerticals: vi.fn(),
    listTenantUsers: vi.fn(),
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    getMembership: vi.fn(),
    createMembership: vi.fn(),
    updateMembershipRole: vi.fn(),
    getTenantUser: vi.fn(),
    getUserById: vi.fn(),
    updateUserName: vi.fn(),
    countOwners: vi.fn(),
    deleteMembership: vi.fn(),
    createImpersonationSession: vi.fn(),
    getImpersonationSession: vi.fn(),
    endImpersonationSession: vi.fn(),
  };
}

function createDependenciesMock() {
  return {
    issuePasswordResetToken: vi.fn(),
    sendUserActivationEmail: vi.fn(),
    recordAdminAuditEvent: vi.fn(),
    createAuthSession: vi.fn(),
    revokeAuthSessionById: vi.fn(),
    now: vi.fn(),
  };
}

describe('AdminService', () => {
  const now = new Date('2026-04-13T10:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes the next cursor for tenant listing', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.listTenants.mockResolvedValue({
      tenants: [
        {
          id: 'tenant-1',
          name: 'Demo Workspace',
          type: 'business',
          plan: 'enterprise',
          status: 'active',
          ownerId: 'user-1',
          createdAt: '2026-04-01T10:00:00.000Z',
          activeVertical: 'internal',
          isPlatformAdminTenant: true,
          userCount: 3,
        },
      ],
      nextCursor: {
        id: 'tenant-1',
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    });

    const service = new AdminService(repository as never, dependencies as never);
    const response = await service.listTenants({ limit: 25, q: 'demo' });

    expect(repository.listTenants).toHaveBeenCalledWith({
      q: 'demo',
      plan: undefined,
      vertical: undefined,
      isPlatformAdminTenant: undefined,
      limit: 25,
      cursor: undefined,
    });
    expect(response.nextCursor).toBe('2026-04-01T10:00:00.000Z::tenant-1');
  });

  it('changes the tenant vertical, ensures config, and audits the change', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.getTenantDetail
      .mockResolvedValueOnce({
        id: 'tenant-1',
        name: 'Dental Demo Clinic',
        type: 'business',
        plan: 'enterprise',
        status: 'active',
        ownerId: 'user-1',
        createdAt: '2026-04-01T10:00:00.000Z',
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        userCount: 4,
        settings: {
          timezone: 'Europe/Madrid',
          defaultHITL: false,
          logRetentionDays: 30,
          memoryRetentionDays: 7,
          activeVertical: 'clinic',
          isPlatformAdminTenant: false,
          settingsVersion: 2,
          verticalClinicUi: true,
          clinicDentalMode: true,
          internalPlatformVisible: false,
        },
        verticalConfigs: [],
      })
      .mockResolvedValueOnce({
        id: 'tenant-1',
        name: 'Dental Demo Clinic',
        type: 'business',
        plan: 'enterprise',
        status: 'active',
        ownerId: 'user-1',
        createdAt: '2026-04-01T10:00:00.000Z',
        activeVertical: 'fisio',
        isPlatformAdminTenant: false,
        userCount: 4,
        settings: {
          timezone: 'Europe/Madrid',
          defaultHITL: false,
          logRetentionDays: 30,
          memoryRetentionDays: 7,
          activeVertical: 'fisio',
          isPlatformAdminTenant: false,
          settingsVersion: 2,
          verticalClinicUi: true,
          clinicDentalMode: true,
          internalPlatformVisible: false,
        },
        verticalConfigs: [],
      });

    const service = new AdminService(repository as never, dependencies as never);
    const tenant = await service.changeTenantVertical({
      tenantId: 'tenant-1',
      activeVertical: 'fisio',
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
    });

    expect(repository.updateTenantActiveVertical).toHaveBeenCalledWith('tenant-1', 'fisio');
    expect(repository.ensureTenantVerticalConfig).toHaveBeenCalledWith('tenant-1', 'fisio');
    expect(dependencies.recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-admin',
        actorTenantId: 'tenant-admin',
        targetTenantId: 'tenant-1',
        action: 'admin.tenant.vertical_changed',
        details: {
          oldVertical: 'clinic',
          newVertical: 'fisio',
        },
      })
    );
    expect(tenant.activeVertical).toBe('fisio');
  });

  it('changes the tenant status and audits the change', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.getTenantDetail
      .mockResolvedValueOnce({
        id: 'tenant-1',
        name: 'Dental Demo Clinic',
        type: 'business',
        plan: 'enterprise',
        status: 'active',
        ownerId: 'user-1',
        createdAt: '2026-04-01T10:00:00.000Z',
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        userCount: 4,
        settings: {
          timezone: 'Europe/Madrid',
          defaultHITL: false,
          logRetentionDays: 30,
          memoryRetentionDays: 7,
          activeVertical: 'clinic',
          isPlatformAdminTenant: false,
          settingsVersion: 2,
          verticalClinicUi: true,
          clinicDentalMode: true,
          internalPlatformVisible: false,
        },
        verticalConfigs: [],
      })
      .mockResolvedValueOnce({
        id: 'tenant-1',
        name: 'Dental Demo Clinic',
        type: 'business',
        plan: 'enterprise',
        status: 'frozen',
        ownerId: 'user-1',
        createdAt: '2026-04-01T10:00:00.000Z',
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        userCount: 4,
        settings: {
          timezone: 'Europe/Madrid',
          defaultHITL: false,
          logRetentionDays: 30,
          memoryRetentionDays: 7,
          activeVertical: 'clinic',
          isPlatformAdminTenant: false,
          settingsVersion: 2,
          verticalClinicUi: true,
          clinicDentalMode: true,
          internalPlatformVisible: false,
        },
        verticalConfigs: [],
      });

    const service = new AdminService(repository as never, dependencies as never);
    const tenant = await service.changeTenantStatus({
      tenantId: 'tenant-1',
      body: {
        status: 'frozen',
      },
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
    });

    expect(repository.updateTenantStatus).toHaveBeenCalledWith('tenant-1', 'frozen');
    expect(dependencies.recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.tenant.status_changed',
        details: {
          oldStatus: 'active',
          newStatus: 'frozen',
        },
      })
    );
    expect(tenant.status).toBe('frozen');
  });

  it('creates a new global user, membership, activation payload, and audit event', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.findUserByEmail.mockResolvedValue(null);
    repository.createUser.mockResolvedValue({
      id: 'user-new',
      email: 'new@clinic.test',
      name: 'New User',
      passwordHash: null,
    });
    repository.getMembership.mockResolvedValue(null);
    repository.createMembership.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'user-new',
      role: 'operator',
    });
    repository.getTenantUser.mockResolvedValue({
      userId: 'user-new',
      membershipId: 'membership-1',
      tenantId: 'tenant-1',
      email: 'new@clinic.test',
      name: 'New User',
      role: 'operator',
      hasPassword: false,
      joinedAt: '2026-04-13T10:00:00.000Z',
      lastActiveAt: '2026-04-13T10:00:00.000Z',
    });
    dependencies.issuePasswordResetToken.mockResolvedValue({
      token: 'reset-token',
      link: 'https://app.test/reset-password?token=reset-token',
      expiresAt: new Date('2026-04-13T11:00:00.000Z'),
    });
    dependencies.sendUserActivationEmail.mockResolvedValue({
      delivery: 'logged',
    });

    const service = new AdminService(repository as never, dependencies as never);
    const response = await service.createTenantUser({
      tenantId: 'tenant-1',
      body: {
        email: 'new@clinic.test',
        name: 'New User',
        role: 'operator',
      },
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
    });

    expect(repository.createUser).toHaveBeenCalledWith({
      email: 'new@clinic.test',
      name: 'New User',
    });
    expect(repository.createMembership).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-new',
      role: 'operator',
    });
    expect(response.activation).toEqual({
      token: 'reset-token',
      link: 'https://app.test/reset-password?token=reset-token',
      expiresAt: '2026-04-13T11:00:00.000Z',
    });
    expect(dependencies.sendUserActivationEmail).toHaveBeenCalledWith({
      email: 'new@clinic.test',
      name: 'New User',
      link: 'https://app.test/reset-password?token=reset-token',
      expiresAt: new Date('2026-04-13T11:00:00.000Z'),
    });
    expect(dependencies.recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.created',
        details: expect.objectContaining({
          targetUserId: 'user-new',
          membershipId: 'membership-1',
          createdGlobalUser: true,
        }),
      })
    );
  });

  it('upserts an existing membership role and audits the role change', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.findUserByEmail.mockResolvedValue({
      id: 'user-existing',
      email: 'existing@clinic.test',
      name: 'Existing User',
      passwordHash: 'hashed',
    });
    repository.getMembership.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'user-existing',
      role: 'viewer',
    });
    repository.updateMembershipRole.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'user-existing',
      role: 'admin',
    });
    repository.getTenantUser.mockResolvedValue({
      userId: 'user-existing',
      membershipId: 'membership-1',
      tenantId: 'tenant-1',
      email: 'existing@clinic.test',
      name: 'Existing User',
      role: 'admin',
      hasPassword: true,
      joinedAt: '2026-04-13T10:00:00.000Z',
      lastActiveAt: '2026-04-13T10:00:00.000Z',
    });

    const service = new AdminService(repository as never, dependencies as never);
    const response = await service.createTenantUser({
      tenantId: 'tenant-1',
      body: {
        email: 'existing@clinic.test',
        role: 'admin',
      },
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
    });

    expect(repository.createUser).not.toHaveBeenCalled();
    expect(repository.updateMembershipRole).toHaveBeenCalledWith('membership-1', 'admin');
    expect(response.activation).toBeUndefined();
    expect(dependencies.recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.role_changed',
        details: expect.objectContaining({
          oldRole: 'viewer',
          newRole: 'admin',
        }),
      })
    );
  });

  it('blocks demoting the last owner in a tenant', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.getMembership.mockResolvedValue({
      id: 'membership-owner',
      tenantId: 'tenant-1',
      userId: 'user-owner',
      role: 'owner',
    });
    repository.getUserById.mockResolvedValue({
      id: 'user-owner',
      email: 'owner@example.com',
      name: 'Owner',
    });
    repository.countOwners.mockResolvedValue(1);

    const service = new AdminService(repository as never, dependencies as never);

    await expect(
      service.updateTenantUser({
        tenantId: 'tenant-1',
        userId: 'user-owner',
        body: {
          role: 'admin',
        },
        actorUserId: 'user-admin',
        actorTenantId: 'tenant-admin',
      })
    ).rejects.toMatchObject({
      message: 'A tenant must keep at least one owner',
      statusCode: 409,
    });
  });

  it('deletes only the tenant membership and audits the removal', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.getMembership.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'user-2',
      role: 'operator',
    });

    const service = new AdminService(repository as never, dependencies as never);
    const response = await service.deleteTenantUser({
      tenantId: 'tenant-1',
      userId: 'user-2',
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
    });

    expect(repository.deleteMembership).toHaveBeenCalledWith('membership-1');
    expect(response).toEqual({ success: true });
    expect(dependencies.recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.deleted',
        details: expect.objectContaining({
          targetUserId: 'user-2',
          membershipId: 'membership-1',
        }),
      })
    );
  });

  it('starts impersonation with an opaque session cookie and audit trail', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    dependencies.now.mockReturnValue(now);
    repository.getTenantDetail.mockResolvedValue({
      id: 'tenant-1',
      name: 'Dental Demo Clinic',
      type: 'business',
      plan: 'enterprise',
      status: 'active',
      ownerId: 'user-1',
      createdAt: '2026-04-01T10:00:00.000Z',
      activeVertical: 'clinic',
      isPlatformAdminTenant: false,
      userCount: 4,
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        settingsVersion: 2,
        verticalClinicUi: true,
        clinicDentalMode: true,
        internalPlatformVisible: false,
      },
      verticalConfigs: [],
    });
    repository.getUserById
      .mockResolvedValueOnce({
        id: 'user-target',
        email: 'target@example.com',
        name: 'Target',
      })
      .mockResolvedValueOnce({
        id: 'user-admin',
        email: 'admin@example.com',
        name: 'Admin',
      });
    repository.getMembership.mockResolvedValue({
      id: 'membership-target',
      tenantId: 'tenant-1',
      userId: 'user-target',
      role: 'operator',
    });
    repository.createImpersonationSession.mockResolvedValue({
      id: 'session-1',
      expiresAt: new Date('2026-04-13T10:30:00.000Z'),
    });
    dependencies.createAuthSession.mockResolvedValue({
      session: {
        id: 'auth-session-1',
        expiresAt: new Date('2026-04-13T10:30:00.000Z'),
      },
      token: 'opaque-session-token',
    });

    const service = new AdminService(repository as never, dependencies as never);
    const response = await service.startImpersonation({
      tenantId: 'tenant-1',
      body: {
        targetUserId: 'user-target',
        reason: 'Support debugging',
      },
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
    });

    expect(repository.createImpersonationSession).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-admin',
        actorTenantId: 'tenant-admin',
        targetUserId: 'user-target',
        targetTenantId: 'tenant-1',
      })
    );
    expect(response).toEqual({
      sessionId: 'session-1',
      expiresAt: '2026-04-13T10:30:00.000Z',
      cookieSession: {
        token: 'opaque-session-token',
        expiresAt: new Date('2026-04-13T10:30:00.000Z'),
      },
    });
    expect(dependencies.recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.impersonation.started',
      })
    );
  });

  it('blocks impersonation when the tenant is frozen', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.getTenantDetail.mockResolvedValue({
      id: 'tenant-1',
      name: 'Frozen Clinic',
      type: 'business',
      plan: 'enterprise',
      status: 'frozen',
      ownerId: 'user-1',
      createdAt: '2026-04-01T10:00:00.000Z',
      activeVertical: 'clinic',
      isPlatformAdminTenant: false,
      userCount: 4,
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        settingsVersion: 2,
        verticalClinicUi: true,
        clinicDentalMode: true,
        internalPlatformVisible: false,
      },
      verticalConfigs: [],
    });

    const service = new AdminService(repository as never, dependencies as never);

    await expect(
      service.startImpersonation({
        tenantId: 'tenant-1',
        body: {
          targetUserId: 'user-target',
        },
        actorUserId: 'user-admin',
        actorTenantId: 'tenant-admin',
      })
    ).rejects.toMatchObject({
      message: 'Frozen tenants cannot be impersonated',
      statusCode: 409,
    });
  });

  it('stops impersonation by restoring a fresh actor session', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    dependencies.now.mockReturnValue(now);
    repository.getImpersonationSession.mockResolvedValue({
      id: 'session-1',
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
      targetUserId: 'user-target',
      targetTenantId: 'tenant-1',
      expiresAt: new Date('2026-04-13T10:30:00.000Z'),
      endedAt: null,
    });
    repository.getUserById.mockResolvedValue({
      id: 'user-admin',
      email: 'admin@example.com',
      name: 'Admin',
    });
    dependencies.createAuthSession.mockResolvedValue({
      session: {
        id: 'restored-session-1',
        expiresAt: new Date('2026-04-20T10:00:00.000Z'),
      },
      token: 'restored-opaque-token',
    });

    const service = new AdminService(repository as never, dependencies as never);
    const response = await service.stopImpersonation({
      body: {},
      authSessionId: 'auth-session-1',
      authContext: {
        userId: 'user-target',
        email: 'target@example.com',
        isImpersonation: true,
        impersonationSessionId: 'session-1',
        actorUserId: 'user-admin',
        actorTenantId: 'tenant-admin',
        targetUserId: 'user-target',
        targetTenantId: 'tenant-1',
      },
    });

    expect(repository.endImpersonationSession).toHaveBeenCalledWith('session-1', now);
    expect(dependencies.revokeAuthSessionById).toHaveBeenCalledWith('auth-session-1', now);
    expect(response).toEqual({
      sessionId: 'restored-session-1',
      endedAt: '2026-04-13T10:00:00.000Z',
      cookieSession: {
        token: 'restored-opaque-token',
        expiresAt: new Date('2026-04-20T10:00:00.000Z'),
      },
    });
    expect(dependencies.recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.impersonation.stopped',
      })
    );
  });

  it('rejects expired impersonation sessions on stop', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    dependencies.now.mockReturnValue(new Date('2026-04-13T10:40:00.000Z'));
    repository.getImpersonationSession.mockResolvedValue({
      id: 'session-1',
      actorUserId: 'user-admin',
      actorTenantId: 'tenant-admin',
      targetUserId: 'user-target',
      targetTenantId: 'tenant-1',
      expiresAt: new Date('2026-04-13T10:30:00.000Z'),
      endedAt: null,
    });

    const service = new AdminService(repository as never, dependencies as never);

    await expect(
      service.stopImpersonation({
        body: {},
        authSessionId: 'auth-session-1',
        authContext: {
          userId: 'user-target',
          email: 'target@example.com',
          isImpersonation: true,
          impersonationSessionId: 'session-1',
          actorUserId: 'user-admin',
          actorTenantId: 'tenant-admin',
          targetUserId: 'user-target',
          targetTenantId: 'tenant-1',
        },
      })
    ).rejects.toMatchObject({
      message: 'Impersonation session has expired',
      statusCode: 409,
    });
  });

  it('updateTenantEnabledVerticals rejects dropping the active vertical', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    repository.getTenantDetail.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      type: 'business',
      plan: 'pro',
      status: 'active',
      ownerId: 'user-1',
      createdAt: '2026-04-01T10:00:00.000Z',
      activeVertical: 'clinic',
      isPlatformAdminTenant: false,
      userCount: 4,
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        settingsVersion: 2,
        verticalClinicUi: true,
        clinicDentalMode: true,
        internalPlatformVisible: false,
      },
      verticalConfigs: [],
    });

    const service = new AdminService(repository as never, dependencies as never);

    await expect(
      service.updateTenantEnabledVerticals({
        tenantId: 'tenant-1',
        enabled: ['fisio'],
        actorUserId: 'actor',
        actorTenantId: 'admin',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('active vertical'),
      statusCode: 409,
    });

    expect(repository.setTenantEnabledVerticals).not.toHaveBeenCalled();
  });

  it('updateTenantEnabledVerticals short-circuits when the list did not change', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    const existing = {
      id: 'tenant-1',
      name: 'Acme',
      type: 'business',
      plan: 'pro',
      status: 'active',
      ownerId: 'user-1',
      createdAt: '2026-04-01T10:00:00.000Z',
      activeVertical: 'clinic',
      isPlatformAdminTenant: false,
      userCount: 4,
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        settingsVersion: 2,
        verticalClinicUi: true,
        clinicDentalMode: true,
        internalPlatformVisible: false,
      },
      verticalConfigs: [],
    };
    repository.getTenantDetail.mockResolvedValue(existing);
    // Repository already reports the same list we're about to set — the
    // service should return early without hitting the write path or audit
    // log, keeping admin actions idempotent.
    repository.listTenantEnabledVerticals.mockResolvedValue(['clinic', 'fisio']);

    const service = new AdminService(repository as never, dependencies as never);

    const result = await service.updateTenantEnabledVerticals({
      tenantId: 'tenant-1',
      enabled: ['fisio', 'clinic'],
      actorUserId: 'actor',
      actorTenantId: 'admin',
    });

    expect(result).toBe(existing);
    expect(repository.setTenantEnabledVerticals).not.toHaveBeenCalled();
    expect(dependencies.recordAdminAuditEvent).not.toHaveBeenCalled();
  });

  it('returns null from getTenantFeatureResolution when the tenant does not exist', async () => {
    const repository = createRepositoryMock();
    const dependencies = createDependenciesMock();
    const clinicExperienceRepository = { loadContext: vi.fn().mockResolvedValue(null) };
    const featureFlagService = {
      resolve: vi.fn(),
      resolvePlanEntitlements: vi.fn(),
    };

    const service = new AdminService(
      repository as never,
      dependencies as never,
      clinicExperienceRepository as never,
      featureFlagService as never
    );

    const result = await service.getTenantFeatureResolution('missing-tenant');

    expect(result).toBeNull();
    expect(featureFlagService.resolve).not.toHaveBeenCalled();
    expect(featureFlagService.resolvePlanEntitlements).not.toHaveBeenCalled();
  });
});
