'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ArrowRight,
  Bot,
  Workflow,
  AlertTriangle,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { MinimalButton } from '@/components/ui/minimal-button'
import { FadeContent } from '@/components/reactbits/fade-content'
import { SpotlightCard } from '@/components/reactbits/spotlight-card'
import { StarBorder } from '@/components/reactbits/star-border'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import { EmptyState } from '@/components/fleetops/empty-state'
import { Store } from 'lucide-react'
import type {
  AgentTemplate,
  WorkflowTemplate,
  InstalledAgent,
  InstalledWorkflow,
  ApprovalRequest,
  ExecutionRun,
  Integration,
  SecurityFinding,
  DashboardMetrics,
} from '@agentmou/contracts'

const emptyMetrics: DashboardMetrics = {
  tenantId: '',
  period: 'week',
  runsTotal: 0,
  runsSuccess: 0,
  runsFailed: 0,
  avgLatencyMs: 0,
  totalCost: 0,
  topAgents: [],
  topWorkflows: [],
  costByDay: [],
  runsByDay: [],
  errorsByType: [],
}

export default function DashboardPage() {
  const params = useParams()
  const tenantId = params.tenantId as string

  const { data: metrics } = useProviderQuery<DashboardMetrics>(
    (p) => p.getTenantDashboardMetrics(tenantId, 'week'),
    emptyMetrics,
    [tenantId],
  )
  const { data: catalogAgents } = useProviderQuery<AgentTemplate[]>(
    (p) => p.listCatalogAgentTemplates(),
    [],
    [],
  )
  const { data: catalogWorkflows } = useProviderQuery<WorkflowTemplate[]>(
    (p) => p.listCatalogWorkflowTemplates(),
    [],
    [],
  )
  const { data: agents } = useProviderQuery<InstalledAgent[]>(
    (p) => p.listTenantInstalledAgents(tenantId),
    [],
    [tenantId],
  )
  const { data: workflows } = useProviderQuery<InstalledWorkflow[]>(
    (p) => p.listTenantInstalledWorkflows(tenantId),
    [],
    [tenantId],
  )
  const { data: approvals } = useProviderQuery<ApprovalRequest[]>(
    (p) => p.listTenantApprovals(tenantId),
    [],
    [tenantId],
  )
  const { data: runs } = useProviderQuery<ExecutionRun[]>(
    (p) => p.listTenantRuns(tenantId),
    [],
    [tenantId],
  )
  const { data: integrations } = useProviderQuery<Integration[]>(
    (p) => p.listTenantIntegrations(tenantId),
    [],
    [tenantId],
  )
  const { data: securityFindings } = useProviderQuery<SecurityFinding[]>(
    (p) => p.listTenantSecurityFindings(tenantId),
    [],
    [tenantId],
  )

  const pendingApprovals = React.useMemo(
    () => approvals.filter((approval) => approval.status === 'pending'),
    [approvals],
  )
  const failedRuns = React.useMemo(
    () =>
      runs
        .filter((run) => run.status === 'failed')
        .slice(0, 3),
    [runs],
  )
  const disconnectedIntegrations = React.useMemo(
    () =>
      integrations
        .filter((integration) => integration.status === 'disconnected')
        .slice(0, 3),
    [integrations],
  )
  const securityWarnings = React.useMemo(
    () =>
      securityFindings
        .filter(
          (finding) =>
            finding.severity === 'high' || finding.severity === 'critical',
        )
        .slice(0, 3),
    [securityFindings],
  )
  
  const successRate = metrics.runsTotal > 0 
    ? Math.round((metrics.runsSuccess / metrics.runsTotal) * 100) 
    : 0
  
  // Check if there are any attention items
  const hasAttentionItems = pendingApprovals.length > 0 || failedRuns.length > 0 || disconnectedIntegrations.length > 0 || securityWarnings.length > 0
  
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-editorial-tiny mb-2">Dashboard</p>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        </div>
        <div className="flex gap-3">
          <Link href={`/app/${tenantId}/marketplace`}>
            <MinimalButton variant="outline" size="sm">
              Browse Marketplace
            </MinimalButton>
          </Link>
          <Link href={`/app/${tenantId}/installer/new`}>
            <MinimalButton size="sm">
              Install New
            </MinimalButton>
          </Link>
        </div>
      </div>
      
      {/* Welcome state for new tenants */}
      {agents.length === 0 && runs.length === 0 && (
        <EmptyState
          icon={Store}
          title="Welcome to your workspace"
          description="Get started by browsing the marketplace and installing your first agent pack. Your dashboard will come alive with real-time metrics once agents are running."
          actionLabel="Browse Marketplace"
          actionHref={`/app/${tenantId}/marketplace`}
        />
      )}

      {/* Attention Required Panel */}
      {hasAttentionItems && (
        <div className="p-5 border border-border/50 rounded-sm space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-foreground" />
            <h2 className="font-semibold text-sm">Attention Required</h2>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {pendingApprovals.length > 0 && (
              <StarBorder color="hsl(var(--accent))" speed="8s" className="rounded-sm">
                <Link 
                  href={`/app/${tenantId}/approvals`}
                  className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-accent/10">
                    <CheckCircle className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{pendingApprovals.length} Pending</p>
                    <p className="text-xs text-muted-foreground">HITL approvals</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                </Link>
              </StarBorder>
            )}
            
            {failedRuns.length > 0 && (
              <StarBorder color="hsl(var(--destructive))" speed="8s" className="rounded-sm">
                <Link 
                  href={`/app/${tenantId}/runs?status=failed`}
                  className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-destructive/10">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{failedRuns.length} Failed</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {failedRuns[0]
                        ? catalogAgents.find((agent) => agent.id === failedRuns[0].agentId)?.name || 'Unknown'
                        : 'Recent runs'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                </Link>
              </StarBorder>
            )}
            
            {disconnectedIntegrations.length > 0 && (
              <Link 
                href={`/app/${tenantId}/security`}
                className="flex items-start gap-3 p-3 border border-border/30 rounded-sm hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{disconnectedIntegrations.length} Disconnected</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {disconnectedIntegrations.map(i => i.name).join(', ')}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
              </Link>
            )}
            
            {securityWarnings.length > 0 && (
              <StarBorder color="hsl(var(--destructive))" speed="8s" className="rounded-sm">
                <Link 
                  href={`/app/${tenantId}/security`}
                  className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{securityWarnings.length} Warnings</p>
                    <p className="text-xs text-muted-foreground">Security findings</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                </Link>
              </StarBorder>
            )}
          </div>
        </div>
      )}
      
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <SpotlightCard className="rounded-sm border border-border/50">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-editorial-tiny">Total Runs</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{formatNumber(metrics.runsTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </div>
        </SpotlightCard>
        
        <SpotlightCard className="rounded-sm border border-border/50">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-editorial-tiny">Success Rate</p>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{successRate}%</p>
            <p className="text-xs text-accent mt-1">
              +2.5% <span className="text-muted-foreground">from last week</span>
            </p>
          </div>
        </SpotlightCard>
        
        <SpotlightCard className="rounded-sm border border-border/50">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-editorial-tiny">Avg Latency</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold tracking-tight">{(metrics.avgLatencyMs / 1000).toFixed(1)}s</p>
            <p className="text-xs text-muted-foreground mt-1">Per execution</p>
          </div>
        </SpotlightCard>
        
        <SpotlightCard className="rounded-sm border border-border/50">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-editorial-tiny">Est. LLM Cost</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold tracking-tight">${metrics.totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">This week</p>
          </div>
        </SpotlightCard>
      </div>
      
      {/* Charts */}
      <FadeContent>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="p-5 border border-border/50 rounded-sm">
          <div className="mb-4">
            <p className="font-semibold text-sm">Runs by Day</p>
            <p className="text-xs text-muted-foreground">Execution activity over the past week</p>
          </div>
          <ChartContainer
            config={{
              count: { label: 'Runs', color: 'hsl(var(--accent))' },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.runsByDay}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        
        <div className="p-5 border border-border/50 rounded-sm">
          <div className="mb-4">
            <p className="font-semibold text-sm">Cost by Day</p>
            <p className="text-xs text-muted-foreground">Estimated LLM costs over the past week</p>
          </div>
          <ChartContainer
            config={{
              cost: { label: 'Cost ($)', color: 'hsl(var(--foreground))' },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.costByDay}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="var(--color-cost)" 
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>
      </FadeContent>
      
      {/* Installed Overview */}
      <FadeContent>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Installed Agents */}
        <div className="p-5 border border-border/50 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-sm">Installed Agents</p>
              <p className="text-xs text-muted-foreground">{agents.length} agents active</p>
            </div>
            <Link href={`/app/${tenantId}/fleet`}>
              <MinimalButton variant="text" size="sm">
                View All
                <ArrowRight className="h-3 w-3" />
              </MinimalButton>
            </Link>
          </div>
          <div className="space-y-2">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No agents installed yet</p>
                <Link href={`/app/${tenantId}/marketplace`}>
                  <MinimalButton variant="text" size="sm">Browse agents</MinimalButton>
                </Link>
              </div>
            ) : (
              agents.slice(0, 3).map((agent) => {
                const template = catalogAgents.find((item) => item.id === agent.templateId)
                return (
                  <Link 
                    key={agent.id} 
                    href={`/app/${tenantId}/fleet`}
                    className="flex items-center justify-between p-3 border border-border/30 rounded-sm hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{template?.name || agent.templateId}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {agent.runsTotal} runs · {Math.round((agent.runsSuccess / agent.runsTotal) * 100)}% success
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wide font-medium ${
                      agent.status === 'active' ? 'text-accent' : 'text-muted-foreground'
                    }`}>
                      {agent.status}
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </div>
        
        {/* Installed Workflows */}
        <div className="p-5 border border-border/50 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-sm">Installed Workflows</p>
              <p className="text-xs text-muted-foreground">{workflows.length} workflows active</p>
            </div>
            <Link href={`/app/${tenantId}/fleet`}>
              <MinimalButton variant="text" size="sm">
                View All
                <ArrowRight className="h-3 w-3" />
              </MinimalButton>
            </Link>
          </div>
          <div className="space-y-2">
            {workflows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Workflow className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No workflows installed yet</p>
                <Link href={`/app/${tenantId}/marketplace`}>
                  <MinimalButton variant="text" size="sm">Browse workflows</MinimalButton>
                </Link>
              </div>
            ) : (
              workflows.slice(0, 3).map((workflow) => {
                const template = catalogWorkflows.find(
                  (item) => item.id === workflow.templateId,
                )

                return (
                  <Link
                    key={workflow.id}
                    href={`/app/${tenantId}/fleet`}
                    className="flex items-center justify-between p-3 border border-border/30 rounded-sm hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-muted">
                        <Workflow className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {template?.name || workflow.templateId}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {workflow.runsTotal} runs · {Math.round((workflow.runsSuccess / workflow.runsTotal) * 100)}% success
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wide font-medium ${
                        workflow.status === 'active'
                          ? 'text-accent'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {workflow.status}
                    </span>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
      </FadeContent>
      
      {/* Top Errors */}
      <div className="p-5 border border-border/50 rounded-sm">
        <div className="mb-4">
          <p className="font-semibold text-sm">Top Errors</p>
          <p className="text-xs text-muted-foreground">Most common error types this week</p>
        </div>
        <div className="space-y-3">
          {metrics.errorsByType.map((error, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{error.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-foreground/40 rounded-full"
                    style={{
                      width: `${
                        metrics.runsFailed
                          ? (error.count / metrics.runsFailed) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{error.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
