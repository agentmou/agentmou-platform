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
  dashboardMetrics,
  n8nConnections,
} from './mock-data'
import type {
  Tenant,
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
  DashboardMetrics,
  N8nConnection,
  InstallRun,
  AgentDomain,
  RiskLevel,
} from './types'

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Tenants
export async function getTenants(): Promise<Tenant[]> {
  await delay(200)
  return tenants
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  await delay(150)
  return tenants.find(t => t.id === tenantId) || null
}

// Marketplace - Agents
export async function listMarketplaceAgents(filters?: {
  domain?: AgentDomain
  riskLevel?: RiskLevel
  search?: string
}): Promise<AgentTemplate[]> {
  await delay(300)
  let result = [...agentTemplates]
  
  if (filters?.domain) {
    result = result.filter(a => a.domain === filters.domain)
  }
  if (filters?.riskLevel) {
    result = result.filter(a => a.riskLevel === filters.riskLevel)
  }
  if (filters?.search) {
    const search = filters.search.toLowerCase()
    result = result.filter(a => 
      a.name.toLowerCase().includes(search) || 
      a.outcome.toLowerCase().includes(search) ||
      a.description.toLowerCase().includes(search)
    )
  }
  
  return result
}

export async function getAgentTemplate(agentId: string): Promise<AgentTemplate | null> {
  await delay(200)
  return agentTemplates.find(a => a.id === agentId) || null
}

// Marketplace - Workflows
export async function listMarketplaceWorkflows(filters?: {
  integrations?: string[]
  riskLevel?: RiskLevel
  search?: string
}): Promise<WorkflowTemplate[]> {
  await delay(300)
  let result = [...workflowTemplates]
  
  if (filters?.integrations?.length) {
    result = result.filter(w => 
      filters.integrations!.some(i => w.integrations.includes(i))
    )
  }
  if (filters?.riskLevel) {
    result = result.filter(w => w.riskLevel === filters.riskLevel)
  }
  if (filters?.search) {
    const search = filters.search.toLowerCase()
    result = result.filter(w => 
      w.name.toLowerCase().includes(search) || 
      w.summary.toLowerCase().includes(search)
    )
  }
  
  return result
}

export async function getWorkflowTemplate(workflowId: string): Promise<WorkflowTemplate | null> {
  await delay(200)
  return workflowTemplates.find(w => w.id === workflowId) || null
}

// Marketplace - Packs
export async function listPacks(): Promise<PackTemplate[]> {
  await delay(250)
  return packTemplates
}

export async function getPack(packId: string): Promise<PackTemplate | null> {
  await delay(200)
  return packTemplates.find(p => p.id === packId) || null
}

// Integrations
export async function listIntegrations(tenantId: string): Promise<Integration[]> {
  await delay(200)
  return integrations
}

export async function getIntegration(integrationId: string): Promise<Integration | null> {
  await delay(150)
  return integrations.find(i => i.id === integrationId) || null
}

export async function testIntegration(integrationId: string): Promise<{ success: boolean; message: string }> {
  await delay(1500)
  const integration = integrations.find(i => i.id === integrationId)
  if (!integration) {
    return { success: false, message: 'Integration not found' }
  }
  if (integration.status !== 'connected') {
    return { success: false, message: 'Integration not connected' }
  }
  return { success: true, message: 'Connection successful' }
}

export async function connectIntegration(integrationId: string): Promise<{ success: boolean; authUrl?: string }> {
  await delay(500)
  const integration = integrations.find(i => i.id === integrationId)
  if (!integration) {
    return { success: false }
  }
  return { success: true, authUrl: integration.oauthUrl || `/api/oauth/${integrationId}` }
}

// Installed Agents
export async function listInstalledAgents(tenantId: string): Promise<InstalledAgent[]> {
  await delay(250)
  return installedAgents.filter(a => a.tenantId === tenantId)
}

export async function getInstalledAgent(installedAgentId: string): Promise<InstalledAgent | null> {
  await delay(200)
  return installedAgents.find(a => a.id === installedAgentId) || null
}

// Installed Workflows
export async function listInstalledWorkflows(tenantId: string): Promise<InstalledWorkflow[]> {
  await delay(250)
  return installedWorkflows.filter(w => w.tenantId === tenantId)
}

export async function getInstalledWorkflow(installedWorkflowId: string): Promise<InstalledWorkflow | null> {
  await delay(200)
  return installedWorkflows.find(w => w.id === installedWorkflowId) || null
}

// Installation
export async function createInstallRun(tenantId: string, config: Partial<InstallRun>): Promise<InstallRun> {
  await delay(500)
  const installRun: InstallRun = {
    id: `install-${Date.now()}`,
    tenantId,
    packId: config.packId,
    selectedAgents: config.selectedAgents || [],
    selectedWorkflows: config.selectedWorkflows || [],
    status: 'draft',
    steps: [
      { id: 'step-1', name: 'Choose Outcome', description: 'Select your goal', status: 'completed' },
      { id: 'step-2', name: 'Select Components', description: 'Pick agents and workflows', status: 'completed' },
      { id: 'step-3', name: 'Connect Integrations', description: 'Link required apps', status: 'pending' },
      { id: 'step-4', name: 'Configure Variables', description: 'Set up parameters', status: 'pending' },
      { id: 'step-5', name: 'Risk & HITL', description: 'Set approval rules', status: 'pending' },
      { id: 'step-6', name: 'Review & Install', description: 'Confirm and deploy', status: 'pending' },
    ],
    config: {
      outcome: config.config?.outcome,
      integrations: {},
      variables: {},
      hitlSettings: {},
    },
    createdAt: new Date().toISOString(),
  }
  return installRun
}

