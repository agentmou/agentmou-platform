import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;

vi.stubGlobal('fetch', fetchMock);

vi.mock('@/lib/runtime/public-origins', () => ({
  getApiUrl: (pathname = '/') => `http://localhost:3001${pathname}`,
}));

describe('auth api client', () => {
  beforeEach(() => {
    globalThis.fetch = fetchMock as typeof fetch;
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('sends login with credentials included so the browser accepts the session cookie', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
        },
        tenants: [],
        session: null,
      }),
    });

    const { loginApi } = await import('./api');
    await loginApi('owner@example.com', 'secret123', true);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'secret123',
        rememberMe: true,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
  });

  it('fetches the current session without constructing an Authorization header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          tenants: [],
        },
        session: null,
      }),
    });

    const { fetchMe } = await import('./api');
    await fetchMe();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/me', {
      headers: {},
      credentials: 'include',
    });
  });

  it('sends forgot-password requests with credentials included', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { forgotPasswordApi } = await import('./api');
    await forgotPasswordApi('owner@example.com');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: 'owner@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
  });

  it('sends reset-password requests with credentials included', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { resetPasswordApi } = await import('./api');
    await resetPasswordApi('reset-token', 'new-password-123');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: 'reset-token',
        password: 'new-password-123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
  });
});
