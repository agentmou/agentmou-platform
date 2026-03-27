const TEST_JWT_SECRET = 'test-jwt-secret';

/**
 * Returns the configured JWT secret or a stable test value in Vitest.
 */
export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'test') {
    return TEST_JWT_SECRET;
  }

  throw new Error('JWT_SECRET must be set');
}
