import { describe, expect, it } from 'vitest';

import { getApiUrl, getAppUrl, getMarketingUrl, resolvePublicOrigins } from '../public-origins';

describe('public origin contract', () => {
  it('normalizes trailing slashes before joining paths', () => {
    const origins = resolvePublicOrigins(
      {
        marketingPublicBaseUrl: 'https://agentmou.io/',
        appPublicBaseUrl: 'https://app.agentmou.io/',
        apiPublicBaseUrl: 'https://api.agentmou.io/',
      },
      { nodeEnv: 'production' }
    );

    expect(origins).toEqual({
      marketingPublicBaseUrl: 'https://agentmou.io',
      appPublicBaseUrl: 'https://app.agentmou.io',
      apiPublicBaseUrl: 'https://api.agentmou.io',
    });
    expect(getMarketingUrl(origins, '/pricing')).toBe('https://agentmou.io/pricing');
    expect(getAppUrl(origins, '/login')).toBe('https://app.agentmou.io/login');
    expect(getApiUrl(origins, '/api/v1/public/chat')).toBe(
      'https://api.agentmou.io/api/v1/public/chat'
    );
  });

  it('accepts paths without a leading slash', () => {
    const origins = resolvePublicOrigins({}, { nodeEnv: 'development' });

    expect(getAppUrl(origins, 'app/demo-workspace/dashboard')).toBe(
      'http://localhost:3000/app/demo-workspace/dashboard'
    );
  });

  it('uses local defaults outside production when env values are missing', () => {
    expect(resolvePublicOrigins({}, { nodeEnv: 'test' })).toEqual({
      marketingPublicBaseUrl: 'http://localhost:3000',
      appPublicBaseUrl: 'http://localhost:3000',
      apiPublicBaseUrl: 'http://localhost:3001',
    });
  });

  it('rejects missing origins in production', () => {
    expect(() => resolvePublicOrigins({}, { nodeEnv: 'production' })).toThrow(
      'MARKETING_PUBLIC_BASE_URL must be set in production'
    );
  });

  it('rejects invalid base URLs', () => {
    expect(() =>
      resolvePublicOrigins(
        {
          marketingPublicBaseUrl: 'not-a-url',
          appPublicBaseUrl: 'https://app.agentmou.io',
          apiPublicBaseUrl: 'https://api.agentmou.io',
        },
        { nodeEnv: 'production' }
      )
    ).toThrow('MARKETING_PUBLIC_BASE_URL must be a valid absolute URL');
  });
});
