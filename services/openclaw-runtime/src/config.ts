export interface OpenClawRuntimeConfig {
  host: string;
  port: number;
  logLevel: string;
}

function parsePort(value: string | undefined, fallback: number) {
  const port = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, received ${value ?? ''}`);
  }

  return port;
}

export function getOpenClawRuntimeConfig(): OpenClawRuntimeConfig {
  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: parsePort(process.env.PORT, 3003),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
