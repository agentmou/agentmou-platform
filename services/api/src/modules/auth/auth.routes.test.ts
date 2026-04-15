import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    register: vi.fn(),
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('./auth.service.js', () => ({
  AuthService: vi.fn().mockImplementation(() => mockService),
}));

vi.mock('./oauth.routes.js', () => ({
  registerB2cOAuthRoutes: vi.fn(),
}));

async function buildAuthRoutesApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);
  const { authRoutes } = await import('./auth.routes.js');
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.ready();

  return app;
}

describe('authRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the opaque session cookie on login', async () => {
    mockService.login.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
      },
      tenants: [],
      session: null,
      cookieSession: {
        token: 'opaque-session-token',
        expiresAt: new Date('2026-04-22T10:00:00.000Z'),
      },
    });

    const app = await buildAuthRoutesApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'owner@example.com',
        password: 'secret123',
        rememberMe: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.login).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'secret123',
      rememberMe: true,
    });
    expect(response.json()).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
      },
      tenants: [],
      session: null,
    });
    expect(String(response.headers['set-cookie'])).toContain('agentmou-session=');
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');

    await app.close();
  }, 10_000);

  it('returns the authenticated user with a null session when not impersonating', async () => {
    mockService.getCurrentUser.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
        tenants: [],
      },
      session: null,
    });

    const app = await buildAuthRoutesApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
        authorization: 'Bearer fallback-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.getCurrentUser).toHaveBeenCalledWith({
      cookieHeader: 'agentmou-session=opaque-cookie-token',
      authorization: 'Bearer fallback-token',
    });
    expect(response.json()).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
        tenants: [],
      },
      session: null,
    });

    await app.close();
  });

  it('returns impersonation session metadata when the session is impersonated', async () => {
    mockService.getCurrentUser.mockResolvedValue({
      user: {
        id: 'user-target',
        email: 'target@example.com',
        name: 'Target User',
        tenants: [],
      },
      session: {
        isImpersonation: true,
        impersonationSessionId: 'session-1',
        actorUserId: 'user-admin',
        actorTenantId: 'tenant-admin',
        targetUserId: 'user-target',
        targetTenantId: 'tenant-clinic',
      },
    });

    const app = await buildAuthRoutesApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        cookie: 'agentmou-session=impersonated-cookie-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      session: {
        isImpersonation: true,
        actorTenantId: 'tenant-admin',
        targetTenantId: 'tenant-clinic',
      },
    });

    await app.close();
  });

  it('revokes the current session and clears the cookie on logout', async () => {
    mockService.logout.mockResolvedValue({ ok: true });

    const app = await buildAuthRoutesApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.logout).toHaveBeenCalledWith({
      cookieHeader: 'agentmou-session=opaque-cookie-token',
    });
    expect(response.json()).toEqual({ ok: true });
    expect(String(response.headers['set-cookie'])).toContain('agentmou-session=');
    expect(String(response.headers['set-cookie'])).toContain('Max-Age=0');

    await app.close();
  });
});
