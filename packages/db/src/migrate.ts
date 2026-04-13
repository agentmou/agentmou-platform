import { fileURLToPath } from 'node:url';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';

import { getDatabaseUrl } from './config';

const DATABASE_URL = getDatabaseUrl();
const MIGRATIONS_SCHEMA = 'drizzle';
const MIGRATIONS_TABLE = '__drizzle_migrations';
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

interface MigrationEntry {
  sql: string[];
  folderMillis: number;
  hash: string;
}

function print(message: string) {
  process.stdout.write(`${message}\n`);
}

async function migrate() {
  const client = postgres(DATABASE_URL, { max: 1 });

  try {
    const migrations = readMigrationFiles({
      migrationsFolder: MIGRATIONS_FOLDER,
    }) as MigrationEntry[];

    await client.unsafe(`create schema if not exists "${MIGRATIONS_SCHEMA}"`);
    await client.unsafe(`
      create table if not exists "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}" (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `);

    const dbMigrations = await client.unsafe<
      {
        id: number;
        hash: string;
        created_at: string | number;
      }[]
    >(
      `select id, hash, created_at
         from "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}"
        order by created_at desc
        limit 1`
    );
    const lastDbMigration = dbMigrations[0];

    let applied = 0;

    for (const migration of migrations) {
      if (lastDbMigration && Number(lastDbMigration.created_at) >= migration.folderMillis) {
        continue;
      }

      for (const statement of migration.sql) {
        if (statement.trim().length === 0) {
          continue;
        }
        await client.unsafe(statement);
      }

      await client.unsafe(
        `insert into "${MIGRATIONS_SCHEMA}"."${MIGRATIONS_TABLE}" ("hash", "created_at")
         values ($1, $2)`,
        [migration.hash, migration.folderMillis]
      );

      applied += 1;
    }

    if (applied === 0) {
      print('No pending migrations.');
      return;
    }

    print(`Applied ${applied} migration(s).`);
  } finally {
    await client.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
