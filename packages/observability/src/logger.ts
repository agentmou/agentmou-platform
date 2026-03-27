import pino from 'pino';

/**
 * Shared Pino logger configured for readable local development output.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: shouldPrettyPrint()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined,
});

/**
 * Create a child logger enriched with request, tenant, or trace context.
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Create a service logger with an optional extra context object.
 */
export function createServiceLogger(service: string, context: Record<string, unknown> = {}) {
  return createChildLogger({ service, ...context });
}

/**
 * Test environments should keep log noise to an absolute minimum.
 */
export function isTestEnvironment() {
  return process.env.NODE_ENV === 'test';
}

function shouldPrettyPrint() {
  return !isTestEnvironment() && process.stdout.isTTY === true;
}
