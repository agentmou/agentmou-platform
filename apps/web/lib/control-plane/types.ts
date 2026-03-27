/**
 * Domain types for the tenant control-plane UI layer.
 *
 * All canonical domain types are defined in @agentmou/contracts and
 * re-exported here so existing page/component imports remain stable.
 */

export type {
  // Catalog
  Category,
  CatalogGroup,
  PackVertical,
  RiskLevel,
  Availability,
  Audience,
  HITLMode,
  Complexity,
  VersionChannel,
  Visibility,
  WorkflowVisibility,
  AgentDomain,
  WorkflowTriggerType,
  AgentTemplate,
  WorkflowNode,
  WorkflowTemplate,
  PackTemplate,
  // Tenancy
  TenantType,
  TenantPlan,
  Tenant,
  UserRole,
  TenantMember,
  // Installations
  InstalledStatus,
  InstalledAgent,
  InstalledWorkflow,
  InstallStepStatus,
  InstallStep,
  InstallRun,
  // Execution
  ExecutionStatus,
  ExecutionStep,
  ExecutionRun,
  // Approvals
  ApprovalActionType,
  ApprovalRequest,
  // Connectors
  IntegrationStatus,
  Integration,
  N8nConnection,
  // Security
  FindingSeverity,
  SecurityFinding,
  SecurityPolicy,
  TenantSecurityScore,
  // Billing
  UsageMetric,
  Invoice,
  // Dashboard
  DashboardMetrics,
} from '@agentmou/contracts';
