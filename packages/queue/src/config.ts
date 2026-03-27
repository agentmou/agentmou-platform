const TEST_REDIS_URL = 'redis://127.0.0.1:6379';

/**
 * Returns the BullMQ connection URL and validates the scheme before use.
 */
export function getRedisUrl(): string {
  const value =
    process.env.REDIS_URL
    ?? (process.env.NODE_ENV === 'test' ? TEST_REDIS_URL : undefined);

  if (!value) {
    throw new Error('REDIS_URL must be set');
  }

  const parsed = new URL(value);

  if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
    throw new Error(
      `REDIS_URL must use redis:// or rediss://, received ${parsed.protocol}`,
    );
  }

  return value;
}
