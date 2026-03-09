import { db, agentInstallations, workflowInstallations } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import { N8nService } from '../n8n/n8n.service';

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
    const [installation] = await db
      .insert(workflowInstallations)
      .values({
        tenantId,
        templateId,
        status: 'active',
        config: config || {},
      })
      .returning();

    if (workflowJson) {
      try {
        const n8n = new N8nService();
        const created = await n8n.importWorkflow({
          ...workflowJson,
          name: `[${tenantId.slice(0, 8)}] ${(workflowJson as { name?: string }).name || templateId}`,
        });
        await db
          .update(workflowInstallations)
          .set({ n8nWorkflowId: created.id })
          .where(eq(workflowInstallations.id, installation.id));
        return { ...installation, n8nWorkflowId: created.id };
      } catch {
        await db
          .update(workflowInstallations)
          .set({ status: 'error' })
          .where(eq(workflowInstallations.id, installation.id));
        return { ...installation, status: 'error' };
      }
    }

    return installation;
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
