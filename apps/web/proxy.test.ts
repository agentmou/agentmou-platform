import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { proxy } from './proxy';

describe('app proxy auth gate', () => {
  it('redirects protected app routes to /login without the opaque session cookie', () => {
    const request = new NextRequest('https://app.agentmou.io/app/tenant-1/dashboard');
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://app.agentmou.io/login?redirect=%2Fapp%2Ftenant-1%2Fdashboard'
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
});
