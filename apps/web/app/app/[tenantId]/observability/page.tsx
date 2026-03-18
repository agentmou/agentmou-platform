'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FadeContent } from '@/components/reactbits/fade-content'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from '@/components/ui/select'
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
Activity,
CheckCircle,
XCircle,
Clock,
DollarSign,
ArrowRight,
Bot,
Workflow,
Loader2,
RefreshCw,
ExternalLink,
AlertTriangle,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import { useDataProvider } from '@/lib/data'
import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface'
import { resolveHonestSurfaceState } from '@/lib/honest-ui'
import type { AgentTemplate, WorkflowTemplate, ExecutionRun, DashboardMetrics } from '@agentmou/contracts'

const statusColors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  timeout: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  skipped: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300',
}

const statusIcons = {
  success: CheckCircle,
  failed: XCircle,
  error: XCircle,
  running: Loader2,
  pending_approval: Clock,
  rejected: XCircle,
  timeout: Clock,
  skipped: Clock,
}

export default function ObservabilityPage() {
const params = useParams()
const router = useRouter()
const tenantId = params.tenantId as string
const provider = useDataProvider()
const analyticsState = resolveHonestSurfaceState('observability-analytics', {
  providerMode: provider.providerMode,
  tenantId,
})

const [period, setPeriod] = React.useState('week')
const [statusFilter, setStatusFilter] = React.useState('all')

const metricPeriod = period === 'day' || period === 'month' ? period : 'week'
const { data: metrics } = useProviderQuery<DashboardMetrics>(
  (p) => p.getTenantDashboardMetrics(tenantId, metricPeriod),
  {
    tenantId,
    period: 'week',
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
  },
  [tenantId, period],
)
const { data: runs } = useProviderQuery<ExecutionRun[]>(
  (p) => p.listTenantRuns(tenantId),
  [],
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
const tenantAgentIds = React.useMemo(
  () => new Set(runs.map((run) => run.agentId).filter(Boolean)),
  [runs],
)
const agents = React.useMemo(
  () => catalogAgents.filter((agent) => tenantAgentIds.has(agent.id)),
  [catalogAgents, tenantAgentIds],
)
  
  const filteredRuns = runs.filter(r => 
    statusFilter === 'all' || r.status === statusFilter
  )
  
  const successRate = metrics.runsTotal > 0 
    ? Math.round((metrics.runsSuccess / metrics.runsTotal) * 100) 
    : 0
  
const statusDistribution = [
{ name: 'Success', value: metrics.runsSuccess, color: '#22c55e', status: 'success' },
{ name: 'Failed', value: metrics.runsFailed, color: '#ef4444', status: 'failed' },
{ name: 'Running', value: runs.filter(r => r.status === 'running').length, color: '#3b82f6', status: 'running' },
{ name: 'Pending', value: runs.filter(r => r.status === 'pending_approval').length, color: '#eab308', status: 'pending_approval' },
]

// Calculate agent performance metrics
const agentPerformance = agents.map(agent => {
const agentRuns = runs.filter(r => r.agentId === agent.id)
const successRuns = agentRuns.filter(r => r.status === 'success')
const failedRuns = agentRuns.filter(r => r.status === 'failed')
const totalCost = agentRuns.reduce((sum, r) => sum + r.costEstimate, 0)
const avgLatency = agentRuns.length > 0
  ? agentRuns.reduce((sum, r) => sum + (r.durationMs || 0), 0) / agentRuns.length
  : 0
const successRate = agentRuns.length > 0
  ? Math.round((successRuns.length / agentRuns.length) * 100)
  : 0

return {
  id: agent.id,
  name: agent.name,
  totalRuns: agentRuns.length,
  successRate,
  failedCount: failedRuns.length,
  avgLatency,
  totalCost,
}
}).filter(a => a.totalRuns > 0).sort((a, b) => b.totalRuns - a.totalRuns)

// Handle drill-down navigation
const navigateToRuns = (filters: Record<string, string>) => {
const params = new URLSearchParams(filters)
router.push(`/app/${tenantId}/runs?${params.toString()}`)
}

const navigateToAgentRuns = (agentId: string) => {
router.push(`/app/${tenantId}/runs?agentId=${agentId}`)
}
  
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-editorial-tiny mb-2">Observability</p>
          <h1 className="text-2xl font-bold tracking-tight">Observability</h1>
          <p className="text-muted-foreground mt-1">
            Monitor execution metrics, costs, and performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={period}
            onValueChange={setPeriod}
            disabled={analyticsState.disabled}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24h</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" disabled={analyticsState.disabled}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <HonestSurfaceNotice state={analyticsState} />
      
{/* KPI Cards - Clickable for drill-down */}
<TooltipProvider>
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
<Tooltip>
  <TooltipTrigger asChild>
    <Card 
      className={analyticsState.disabled
        ? 'cursor-default'
        : 'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md'}
      onClick={analyticsState.disabled ? undefined : () => navigateToRuns({})}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
        <div className="flex items-center gap-2">
          <HonestSurfaceBadge state={analyticsState} />
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatNumber(metrics.runsTotal)}</div>
        <p className="text-xs text-muted-foreground">Preview metric</p>
      </CardContent>
    </Card>
  </TooltipTrigger>
  <TooltipContent>
    <p>{analyticsState.description}</p>
  </TooltipContent>
</Tooltip>

<Tooltip>
  <TooltipTrigger asChild>
    <Card 
      className={analyticsState.disabled
        ? 'cursor-default'
        : 'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md'}
      onClick={
        analyticsState.disabled
          ? undefined
          : () => navigateToRuns({ status: 'success' })
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
        <div className="flex items-center gap-2">
          <HonestSurfaceBadge state={analyticsState} />
          <CheckCircle className="h-4 w-4 text-green-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{successRate}%</div>
        <p className="text-xs text-muted-foreground">
          Preview metric
        </p>
      </CardContent>
    </Card>
  </TooltipTrigger>
  <TooltipContent>
    <p>{analyticsState.description}</p>
  </TooltipContent>
</Tooltip>

<Tooltip>
  <TooltipTrigger asChild>
    <Card 
      className={analyticsState.disabled
        ? 'cursor-default'
        : 'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md'}
      onClick={
        analyticsState.disabled
          ? undefined
          : () => navigateToRuns({ status: 'failed' })
      }
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Failed Runs</CardTitle>
        <div className="flex items-center gap-2">
          <HonestSurfaceBadge state={analyticsState} />
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-red-600">{metrics.runsFailed}</div>
        <p className="text-xs text-muted-foreground">Preview metric</p>
      </CardContent>
    </Card>
  </TooltipTrigger>
  <TooltipContent>
    <p>{analyticsState.description}</p>
  </TooltipContent>
</Tooltip>

<Tooltip>
  <TooltipTrigger asChild>
    <Card className="cursor-default">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
        <div className="flex items-center gap-2">
          <HonestSurfaceBadge state={analyticsState} />
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${metrics.totalCost.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground">Preview metric</p>
      </CardContent>
    </Card>
  </TooltipTrigger>
  <TooltipContent>
    <p>{analyticsState.description}</p>
  </TooltipContent>
</Tooltip>
</div>
</TooltipProvider>
      
      {/* Charts */}
      <FadeContent>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Runs Over Time</CardTitle>
                <CardDescription>Preview execution count by day</CardDescription>
              </div>
              <HonestSurfaceBadge state={analyticsState} />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: 'Runs', color: 'var(--chart-1)' },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.runsByDay}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
<Card>
<CardHeader>
<div className="flex items-start justify-between gap-4">
  <div>
    <CardTitle>Status Distribution</CardTitle>
    <CardDescription>Preview status distribution for this workspace</CardDescription>
  </div>
  <HonestSurfaceBadge state={analyticsState} />
</div>
</CardHeader>
<CardContent>
<div className="h-[200px]">
<ResponsiveContainer width="100%" height="100%">
<PieChart>
<Pie
data={statusDistribution.filter(d => d.value > 0)}
cx="50%"
cy="50%"
innerRadius={50}
outerRadius={80}
dataKey="value"
onClick={
  analyticsState.disabled
    ? undefined
    : (data) => navigateToRuns({ status: data.status })
}
className={analyticsState.disabled ? 'cursor-default' : 'cursor-pointer'}
>
{statusDistribution.map((entry, index) => (
<Cell 
  key={`cell-${index}`} 
  fill={entry.color}
  className={
    analyticsState.disabled
      ? ''
      : 'cursor-pointer hover:opacity-80 transition-opacity'
  }
/>
))}
</Pie>
<ChartTooltip 
  content={({ payload }) => {
    if (payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-xs text-muted-foreground">{data.value} runs</p>
          <p className="text-xs text-primary mt-1">Click to view</p>
        </div>
      )
    }
    return null
  }}
