/**
 * Typed API client for the Agentmou Control Plane API.
 *
 * All methods return typed data using @agentmou/contracts types.
 * Set NEXT_PUBLIC_API_URL in your environment to point to the API server.
 */

import {
  AdminDeleteTenantUserResponseSchema,
  AdminStartImpersonationResponseSchema,
  AdminStopImpersonationResponseSchema,
  AdminTenantDetailResponseSchema,
  AdminTenantListResponseSchema,
  AdminTenantFeatureResolutionResponseSchema,
  AdminTenantUserMutationResponseSchema,
  AdminTenantUsersResponseSchema,
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
  TenantExperienceResponseSchema,
  TenantResponseSchema,
  TenantsResponseSchema,
  WorkflowTemplatesResponseSchema,
  WorkflowEngineStatusResponseSchema,
  type AdminChangeTenantVerticalInput,
  type AdminUpdateTenantEnabledVerticalsInput,
  type AdminCreateTenantUserInput,
  type AdminDeleteTenantUserResponse,
  type AdminStartImpersonationInput,
  type AdminStartImpersonationResponse,
  type AdminStopImpersonationInput,
  type AdminStopImpersonationResponse,
  type AdminTenantDetail,
  type AdminTenantFeatureResolution,
  type AdminTenantListFilters,
  type AdminTenantListResponse,
  type AdminTenantUser,
  type AdminTenantUserMutationResponse,
  type AdminUpdateTenantUserInput,
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
  type TenantExperience,
  type TenantMember,
  type WorkflowEngineStatus,
  type WorkflowTemplate,
} from '@agentmou/contracts';
import { z } from 'zod';

import { buildQueryString, isApiNotFound, requestParsed } from './core';

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
export { ApiContractError, ApiError } from './core';

function adminHeaders(adminTenantId: string, headers?: HeadersInit): HeadersInit {
  return {
    ...headers,
    'x-tenant-id': adminTenantId,
  };
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

export async function fetchTenantExperience(tenantId: string): Promise<TenantExperience | null> {
  try {
    const data = await requestParsed(
      `/api/v1/tenants/${tenantId}/experience`,
      TenantExperienceResponseSchema
    );
    return data.experience;
  } catch (error) {
    if (isApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function fetchAdminTenants(
  adminTenantId: string,
  filters: AdminTenantListFilters = {}
): Promise<AdminTenantListResponse> {
  return requestParsed(
    `/api/v1/admin/tenants${buildQueryString(filters)}`,
    AdminTenantListResponseSchema,
    {
      headers: adminHeaders(adminTenantId),
    }
  );
}

export async function fetchAdminTenantDetail(
  adminTenantId: string,
  tenantId: string
): Promise<AdminTenantDetail | null> {
  try {
    const data = await requestParsed(
      `/api/v1/admin/tenants/${tenantId}`,
      AdminTenantDetailResponseSchema,
      {
        headers: adminHeaders(adminTenantId),
      }
    );
    return data.tenant;
  } catch (error) {
    if (isApiNotFound(error)) {
      return null;
    }

    throw error;
  }
}

export async function fetchAdminTenantUsers(
  adminTenantId: string,
  tenantId: string
): Promise<AdminTenantUser[]> {
  const data = await requestParsed(
    `/api/v1/admin/tenants/${tenantId}/users`,
    AdminTenantUsersResponseSchema,
    {
      headers: adminHeaders(adminTenantId),
    }
  );
  return data.users;
}

export async function fetchAdminTenantFeatureResolution(
  adminTenantId: string,
  tenantId: string
): Promise<AdminTenantFeatureResolution | null> {
  try {
    const data = await requestParsed(
      `/api/v1/admin/tenants/${tenantId}/feature-resolution`,
      AdminTenantFeatureResolutionResponseSchema,
      {
        headers: adminHeaders(adminTenantId),
      }
    );
    return data.resolution;
  } catch (error) {
    if (isApiNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export async function createAdminTenantUser(
  adminTenantId: string,
  tenantId: string,
  body: AdminCreateTenantUserInput
): Promise<AdminTenantUserMutationResponse> {
  return requestParsed(
    `/api/v1/admin/tenants/${tenantId}/users`,
    AdminTenantUserMutationResponseSchema,
    {
      method: 'POST',
      headers: adminHeaders(adminTenantId),
      body: JSON.stringify(body),
    }
  );
}

export async function updateAdminTenantUser(
  adminTenantId: string,
  tenantId: string,
  userId: string,
  body: AdminUpdateTenantUserInput
): Promise<AdminTenantUserMutationResponse> {
  return requestParsed(
    `/api/v1/admin/tenants/${tenantId}/users/${userId}`,
    AdminTenantUserMutationResponseSchema,
    {
      method: 'PATCH',
      headers: adminHeaders(adminTenantId),
      body: JSON.stringify(body),
    }
  );
}

export async function deleteAdminTenantUser(
  adminTenantId: string,
  tenantId: string,
  userId: string
): Promise<AdminDeleteTenantUserResponse> {
  return requestParsed(
    `/api/v1/admin/tenants/${tenantId}/users/${userId}`,
    AdminDeleteTenantUserResponseSchema,
    {
      method: 'DELETE',
      headers: adminHeaders(adminTenantId),
    }
  );
}

export async function changeAdminTenantVertical(
  adminTenantId: string,
  tenantId: string,
  body: AdminChangeTenantVerticalInput
): Promise<AdminTenantDetail> {
  const data = await requestParsed(
    `/api/v1/admin/tenants/${tenantId}/vertical`,
    AdminTenantDetailResponseSchema,
    {
      method: 'PATCH',
      headers: adminHeaders(adminTenantId),
      body: JSON.stringify(body),
    }
  );
  return data.tenant;
}

export async function updateAdminTenantEnabledVerticals(
  adminTenantId: string,
  tenantId: string,
  body: AdminUpdateTenantEnabledVerticalsInput
): Promise<AdminTenantDetail> {
  const data = await requestParsed(
    `/api/v1/admin/tenants/${tenantId}/verticals-enabled`,
    AdminTenantDetailResponseSchema,
    {
      method: 'PATCH',
      headers: adminHeaders(adminTenantId),
      body: JSON.stringify(body),
    }
  );
  return data.tenant;
}

export async function startAdminImpersonation(
  adminTenantId: string,
  tenantId: string,
  body: AdminStartImpersonationInput
): Promise<AdminStartImpersonationResponse> {
  return requestParsed(
    `/api/v1/admin/tenants/${tenantId}/impersonation`,
    AdminStartImpersonationResponseSchema,
    {
      method: 'POST',
      headers: adminHeaders(adminTenantId),
      body: JSON.stringify(body),
    }
  );
}

export async function stopAdminImpersonation(
  body: AdminStopImpersonationInput
): Promise<AdminStopImpersonationResponse> {
  return requestParsed('/api/v1/admin/impersonation/stop', AdminStopImpersonationResponseSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
