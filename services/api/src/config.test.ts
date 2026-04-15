import { afterEach, describe, expect, it } from 'vitest';

import { getApiConfig } from './config.js';

describe('getApiConfig', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalMarketingPublicBaseUrl = process.env.MARKETING_PUBLIC_BASE_URL;
  const originalAppPublicBaseUrl = process.env.APP_PUBLIC_BASE_URL;
  const originalApiPublicBaseUrl = process.env.API_PUBLIC_BASE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_ORIGIN = originalCorsOrigin;
    process.env.MARKETING_PUBLIC_BASE_URL = originalMarketingPublicBaseUrl;
    process.env.APP_PUBLIC_BASE_URL = originalAppPublicBaseUrl;
    process.env.API_PUBLIC_BASE_URL = originalApiPublicBaseUrl;
  });

  it('exposes the renamed public origin fields', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://app.agentmou.io';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io/';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io/';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io/';

    expect(getApiConfig()).toMatchObject({
      corsOrigin: 'https://app.agentmou.io',
      marketingPublicBaseUrl: 'https://agentmou.io',
      appPublicBaseUrl: 'https://app.agentmou.io',
      apiPublicBaseUrl: 'https://api.agentmou.io',
    });
  });
});