/>
</PieChart>
</ResponsiveContainer>
</div>
<div className="flex flex-wrap justify-center gap-3 mt-2">
{statusDistribution.filter(d => d.value > 0).map((item) => (
<button
  key={item.name} 
  className={analyticsState.disabled
    ? 'flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground'
    : 'flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors cursor-pointer'}
  onClick={
    analyticsState.disabled
      ? undefined
      : () => navigateToRuns({ status: item.status })
  }
  disabled={analyticsState.disabled}
>
  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
  {!analyticsState.disabled && (
    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
  )}
</button>
))}
</div>
</CardContent>
</Card>
      </div>
      
      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Cost by Day</CardTitle>
              <CardDescription>Preview LLM cost trends</CardDescription>
            </div>
            <HonestSurfaceBadge state={analyticsState} />
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              cost: { label: 'Cost ($)', color: 'var(--chart-2)' },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.costByDay}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en', { weekday: 'short' })}
                  fontSize={12}
                />
                <YAxis fontSize={12} tickFormatter={(value) => `$${value}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="var(--color-cost)" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      </FadeContent>
      
{/* Agent Performance - Drill-down section */}
{agentPerformance.length > 0 && (
<Card>
<CardHeader>
<CardTitle className="flex items-center gap-2">
  <Bot className="h-5 w-5" />
  Agent Performance
</CardTitle>
<CardDescription>Click an agent to view its execution history</CardDescription>
</CardHeader>
<CardContent>
<div className="space-y-4">
  {agentPerformance.slice(0, 5).map((agent) => (
    <div
      key={agent.id}
      className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-all"
      onClick={() => navigateToAgentRuns(agent.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{agent.name}</span>
          {agent.failedCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {agent.failedCount} failed
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>{agent.totalRuns} runs</span>
          <span>${agent.totalCost.toFixed(2)} cost</span>
          <span>{(agent.avgLatency / 1000).toFixed(1)}s avg</span>
        </div>
      </div>
      <div className="flex items-center gap-3 w-40">
        <Progress 
          value={agent.successRate} 
          className="h-2"
        />
        <span className={`text-sm font-medium w-12 text-right ${
          agent.successRate >= 90 ? 'text-green-600' :
          agent.successRate >= 70 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {agent.successRate}%
        </span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </div>
  ))}
  
  {agentPerformance.length > 5 && (
    <div className="text-center pt-2">
      <Link href={`/app/${tenantId}/fleet`}>
        <Button variant="outline" size="sm">
          View All Agents
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  )}
</div>
</CardContent>
</Card>
)}

