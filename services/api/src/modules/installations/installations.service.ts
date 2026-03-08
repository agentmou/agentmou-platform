import { db, agentInstallations, workflowInstallations } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';

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

  async installWorkflow(
    tenantId: string,
    templateId: string,
    config?: Record<string, unknown>
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
