import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getDatabaseUrl } from './config';

const DATABASE_URL = getDatabaseUrl();

const client = postgres(DATABASE_URL);

/** Shared Drizzle client used by long-lived services. */
export const db = drizzle(client, { schema });

/** Create a one-off DB client for scripts (seed, tests). */
export function createDb(url?: string) {
  const c = postgres(url ?? DATABASE_URL, { max: 1 });
  return { db: drizzle(c, { schema }), close: () => c.end() };
}
