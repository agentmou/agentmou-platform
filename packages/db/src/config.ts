const TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/agentmou';

function ensureDatabaseUrl(value: string) {
  const parsed = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(
      `DATABASE_URL must use postgres:// or postgresql://, received ${parsed.protocol}`
    );
  }

  return value;
}

/**
 * Returns the configured database URL or a stable test value during Vitest runs.
 */
export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return ensureDatabaseUrl(process.env.DATABASE_URL);
  }

  if (process.env.NODE_ENV === 'test') {
    return ensureDatabaseUrl(TEST_DATABASE_URL);
  }

  throw new Error('DATABASE_URL must be set');
}
