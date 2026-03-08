/**
 * install-pack job processor.
 *
 * Reads the pack manifest via catalog-sdk, then creates agent and workflow
 * installation rows in the database for the tenant.
 */

import type { Job } from 'bullmq';
import type { InstallPackPayload } from '@agentmou/queue';
import { CatalogSDK } from '@agentmou/catalog-sdk';
import { db, agentInstallations, workflowInstallations } from '@agentmou/db';
import * as path from 'path';

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

  for (const templateId of agentIds) {
    await db.insert(agentInstallations).values({
      tenantId,
      templateId,
      status: 'active',
      config: config || {},
      hitlEnabled: true,
    });
  }

  await job.updateProgress(60);

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
