import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getActiveAuthSessionByTokenMock, verifyTokenMock } = vi.hoisted(() => ({
  getActiveAuthSessionByTokenMock: vi.fn(),
  verifyTokenMock: vi.fn(),
}));

vi.mock('../lib/auth-sessions.js', async () => {
  const actual =
    await vi.importActual<typeof import('../lib/auth-sessions.js')>('../lib/auth-sessions.js');

  return {
    ...actual,
    getActiveAuthSessionByToken: getActiveAuthSessionByTokenMock,
  };
});

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
    authSession: request.authSession,
  }));
  await app.ready();

  return app;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts opaque cookie sessions before checking bearer auth', async () => {
    getActiveAuthSessionByTokenMock.mockResolvedValue({
      session: {
        id: 'session-1',
      },
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
      },
      authContext: {
        userId: 'user-1',
        email: 'owner@example.com',
        sessionId: 'session-1',
        sessionType: 'standard',
        isImpersonation: false,
        impersonationSessionId: null,
        actorUserId: null,
        actorTenantId: null,
        targetUserId: null,
        targetTenantId: null,
      },
    });

    const app = await buildAuthApp();
    const response = await app.inject({
      method: 'GET',
      url: '/auth-check',
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
        authorization: 'Bearer bearer-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(getActiveAuthSessionByTokenMock).toHaveBeenCalledWith('opaque-cookie-token');
    expect(verifyTokenMock).not.toHaveBeenCalled();
    expect(response.json()).toMatchObject({
      userId: 'user-1',
      authContext: {
        sessionType: 'standard',
      },
      authSession: {
        id: 'session-1',
      },
    });

    await app.close();
  }, 10_000);

  it('rejects impersonation restore tokens as bearer auth', async () => {
    getActiveAuthSessionByTokenMock.mockResolvedValue(null);
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
