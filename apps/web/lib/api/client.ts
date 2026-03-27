/**
 * Typed API client for the Agentmou Control Plane API.
 *
 * All methods return typed data using @agentmou/contracts types.
 * Set NEXT_PUBLIC_API_URL in your environment to point to the API server.
 */

import {
  ApprovalRequestsResponseSchema,
  ApprovalResponseSchema,
  AgentTemplateResponseSchema,
  AgentTemplatesResponseSchema,
  AuditEventsResponseSchema,
  BillingInvoicesResponseSchema,
  BillingOverviewResponseSchema,
  ConnectorsResponseSchema,
  ExecutionRunResponseSchema,
  ExecutionRunsResponseSchema,
  InstallationResponseSchema,
  InstallationsResponseSchema,
  InstallPackQueuedResponseSchema,
  PackTemplateResponseSchema,
  PackTemplatesResponseSchema,
  SecurityFindingsResponseSchema,
  SecurityPoliciesResponseSchema,
  TenantMembersResponseSchema,
  TenantResponseSchema,
  TenantsResponseSchema,
  WorkflowTemplatesResponseSchema,
  WorkflowEngineStatusResponseSchema,
  type ApprovalRequest,
  type AgentTemplate,
  type BillingOverview,
  type ExecutionRun,
  type InstalledAgent,
  type InstalledWorkflow,
  type Integration,
  type Invoice,
  type PackTemplate,
  type SecurityFinding,
  type SecurityPolicy,
  type Tenant,
  type TenantMember,
  type WorkflowEngineStatus,
  type WorkflowTemplate,
} from '@agentmou/contracts';
import { z, type ZodTypeAny } from 'zod';

import { getTokenCookie } from '@/lib/auth/cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const secretsResponseSchema = z.object({
  secrets: z.array(
    z.object({
      id: z.string(),
      tenantId: z.string(),
      key: z.string(),
      connectorAccountId: z.string().nullable().optional(),
      createdAt: z.string(),
      rotatedAt: z.string().nullable().optional(),
    })
  ),
});

export type ApiSecret = z.infer<typeof secretsResponseSchema>['secrets'][number];

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiContractError extends Error {
  constructor(
    public path: string,
    public issues: string[]
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
  options?: RequestInit
): Promise<z.infer<TSchema>> {
  const data = await request<unknown>(path, options);
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`
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
    const data = await requestParsed(`/api/v1/tenants/${tenantId}`, TenantResponseSchema);
    return data.tenant;
  } catch (error) {
    if (isApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}

async function fetchInstallations(tenantId: string) {
  return requestParsed(`/api/v1/tenants/${tenantId}/installations`, InstallationsResponseSchema);
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

export async function fetchTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/members`,
    TenantMembersResponseSchema
  );
  return data.members;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function fetchCatalogAgents(): Promise<AgentTemplate[]> {
  const data = await requestParsed('/api/v1/catalog/agents', AgentTemplatesResponseSchema);
  return data.agents;
}

export async function fetchCatalogAgent(agentId: string): Promise<AgentTemplate | null> {
  try {
    const data = await requestParsed(
      `/api/v1/catalog/agents/${agentId}`,
      AgentTemplateResponseSchema
    );
    return data.agent;
  } catch {
    return null;
  }
}

export async function fetchCatalogPacks(): Promise<PackTemplate[]> {
  const data = await requestParsed('/api/v1/catalog/packs', PackTemplatesResponseSchema);
  return data.packs;
}

export async function fetchCatalogPack(packId: string): Promise<PackTemplate | null> {
  try {
    const data = await requestParsed(`/api/v1/catalog/packs/${packId}`, PackTemplateResponseSchema);
    return data.pack;
  } catch {
    return null;
  }
}

export async function fetchCatalogWorkflows(): Promise<WorkflowTemplate[]> {
  const data = await requestParsed('/api/v1/catalog/workflows', WorkflowTemplatesResponseSchema);
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
  config?: Record<string, unknown>
) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/installations/agents`,
    InstallationResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ templateId, config }),
    }
  );
}

export async function installPack(
  tenantId: string,
  packId: string,
  config?: Record<string, unknown>
) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/installations/packs`,
    InstallPackQueuedResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ packId, config }),
    }
  );
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export async function fetchConnectors(tenantId: string): Promise<Integration[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/connectors`,
    ConnectorsResponseSchema
  );
  return data.connectors;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function fetchTenantRuns(tenantId: string): Promise<ExecutionRun[]> {
  const data = await requestParsed(`/api/v1/tenants/${tenantId}/runs`, ExecutionRunsResponseSchema);
  return data.runs;
}

export async function fetchTenantRun(
  tenantId: string,
  runId: string
): Promise<ExecutionRun | null> {
  try {
    const data = await requestParsed(
      `/api/v1/tenants/${tenantId}/runs/${runId}`,
      ExecutionRunResponseSchema
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
    ApprovalRequestsResponseSchema
  );
  return data.approvals;
}

export async function approveRequest(tenantId: string, approvalId: string, reason?: string) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/approvals/${approvalId}/approve`,
    ApprovalResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
}

export async function rejectRequest(tenantId: string, approvalId: string, reason?: string) {
  return requestParsed(
    `/api/v1/tenants/${tenantId}/approvals/${approvalId}/reject`,
    ApprovalResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export async function fetchTenantSecurityFindings(tenantId: string): Promise<SecurityFinding[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/security/findings`,
    SecurityFindingsResponseSchema
  );
  return data.findings;
}

export async function fetchTenantSecurityPolicies(tenantId: string): Promise<SecurityPolicy[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/security/policies`,
    SecurityPoliciesResponseSchema
  );
  return data.policies;
}

export async function fetchTenantSecrets(tenantId: string): Promise<ApiSecret[]> {
  const data = await requestParsed(`/api/v1/tenants/${tenantId}/secrets`, secretsResponseSchema);
  return data.secrets;
}

export async function fetchTenantAuditLogs(tenantId: string) {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/security/audit-logs`,
    AuditEventsResponseSchema
  );
  return data.logs;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export async function fetchBillingOverview(tenantId: string): Promise<BillingOverview> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/billing/overview`,
    BillingOverviewResponseSchema
  );
  return data.overview;
}

export async function fetchTenantInvoices(tenantId: string): Promise<Invoice[]> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/billing/invoices`,
    BillingInvoicesResponseSchema
  );
  return data.invoices;
}

// ---------------------------------------------------------------------------
// Workflow Engine
// ---------------------------------------------------------------------------

export async function fetchWorkflowEngineStatus(tenantId: string): Promise<WorkflowEngineStatus> {
  const data = await requestParsed(
    `/api/v1/tenants/${tenantId}/n8n/status`,
    WorkflowEngineStatusResponseSchema
  );
  return data.status;
}
