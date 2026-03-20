/**
 * install-pack job processor.
 *
 * Reads the pack manifest via catalog-sdk, creates agent and workflow
 * installation rows in the database, and registers BullMQ repeatable
 * jobs for agents that have cron-based triggers.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Job } from 'bullmq';
import type { InstallPackPayload } from '@agentmou/queue';
import {
  getQueue,
  getScheduleTriggerJobId,
  QUEUE_NAMES,
  SCHEDULE_TRIGGER_JOB_NAME,
} from '@agentmou/queue';
import { CatalogSDK, resolveRepoRoot } from '@agentmou/catalog-sdk';
import { N8nClient } from '@agentmou/n8n-client';
import { db, agentInstallations, workflowInstallations, schedules } from '@agentmou/db';
import { eq } from 'drizzle-orm';

const REPO_ROOT = resolveRepoRoot(import.meta.dirname, [
  'catalog/agents',
  'workflows/public',
]);
const CATALOG_DIR = path.join(REPO_ROOT, 'catalog');
const WORKFLOWS_PUBLIC_DIR = path.join(REPO_ROOT, 'workflows', 'public');
const N8N_API_URL = process.env.N8N_API_URL || 'http://n8n:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const TEMPLATE_ID_PATTERN = /^[a-zA-Z0-9-_]+$/;

const sdk = new CatalogSDK();

export async function processInstallPack(job: Job<InstallPackPayload>) {
  const { tenantId, packId, config } = job.data;
  const n8n = createN8nClient();

  console.log(`[install-pack] Installing pack "${packId}" for tenant ${tenantId}`);

  await job.updateProgress(10);

  const packPath = path.join(CATALOG_DIR, 'packs', `${packId}.yaml`);
  const pack = await sdk.loadPackManifest(packPath);

  await job.updateProgress(30);

  const agentIds = pack.agents || [];
  const workflowIds = pack.workflows || [];

  let installedAgents = 0;
  let installedWorkflows = 0;

  // Install agents and create schedules for cron triggers
  for (const templateId of agentIds) {
    const manifest = await loadAgentManifest(templateId);
    if (!manifest) {
      console.warn(`[install-pack] Skipping unknown agent template "${templateId}"`);
      continue;
    }

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

    installedAgents += 1;

    if (manifest.triggers) {
      for (const trigger of manifest.triggers) {
        if (trigger.type === 'schedule' && trigger.cron) {
          await createSchedule(tenantId, installation.id, 'agent', trigger.cron);
        }
      }
    }
  }

  await job.updateProgress(60);

  // Install workflows and provision them in n8n when possible.
  for (const templateId of workflowIds) {
    const workflowJson = await loadWorkflowDefinition(templateId);
    if (!workflowJson) {
      console.warn(`[install-pack] Skipping unknown workflow template "${templateId}"`);
      continue;
    }

    const [installation] = await db.insert(workflowInstallations).values({
      tenantId,
      templateId,
      status: 'configuring',
      config: config || {},
    }).returning();

    if (!n8n) {
      console.warn('[install-pack] N8N_API_KEY missing; marking workflow installation as error');
      await db
        .update(workflowInstallations)
        .set({ status: 'error' })
        .where(eq(workflowInstallations.id, installation.id));
      continue;
    }

    try {
      const created = await n8n.createWorkflow({
        ...workflowJson,
        name: `[${tenantId.slice(0, 8)}] ${(workflowJson as { name?: string }).name || templateId}`,
      });
      await db
        .update(workflowInstallations)
        .set({ n8nWorkflowId: created.id, status: 'active' })
        .where(eq(workflowInstallations.id, installation.id));
      installedWorkflows += 1;
    } catch (error) {
      console.error(
        `[install-pack] Failed to provision workflow "${templateId}" in n8n`,
        error,
      );
      await db
        .update(workflowInstallations)
        .set({ status: 'error' })
        .where(eq(workflowInstallations.id, installation.id));
    }
  }

  await job.updateProgress(100);

  console.log(
    `[install-pack] Pack "${packId}" installed: ${installedAgents} agents, ${installedWorkflows} workflows`,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadAgentManifest(templateId: string) {
  if (!TEMPLATE_ID_PATTERN.test(templateId)) {
    return null;
  }

  try {
    const manifestPath = path.join(CATALOG_DIR, 'agents', templateId, 'manifest.yaml');
    return await sdk.loadAgentManifest(manifestPath);
  } catch {
    return null;
  }
}

async function loadWorkflowDefinition(
  templateId: string,
): Promise<Record<string, unknown> | null> {
  if (!TEMPLATE_ID_PATTERN.test(templateId)) {
    return null;
  }

  const workflowPath = path.join(WORKFLOWS_PUBLIC_DIR, templateId, 'workflow.json');
  try {
    const raw = await fs.readFile(workflowPath, 'utf8');
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function createN8nClient(): N8nClient | null {
  if (!N8N_API_KEY) {
    return null;
  }
  return new N8nClient(N8N_API_URL, N8N_API_KEY);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    SCHEDULE_TRIGGER_JOB_NAME,
    {
      tenantId,
      scheduleId: schedule.id,
      targetType,
      installationId,
    },
    {
      repeat: { pattern: cron },
      jobId: getScheduleTriggerJobId(schedule.id),
    },
  );

  console.log(
    `[install-pack] Created schedule ${schedule.id} (${cron}) for ${targetType} ${installationId}`,
  );
}
