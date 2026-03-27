/**
 * Seed script — populates the database with minimal data for local development.
 *
 * Usage:
 *   DATABASE_URL=postgres://agentmou:changeme@localhost:5432/agentmou pnpm db:seed
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { getDatabaseUrl } from './config';

const DATABASE_URL = getDatabaseUrl();

function print(message: string) {
  process.stdout.write(`${message}\n`);
}

async function seed() {
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  print('Seeding database...');

  // 1. User
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'admin@agentmou.dev',
      name: 'Admin User',
      passwordHash: '$2b$10$placeholder_hash_for_dev',
    })
    .onConflictDoNothing({ target: schema.users.email })
    .returning();

  const userId = user?.id;
  if (!userId) {
    print('User already exists, looking up...');
    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, 'admin@agentmou.dev'),
    });
    if (!existing) throw new Error('Failed to create or find seed user');
    await finish(db, existing.id, client);
    return;
  }

  await finish(db, userId, client);
}

async function finish(
  db: ReturnType<typeof drizzle<typeof schema>>,
  userId: string,
  client: ReturnType<typeof postgres>
) {
  // 2. Tenant
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: 'Demo Workspace',
      type: 'business',
      plan: 'pro',
      ownerId: userId,
      settings: {
        timezone: 'America/New_York',
        defaultHITL: true,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
      },
    })
    .returning();

  // 3. Membership
  await db.insert(schema.memberships).values({
    tenantId: tenant.id,
    userId,
    role: 'owner',
  });

  // 4. Connector accounts (disconnected stubs)
  const connectorProviders = ['gmail', 'slack', 'notion'];
  for (const provider of connectorProviders) {
    await db.insert(schema.connectorAccounts).values({
      tenantId: tenant.id,
      provider,
      status: 'disconnected',
      scopes: [],
    });
  }

  print('Seed complete.');
  print(`  User:   ${userId} (admin@agentmou.dev)`);
  print(`  Tenant: ${tenant.id} (${tenant.name})`);

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
