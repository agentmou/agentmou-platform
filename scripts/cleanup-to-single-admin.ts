#!/usr/bin/env tsx

/**
 * Cleans all tenants and users from the database except the specified admin.
 *
 * Usage:
 *   DATABASE_URL=postgres://... ADMIN_EMAIL=timbrandtlopez@gmail.com pnpm tsx scripts/cleanup-to-single-admin.ts
 *
 * The script:
 *   1. Finds or creates the admin user by ADMIN_EMAIL.
 *   2. Ensures the admin has a platform-admin tenant (activeVertical=internal, isPlatformAdminTenant=true).
 *   3. Deletes all other tenants, memberships, users, and dependent data.
 *   4. Re-runs seed to populate demo data owned by the admin.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, ne, notInArray, sql } from 'drizzle-orm';
import * as schema from '../packages/db/src/schema.ts';
import { getDatabaseUrl } from '../packages/db/src/config.ts';

const DATABASE_URL = getDatabaseUrl();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'timbrandtlopez@gmail.com';
const DRY_RUN = process.env.DRY_RUN === '1';

function print(msg: string) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  print(`Cleanup to single admin: ${ADMIN_EMAIL}`);
  print(`Database: ${DATABASE_URL.replace(/\/\/[^@]+@/, '//***@')}`);
  if (DRY_RUN) print('DRY RUN — no data will be deleted');
  print('');

  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  const [adminUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .limit(1);

  if (!adminUser) {
    print(`Admin user ${ADMIN_EMAIL} not found. It will be created on next seed.`);
    print('Proceeding with full wipe...');
  } else {
    print(`Admin user found: ${adminUser.id} (${adminUser.email})`);
  }

  const allTenants = await db
    .select({ id: schema.tenants.id, name: schema.tenants.name })
    .from(schema.tenants);
  const allUsers = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users);

  print(`\nCurrent state:`);
  print(`  Tenants: ${allTenants.length}`);
  for (const t of allTenants) print(`    - ${t.name} (${t.id})`);
  print(`  Users: ${allUsers.length}`);
  for (const u of allUsers) print(`    - ${u.email} (${u.id})`);

  if (DRY_RUN) {
    print('\nDRY RUN complete. Set DRY_RUN=0 or remove DRY_RUN to execute.');
    await client.end();
    return;
  }

  print('\nDeleting all tenant-scoped data...');

  const tenantScopedTables = [
    schema.reactivationRecipients,
    schema.reactivationCampaigns,
    schema.gapOutreachAttempts,
    schema.gapOpportunities,
    schema.waitlistRequests,
    schema.confirmationRequests,
    schema.reminderJobs,
    schema.appointmentEvents,
    schema.appointments,
    schema.intakeFormSubmissions,
    schema.intakeFormTemplates,
    schema.conversationMessages,
    schema.callSessions,
    schema.conversationThreads,
    schema.patientIdentities,
    schema.patients,
    schema.clinicServices,
    schema.clinicLocations,
    schema.clinicChannels,
    schema.clinicProfiles,
    schema.practitioners,
    schema.tenantModules,
    schema.tenantVerticalConfigs,
    schema.connectorAccounts,
    schema.memberships,
  ];

  for (const table of tenantScopedTables) {
    const result = await db.delete(table).returning({ id: sql<string>`id` });
    if (result.length > 0) {
      const tableName = Object.entries(schema).find(([, v]) => v === table)?.[0] ?? 'unknown';
      print(`  Deleted ${result.length} rows from ${tableName}`);
    }
  }

  print('Deleting all tenants...');
  const deletedTenants = await db.delete(schema.tenants).returning({ id: schema.tenants.id });
  print(`  Deleted ${deletedTenants.length} tenants`);

  print('Deleting auth sessions...');
  await db.execute(sql`DELETE FROM admin_impersonation_sessions`);
  await db.execute(sql`DELETE FROM auth_sessions`);
  await db.execute(sql`DELETE FROM password_reset_tokens`);

  if (adminUser) {
    print(`Deleting all users except admin (${ADMIN_EMAIL})...`);
    const deletedUsers = await db
      .delete(schema.users)
      .where(ne(schema.users.id, adminUser.id))
      .returning({ id: schema.users.id });
    print(`  Deleted ${deletedUsers.length} users`);
  } else {
    print('Deleting all users...');
    const deletedUsers = await db.delete(schema.users).returning({ id: schema.users.id });
    print(`  Deleted ${deletedUsers.length} users`);
  }

  const remainingUsers = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users);
  const remainingTenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);
  print(`\nFinal state:`);
  print(`  Users: ${remainingUsers.length}`);
  for (const u of remainingUsers) print(`    - ${u.email} (${u.id})`);
  print(`  Tenants: ${remainingTenants.length}`);
  print('\nCleanup complete. Run `pnpm db:seed` to repopulate demo data.');

  await client.end();
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
