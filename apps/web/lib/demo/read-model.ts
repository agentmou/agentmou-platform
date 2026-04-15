import {
  tenants,
  agentTemplates,
  workflowTemplates,
  packTemplates,
  integrations,
  installedAgents,
  installedWorkflows,
  approvalRequests,
  executionRuns,
  securityFindings,
  securityPolicies,
  tenantMembers,
  invoices,
  n8nConnections,
  mockSecrets,
  mockAuditEvents,
  mockBillingInfo,
} from '@/lib/demo-catalog';
import type {
  Tenant,
  TenantExperience,
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
  TenantMember,
  Invoice,
  N8nConnection,
  DashboardMetrics,
} from '@/lib/control-plane/types';
import { getTenantExperience as getClinicTenantExperience } from '@/lib/demo/clinic-read-model';

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
}

function isPublicAgent(agent: AgentTemplate): boolean {
  return !agent.visibility || agent.visibility === 'public';
}

function isPublicWorkflow(workflow: WorkflowTemplate): boolean {
  if (!workflow.visibility) return true;
  return workflow.visibility === 'public' || workflow.visibility === 'utility';
}

function dayCount(period: DashboardMetrics['period']): number {
  if (period === 'day') return 1;
  if (period === 'month') return 30;
  return 7;
}

function dateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function buildDateRange(days: number): string[] {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(end);
    current.setUTCDate(end.getUTCDate() - (days - 1 - index));
    return current.toISOString().slice(0, 10);
  });
}

function topCounts(items: (string | undefined)[], maxItems: number) {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item) continue;
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxItems);
}

export function listTenants(): Tenant[] {
  return [...tenants];
}

export function getTenant(tenantId: string): Tenant {
  return tenants.find((tenant) => tenant.id === tenantId) || tenants[0];
}

