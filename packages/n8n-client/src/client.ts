import axios, { type AxiosInstance } from 'axios';

/** Minimal representation of an n8n workflow as returned by the n8n REST API. */
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: unknown[];
  connections: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** Result of triggering an n8n workflow execution. */
export interface N8nExecutionResult {
  id: string;
  finished: boolean;
  data?: unknown;
}

/**
 * Typed wrapper around the subset of n8n REST endpoints used by Agentmou.
 */
export class N8nClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, apiKey: string) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-N8N-API-KEY': apiKey,
      },
    });
  }

  async listWorkflows(): Promise<N8nWorkflow[]> {
    const response = await this.client.get('/workflows');
    return response.data.data ?? response.data;
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    const response = await this.client.get(`/workflows/${id}`);
    return response.data;
  }

  /**
   * Import a workflow JSON into n8n (creates a new workflow).
   * The n8n REST API uses POST /workflows with the full workflow body.
   */
  async createWorkflow(workflow: Record<string, unknown>): Promise<N8nWorkflow> {
    const response = await this.client.post('/workflows', sanitizeWorkflowForCreate(workflow));
    return response.data;
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    const response = await this.client.patch(`/workflows/${id}`, { active: true });
    return response.data;
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    const response = await this.client.patch(`/workflows/${id}`, { active: false });
    return response.data;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.client.delete(`/workflows/${id}`);
  }

  async executeWorkflow(id: string, data?: unknown): Promise<N8nExecutionResult> {
    const response = await this.client.post(`/workflows/${id}/execute`, data);
    return response.data;
  }
}

/**
 * n8n rejects top-level read-only fields such as `id` on workflow creation.
 * Strip only the known create-invalid keys and preserve the node graph as-is.
 */
export function sanitizeWorkflowForCreate(
  workflow: Record<string, unknown>
): Record<string, unknown> {
  const {
    id: _id,
    active: _active,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    versionId: _versionId,
    isArchived: _isArchived,
    ...createPayload
  } = workflow;

  return createPayload;
}
