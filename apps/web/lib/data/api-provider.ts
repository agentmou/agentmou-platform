/**
 * ApiProvider — wraps the real API client for authenticated app routes.
 *
 * Methods whose API module is still a stub (security, billing, n8n)
 * return empty defaults so pages render gracefully with empty states.
 */

import type { DashboardMetrics } from '@agentmou/contracts';
import type { DataProvider } from './provider';
import {
  fetchTenants,
  fetchTenant,
  fetchTenantMembers,
  fetchCatalogAgents,
  fetchCatalogAgent,
  fetchCatalogPacks,
  fetchCatalogPack,
  fetchCatalogWorkflows,
  fetchInstalledAgents,
  fetchInstalledWorkflows,
  installAgent as apiInstallAgent,
  installPack as apiInstallPack,
  fetchConnectors,
  fetchTenantRuns,
  fetchTenantRun,
  fetchTenantApprovals,
  approveRequest as apiApprove,
  rejectRequest as apiReject,
} from '@/lib/api/client';

function emptyMetrics(tenantId: string, period: DashboardMetrics['period'] = 'week'): DashboardMetrics {
  return {
    tenantId,
    period,
    runsTotal: 0,
    runsSuccess: 0,
    runsFailed: 0,
    avgLatencyMs: 0,
    totalCost: 0,
    topAgents: [],
    topWorkflows: [],
    runsByDay: [],
    costByDay: [],
    errorsByType: [],
  };
}

export const apiProvider: DataProvider = {
  providerMode: 'api',
  // Catalog
  listCatalogAgentTemplates: () => fetchCatalogAgents(),
  listMarketplaceAgentTemplates: () => fetchCatalogAgents(),
  getAgentTemplate: (id) => fetchCatalogAgent(id),
  listCatalogWorkflowTemplates: () => fetchCatalogWorkflows(),
  listMarketplaceWorkflowTemplates: () => fetchCatalogWorkflows(),
  getWorkflowTemplate: async (id) => {
    const all = await fetchCatalogWorkflows();
    return all.find((w) => w.id === id) ?? null;
  },
  listPackTemplates: () => fetchCatalogPacks(),
  getPackTemplate: (id) => fetchCatalogPack(id),
  listIntegrations: async (tenantId?: string) => {
    if (!tenantId) return [];
    return fetchConnectors(tenantId);
  },

  // Tenancy
  listTenants: () => fetchTenants(),
  getTenant: (id) => fetchTenant(id),
  listTenantMembers: (id) => fetchTenantMembers(id),

  // Installations
  listTenantInstalledAgents: (id) => fetchInstalledAgents(id),
  listTenantInstalledWorkflows: (id) => fetchInstalledWorkflows(id),
  installAgent: (tenantId, templateId, config) =>
    apiInstallAgent(tenantId, templateId, config),
  installPack: (tenantId, packId, config) =>
    apiInstallPack(tenantId, packId, config),

  // Execution
  listTenantRuns: (id) => fetchTenantRuns(id),
  getTenantRun: (tenantId, runId) => fetchTenantRun(tenantId, runId),

  // Approvals
  listTenantApprovals: (id) => fetchTenantApprovals(id),
  approveRequest: (tenantId, approvalId, reason) =>
    apiApprove(tenantId, approvalId, reason),
  rejectRequest: (tenantId, approvalId, reason) =>
    apiReject(tenantId, approvalId, reason),

  // Security — API modules are stubs, return empty
  listTenantSecurityFindings: async () => [],
  listTenantSecurityPolicies: async () => [],
  listTenantSecrets: async () => [],
  listTenantAuditEvents: async () => [],

  // Billing — API module is stub
  listTenantInvoices: async () => [],
  getTenantBillingInfo: async () => ({
    plan: 'free',
    monthlySpend: 0,
    agentsInstalled: 0,
    runsThisMonth: 0,
  }),

  // Dashboard — computed from runs when API endpoint doesn't exist yet
  getTenantDashboardMetrics: async (tenantId, period) =>
    emptyMetrics(tenantId, period),

  // Connectors
  listTenantIntegrations: (id) => fetchConnectors(id),
  getTenantN8nConnection: async () => null,
};