export function getTenantExperience(tenantId: string): TenantExperience | null {
  if (tenantId === 'demo-workspace') {
    return getClinicTenantExperience(tenantId);
  }

  const tenant = tenants.find((item) => item.id === tenantId);
  if (!tenant) {
    return null;
  }

  const activeVertical =
    tenant.settings.activeVertical ?? (tenant.settings.verticalClinicUi ? 'clinic' : 'internal');

  if (activeVertical === 'clinic') {
    return getClinicTenantExperience(tenantId);
  }

  if (activeVertical === 'fisio') {
    return {
      tenantId,
      activeVertical: 'fisio',
      shellKey: 'fisio',
      defaultRoute: `/app/${tenantId}/dashboard`,
      normalizedRole: 'admin',
      permissions: [],
      allowedNavigation: ['dashboard', 'configuration'],
      modules: [],
      flags: {
        activeVertical: 'fisio',
        isPlatformAdminTenant: Boolean(tenant.settings.isPlatformAdminTenant),
        adminConsoleEnabled: false,
        verticalClinicUi: Boolean(tenant.settings.verticalClinicUi),
        clinicDentalMode: Boolean(tenant.settings.clinicDentalMode),
        voiceInboundEnabled: false,
        voiceOutboundEnabled: false,
        whatsappOutboundEnabled: false,
        intakeFormsEnabled: false,
        appointmentConfirmationsEnabled: false,
        smartGapFillEnabled: false,
        reactivationEnabled: false,
        advancedClinicModeEnabled: false,
        internalPlatformVisible: false,
      },
      featureDecisions: {
        voiceInboundEnabled: {
          enabled: false,
          source: 'entitlement',
          reason: 'not_in_plan',
          moduleKey: 'voice',
        },
        voiceOutboundEnabled: {
          enabled: false,
          source: 'entitlement',
          reason: 'not_in_plan',
          moduleKey: 'voice',
        },
        whatsappOutboundEnabled: {
          enabled: false,
          source: 'readiness',
          reason: 'channel_missing',
          moduleKey: 'core_reception',
          channelType: 'whatsapp',
        },
        intakeFormsEnabled: {
          enabled: false,
          source: 'entitlement',
          reason: 'not_in_plan',
          moduleKey: 'core_reception',
        },
        appointmentConfirmationsEnabled: {
          enabled: false,
          source: 'entitlement',
          reason: 'not_in_plan',
          moduleKey: 'core_reception',
        },
        smartGapFillEnabled: {
          enabled: false,
          source: 'entitlement',
          reason: 'not_in_plan',
          moduleKey: 'growth',
        },
        reactivationEnabled: {
          enabled: false,
          source: 'entitlement',
          reason: 'not_in_plan',
          moduleKey: 'growth',
        },
        advancedClinicModeEnabled: {
          enabled: false,
          source: 'entitlement',
          reason: 'not_in_plan',
          moduleKey: 'advanced_mode',
        },
        internalPlatformVisible: {
          enabled: false,
          source: 'internal_access',
          reason: 'hidden_internal_only',
          moduleKey: 'internal_platform',
        },
        adminConsoleEnabled: {
          enabled: false,
          source: 'internal_access',
          reason: 'hidden_internal_only',
        },
      },
      settingsSections: [
        'general',
        'team',
        'integrations',
        'plan',
        'security',
        'care_profile',
        'care_schedule',
      ],
      canAccessInternalPlatform: false,
      canAccessAdminConsole: false,
    };
  }

  return {
    tenantId,
    activeVertical: 'internal',
    shellKey: 'platform_internal',
    defaultRoute: `/app/${tenantId}/dashboard`,
    normalizedRole: 'admin',
    permissions: ['view_internal_platform'],
    allowedNavigation: ['platform_internal'],
    modules: [],
    flags: {
      activeVertical: 'internal',
      isPlatformAdminTenant: Boolean(tenant.settings.isPlatformAdminTenant),
      adminConsoleEnabled: Boolean(tenant.settings.isPlatformAdminTenant),
      verticalClinicUi: false,
      clinicDentalMode: false,
      voiceInboundEnabled: false,
      voiceOutboundEnabled: false,
      whatsappOutboundEnabled: false,
      intakeFormsEnabled: false,
      appointmentConfirmationsEnabled: false,
      smartGapFillEnabled: false,
      reactivationEnabled: false,
      advancedClinicModeEnabled: false,
      internalPlatformVisible: true,
    },
    featureDecisions: {
      voiceInboundEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'voice',
      },
      voiceOutboundEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'voice',
      },
      whatsappOutboundEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'core_reception',
        channelType: 'whatsapp',
      },
      intakeFormsEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'core_reception',
      },
      appointmentConfirmationsEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'core_reception',
      },
      smartGapFillEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'growth',
      },
      reactivationEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'growth',
      },
      advancedClinicModeEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'advanced_mode',
      },
      internalPlatformVisible: {
        enabled: true,
        source: 'internal_access',
        moduleKey: 'internal_platform',
      },
      adminConsoleEnabled: tenant.settings.isPlatformAdminTenant
        ? {
            enabled: true,
            source: 'internal_access',
          }
        : {
            enabled: false,
            source: 'internal_access',
            reason: 'not_admin_tenant',
          },
    },
    settingsSections: tenant.settings.isPlatformAdminTenant
      ? [
          'general',
          'team',
          'integrations',
          'plan',
          'security',
          'internal_defaults',
          'internal_approvals',
        ]
      : ['general', 'team', 'integrations', 'plan', 'security', 'internal_defaults'],
    canAccessInternalPlatform: true,
    canAccessAdminConsole: Boolean(tenant.settings.isPlatformAdminTenant),
  };
}

export function listCatalogAgentTemplates(): AgentTemplate[] {
  return [...agentTemplates];
}

export function listMarketplaceAgentTemplates(): AgentTemplate[] {
  return agentTemplates.filter(isPublicAgent);
}

export function getAgentTemplate(agentId: string): AgentTemplate | undefined {
  return agentTemplates.find((agent) => agent.id === agentId);
}

export function listCatalogWorkflowTemplates(): WorkflowTemplate[] {
  return [...workflowTemplates];
}

export function listMarketplaceWorkflowTemplates(): WorkflowTemplate[] {
  return workflowTemplates.filter(isPublicWorkflow);
}

export function getWorkflowTemplate(workflowId: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((workflow) => workflow.id === workflowId);
}

export function listPackTemplates(): PackTemplate[] {
  return [...packTemplates];
}

export function getPackTemplate(packIdOrSlug: string): PackTemplate | undefined {
  return packTemplates.find((pack) => pack.id === packIdOrSlug || pack.slug === packIdOrSlug);
}

export function listIntegrations(): Integration[] {
  return [...integrations];
}

export function listTenantIntegrations(_tenantId: string): Integration[] {
  return listIntegrations();
}

export function listTenantInstalledAgents(tenantId: string): InstalledAgent[] {
  return installedAgents.filter((agent) => agent.tenantId === tenantId);
}

export function listTenantInstalledWorkflows(tenantId: string): InstalledWorkflow[] {
  return installedWorkflows.filter((workflow) => workflow.tenantId === tenantId);
}

export function listTenantAgentTemplates(tenantId: string): AgentTemplate[] {
  const templateIds = new Set(
    listTenantInstalledAgents(tenantId).map((installation) => installation.templateId)
  );

  return listCatalogAgentTemplates().filter((template) => templateIds.has(template.id));
}

