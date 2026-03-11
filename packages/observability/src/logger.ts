import pino from 'pino';

/**
 * Shared Pino logger configured for readable local development output.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

/**
 * Create a child logger enriched with request, tenant, or trace context.
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