export async function updateInstallRun(installId: string, updates: Partial<InstallRun>): Promise<InstallRun> {
  await delay(300)
  // In a real app, this would update the database
  return { ...updates, id: installId } as InstallRun
}

export async function executeInstallRun(installId: string): Promise<{ success: boolean; message: string }> {
  await delay(3000)
  return { success: true, message: 'Installation completed successfully' }
}

// Execution Runs
export async function listRuns(tenantId: string, filters?: {
  agentId?: string
  workflowId?: string
  status?: string
  limit?: number
}): Promise<ExecutionRun[]> {
  await delay(300)
  let result = executionRuns.filter(r => r.tenantId === tenantId)
  
  if (filters?.agentId) {
    result = result.filter(r => r.agentId === filters.agentId)
  }
  if (filters?.workflowId) {
    result = result.filter(r => r.workflowId === filters.workflowId)
  }
  if (filters?.status) {
    result = result.filter(r => r.status === filters.status)
  }
  if (filters?.limit) {
    result = result.slice(0, filters.limit)
  }
  
  return result
}

export async function getRun(runId: string): Promise<ExecutionRun | null> {
  await delay(200)
  return executionRuns.find(r => r.id === runId) || null
}

// Approvals
export async function listApprovals(tenantId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<ApprovalRequest[]> {
  await delay(250)
  let result = approvalRequests.filter(a => a.tenantId === tenantId)
  if (status) {
    result = result.filter(a => a.status === status)
  }
  return result
}

export async function getApproval(approvalId: string): Promise<ApprovalRequest | null> {
  await delay(200)
  return approvalRequests.find(a => a.id === approvalId) || null
}

export async function approveRequest(approvalId: string, reason?: string): Promise<{ success: boolean }> {
  await delay(500)
  const approval = approvalRequests.find(a => a.id === approvalId)
  if (!approval) return { success: false }
  
  // In a real app, this would update the database
  approval.status = 'approved'
  approval.decidedAt = new Date().toISOString()
  approval.decidedBy = 'current-user'
  approval.decisionReason = reason
  
  return { success: true }
}

export async function rejectRequest(approvalId: string, reason: string): Promise<{ success: boolean }> {
  await delay(500)
  const approval = approvalRequests.find(a => a.id === approvalId)
  if (!approval) return { success: false }
  
  approval.status = 'rejected'
  approval.decidedAt = new Date().toISOString()
  approval.decidedBy = 'current-user'
  approval.decisionReason = reason
  
  return { success: true }
}

// Security
export async function getSecurityScore(tenantId: string): Promise<{
  score: number
  findings: SecurityFinding[]
  policies: SecurityPolicy[]
  lastScanAt: string
}> {
  await delay(400)
  const findings = securityFindings.filter(f => f.tenantId === tenantId)
  const unresolvedFindings = findings.filter(f => !f.resolvedAt)
  
  // Calculate score based on findings
  let score = 100
  unresolvedFindings.forEach(f => {
    if (f.severity === 'critical') score -= 25
    else if (f.severity === 'high') score -= 15
    else if (f.severity === 'medium') score -= 10
    else if (f.severity === 'low') score -= 5
  })
  
  return {
    score: Math.max(0, score),
    findings,
    policies: securityPolicies,
    lastScanAt: new Date().toISOString(),
  }
}

export async function runSecurityScan(tenantId: string): Promise<{ success: boolean; newFindings: number }> {
  await delay(3000)
  return { success: true, newFindings: 0 }
}

export async function togglePolicy(policyId: string, enabled: boolean): Promise<{ success: boolean }> {
  await delay(300)
  const policy = securityPolicies.find(p => p.id === policyId)
  if (policy) {
    policy.enabled = enabled
  }
  return { success: true }
}

// Members
export async function listMembers(tenantId: string): Promise<TenantMember[]> {
  await delay(200)
  return tenantMembers.filter(m => m.tenantId === tenantId)
}

export async function inviteMember(tenantId: string, email: string, role: string): Promise<{ success: boolean }> {
  await delay(500)
  return { success: true }
}

// Billing
export async function listInvoices(tenantId: string): Promise<Invoice[]> {
  await delay(200)
  return invoices.filter(i => i.tenantId === tenantId)
}

export async function getUsageMetrics(tenantId: string): Promise<{
  runs: { used: number; limit: number | null }
  agents: { used: number; limit: number | null }
  workflows: { used: number; limit: number | null }
  storage: { used: number; limit: number }
}> {
  await delay(300)
  return {
    runs: { used: 2185, limit: 10000 },
    agents: { used: 3, limit: 10 },
    workflows: { used: 3, limit: 20 },
    storage: { used: 1.2, limit: 5 },
  }
}

// Dashboard
export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  await delay(400)
  return { ...dashboardMetrics, tenantId }
}

// n8n Commander
export async function getN8nConnection(tenantId: string): Promise<N8nConnection | null> {
  await delay(200)
  return n8nConnections.find(c => c.tenantId === tenantId) || null
}

export async function testN8nConnection(tenantId: string): Promise<{ success: boolean; message: string }> {
  await delay(1500)
  const connection = n8nConnections.find(c => c.tenantId === tenantId)
  if (!connection || !connection.apiKeySet) {
    return { success: false, message: 'n8n connection not configured' }
  }
  return { success: true, message: 'Connection successful' }
}

export async function updateN8nConnection(tenantId: string, baseUrl: string, apiKey: string): Promise<{ success: boolean }> {
  await delay(500)
  return { success: true }
}
