import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://agentmou:changeme@localhost:5432/agentmou';

const client = postgres(DATABASE_URL);

/** Shared Drizzle client used by long-lived services. */
export const db = drizzle(client, { schema });

/** Create a one-off DB client for scripts (seed, tests). */
export function createDb(url?: string) {
  const c = postgres(url || DATABASE_URL, { max: 1 });
  return { db: drizzle(c, { schema }), close: () => c.end() };
}
