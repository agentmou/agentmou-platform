/**
 * MockProvider — wraps the synchronous read-model functions with async signatures.
 *
 * Used by marketing/demo routes to show the full mock catalog.
 */

import type { DataProvider } from './provider';
import {
  listTenants as _listTenants,
  getTenant as _getTenant,
  listCatalogAgentTemplates as _listCatalogAgentTemplates,
  listMarketplaceAgentTemplates as _listMarketplaceAgentTemplates,
  getAgentTemplate as _getAgentTemplate,
  listCatalogWorkflowTemplates as _listCatalogWorkflowTemplates,
  listMarketplaceWorkflowTemplates as _listMarketplaceWorkflowTemplates,
  getWorkflowTemplate as _getWorkflowTemplate,
  listPackTemplates as _listPackTemplates,
  getPackTemplate as _getPackTemplate,
  listIntegrations as _listIntegrations,
  listTenantIntegrations as _listTenantIntegrations,
  listTenantInstalledAgents as _listTenantInstalledAgents,
  listTenantInstalledWorkflows as _listTenantInstalledWorkflows,
  listTenantApprovals as _listTenantApprovals,
  listTenantRuns as _listTenantRuns,
  getTenantRun as _getTenantRun,
  listTenantSecurityFindings as _listTenantSecurityFindings,
  listTenantSecurityPolicies as _listTenantSecurityPolicies,
  listTenantMembers as _listTenantMembers,
  listTenantInvoices as _listTenantInvoices,
  getTenantN8nConnection as _getTenantN8nConnection,
  listTenantSecrets as _listTenantSecrets,
  listTenantAuditEvents as _listTenantAuditEvents,
  getTenantBillingInfo as _getTenantBillingInfo,
  getTenantDashboardMetrics as _getTenantDashboardMetrics,
} from '@/lib/demo/read-model';

export const mockProvider: DataProvider = {
  providerMode: 'mock',
  // Catalog
  listCatalogAgentTemplates: async () => _listCatalogAgentTemplates(),
  listMarketplaceAgentTemplates: async () => _listMarketplaceAgentTemplates(),
  getAgentTemplate: async (id) => _getAgentTemplate(id) ?? null,
  listCatalogWorkflowTemplates: async () => _listCatalogWorkflowTemplates(),
  listMarketplaceWorkflowTemplates: async () => _listMarketplaceWorkflowTemplates(),
  getWorkflowTemplate: async (id) => _getWorkflowTemplate(id) ?? null,
  listPackTemplates: async () => _listPackTemplates(),
  getPackTemplate: async (id) => _getPackTemplate(id) ?? null,
  listIntegrations: async () => _listIntegrations(),

  // Tenancy
  listTenants: async () => _listTenants(),
  getTenant: async (id) => _getTenant(id),
  listTenantMembers: async (id) => _listTenantMembers(id),

  // Installations
  listTenantInstalledAgents: async (id) => _listTenantInstalledAgents(id),
  listTenantInstalledWorkflows: async (id) => _listTenantInstalledWorkflows(id),
  installAgent: async () => ({ ok: true }),
  installPack: async () => ({ ok: true }),

  // Execution
  listTenantRuns: async (id) => _listTenantRuns(id),
  getTenantRun: async (tenantId, runId) => _getTenantRun(tenantId, runId) ?? null,

  // Approvals
  listTenantApprovals: async (id) => _listTenantApprovals(id),
  approveRequest: async () => ({ ok: true }),
  rejectRequest: async () => ({ ok: true }),

  // Security
  listTenantSecurityFindings: async (id) => _listTenantSecurityFindings(id),
  listTenantSecurityPolicies: async (id) => _listTenantSecurityPolicies(id),
  listTenantSecrets: async (id) => _listTenantSecrets(id),
  listTenantAuditEvents: async (id) => _listTenantAuditEvents(id),

  // Billing
  listTenantInvoices: async (id) => _listTenantInvoices(id),
  getTenantBillingInfo: async (id) => _getTenantBillingInfo(id),

  // Dashboard
  getTenantDashboardMetrics: async (id, period) => _getTenantDashboardMetrics(id, period),

  // Connectors
  listTenantIntegrations: async (id) => _listTenantIntegrations(id),
  getTenantN8nConnection: async (id) => _getTenantN8nConnection(id) ?? null,
};
