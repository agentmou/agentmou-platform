import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadContextMock } = vi.hoisted(() => ({
  loadContextMock: vi.fn(),
}));

vi.mock('../modules/clinic-shared/clinic-experience.repository.js', () => ({
  ClinicExperienceRepository: vi.fn().mockImplementation(() => ({
    loadContext: loadContextMock,
  })),
}));

async function buildInternalPlatformApp(role = 'viewer') {
  const app = Fastify();

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & { tenantRole?: string };
    clinicRequest.tenantRole = role;
  });

  const { requireInternalPlatformAccess } = await import('./internal-platform-access.js');
  app.addHook('preHandler', requireInternalPlatformAccess);
  app.get('/tenants/:tenantId/internal-check', async () => ({ ok: true }));
  await app.ready();

  return app;
}

describe('requireInternalPlatformAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 409 when the internal platform is not visible for the tenant', async () => {
    loadContextMock.mockResolvedValue({
      tenantId: 'tenant-1',
      plan: 'enterprise',
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        verticalClinicUi: true,
        clinicDentalMode: true,
        internalPlatformVisible: false,
      },
      profile: null,
      modules: [
        {
          id: 'module-internal',
          tenantId: 'tenant-1',
          moduleKey: 'internal_platform',
          status: 'enabled',
          visibleToClient: false,
          planLevel: 'enterprise',
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
      ],
      channels: [],
    });

    const app = await buildInternalPlatformApp('admin');
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/internal-check',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      code: 'clinic_feature_unavailable',
      reason: 'hidden_internal_only',
      moduleKey: 'internal_platform',
    });

    await app.close();
  });

  it('returns 403 when the user role is not allowed to enter the internal platform', async () => {
    loadContextMock.mockResolvedValue({
      tenantId: 'tenant-1',
      plan: 'enterprise',
      settings: {
        timezone: 'Europe/Madrid',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
        verticalClinicUi: true,
        clinicDentalMode: true,
        internalPlatformVisible: true,
      },
      profile: null,
      modules: [
        {
          id: 'module-internal',
          tenantId: 'tenant-1',
          moduleKey: 'internal_platform',
          status: 'enabled',
          visibleToClient: false,
          planLevel: 'enterprise',
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
        },
      ],
      channels: [],
    });

    const app = await buildInternalPlatformApp('viewer');
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/internal-check',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'Internal platform access is restricted' });

    await app.close();
  });
});
