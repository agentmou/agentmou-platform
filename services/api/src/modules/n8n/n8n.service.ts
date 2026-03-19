import { N8nClient, type N8nWorkflow } from '@agentmou/n8n-client';
import { WorkflowEngineStatusSchema } from '@agentmou/contracts';
import { db, workflowInstallations } from '@agentmou/db';
import { eq } from 'drizzle-orm';

const N8N_API_URL = process.env.N8N_API_URL || 'http://n8n:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

function getClient(): N8nClient {
  if (!N8N_API_KEY) {
    throw Object.assign(new Error('N8N_API_KEY not configured'), { statusCode: 500 });
  }
  return new N8nClient(N8N_API_URL, N8N_API_KEY);
}

export class N8nService {
  async listWorkflows(): Promise<N8nWorkflow[]> {
    return getClient().listWorkflows();
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return getClient().getWorkflow(workflowId);
  }

  async importWorkflow(workflowJson: Record<string, unknown>): Promise<N8nWorkflow> {
    return getClient().createWorkflow(workflowJson);
  }

  async exportWorkflow(workflowId: string): Promise<{ workflow: N8nWorkflow }> {
    const wf = await getClient().getWorkflow(workflowId);
    return { workflow: wf };
  }

  async executeWorkflow(workflowId: string, data?: unknown) {
    return getClient().executeWorkflow(workflowId, data);
  }

  async activateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return getClient().activateWorkflow(workflowId);
  }

  async deactivateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return getClient().deactivateWorkflow(workflowId);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return getClient().deleteWorkflow(workflowId);
  }

  async testConnection() {
    try {
      const start = Date.now();
      await getClient().listWorkflows();
      return { success: true, message: 'Connection to n8n successful', latency: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `n8n connection failed: ${msg}`, latency: 0 };
    }
  }

  async getWorkflowEngineStatus(tenantId: string) {
    const installations = await db
      .select()
      .from(workflowInstallations)
      .where(eq(workflowInstallations.tenantId, tenantId));

    const lastProvisionedAt = installations
      .map((installation) => installation.installedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const lastExecutionAt = installations
      .map((installation) => installation.lastRunAt)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (!N8N_API_KEY) {
      return WorkflowEngineStatusSchema.parse({
        tenantId,
        availability: 'not_configured',
        baseUrl: N8N_API_URL,
        apiKeySet: false,
        installedWorkflows: installations.length,
        activeWorkflows: installations.filter((item) => item.status === 'active').length,
        executionCount: installations.reduce((sum, item) => sum + item.runsTotal, 0),
        lastProvisionedAt: lastProvisionedAt?.toISOString(),
        lastExecutionAt: lastExecutionAt?.toISOString(),
        platformManaged: true,
      });
    }

    const testResult = await this.testConnection();

    return WorkflowEngineStatusSchema.parse({
      tenantId,
      availability: testResult.success ? 'online' : 'offline',
      baseUrl: N8N_API_URL,
      apiKeySet: true,
      lastTestAt: new Date().toISOString(),
      lastTestStatus: testResult.success ? 'success' : 'failed',
      installedWorkflows: installations.length,
      activeWorkflows: installations.filter((item) => item.status === 'active').length,
      executionCount: installations.reduce((sum, item) => sum + item.runsTotal, 0),
      lastProvisionedAt: lastProvisionedAt?.toISOString(),
      lastExecutionAt: lastExecutionAt?.toISOString(),
      platformManaged: true,
    });
  }
}
