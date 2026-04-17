import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy } from './proxy';

describe('app proxy auth gate', () => {
  const originalMarketingBaseUrl = process.env.MARKETING_PUBLIC_BASE_URL;
  const originalAppBaseUrl = process.env.APP_PUBLIC_BASE_URL;
  const originalApiBaseUrl = process.env.API_PUBLIC_BASE_URL;

  beforeEach(() => {
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io';
  });

  afterEach(() => {
    process.env.MARKETING_PUBLIC_BASE_URL = originalMarketingBaseUrl;
    process.env.APP_PUBLIC_BASE_URL = originalAppBaseUrl;
    process.env.API_PUBLIC_BASE_URL = originalApiBaseUrl;
  });

  it('redirects auth routes on the marketing host to the app host', () => {
    const request = new NextRequest(
      'https://agentmou.io/login?redirect=%2Fapp%2Ftenant-1%2Fdashboard'
    );
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://app.agentmou.io/login?redirect=%2Fapp%2Ftenant-1%2Fdashboard'
    );
  });

  it('redirects marketing routes on the app host back to the marketing host', () => {
    const request = new NextRequest('https://app.agentmou.io/pricing?plan=growth');
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://agentmou.io/pricing?plan=growth');
  });

  it('redirects protected app routes to /login without the opaque session cookie', () => {
    const request = new NextRequest('https://app.agentmou.io/app/tenant-1/dashboard');
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://app.agentmou.io/login?redirect=%2Fapp%2Ftenant-1%2Fdashboard'
    );
  });

  it('redirects protected app routes on the marketing host before applying the auth gate', () => {
    const request = new NextRequest('https://agentmou.io/app/tenant-1/dashboard?tab=inbox');
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://app.agentmou.io/app/tenant-1/dashboard?tab=inbox'
    );
  });

  it('lets authenticated app requests through when agentmou-session is present', () => {
    const request = new NextRequest('https://app.agentmou.io/app/tenant-1/dashboard', {
      headers: {
        cookie: 'agentmou-session=opaque-cookie-token',
      },
    });
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not interfere with internal next assets or api routes', () => {
    const assetRequest = new NextRequest('https://agentmou.io/_next/static/chunks/app.js');
    const assetResponse = proxy(assetRequest);
    expect(assetResponse.status).toBe(200);

    const apiRequest = new NextRequest('https://agentmou.io/api/contact-sales');
    const apiResponse = proxy(apiRequest);
    expect(apiResponse.status).toBe(200);

    const iconRequest = new NextRequest('https://agentmou.io/isotipo_agentmou.svg');
    const iconResponse = proxy(iconRequest);
    expect(iconResponse.status).toBe(200);
  });

  it('passes /logout through without touching cookies or canonical host logic', () => {
    const withCookie = new NextRequest('https://app.agentmou.io/logout', {
      headers: { cookie: 'agentmou-session=opaque-cookie-token' },
    });
    expect(proxy(withCookie).status).toBe(200);

    const withoutCookie = new NextRequest('https://app.agentmou.io/logout');
    expect(proxy(withoutCookie).status).toBe(200);
  });

  it('redirects a stale-cookie /app request to /login when the cookie is missing', () => {
    // Regression guard: after the session cookie is cleared, any subsequent
    // /app request must land on /login rather than looping through /app.
    const request = new NextRequest('https://app.agentmou.io/app/tenant-1/dashboard');
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://app.agentmou.io/login?redirect=%2Fapp%2Ftenant-1%2Fdashboard'
    );
  });
});
