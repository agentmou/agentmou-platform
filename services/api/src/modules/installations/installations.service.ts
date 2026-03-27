import { db, agentInstallations, schedules, workflowInstallations } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { resolveRepoRoot } from '@agentmou/catalog-sdk';
import { N8nService } from '../n8n/n8n.service';
import { cleanupInstallationExternalResources } from '../../lib/external-installation-cleanup.js';
import {
  mapAgentInstallation,
  mapInstallationRecord,
  mapWorkflowInstallation,
} from './installations.mapper.js';

const REPO_ROOT = resolveRepoRoot(import.meta.dirname, [
  'workflows/public',
]);
const WORKFLOWS_PUBLIC_DIR = path.join(REPO_ROOT, 'workflows', 'public');
const TEMPLATE_ID_PATTERN = /^[a-zA-Z0-9-_]+$/;

export class InstallationsService {
  async listAgentInstallations(tenantId: string) {
    const installations = await db
      .select()
      .from(agentInstallations)
      .where(eq(agentInstallations.tenantId, tenantId));

    return installations.map(mapAgentInstallation);
  }

  async listWorkflowInstallations(tenantId: string) {
    const installations = await db
      .select()
      .from(workflowInstallations)
      .where(eq(workflowInstallations.tenantId, tenantId));

    return installations.map(mapWorkflowInstallation);
  }

  async installAgent(
    tenantId: string,
    templateId: string,
    config?: Record<string, unknown>
  ) {
    const [installation] = await db
      .insert(agentInstallations)
      .values({
        tenantId,
        templateId,
        status: 'active',
        config: config || {},
      })
      .returning();
    return mapAgentInstallation(installation);
  }

  /**
   * Install a workflow: create the DB record and, if a workflow JSON is
   * provided, import it into the real n8n instance and store the n8nWorkflowId.
   */
  async installWorkflow(
    tenantId: string,
    templateId: string,
    config?: Record<string, unknown>,
    workflowJson?: Record<string, unknown>,
  ) {
    const workflowDefinition = workflowJson ?? await loadWorkflowDefinition(templateId);

    if (!workflowDefinition) {
      throw Object.assign(
        new Error(`Workflow template "${templateId}" is not installable`),
        { statusCode: 404 },
      );
    }

    const [installation] = await db
      .insert(workflowInstallations)
      .values({
        tenantId,
        templateId,
        status: 'configuring',
        config: config || {},
      })
      .returning();

    try {
      const n8n = new N8nService();
      const created = await n8n.importWorkflow({
        ...workflowDefinition,
        name: `[${tenantId.slice(0, 8)}] ${(workflowDefinition as { name?: string }).name || templateId}`,
      });
      await db
        .update(workflowInstallations)
        .set({ n8nWorkflowId: created.id, status: 'active' })
        .where(eq(workflowInstallations.id, installation.id));
      return mapWorkflowInstallation({
        ...installation,
        status: 'active',
        n8nWorkflowId: created.id,
      });
    } catch (error) {
      await db
        .update(workflowInstallations)
        .set({ status: 'error' })
        .where(eq(workflowInstallations.id, installation.id));
      throw Object.assign(
        new Error(`Workflow installation failed for template "${templateId}"`),
        { statusCode: getStatusCode(error) || 502 },
      );
    }
  }

  async getInstallation(tenantId: string, installationId: string) {
    const [agent] = await db
      .select()
      .from(agentInstallations)
      .where(
        and(
          eq(agentInstallations.tenantId, tenantId),
          eq(agentInstallations.id, installationId)
        )
      );
    if (agent) {
      return mapInstallationRecord({ ...agent, type: 'agent' as const });
    }

    const [workflow] = await db
      .select()
      .from(workflowInstallations)
      .where(
        and(
          eq(workflowInstallations.tenantId, tenantId),
          eq(workflowInstallations.id, installationId)
        )
      );
    if (workflow) {
      return mapInstallationRecord({ ...workflow, type: 'workflow' as const });
    }

    return null;
  }

  async uninstall(tenantId: string, installationId: string) {
    const [agentRows, workflowRows, scheduleRows] = await Promise.all([
      db
        .select({
          id: agentInstallations.id,
          templateId: agentInstallations.templateId,
        })
        .from(agentInstallations)
        .where(
          and(
            eq(agentInstallations.tenantId, tenantId),
            eq(agentInstallations.id, installationId)
          )
        ),
      db
        .select({
          id: workflowInstallations.id,
          templateId: workflowInstallations.templateId,
          n8nWorkflowId: workflowInstallations.n8nWorkflowId,
        })
        .from(workflowInstallations)
        .where(
          and(
            eq(workflowInstallations.tenantId, tenantId),
            eq(workflowInstallations.id, installationId)
          )
        ),
      db
        .select({
          id: schedules.id,
          installationId: schedules.installationId,
          targetType: schedules.targetType,
          cron: schedules.cron,
        })
        .from(schedules)
        .where(
          and(
            eq(schedules.tenantId, tenantId),
            eq(schedules.installationId, installationId)
          )
        ),
    ]);

    const agent = agentRows[0];
    const workflow = workflowRows[0];

    if (!agent && !workflow) {
      return;
    }

    await cleanupInstallationExternalResources({
      workflows: workflow
        ? [
            {
              installationId: workflow.id,
              templateId: workflow.templateId,
              n8nWorkflowId: workflow.n8nWorkflowId,
            },
          ]
        : [],
      schedules: scheduleRows.map((schedule) => ({
        id: schedule.id,
        installationId: schedule.installationId,
        targetType: schedule.targetType,
        cron: schedule.cron,
      })),
    });

    try {
      await db.transaction(async (tx) => {
        await tx
          .delete(schedules)
          .where(
            and(
              eq(schedules.tenantId, tenantId),
              eq(schedules.installationId, installationId)
            )
          );

        if (agent) {
          await tx
            .delete(agentInstallations)
            .where(
              and(
                eq(agentInstallations.tenantId, tenantId),
                eq(agentInstallations.id, installationId)
              )
            );
        }

        if (workflow) {
          await tx
            .delete(workflowInstallations)
            .where(
              and(
                eq(workflowInstallations.tenantId, tenantId),
                eq(workflowInstallations.id, installationId)
              )
            );
        }
      });
    } catch (error) {
      throw Object.assign(
        new Error(
          `External cleanup succeeded but local uninstall failed for installation ${installationId}. Rerun is safe because missing external resources are treated as already cleaned.`,
        ),
        { statusCode: 500, cause: error },
      );
    }
  }
}

function getStatusCode(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
