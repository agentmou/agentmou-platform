import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const originalFetch = globalThis.fetch;

describe('logout route handler', () => {
  const originalMarketingBaseUrl = process.env.MARKETING_PUBLIC_BASE_URL;
  const originalAppBaseUrl = process.env.APP_PUBLIC_BASE_URL;
  const originalApiBaseUrl = process.env.API_PUBLIC_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.MARKETING_PUBLIC_BASE_URL = originalMarketingBaseUrl;
    process.env.APP_PUBLIC_BASE_URL = originalAppBaseUrl;
    process.env.API_PUBLIC_BASE_URL = originalApiBaseUrl;
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('redirects to /login with a cleared session cookie on POST with cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const { POST } = await import('./route');
    const request = new NextRequest('https://app.agentmou.io/logout', {
      method: 'POST',
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://app.agentmou.io/login');
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('agentmou-session=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('Domain=.agentmou.io');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.agentmou.io/api/v1/auth/logout');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).cookie).toBe(
      'agentmou-session=opaque-cookie-token'
    );
  });

  it('redirects to /login without calling the API when no session cookie is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const { POST } = await import('./route');
    const request = new NextRequest('https://app.agentmou.io/logout', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://app.agentmou.io/login');
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('agentmou-session=');
    expect(setCookie).toContain('Max-Age=0');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still clears the cookie and redirects when the API logout call fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    globalThis.fetch = fetchMock as typeof fetch;

    const { POST } = await import('./route');
    const request = new NextRequest('https://app.agentmou.io/logout', {
      method: 'POST',
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://app.agentmou.io/login');
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('agentmou-session=');
    expect(setCookie).toContain('Max-Age=0');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles GET the same as POST for legacy plain links', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const { GET } = await import('./route');
    const request = new NextRequest('https://app.agentmou.io/logout', {
      method: 'GET',
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://app.agentmou.io/login');
  });

  it('omits cookie domain when running against localhost', async () => {
    process.env.MARKETING_PUBLIC_BASE_URL = 'http://localhost:3000';
    process.env.APP_PUBLIC_BASE_URL = 'http://localhost:3000';
    process.env.API_PUBLIC_BASE_URL = 'http://127.0.0.1:3001';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as typeof fetch;

    vi.resetModules();
    const { POST } = await import('./route');
    const request = new NextRequest('http://localhost:3000/logout', {
      method: 'POST',
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).not.toContain('Domain=');
  });
});
