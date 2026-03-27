export interface InternalOpsConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: string;
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

export function getInternalOpsConfig(): InternalOpsConfig {
  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: parsePort(process.env.PORT, 3002),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigin: requireCorsOrigin(),
  };
}
