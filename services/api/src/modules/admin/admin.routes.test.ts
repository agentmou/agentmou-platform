import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listTenants: vi.fn(),
    getTenantDetail: vi.fn(),
    changeTenantStatus: vi.fn(),
    changeTenantVertical: vi.fn(),
    listTenantUsers: vi.fn(),
    createTenantUser: vi.fn(),
    updateTenantUser: vi.fn(),
    deleteTenantUser: vi.fn(),
    startImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  },
}));

vi.mock('./admin.service.js', () => ({
  AdminService: vi.fn().mockImplementation(() => mockService),
}));

async function buildAdminRoutesApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);
  app.addHook('preHandler', async (request) => {
    request.userId = '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2';
    request.adminTenantId = '6ad5a85e-1dc1-4ce3-b8df-a6dcf6cc12b1';
    request.authSession = {
      id: 'auth-session-1',
    } as never;
    request.authContext = {
      userId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
      email: 'admin@example.com',
    };
  });

  const { adminRoutes, adminImpersonationSessionRoutes } = await import('./admin.routes.js');
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });
  await app.register(adminImpersonationSessionRoutes, { prefix: '/api/v1/admin' });
  await app.ready();

  return app;
}

describe('adminRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists tenants with parsed filters', async () => {
    mockService.listTenants.mockResolvedValue({
      tenants: [
        {
          id: 'cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
          name: 'Demo Workspace',
          type: 'business',
          plan: 'enterprise',
          status: 'active',
          ownerId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
          createdAt: '2026-04-01T10:00:00.000Z',
          activeVertical: 'internal',
          isPlatformAdminTenant: true,
          userCount: 3,
        },
      ],
      nextCursor: '2026-04-01T10:00:00.000Z::cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
    });

    const app = await buildAdminRoutesApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/tenants?q=demo&limit=20&isPlatformAdminTenant=true',
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.listTenants).toHaveBeenCalledWith({
      q: 'demo',
      limit: 20,
      isPlatformAdminTenant: true,
    });
    expect(response.json()).toMatchObject({
      tenants: [
        {
          name: 'Demo Workspace',
          activeVertical: 'internal',
        },
      ],
    });

    await app.close();
  }, 10_000);

  it('changes a tenant vertical with actor context from the request', async () => {
    mockService.changeTenantVertical.mockResolvedValue({
      id: 'cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
      name: 'Tenant',
      type: 'business',
      plan: 'starter',
      status: 'active',
      ownerId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
      createdAt: '2026-04-01T10:00:00.000Z',
      activeVertical: 'fisio',
      isPlatformAdminTenant: false,
      userCount: 2,
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        activeVertical: 'fisio',
        isPlatformAdminTenant: false,
        settingsVersion: 2,
        verticalClinicUi: false,
        clinicDentalMode: false,
        internalPlatformVisible: false,
      },
      verticalConfigs: [],
    });

    const app = await buildAdminRoutesApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/tenants/cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5/vertical',
      payload: {
        activeVertical: 'fisio',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.changeTenantVertical).toHaveBeenCalledWith({
      tenantId: 'cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
      activeVertical: 'fisio',
      actorUserId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
      actorTenantId: '6ad5a85e-1dc1-4ce3-b8df-a6dcf6cc12b1',
    });

    await app.close();
  });

  it('changes a tenant status with actor context from the request', async () => {
    mockService.changeTenantStatus.mockResolvedValue({
      id: 'cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
      name: 'Tenant',
      type: 'business',
      plan: 'starter',
      status: 'frozen',
      ownerId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
      createdAt: '2026-04-01T10:00:00.000Z',
      activeVertical: 'clinic',
      isPlatformAdminTenant: false,
      userCount: 2,
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

    const app = await buildAdminRoutesApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/tenants/cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5/status',
      payload: {
        status: 'frozen',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.changeTenantStatus).toHaveBeenCalledWith({
      tenantId: 'cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
      body: {
        status: 'frozen',
      },
      actorUserId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
      actorTenantId: '6ad5a85e-1dc1-4ce3-b8df-a6dcf6cc12b1',
    });

    await app.close();
  });

  it('creates tenant users and returns the activation payload', async () => {
    mockService.createTenantUser.mockResolvedValue({
      user: {
        userId: '4d659f3b-515b-493f-90fc-84706f5ad4a0',
        membershipId: '1caa1d6c-a95d-49a7-ae26-609f46825fc7',
        tenantId: 'cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
        email: 'new@example.com',
        name: 'New User',
        role: 'operator',
        hasPassword: false,
        joinedAt: '2026-04-13T10:00:00.000Z',
        lastActiveAt: '2026-04-13T10:00:00.000Z',
      },
      activation: {
        token: 'reset-token',
        link: 'https://app.example.com/reset-password?token=reset-token',
        expiresAt: '2026-04-13T11:00:00.000Z',
      },
    });

    const app = await buildAdminRoutesApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/tenants/cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5/users',
      payload: {
        email: 'new@example.com',
        name: 'New User',
        role: 'operator',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(mockService.createTenantUser).toHaveBeenCalledWith({
      tenantId: 'cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
      body: {
        email: 'new@example.com',
        name: 'New User',
        role: 'operator',
      },
      actorUserId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
      actorTenantId: '6ad5a85e-1dc1-4ce3-b8df-a6dcf6cc12b1',
    });
    expect(response.json()).toMatchObject({
      activation: {
        token: 'reset-token',
      },
    });

    await app.close();
  });

  it('stops impersonation using the authenticated impersonation context', async () => {
    mockService.stopImpersonation.mockResolvedValue({
      sessionId: 'restored-session-1',
      endedAt: '2026-04-13T10:00:00.000Z',
      cookieSession: {
        token: 'opaque-cookie-token',
        expiresAt: new Date('2026-04-20T10:00:00.000Z'),
      },
    });

    const app = await buildAdminRoutesApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/impersonation/stop',
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.stopImpersonation).toHaveBeenCalledWith({
      body: {},
      authContext: {
        userId: '0f7d76b0-e149-4bc8-b8ba-7e71938ef6d2',
        email: 'admin@example.com',
      },
      authSessionId: 'auth-session-1',
    });
    expect(String(response.headers['set-cookie'])).toContain('agentmou-session=');

    await app.close();
  });

  it('maps service errors to route responses', async () => {
    mockService.getTenantDetail.mockRejectedValue(
      Object.assign(new Error('tenant not found'), { statusCode: 404 })
    );

    const app = await buildAdminRoutesApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/tenants/cb99d0e2-bab2-4d26-9c84-6ea48dd3f1f5',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'tenant not found' });

    await app.close();
  });
});
