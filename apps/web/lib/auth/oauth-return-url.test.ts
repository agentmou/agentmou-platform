import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildOAuthReturnUrl } from './oauth-return-url';

describe('buildOAuthReturnUrl', () => {
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

  it('always targets the canonical app callback host', () => {
    expect(buildOAuthReturnUrl(null)).toBe('https://app.agentmou.io/auth/callback');
  });

  it('preserves the app redirect target inside the callback url', () => {
    expect(buildOAuthReturnUrl('/app/demo-workspace/dashboard')).toBe(
      'https://app.agentmou.io/auth/callback?redirect=%2Fapp%2Fdemo-workspace%2Fdashboard'
    );
  });
});
