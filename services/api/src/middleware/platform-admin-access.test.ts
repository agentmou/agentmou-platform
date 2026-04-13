import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTenantMembershipContextMock } = vi.hoisted(() => ({
  getTenantMembershipContextMock: vi.fn(),
}));

vi.mock('./platform-admin-access.repository.js', () => ({
  PlatformAdminAccessRepository: vi.fn().mockImplementation(() => ({
    getTenantMembershipContext: getTenantMembershipContextMock,
  })),
}));

async function buildPlatformAdminApp(params?: {
  userId?: string;
  authContext?: FastifyRequest['authContext'];
}) {
  const app = Fastify();

  app.addHook('preHandler', async (request) => {
    request.userId = params?.userId ?? 'user-1';
    request.authContext = params?.authContext;
  });

  const { requirePlatformAdmin } = await import('./platform-admin-access.js');
  app.addHook('preHandler', requirePlatformAdmin);
  app.get('/admin-check', async (request) => ({
    ok: true,
    adminTenantId: request.adminTenantId,
    adminTenantRole: request.adminTenantRole,
  }));
  await app.ready();

  return app;
}

const adminTenantSettings = {
  timezone: 'Europe/Madrid',
  defaultHITL: false,
  logRetentionDays: 30,
  memoryRetentionDays: 7,
  activeVertical: 'internal' as const,
  isPlatformAdminTenant: true,
  settingsVersion: 2,
  verticalClinicUi: false,
  clinicDentalMode: false,
  internalPlatformVisible: true,
};

describe('requirePlatformAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when x-tenant-id is missing', async () => {
    const app = await buildPlatformAdminApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-check',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Missing x-tenant-id header' });

    await app.close();
  });

  it('returns 403 when the actor is not a member of the admin tenant', async () => {
    getTenantMembershipContextMock.mockResolvedValue(null);

    const app = await buildPlatformAdminApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-check',
      headers: {
        'x-tenant-id': 'tenant-admin',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'Platform admin access is restricted' });

    await app.close();
  });

  it('returns 403 when the tenant is not marked as a platform admin tenant', async () => {
    getTenantMembershipContextMock.mockResolvedValue({
      role: 'owner',
      settings: {
        ...adminTenantSettings,
        isPlatformAdminTenant: false,
      },
    });

    const app = await buildPlatformAdminApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-check',
      headers: {
        'x-tenant-id': 'tenant-admin',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'Platform admin access is restricted' });

    await app.close();
  });

  it('returns 403 when the membership role is not allowed', async () => {
    getTenantMembershipContextMock.mockResolvedValue({
      role: 'viewer',
      settings: adminTenantSettings,
    });

    const app = await buildPlatformAdminApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-check',
      headers: {
        'x-tenant-id': 'tenant-admin',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'Platform admin access is restricted' });

    await app.close();
  });

  it('returns 403 for impersonation tokens', async () => {
    const app = await buildPlatformAdminApp({
      authContext: {
        userId: 'user-2',
        email: 'support@example.com',
        isImpersonation: true,
        impersonationSessionId: 'session-1',
        actorUserId: 'user-1',
        actorTenantId: 'tenant-admin',
        targetUserId: 'user-2',
        targetTenantId: 'tenant-target',
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/admin-check',
      headers: {
        'x-tenant-id': 'tenant-admin',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: 'Impersonation sessions cannot access admin endpoints',
    });

    await app.close();
  });

  it('stores the admin tenant context on success', async () => {
    getTenantMembershipContextMock.mockResolvedValue({
      role: 'admin',
      settings: adminTenantSettings,
    });

    const app = await buildPlatformAdminApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-check',
      headers: {
        'x-tenant-id': 'tenant-admin',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      adminTenantId: 'tenant-admin',
      adminTenantRole: 'admin',
    });

    await app.close();
  });
});
