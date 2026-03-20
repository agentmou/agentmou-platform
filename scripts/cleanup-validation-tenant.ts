#!/usr/bin/env tsx

import { createDb } from '@agentmou/db';
import { parseArgs } from 'node:util';

import {
  executeValidationFixtureCleanup,
  planValidationFixtureCleanup,
  ValidationFixtureCleanupError,
} from '../services/api/src/lib/validation-fixture-cleanup.js';

const usage = `Usage:
  TENANT_ID=<tenant-id> USER_EMAIL=<email> tsx scripts/cleanup-validation-tenant.ts
  tsx scripts/cleanup-validation-tenant.ts --tenant-id <tenant-id> --user-email <email> [--user-id <uuid>] [--execute]

Defaults to dry-run preview mode. Pass --execute to mutate production data.`;

async function main() {
  const { values } = parseArgs({
    options: {
      'tenant-id': { type: 'string' },
      'user-email': { type: 'string' },
      'user-id': { type: 'string' },
      execute: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    console.log(usage);
    return;
  }

  const tenantId = values['tenant-id'] ?? process.env.TENANT_ID;
  const userEmail = values['user-email'] ?? process.env.USER_EMAIL;
  const userId = values['user-id'] ?? process.env.USER_ID;

  if (!tenantId || (!userEmail && !userId)) {
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  const { db, close } = createDb();

  try {
    const input = {
      tenantId,
      userEmail,
      userId,
    };

    const plan = values.execute
      ? await executeValidationFixtureCleanup(db, input)
      : await planValidationFixtureCleanup(db, input);

    printSummary(values.execute ? 'execute' : 'dry-run', plan);
  } catch (error) {
    if (error instanceof ValidationFixtureCleanupError) {
      console.error(`Cleanup blocked: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await close();
  }
}

function printSummary(
  mode: 'dry-run' | 'execute',
  plan: Awaited<ReturnType<typeof planValidationFixtureCleanup>>,
) {
  console.log(
    `${mode === 'execute' ? 'Executed' : 'Planned'} validation fixture cleanup`,
  );
  console.log(`Tenant: ${plan.tenant.name} (${plan.tenant.id})`);
  console.log(`User: ${plan.user.email} (${plan.user.id})`);
  console.log('External cleanup:');

  for (const operation of plan.externalOperations) {
    console.log(`- ${operation.label}: ${operation.count}`);
  }

  console.log(`Total external resources scheduled: ${plan.totalExternalResources}`);
  console.log('Delete plan:');

  for (const operation of plan.operations) {
    console.log(`- ${operation.label}: ${operation.count}`);
  }

  if (plan.userDeletion.willDelete) {
    console.log('- users: 1');
  } else {
    const blockerText = plan.userDeletion.blockers
      .map((blocker) => `${blocker.label}=${blocker.count}`)
      .join(', ');
    console.log(`- users: 0 (kept because ${blockerText})`);
  }

  console.log(`Total rows scheduled: ${plan.totalRows}`);
}

void main();
