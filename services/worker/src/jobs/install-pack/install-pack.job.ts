/**
 * install-pack job processor.
 *
 * Reads the pack manifest via catalog-sdk, creates agent and workflow
 * installation rows in the database, and registers BullMQ repeatable
 * jobs for agents that have cron-based triggers.
 */

import * as path from 'node:path';
import type { Job } from 'bullmq';
import type { InstallPackPayload } from '@agentmou/queue';
import { getQueue, QUEUE_NAMES } from '@agentmou/queue';
import { CatalogSDK } from '@agentmou/catalog-sdk';
import { db, agentInstallations, workflowInstallations, schedules } from '@agentmou/db';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');
const CATALOG_DIR = path.join(REPO_ROOT, 'catalog');

const sdk = new CatalogSDK();

export async function processInstallPack(job: Job<InstallPackPayload>) {
  const { tenantId, packId, config } = job.data;

  console.log(`[install-pack] Installing pack "${packId}" for tenant ${tenantId}`);

  await job.updateProgress(10);

  const packPath = path.join(CATALOG_DIR, 'packs', `${packId}.yaml`);
  const pack = await sdk.loadPackManifest(packPath);

  await job.updateProgress(30);

  const agentIds = pack.agents || [];
  const workflowIds = pack.workflows || [];

  // Install agents and create schedules for cron triggers
  for (const templateId of agentIds) {
    const [installation] = await db
      .insert(agentInstallations)
      .values({
        tenantId,
        templateId,
        status: 'active',
        config: config || {},
        hitlEnabled: true,
      })
      .returning();

    // Load the agent manifest to check for cron triggers
    const manifest = await loadAgentManifest(templateId);
    if (manifest?.triggers) {
      for (const trigger of manifest.triggers) {
        if (trigger.type === 'schedule' && trigger.cron) {
          await createSchedule(tenantId, installation.id, 'agent', trigger.cron);
        }
      }
    }
  }

  await job.updateProgress(60);

  // Install workflows
  for (const templateId of workflowIds) {
    await db.insert(workflowInstallations).values({
      tenantId,
      templateId,
      status: 'active',
      config: config || {},
    });
  }

  await job.updateProgress(100);

  console.log(
    `[install-pack] Pack "${packId}" installed: ${agentIds.length} agents, ${workflowIds.length} workflows`,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadAgentManifest(templateId: string) {
  try {
    const manifestPath = path.join(CATALOG_DIR, 'agents', templateId, 'manifest.yaml');
    return await sdk.loadAgentManifest(manifestPath);
  } catch {
    return null;
  }
}

/**
 * Creates a schedule row and registers a BullMQ repeatable job
 * that fires the schedule-trigger processor on the given cron.
 */
async function createSchedule(
  tenantId: string,
  installationId: string,
  targetType: 'agent' | 'workflow',
  cron: string,
) {
  const [schedule] = await db
    .insert(schedules)
    .values({
      tenantId,
      installationId,
      targetType,
      cron,
      enabled: true,
    })
    .returning();

  const queue = getQueue(QUEUE_NAMES.SCHEDULE_TRIGGER);
  await queue.add(
    'schedule-trigger',
    {
      tenantId,
      scheduleId: schedule.id,
      targetType,
      installationId,
    },
    {
      repeat: { pattern: cron },
      jobId: `schedule-${schedule.id}`,
    },
  );

  console.log(
    `[install-pack] Created schedule ${schedule.id} (${cron}) for ${targetType} ${installationId}`,
  );
}
