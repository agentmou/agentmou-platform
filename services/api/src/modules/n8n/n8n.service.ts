import { N8nClient, type N8nWorkflow } from '@agentmou/n8n-client';

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
}
