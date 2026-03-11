/**
 * Typed API client for the AgentMou Control Plane API.
 *
 * All methods return typed data using @agentmou/contracts types.
 * Set NEXT_PUBLIC_API_URL in your environment to point to the API server.
 */

import type {
  Tenant,
  TenantMember,
  AgentTemplate,
  WorkflowTemplate,
  PackTemplate,
  Integration,
  InstalledAgent,
  InstalledWorkflow,
  ExecutionRun,
  ApprovalRequest,
} from '@agentmou/contracts';

import { getTokenCookie } from '@/lib/auth/cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function authHeaders(): Record<string, string> {
  const token = getTokenCookie();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

export async function fetchTenants(): Promise<Tenant[]> {
  const data = await request<{ tenants: Tenant[] }>('/api/v1/tenants');
  return data.tenants;
}

export async function fetchTenant(tenantId: string): Promise<Tenant | null> {
  try {
    const data = await request<{ tenant: Tenant }>(`/api/v1/tenants/${tenantId}`);
    return data.tenant;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export async function fetchTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const data = await request<{ members: TenantMember[] }>(
    `/api/v1/tenants/${tenantId}/members`,
  );
  return data.members;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function fetchCatalogAgents(): Promise<AgentTemplate[]> {
  const data = await request<{ agents: AgentTemplate[] }>('/api/v1/catalog/agents');
  return data.agents;
}

export async function fetchCatalogAgent(agentId: string): Promise<AgentTemplate | null> {
  try {
    const data = await request<{ agent: AgentTemplate }>(`/api/v1/catalog/agents/${agentId}`);
    return data.agent;
  } catch {
    return null;
  }
}

export async function fetchCatalogPacks(): Promise<PackTemplate[]> {
  const data = await request<{ packs: PackTemplate[] }>('/api/v1/catalog/packs');
  return data.packs;
}

export async function fetchCatalogPack(packId: string): Promise<PackTemplate | null> {
  try {
    const data = await request<{ pack: PackTemplate }>(`/api/v1/catalog/packs/${packId}`);
    return data.pack;
  } catch {
    return null;
  }
}

export async function fetchCatalogWorkflows(): Promise<WorkflowTemplate[]> {
  const data = await request<{ workflows: WorkflowTemplate[] }>('/api/v1/catalog/workflows');
  return data.workflows;
}

// ---------------------------------------------------------------------------
// Installations
// ---------------------------------------------------------------------------

export async function fetchInstalledAgents(tenantId: string): Promise<InstalledAgent[]> {
  const data = await request<{ installations: { agents: InstalledAgent[]; workflows: InstalledWorkflow[] } }>(
    `/api/v1/tenants/${tenantId}/installations`,
  );
  return data.installations.agents;
}

export async function fetchInstalledWorkflows(tenantId: string): Promise<InstalledWorkflow[]> {
  const data = await request<{ installations: { agents: InstalledAgent[]; workflows: InstalledWorkflow[] } }>(
    `/api/v1/tenants/${tenantId}/installations`,
  );
  return data.installations.workflows;
}

export async function installAgent(
  tenantId: string,
  templateId: string,
  config?: Record<string, unknown>,
) {
  return request(`/api/v1/tenants/${tenantId}/installations/agents`, {
    method: 'POST',
    body: JSON.stringify({ templateId, config }),
  });
}

export async function installPack(
  tenantId: string,
  packId: string,
  config?: Record<string, unknown>,
) {
  return request(`/api/v1/tenants/${tenantId}/installations/packs`, {
    method: 'POST',
    body: JSON.stringify({ packId, config }),
  });
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export async function fetchConnectors(tenantId: string): Promise<Integration[]> {
  const data = await request<{ connectors: Integration[] }>(
    `/api/v1/tenants/${tenantId}/connectors`,
  );
  return data.connectors;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function fetchTenantRuns(tenantId: string): Promise<ExecutionRun[]> {
  const data = await request<{ runs: ExecutionRun[] }>(
    `/api/v1/tenants/${tenantId}/runs`,
  );
  return data.runs;
}

export async function fetchTenantRun(
  tenantId: string,
  runId: string,
): Promise<ExecutionRun | null> {
  try {
    const data = await request<{ run: ExecutionRun }>(
      `/api/v1/tenants/${tenantId}/runs/${runId}`,
    );
    return data.run;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function fetchTenantApprovals(tenantId: string): Promise<ApprovalRequest[]> {
  const data = await request<{ approvals: ApprovalRequest[] }>(
    `/api/v1/tenants/${tenantId}/approvals`,
  );
  return data.approvals;
}

export async function approveRequest(
  tenantId: string,
  approvalId: string,
  reason?: string,
) {
  return request(`/api/v1/tenants/${tenantId}/approvals/${approvalId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function rejectRequest(
  tenantId: string,
  approvalId: string,
  reason?: string,
) {
  return request(`/api/v1/tenants/${tenantId}/approvals/${approvalId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
