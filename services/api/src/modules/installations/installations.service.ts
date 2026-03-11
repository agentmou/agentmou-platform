import { db, agentInstallations, workflowInstallations } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { N8nService } from '../n8n/n8n.service';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');
const WORKFLOWS_PUBLIC_DIR = path.join(REPO_ROOT, 'workflows', 'public');
const TEMPLATE_ID_PATTERN = /^[a-zA-Z0-9-_]+$/;

export class InstallationsService {
  async listAgentInstallations(tenantId: string) {
    return db
      .select()
      .from(agentInstallations)
      .where(eq(agentInstallations.tenantId, tenantId));
  }

  async listWorkflowInstallations(tenantId: string) {
    return db
      .select()
      .from(workflowInstallations)
      .where(eq(workflowInstallations.tenantId, tenantId));
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
    return installation;
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
      return { ...installation, status: 'active', n8nWorkflowId: created.id };
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
    if (agent) return { ...agent, type: 'agent' as const };

    const [workflow] = await db
      .select()
      .from(workflowInstallations)
      .where(
        and(
          eq(workflowInstallations.tenantId, tenantId),
          eq(workflowInstallations.id, installationId)
        )
      );
    if (workflow) return { ...workflow, type: 'workflow' as const };

    return null;
  }

  async uninstall(tenantId: string, installationId: string) {
    await db
      .delete(agentInstallations)
      .where(
        and(
          eq(agentInstallations.tenantId, tenantId),
          eq(agentInstallations.id, installationId)
        )
      );
    await db
      .delete(workflowInstallations)
      .where(
        and(
          eq(workflowInstallations.tenantId, tenantId),
          eq(workflowInstallations.id, installationId)
        )
      );
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
