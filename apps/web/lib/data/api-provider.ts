/**
 * ApiProvider — wraps the real API client for authenticated app routes.
 *
 * Security, billing, and workflow engine surfaces now fetch live tenant data
 * where the backend is available, while dashboard rollups are still derived
 * from run history on the client side.
 */

import type { DataProvider } from './provider';
import {
  fetchBillingOverview,
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
  fetchTenantAuditLogs,
  fetchTenantInvoices,
  fetchTenantSecrets,
  fetchTenantSecurityFindings,
  fetchTenantSecurityPolicies,
  fetchWorkflowEngineStatus,
  approveRequest as apiApprove,
  rejectRequest as apiReject,
} from '@/lib/api/client';

import { buildDashboardMetrics } from './dashboard-metrics';

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

  // Security — backed by live tenant aggregates where available
  listTenantSecurityFindings: (id) => fetchTenantSecurityFindings(id),
  listTenantSecurityPolicies: (id) => fetchTenantSecurityPolicies(id),
  listTenantSecrets: async (id) => {
    const secrets = await fetchTenantSecrets(id);
    return secrets.map((secret) => ({
      id: secret.id,
      key: secret.key,
      value: 'redacted',
      createdAt: secret.createdAt,
      lastRotated: secret.rotatedAt ?? secret.createdAt,
      usedBy: secret.connectorAccountId ? [secret.connectorAccountId] : [],
    }));
  },
  listTenantAuditEvents: async (id) => {
    const logs = await fetchTenantAuditLogs(id);
    return logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      actor: log.actorLabel,
      category: log.category === 'membership' || log.category === 'connector'
        ? 'security'
        : log.category === 'approval'
          ? 'workflow'
          : log.category === 'auth'
            ? 'security'
            : log.category,
      details: Object.entries(log.details)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', '),
    }));
  },

  // Billing
  listTenantInvoices: (id) => fetchTenantInvoices(id),
  getTenantBillingInfo: async (id) => {
    const [overview, agents] = await Promise.all([
      fetchBillingOverview(id),
      fetchInstalledAgents(id),
    ]);
    const primaryPaymentMethod = overview.paymentMethods.find(
      (method) => method.isDefault,
    );
    return {
      plan: overview.subscription.plan,
      monthlySpend: overview.subscription.monthlyBaseAmount,
      agentsInstalled: agents.length,
      runsThisMonth: overview.usage.billableRuns,
      includedRuns: overview.usage.includedRuns,
      overageRuns: overview.usage.overageRuns,
      overageAmount: overview.usage.overageAmount,
      subscriptionStatus: overview.subscription.status,
      currency: overview.subscription.currency,
      currentPeriodEnd: overview.subscription.currentPeriodEnd,
      paymentMethodSummary: primaryPaymentMethod?.last4
        ? `${primaryPaymentMethod.brand?.toUpperCase() || 'CARD'} •••• ${primaryPaymentMethod.last4}`
        : undefined,
    };
  },

  // Dashboard — computed from real runs until the API exposes rollups
  getTenantDashboardMetrics: async (tenantId, period) => {
    const runs = await fetchTenantRuns(tenantId);
    return buildDashboardMetrics(tenantId, runs, period);
  },

  // Connectors
  listTenantIntegrations: (id) => fetchConnectors(id),
  getTenantN8nConnection: async (id) => {
    const status = await fetchWorkflowEngineStatus(id);
    return {
      tenantId: status.tenantId,
      baseUrl: status.baseUrl,
      apiKeySet: status.apiKeySet,
      lastTestAt: status.lastTestAt,
      lastTestStatus: status.lastTestStatus,
      executionCount: status.executionCount,
      availability: status.availability,
      installedWorkflows: status.installedWorkflows,
      activeWorkflows: status.activeWorkflows,
      lastProvisionedAt: status.lastProvisionedAt,
      lastExecutionAt: status.lastExecutionAt,
      platformManaged: status.platformManaged,
    };
  },
};