export function listTenantWorkflowTemplates(tenantId: string): WorkflowTemplate[] {
  const templateIds = new Set(
    listTenantInstalledWorkflows(tenantId).map((installation) => installation.templateId)
  );

  return listCatalogWorkflowTemplates().filter((template) => templateIds.has(template.id));
}

export function listTenantApprovals(tenantId: string): ApprovalRequest[] {
  return approvalRequests.filter((approval) => approval.tenantId === tenantId);
}

export function listTenantRuns(tenantId: string): ExecutionRun[] {
  return executionRuns.filter((run) => run.tenantId === tenantId);
}

export function getTenantRun(tenantId: string, runId: string): ExecutionRun | undefined {
  return listTenantRuns(tenantId).find((run) => run.id === runId);
}

export function listTenantSecurityFindings(tenantId: string): SecurityFinding[] {
  return securityFindings.filter((finding) => finding.tenantId === tenantId);
}

export function listTenantSecurityPolicies(tenantId: string): SecurityPolicy[] {
  const scopedPolicies = securityPolicies.filter((policy) => policy.tenantId === tenantId);
  return scopedPolicies.length > 0 ? scopedPolicies : [...securityPolicies];
}

export function listTenantMembers(tenantId: string): TenantMember[] {
  return tenantMembers.filter((member) => member.tenantId === tenantId);
}

export function listTenantInvoices(tenantId: string): Invoice[] {
  return invoices.filter((invoice) => invoice.tenantId === tenantId);
}

export function getTenantN8nConnection(tenantId: string): N8nConnection | undefined {
  return n8nConnections.find((connection) => connection.tenantId === tenantId);
}

export function listTenantSecrets(_tenantId: string): FleetSecret[] {
  return mockSecrets.map((secret) => ({ ...secret }));
}

export function listTenantAuditEvents(_tenantId: string): FleetAuditEvent[] {
  return mockAuditEvents.map((event) => ({
    ...event,
    category: event.category as FleetAuditEvent['category'],
  }));
}

export function getTenantBillingInfo(_tenantId: string): FleetBillingInfo {
  return { ...mockBillingInfo };
}

export function getTenantDashboardMetrics(
  tenantId: string,
  period: DashboardMetrics['period'] = 'week'
): DashboardMetrics {
  const runs = listTenantRuns(tenantId);
  const days = dayCount(period);
  const dateRange = buildDateRange(days);
  const visibleRuns = runs.filter((run) => dateRange.includes(dateKey(run.startedAt)));

  const runsTotal = visibleRuns.length;
  const runsSuccess = visibleRuns.filter((run) => run.status === 'success').length;
  const runsFailed = visibleRuns.filter((run) => run.status === 'failed').length;
  const avgLatencyMs = runsTotal
    ? Math.round(visibleRuns.reduce((acc, run) => acc + (run.durationMs || 0), 0) / runsTotal)
    : 0;

  const totalCost = visibleRuns.reduce((acc, run) => acc + run.costEstimate, 0);

  const topAgents = topCounts(
    visibleRuns.map((run) => run.agentId),
    5
  ).map(([agentId, count]) => ({
    agentId,
    runs: count,
  }));

  const topWorkflows = topCounts(
    visibleRuns.map((run) => run.workflowId),
    5
  ).map(([workflowId, count]) => ({
    workflowId,
    runs: count,
  }));

  const runsByDay = dateRange.map((date) => ({
    date,
    count: visibleRuns.filter((run) => dateKey(run.startedAt) === date).length,
  }));

  const costByDay = dateRange.map((date) => ({
    date,
    cost: Number(
      visibleRuns
        .filter((run) => dateKey(run.startedAt) === date)
        .reduce((acc, run) => acc + run.costEstimate, 0)
        .toFixed(4)
    ),
  }));

  const errorsByType = [
    {
      type: 'Execution Failure',
      count: visibleRuns.filter((run) => run.status === 'failed').length,
    },
    {
      type: 'Timeout',
      count: visibleRuns.filter((run) => run.status === 'timeout').length,
    },
    {
      type: 'Pending Approval',
      count: visibleRuns.filter((run) => run.status === 'pending_approval').length,
    },
    {
      type: 'Rejected',
      count: visibleRuns.filter((run) => run.status === 'rejected').length,
    },
  ].filter((item) => item.count > 0);

  return {
    tenantId,
    period,
    runsTotal,
    runsSuccess,
    runsFailed,
    avgLatencyMs,
    totalCost,
    topAgents,
    topWorkflows,
    costByDay,
    runsByDay,
    errorsByType,
  };
}
