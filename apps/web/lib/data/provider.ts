/**
 * DataProvider interface — unified data access for the tenant control-plane UI.
 *
 * Two implementations exist:
 *   - MockProvider: wraps read-model.ts (sync mock data, instant)
 *   - ApiProvider:  wraps lib/api/client.ts (real API calls)
 *
 * Marketing routes use MockProvider (full demo catalog).
 * App routes use ApiProvider (real tenant data).
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
  ApprovalRequest,
  ExecutionRun,
  SecurityFinding,
  SecurityPolicy,
  N8nConnection,
  Invoice,
  DashboardMetrics,
} from '@agentmou/contracts';

export type DataProviderMode = 'api' | 'demo' | 'mock';

export interface FleetSecret {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  lastRotated: string;
  usedBy: string[];
}

export interface FleetAuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  category: 'agent' | 'workflow' | 'security' | 'billing';
  details: string;
}

export interface FleetBillingInfo {
  plan: string;
  monthlySpend: number;
  agentsInstalled: number;
  runsThisMonth: number;
  includedRuns?: number | null;
  overageRuns?: number;
  overageAmount?: number;
  subscriptionStatus?: string;
  currency?: string;
  currentPeriodEnd?: string;
  paymentMethodSummary?: string;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface CatalogMethods {
  listCatalogAgentTemplates(): Promise<AgentTemplate[]>;
  listMarketplaceAgentTemplates(): Promise<AgentTemplate[]>;
  getAgentTemplate(agentId: string): Promise<AgentTemplate | null>;

  listCatalogWorkflowTemplates(): Promise<WorkflowTemplate[]>;
  listMarketplaceWorkflowTemplates(): Promise<WorkflowTemplate[]>;
  getWorkflowTemplate(workflowId: string): Promise<WorkflowTemplate | null>;

  listPackTemplates(): Promise<PackTemplate[]>;
  getPackTemplate(packIdOrSlug: string): Promise<PackTemplate | null>;

  listIntegrations(): Promise<Integration[]>;
}

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export interface TenancyMethods {
  listTenants(): Promise<Tenant[]>;
  getTenant(tenantId: string): Promise<Tenant | null>;
  listTenantMembers(tenantId: string): Promise<TenantMember[]>;
}

// ---------------------------------------------------------------------------
// Installations
// ---------------------------------------------------------------------------

export interface InstallationMethods {
  listTenantInstalledAgents(tenantId: string): Promise<InstalledAgent[]>;
  listTenantInstalledWorkflows(tenantId: string): Promise<InstalledWorkflow[]>;
  installAgent(
    tenantId: string,
    templateId: string,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
  installPack(
    tenantId: string,
    packId: string,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export interface ExecutionMethods {
  listTenantRuns(tenantId: string): Promise<ExecutionRun[]>;
  getTenantRun(tenantId: string, runId: string): Promise<ExecutionRun | null>;
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export interface ApprovalMethods {
  listTenantApprovals(tenantId: string): Promise<ApprovalRequest[]>;
  approveRequest(
    tenantId: string,
    approvalId: string,
    reason?: string,
  ): Promise<unknown>;
  rejectRequest(
    tenantId: string,
    approvalId: string,
    reason?: string,
  ): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Security & Compliance (stubs in API, full in mock)
// ---------------------------------------------------------------------------

export interface SecurityMethods {
  listTenantSecurityFindings(tenantId: string): Promise<SecurityFinding[]>;
  listTenantSecurityPolicies(tenantId: string): Promise<SecurityPolicy[]>;
  listTenantSecrets(tenantId: string): Promise<FleetSecret[]>;
  listTenantAuditEvents(tenantId: string): Promise<FleetAuditEvent[]>;
}

// ---------------------------------------------------------------------------
// Billing (stub in API)
// ---------------------------------------------------------------------------

export interface BillingMethods {
  listTenantInvoices(tenantId: string): Promise<Invoice[]>;
  getTenantBillingInfo(tenantId: string): Promise<FleetBillingInfo>;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardMethods {
  getTenantDashboardMetrics(
    tenantId: string,
    period?: DashboardMetrics['period'],
  ): Promise<DashboardMetrics>;
}

// ---------------------------------------------------------------------------
// Connectors / n8n
// ---------------------------------------------------------------------------

export interface ConnectorMethods {
  listTenantIntegrations(tenantId: string): Promise<Integration[]>;
  getTenantN8nConnection(tenantId: string): Promise<N8nConnection | null>;
}

export interface ProviderMetadata {
  providerMode: DataProviderMode;
}

// ---------------------------------------------------------------------------
// Composite DataProvider
// ---------------------------------------------------------------------------

export interface DataProvider
  extends ProviderMetadata,
    CatalogMethods,
    TenancyMethods,
    InstallationMethods,
    ExecutionMethods,
    ApprovalMethods,
    SecurityMethods,
    BillingMethods,
    DashboardMethods,
    ConnectorMethods {}
