import { afterEach, describe, expect, it } from 'vitest';

import { getApiConfig } from './config.js';

describe('getApiConfig', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalMarketingPublicBaseUrl = process.env.MARKETING_PUBLIC_BASE_URL;
  const originalAppPublicBaseUrl = process.env.APP_PUBLIC_BASE_URL;
  const originalApiPublicBaseUrl = process.env.API_PUBLIC_BASE_URL;
  const originalAuthWebOriginAllowlist = process.env.AUTH_WEB_ORIGIN_ALLOWLIST;
  const originalGoogleOauthRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const originalMicrosoftOauthRedirectUri = process.env.MICROSOFT_OAUTH_REDIRECT_URI;
  const originalGoogleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_ORIGIN = originalCorsOrigin;
    process.env.MARKETING_PUBLIC_BASE_URL = originalMarketingPublicBaseUrl;
    process.env.APP_PUBLIC_BASE_URL = originalAppPublicBaseUrl;
    process.env.API_PUBLIC_BASE_URL = originalApiPublicBaseUrl;
    process.env.AUTH_WEB_ORIGIN_ALLOWLIST = originalAuthWebOriginAllowlist;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = originalGoogleOauthRedirectUri;
    process.env.MICROSOFT_OAUTH_REDIRECT_URI = originalMicrosoftOauthRedirectUri;
    process.env.GOOGLE_REDIRECT_URI = originalGoogleRedirectUri;
  });

  it('exposes the renamed public origin fields', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://app.agentmou.io';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io/';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io/';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io/';
    process.env.AUTH_WEB_ORIGIN_ALLOWLIST = 'https://app.agentmou.io';
    process.env.GOOGLE_OAUTH_REDIRECT_URI =
      'https://api.agentmou.io/api/v1/auth/oauth/google/callback';
    process.env.MICROSOFT_OAUTH_REDIRECT_URI =
      'https://api.agentmou.io/api/v1/auth/oauth/microsoft/callback';
    process.env.GOOGLE_REDIRECT_URI = 'https://api.agentmou.io/api/v1/oauth/callback';

    expect(getApiConfig()).toMatchObject({
      corsOrigin: 'https://app.agentmou.io',
      marketingPublicBaseUrl: 'https://agentmou.io',
      appPublicBaseUrl: 'https://app.agentmou.io',
      apiPublicBaseUrl: 'https://api.agentmou.io',
    });
  });

  it('rejects a production config when CORS_ORIGIN does not match the app origin', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://agentmou.io';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io';
    process.env.AUTH_WEB_ORIGIN_ALLOWLIST = 'https://app.agentmou.io';

    expect(() => getApiConfig()).toThrow(
      'CORS_ORIGIN must match APP_PUBLIC_BASE_URL origin in production'
    );
  });

  it('rejects a production config when the app origin is missing from the auth allowlist', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://app.agentmou.io';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io';
    process.env.AUTH_WEB_ORIGIN_ALLOWLIST = 'https://agentmou.io';

    expect(() => getApiConfig()).toThrow(
      'AUTH_WEB_ORIGIN_ALLOWLIST must include APP_PUBLIC_BASE_URL origin in production'
    );
  });

  it('rejects a production config when oauth callbacks do not use the api origin', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://app.agentmou.io';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io';
    process.env.AUTH_WEB_ORIGIN_ALLOWLIST = 'https://app.agentmou.io';
    process.env.GOOGLE_OAUTH_REDIRECT_URI =
      'https://auth.agentmou.io/api/v1/auth/oauth/google/callback';

    expect(() => getApiConfig()).toThrow(
      'GOOGLE_OAUTH_REDIRECT_URI must use API_PUBLIC_BASE_URL origin in production'
    );
  });
});
