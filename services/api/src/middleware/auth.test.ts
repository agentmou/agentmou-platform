import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyTokenMock } = vi.hoisted(() => ({
  verifyTokenMock: vi.fn(),
}));

vi.mock('@agentmou/auth', () => ({
  verifyToken: verifyTokenMock,
}));

async function buildAuthApp() {
  const app = Fastify();
  const { requireAuth } = await import('./auth.js');

  app.addHook('preHandler', requireAuth);
  app.get('/auth-check', async (request) => ({
    userId: request.userId,
    authContext: request.authContext,
  }));
  await app.ready();

  return app;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects impersonation restore tokens as bearer auth', async () => {
    verifyTokenMock.mockResolvedValue({
      userId: 'user-1',
      email: 'admin@example.com',
      isImpersonationRestore: true,
      impersonationSessionId: 'session-1',
      actorUserId: 'user-1',
      actorTenantId: 'tenant-admin',
      targetUserId: 'user-2',
      targetTenantId: 'tenant-target',
    });

    const app = await buildAuthApp();
    const response = await app.inject({
      method: 'GET',
      url: '/auth-check',
      headers: {
        authorization: 'Bearer restore-token',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Invalid session token' });

    await app.close();
  });
});
