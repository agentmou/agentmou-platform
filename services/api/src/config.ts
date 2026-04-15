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

  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: parsePort(process.env.PORT, 3001),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigin: requireCorsOrigin(),
    marketingPublicBaseUrl: publicOrigins.marketingPublicBaseUrl,
    appPublicBaseUrl: publicOrigins.appPublicBaseUrl,
    apiPublicBaseUrl: publicOrigins.apiPublicBaseUrl,
    reflagSdkKey: process.env.REFLAG_SDK_KEY,
    reflagEnvironment: process.env.REFLAG_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    reflagBaseUrl: process.env.REFLAG_BASE_URL,
    reflagLocalOverridesJson: process.env.REFLAG_LOCAL_OVERRIDES_JSON,
  };
}
