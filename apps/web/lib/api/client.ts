/**
 * Typed API client for the AgentMou Control Plane API.
 *
 * All methods return typed data using @agentmou/contracts types.
 * Set NEXT_PUBLIC_API_URL in your environment to point to the API server.
 */

import {
  ApprovalRequestsResponseSchema,
  ApprovalResponseSchema,
  ConnectorsResponseSchema,
  ExecutionRunResponseSchema,
  ExecutionRunsResponseSchema,
  InstallationsResponseSchema,
  InstalledAgentSchema,
  TenantMembersResponseSchema,
  TenantResponseSchema,
  TenantsResponseSchema,
  type ApprovalRequest,
  type AgentTemplate,
  type ExecutionRun,
  type InstalledAgent,
  type InstalledWorkflow,
  type Integration,
  type PackTemplate,
  type Tenant,
  type TenantMember,
  type WorkflowTemplate,
} from '@agentmou/contracts';
import { z, type ZodTypeAny } from 'zod';

import { getTokenCookie } from '@/lib/auth/cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const installAgentResponseSchema = z.object({
  installation: InstalledAgentSchema,
});

const installPackResponseSchema = z.object({
  jobId: z.union([z.string(), z.number()]),
  status: z.literal('queued'),
  message: z.string(),
});

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiContractError extends Error {
  constructor(
    public path: string,
    public issues: string[],
  ) {
    super(formatContractError(path, issues));
    this.name = 'ApiContractError';
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

async function requestParsed<TSchema extends ZodTypeAny>(
  path: string,
  schema: TSchema,
  options?: RequestInit,
): Promise<z.infer<TSchema>> {
  const data = await request<unknown>(path, options);
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`,
  );

  throw new ApiContractError(path, issues);
}

function isApiNotFound(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 404;
}

function formatContractError(path: string, issues: string[]): string {
  if (process.env.NODE_ENV === 'development') {
    return `API contract mismatch for ${path}: ${issues.join('; ')}`;
  }

  return `API contract mismatch for ${path}`;
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

export async function fetchTenants(): Promise<Tenant[]> {
  const data = await requestParsed('/api/v1/tenants', TenantsResponseSchema);
  return data.tenants;
}

export async function fetchTenant(tenantId: string): Promise<Tenant | null> {
  try {
    const data = await requestParsed(
      `/api/v1/tenants/${tenantId}`,
      TenantResponseSchema,
    );
    return data.tenant;
  } catch (error) {
    if (isApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}

async function fetchInstallations(tenantId: string) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/installations`,
    InstallationsResponseSchema,
  );
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export async function fetchTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/members`,
    TenantMembersResponseSchema,
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
  const data = await fetchInstallations(tenantId);
  return data.installations.agents;
}

export async function fetchInstalledWorkflows(tenantId: string): Promise<InstalledWorkflow[]> {
  const data = await fetchInstallations(tenantId);
  return data.installations.workflows;
}

export async function installAgent(
  tenantId: string,
  templateId: string,
  config?: Record<string, unknown>,
) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/installations/agents`,
    installAgentResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ templateId, config }),
    },
  );
}

export async function installPack(
  tenantId: string,
  packId: string,
  config?: Record<string, unknown>,
) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/installations/packs`,
    installPackResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ packId, config }),
    },
  );
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export async function fetchConnectors(tenantId: string): Promise<Integration[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/connectors`,
    ConnectorsResponseSchema,
  );
  return data.connectors;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function fetchTenantRuns(tenantId: string): Promise<ExecutionRun[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/runs`,
    ExecutionRunsResponseSchema,
  );
  return data.runs;
}

export async function fetchTenantRun(
  tenantId: string,
  runId: string,
): Promise<ExecutionRun | null> {
  try {
    const data = await requestParsed(
      `/api/v1/tenants/${tenantId}/runs/${runId}`,
      ExecutionRunResponseSchema,
    );
    return data.run;
  } catch (error) {
    if (isApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}

export async function fetchTenantApprovals(tenantId: string): Promise<ApprovalRequest[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/approvals`,
    ApprovalRequestsResponseSchema,
  );
  return data.approvals;
}

export async function approveRequest(
  tenantId: string,
  approvalId: string,
  reason?: string,
) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/approvals/${approvalId}/approve`,
    ApprovalResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

export async function rejectRequest(
  tenantId: string,
  approvalId: string,
  reason?: string,
) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/approvals/${approvalId}/reject`,
    ApprovalResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}
