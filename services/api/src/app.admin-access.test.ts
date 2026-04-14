import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

const { requirePlatformAdminMock } = vi.hoisted(() => ({
  requirePlatformAdminMock: vi.fn(),
}));

vi.mock('./middleware/index.js', () => ({
  requireAuth: vi.fn(async (request) => {
    request.userId = 'user-1';
    request.authContext = {
      userId: 'user-1',
      email: 'admin@example.com',
    };
  }),
  requirePlatformAdmin: requirePlatformAdminMock,
  requireTenantAccess: vi.fn(async (request) => {
    request.tenantRole = 'admin';
  }),
  requireInternalPlatformAccess: vi.fn(async () => {}),
}));

vi.mock('./modules/auth/index.js', () => ({
  authRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/admin/index.js', () => ({
  adminImpersonationSessionRoutes: vi.fn(async () => {}),
  adminRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/memberships/index.js', () => ({
  membershipRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/catalog/index.js', () => ({
  catalogRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/installations/index.js', () => ({
  installationRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/connectors/index.js', () => ({
  connectorRoutes: vi.fn(async () => {}),
  oauthCallbackRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/secrets/index.js', () => ({
  secretRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/approvals/index.js', () => ({
  approvalRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/runs/index.js', () => ({
  runRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/usage/index.js', () => ({
  usageRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/billing/index.js', () => ({
  billingRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/security/index.js', () => ({
  securityRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/webhooks/index.js', () => ({
  webhookRoutes: vi.fn(async () => {}),
  stripeWebhookRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/n8n/index.js', () => ({
  n8nRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/public-chat/index.js', () => ({
  publicChatRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/clinic-webhooks/index.js', () => ({
  clinicWebhookRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/clinic-dashboard/index.js', () => ({
  clinicDashboardRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/clinic-profile/index.js', () => ({
  clinicProfileRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/clinic-modules/index.js', () => ({
  clinicModulesRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/clinic-channels/index.js', () => ({
  clinicChannelsRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/patients/index.js', () => ({
  patientRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/conversations/index.js', () => ({
  conversationRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/calls/index.js', () => ({
  callRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/appointments/index.js', () => ({
  appointmentRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/forms/index.js', () => ({
  formRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/follow-up/index.js', () => ({
  followUpRoutes: vi.fn(async () => {}),
}));
vi.mock('./modules/reactivation/index.js', () => ({
  reactivationRoutes: vi.fn(async () => {}),
}));
vi.mock('./routes/zod-validator.js', () => ({
  zodValidatorCompiler: vi.fn(),
}));
vi.mock('./config.js', () => ({
  getApiConfig: vi.fn(() => ({
    logLevel: 'silent',
    corsOrigin: true,
  })),
}));

vi.mock('./modules/tenants/index.js', () => ({
  tenantRoutes: vi.fn(async (fastify) => {
    fastify.get('/', async () => ({ tenants: [] }));
    fastify.get('/:id', async (request: { params: { id: string } }) => ({
      tenantId: request.params.id,
    }));
  }),
}));

vi.mock('./modules/clinic-experience/index.js', () => ({
  clinicExperienceRoutes: vi.fn(async (fastify) => {
    fastify.get(
      '/tenants/:tenantId/experience',
      async (request: { params: { tenantId: string } }) => ({
        tenantId: request.params.tenantId,
        ok: true,
      })
    );
  }),
}));

describe('buildApp admin route composition', () => {
  it('places legacy tenant globals behind the platform admin guard only', async () => {
    requirePlatformAdminMock.mockImplementation(
      async (request: FastifyRequest, reply: FastifyReply) => {
        const tenantId = request.headers['x-tenant-id'];
        if (typeof tenantId !== 'string' || tenantId.length === 0) {
          return reply.status(400).send({ error: 'Missing x-tenant-id header' });
        }

        request.adminTenantId = tenantId;
      }
    );

    const { buildApp } = await import('./app.js');
    const app = buildApp();
    await app.ready();

    const legacyListResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants',
    });
    expect(legacyListResponse.statusCode).toBe(400);
    expect(legacyListResponse.json()).toEqual({ error: 'Missing x-tenant-id header' });

    const tenantExperienceResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants/tenant-1/experience',
    });
    expect(tenantExperienceResponse.statusCode).toBe(200);
    expect(tenantExperienceResponse.json()).toEqual({
      tenantId: 'tenant-1',
      ok: true,
    });

    const legacyListWithHeader = await app.inject({
      method: 'GET',
      url: '/api/v1/tenants',
      headers: {
        'x-tenant-id': 'tenant-admin',
      },
    });
    expect(legacyListWithHeader.statusCode).toBe(200);
    expect(legacyListWithHeader.json()).toEqual({ tenants: [] });

    await app.close();
  }, 10000);
});
