import { resolvePublicOrigins } from '@agentmou/contracts';

export interface ApiConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: string;
  marketingPublicBaseUrl: string;
  appPublicBaseUrl: string;
  apiPublicBaseUrl: string;
  reflagSdkKey?: string;
  reflagEnvironment: string;
  reflagBaseUrl?: string;
  reflagLocalOverridesJson?: string;
}

function parsePort(value: string | undefined, fallback: number) {
  const port = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, received ${value ?? ''}`);
  }

  return port;
}

function requireCorsOrigin() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'http://localhost:3000';
  }

  throw new Error('CORS_ORIGIN must be set');
}

function normalizeOrigin(value: string, envName: string) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${envName} must be a valid absolute URL`);
  }
}

function parseOriginAllowlist(raw: string | undefined) {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) =>
      normalizeOrigin(
        value.includes('://') ? value : `https://${value}`,
        'AUTH_WEB_ORIGIN_ALLOWLIST'
      )
    );
}

function validateProductionPublicOriginConfig(params: {
  nodeEnv: string | undefined;
  corsOrigin: string;
  appPublicBaseUrl: string;
  apiPublicBaseUrl: string;
}) {
  if (params.nodeEnv !== 'production') {
    return;
  }

  const appOrigin = normalizeOrigin(params.appPublicBaseUrl, 'APP_PUBLIC_BASE_URL');
  const apiOrigin = normalizeOrigin(params.apiPublicBaseUrl, 'API_PUBLIC_BASE_URL');
  const corsOrigin = normalizeOrigin(params.corsOrigin, 'CORS_ORIGIN');

  if (corsOrigin !== appOrigin) {
    throw new Error('CORS_ORIGIN must match APP_PUBLIC_BASE_URL origin in production');
  }

  const allowlist = parseOriginAllowlist(process.env.AUTH_WEB_ORIGIN_ALLOWLIST);
  if (!allowlist.includes(appOrigin)) {
    throw new Error(
      'AUTH_WEB_ORIGIN_ALLOWLIST must include APP_PUBLIC_BASE_URL origin in production'
    );
  }

  for (const [envName, value] of [
    ['GOOGLE_OAUTH_REDIRECT_URI', process.env.GOOGLE_OAUTH_REDIRECT_URI],
    ['MICROSOFT_OAUTH_REDIRECT_URI', process.env.MICROSOFT_OAUTH_REDIRECT_URI],
    ['GOOGLE_REDIRECT_URI', process.env.GOOGLE_REDIRECT_URI],
  ] as const) {
    if (!value?.trim()) {
      continue;
    }

    if (normalizeOrigin(value, envName) !== apiOrigin) {
      throw new Error(`${envName} must use API_PUBLIC_BASE_URL origin in production`);
    }
  }
}

export function getApiConfig(): ApiConfig {
  const publicOrigins = resolvePublicOrigins(
    {
      marketingPublicBaseUrl: process.env.MARKETING_PUBLIC_BASE_URL,
      appPublicBaseUrl: process.env.APP_PUBLIC_BASE_URL,
      apiPublicBaseUrl: process.env.API_PUBLIC_BASE_URL,
    },
    {
      nodeEnv: process.env.NODE_ENV,
    }
  );
  const corsOrigin = requireCorsOrigin();

  validateProductionPublicOriginConfig({
    nodeEnv: process.env.NODE_ENV,
    corsOrigin,
    appPublicBaseUrl: publicOrigins.appPublicBaseUrl,
    apiPublicBaseUrl: publicOrigins.apiPublicBaseUrl,
  });

  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: parsePort(process.env.PORT, 3001),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigin,
    marketingPublicBaseUrl: publicOrigins.marketingPublicBaseUrl,
    appPublicBaseUrl: publicOrigins.appPublicBaseUrl,
    apiPublicBaseUrl: publicOrigins.apiPublicBaseUrl,
    reflagSdkKey: process.env.REFLAG_SDK_KEY,
    reflagEnvironment: process.env.REFLAG_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    reflagBaseUrl: process.env.REFLAG_BASE_URL,
    reflagLocalOverridesJson: process.env.REFLAG_LOCAL_OVERRIDES_JSON,
  };
}
