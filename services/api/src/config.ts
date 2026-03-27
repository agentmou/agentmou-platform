export interface ApiConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: string;
  webAppBaseUrl: string;
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

function requireWebAppBaseUrl() {
  if (process.env.WEB_APP_BASE_URL) {
    return process.env.WEB_APP_BASE_URL;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'http://localhost:3000';
  }

  throw new Error('WEB_APP_BASE_URL must be set');
}

export function getApiConfig(): ApiConfig {
  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: parsePort(process.env.PORT, 3001),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigin: requireCorsOrigin(),
    webAppBaseUrl: requireWebAppBaseUrl(),
  };
}