{/* Recent Runs */}
<Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>Latest execution activity</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Link href={`/app/${tenantId}/runs`}>
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run ID</TableHead>
                <TableHead>Agent/Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Started</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.slice(0, 10).map((run) => {
                const agent = catalogAgents.find((item) => item.id === run.agentId)
                const workflow = catalogWorkflows.find(
                  (item) => item.id === run.workflowId,
                )
                const StatusIcon = statusIcons[run.status]
                return (
<TableRow 
key={run.id}
className="cursor-pointer hover:bg-muted/50"
onClick={() => router.push(`/app/${tenantId}/runs/${run.id}`)}
>
<TableCell className="font-mono text-xs">{run.id}</TableCell>
<TableCell>
<button
  className="flex items-center gap-2 hover:text-primary transition-colors"
  onClick={(e) => {
    e.stopPropagation()
    if (agent) {
      navigateToAgentRuns(agent.id)
    }
  }}
>
  {agent ? <Bot className="h-4 w-4 text-primary" /> : <Workflow className="h-4 w-4 text-chart-2" />}
  <span className="text-sm hover:underline">{agent?.name || workflow?.name || run.agentId}</span>
</button>
</TableCell>
<TableCell>
<button
  className="cursor-pointer"
  onClick={(e) => {
    e.stopPropagation()
    navigateToRuns({ status: run.status })
  }}
>
  <Badge className={`${statusColors[run.status]} hover:opacity-80 transition-opacity`} variant="secondary">
    <StatusIcon className={`h-3 w-3 mr-1 ${run.status === 'running' ? 'animate-spin' : ''}`} />
    {run.status.replace('_', ' ')}
  </Badge>
</button>
</TableCell>
<TableCell>{run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '-'}</TableCell>
<TableCell>${run.costEstimate.toFixed(4)}</TableCell>
<TableCell className="text-sm text-muted-foreground">
{new Date(run.startedAt).toLocaleTimeString()}
</TableCell>
<TableCell>
<Link 
  href={`/app/${tenantId}/runs/${run.id}`}
  onClick={(e) => e.stopPropagation()}
>
  <Button variant="ghost" size="sm">
    <ArrowRight className="h-4 w-4" />
  </Button>
</Link>
</TableCell>
</TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
