'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Bot,
  Workflow,
  ArrowRight,
  FileQuestion,
  RefreshCw,
  MoreHorizontal,
  Bookmark,
  Trash2,
  ArrowUpDown,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
} from 'lucide-react'
import { formatNumber, formatDate } from '@/lib/utils'
import { StatusPill, IntegrationChip } from '@/components/badges'
import { toast } from 'sonner'
import { getSavedViews, saveView, deleteView, type SavedView } from '@/lib/saved-views'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import { EmptyState } from '@/components/control-plane/empty-state'
import { FadeContent } from '@/components/reactbits/fade-content'
import type { AgentTemplate, WorkflowTemplate, ExecutionRun } from '@agentmou/contracts'

type SortField = 'startedAt' | 'durationMs' | 'costEstimate' | 'tokensUsed'
type SortOrder = 'asc' | 'desc'

export default function RunsListPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantId = params.tenantId as string
  const { data: agentTemplates } = useProviderQuery<AgentTemplate[]>(
    (p) => p.listCatalogAgentTemplates(),
    [],
    [],
  )
  const { data: workflowTemplates } = useProviderQuery<WorkflowTemplate[]>(
    (p) => p.listCatalogWorkflowTemplates(),
    [],
    [],
  )
  
  // Initialize filters from URL params
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState(searchParams.get('status') || 'all')
  const [triggerFilter, setTriggerFilter] = React.useState('all')
  const [agentFilter, setAgentFilter] = React.useState(
    searchParams.get('agentId') || searchParams.get('agent') || 'all',
  )
  const [workflowFilter, setWorkflowFilter] = React.useState(
    searchParams.get('workflowId') || searchParams.get('workflow') || 'all',
  )
  const [onlyFailed, setOnlyFailed] = React.useState(searchParams.get('status') === 'failed')
  const [sortField, setSortField] = React.useState<SortField>('startedAt')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc')
  
  // Saved views
  const [savedViews, setSavedViews] = React.useState<SavedView[]>([])
  const [saveViewDialogOpen, setSaveViewDialogOpen] = React.useState(false)
  const [newViewName, setNewViewName] = React.useState('')
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  
  // Load saved views on mount
  React.useEffect(() => {
    setSavedViews(getSavedViews())
  }, [])
  
  const { data: runs } = useProviderQuery<ExecutionRun[]>(
    (p) => p.listTenantRuns(tenantId),
    [],
    [tenantId],
  )
  
  // Get unique agents and workflows for filter dropdowns
  const uniqueAgentIds = [
    ...new Set(runs.map((run) => run.agentId).filter(Boolean)),
  ] as string[]
  const uniqueWorkflowIds = [
    ...new Set(runs.map((run) => run.workflowId).filter(Boolean)),
  ] as string[]
  
  // Filter runs
  let filteredRuns = runs.filter(run => {
    if (statusFilter !== 'all' && run.status !== statusFilter) return false
    if (triggerFilter !== 'all' && run.triggeredBy !== triggerFilter) return false
    if (agentFilter !== 'all' && run.agentId !== agentFilter) return false
    if (workflowFilter !== 'all' && run.workflowId !== workflowFilter) return false
    if (onlyFailed && run.status !== 'failed') return false
    if (search) {
      const agent = agentTemplates.find(a => a.id === run.agentId)
      const workflow = workflowTemplates.find(w => w.id === run.workflowId)
      const searchLower = search.toLowerCase()
      if (!run.id.toLowerCase().includes(searchLower) &&
          !agent?.name.toLowerCase().includes(searchLower) &&
          !workflow?.name.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    return true
  })
  
  // Sort runs
  filteredRuns = [...filteredRuns].sort((a, b) => {
    let aVal: number, bVal: number
    switch (sortField) {
      case 'startedAt':
        aVal = new Date(a.startedAt).getTime()
        bVal = new Date(b.startedAt).getTime()
        break
      case 'durationMs':
        aVal = a.durationMs || 0
        bVal = b.durationMs || 0
        break
      case 'costEstimate':
        aVal = a.costEstimate
        bVal = b.costEstimate
        break
      case 'tokensUsed':
        aVal = a.tokensUsed
        bVal = b.tokensUsed
        break
      default:
        return 0
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  })

  // Map status to StatusPill status type
  const getStatusType = (status: string): 'success' | 'error' | 'running' | 'pending' | 'warning' => {
    switch (status) {
      case 'success': return 'success'
      case 'failed': return 'error'
      case 'running': return 'running'
      case 'pending_approval': return 'pending'
      case 'rejected': return 'error'
      case 'timeout': return 'warning'
      default: return 'pending'
    }
  }
  
  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }
  
  // Handle retry
  const handleRetry = (runId: string) => {
    toast.success('Run queued for retry', {
      description: `A new execution has been queued based on run ${runId}`,
    })
  }
  
  // Handle bulk retry
  const handleBulkRetry = () => {
    toast.success(`${selectedRows.size} runs queued for retry`, {
      description: 'New executions have been queued.',
    })
    setSelectedRows(new Set())
  }
  
  // Handle save view
  const handleSaveView = () => {
    if (!newViewName.trim()) return
    const view = saveView({
      name: newViewName,
      filters: {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        trigger: triggerFilter !== 'all' ? triggerFilter : undefined,
        agentId: agentFilter !== 'all' ? agentFilter : undefined,
        workflowId: workflowFilter !== 'all' ? workflowFilter : undefined,
        onlyFailed,
      },
      sortBy: sortField,
      sortOrder,
    })
    setSavedViews([...savedViews, view])
    setSaveViewDialogOpen(false)
    setNewViewName('')
    toast.success('View saved', { description: `"${view.name}" has been saved.` })
  }
  
  // Handle load view
  const handleLoadView = (view: SavedView) => {
    setStatusFilter(view.filters.status || 'all')
    setTriggerFilter(view.filters.trigger || 'all')
    setAgentFilter(view.filters.agentId || 'all')
    setWorkflowFilter(view.filters.workflowId || 'all')
    setOnlyFailed(view.filters.onlyFailed || false)
    if (view.sortBy) setSortField(view.sortBy as SortField)
    if (view.sortOrder) setSortOrder(view.sortOrder)
    toast.success('View loaded', { description: `Applied "${view.name}"` })
  }
  
  // Handle delete view
  const handleDeleteView = (viewId: string) => {
    deleteView(viewId)
    setSavedViews(savedViews.filter(v => v.id !== viewId))
    toast.success('View deleted')
  }
  
  // Handle row selection
  const toggleRowSelection = (runId: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(runId)) {
      newSelected.delete(runId)
    } else {
      newSelected.add(runId)
    }
    setSelectedRows(newSelected)
  }
  
  const toggleAllRows = () => {
    if (selectedRows.size === filteredRuns.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredRuns.map(r => r.id)))
    }
  }
  
  // Sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }
  
  if (runs.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <p className="text-editorial-tiny mb-2">Runs</p>
          <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">View all agent and workflow executions.</p>
        </div>
        <EmptyState
          icon={Eye}
          title="No runs yet"
          description="Execution runs will appear here once your agents start processing tasks. Install an agent pack and trigger a run to get started."
          actionLabel="Go to Fleet"
          actionHref={`/app/${tenantId}/fleet`}
        />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-editorial-tiny mb-2">Runs</p>
          <h1 className="text-2xl font-bold tracking-tight">Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View all agent and workflow executions.
          </p>
        </div>
        
        {/* Saved Views */}
        <div className="flex gap-2">
          {savedViews.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Saved Views
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {savedViews.map((view) => (
                  <DropdownMenuItem key={view.id} className="flex items-center justify-between">
                    <span 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLoadView(view)}
                    >
                      {view.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteView(view.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" className="h-9" onClick={() => setSaveViewDialogOpen(true)}>
            <Bookmark className="h-4 w-4 mr-2" />
            Save View
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search runs..."
            className="pl-9 h-9 text-sm border-border/50 bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="success" className="text-xs">Success</SelectItem>
              <SelectItem value="failed" className="text-xs">Failed</SelectItem>
              <SelectItem value="running" className="text-xs">Running</SelectItem>
              <SelectItem value="pending_approval" className="text-xs">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={triggerFilter} onValueChange={setTriggerFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Triggers</SelectItem>
              <SelectItem value="webhook" className="text-xs">Webhook</SelectItem>
              <SelectItem value="cron" className="text-xs">Cron</SelectItem>
              <SelectItem value="manual" className="text-xs">Manual</SelectItem>
              <SelectItem value="api" className="text-xs">API</SelectItem>
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Agents</SelectItem>
              {uniqueAgentIds.map(agentId => {
                const agent = agentTemplates.find(a => a.id === agentId)
                return (
                  <SelectItem key={agentId} value={agentId} className="text-xs">
                    {agent?.name || agentId}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Workflows</SelectItem>
              {uniqueWorkflowIds.map((workflowId) => {
                const workflow = workflowTemplates.find((item) => item.id === workflowId)
                return (
                  <SelectItem key={workflowId} value={workflowId} className="text-xs">
                    {workflow?.name || workflowId}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 px-3 h-9 border border-border/50 rounded-md text-xs cursor-pointer hover:bg-muted/30">
            <Checkbox 
              checked={onlyFailed} 
              onCheckedChange={(checked) => setOnlyFailed(checked === true)}
              className="h-3.5 w-3.5"
            />
            Only failed
          </label>
        </div>
      </div>
      
      {/* Runs Table */}
      <FadeContent>
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="h-11 w-10 bg-muted/30">
                  <Checkbox 
                    checked={selectedRows.size === filteredRuns.length && filteredRuns.length > 0}
                    onCheckedChange={toggleAllRows}
                    className="h-3.5 w-3.5"
                  />
                </TableHead>
                <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Run ID</TableHead>
                <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Agent / Workflow</TableHead>
                <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Status</TableHead>
                <TableHead className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30">Trigger</TableHead>
                <TableHead 
                  className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-right cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('durationMs')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Duration <SortIcon field="durationMs" />
                  </span>
                </TableHead>
                <TableHead 
                  className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-right cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('tokensUsed')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Tokens <SortIcon field="tokensUsed" />
                  </span>
                </TableHead>
                <TableHead 
                  className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 text-right cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('costEstimate')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Cost <SortIcon field="costEstimate" />
                  </span>
                </TableHead>
                <TableHead 
                  className="h-11 text-[11px] uppercase tracking-[0.05em] text-muted-foreground font-medium bg-muted/30 cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('startedAt')}
                >
                  <span className="flex items-center gap-1">
                    Started <SortIcon field="startedAt" />
                  </span>
                </TableHead>
                <TableHead className="h-11 bg-muted/30 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                        <FileQuestion className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">No runs found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRuns.map((run) => {
                  const agent = agentTemplates.find(a => a.id === run.agentId)
                  const workflow = workflowTemplates.find(w => w.id === run.workflowId)
                  return (
                    <TableRow key={run.id} className="border-b border-border/30 h-[52px] hover:bg-muted/20">
                      <TableCell>
                        <Checkbox 
                          checked={selectedRows.has(run.id)}
                          onCheckedChange={() => toggleRowSelection(run.id)}
                          className="h-3.5 w-3.5"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{run.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {agent ? (
                            <Bot className="h-3.5 w-3.5 text-foreground" />
                          ) : (
                            <Workflow className="h-3.5 w-3.5 text-foreground" />
                          )}
                          <span className="text-sm">{agent?.name || workflow?.name || run.agentId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill 
                          status={getStatusType(run.status)} 
                          label={run.status.replace('_', ' ')} 
                        />
                      </TableCell>
                      <TableCell>
                        <IntegrationChip name={run.triggeredBy} />
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatNumber(run.tokensUsed)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">${run.costEstimate.toFixed(4)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(run.startedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Link href={`/app/${tenantId}/runs/${run.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/app/${tenantId}/runs/${run.id}`}>
                                  View details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRetry(run.id)}>
                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                Retry run
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </FadeContent>
      
      {/* Selection bar - fixed popup centered in viewport */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex w-fit items-center justify-center gap-2 rounded-lg border border-border/50 bg-background px-2 py-2 shadow-lg">
          <div className="flex h-9 items-center gap-1.5 rounded-md bg-accent/20 px-2.5">
            <span className="text-sm font-medium text-foreground">{selectedRows.size} selected</span>
            <button
              type="button"
              onClick={() => setSelectedRows(new Set())}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-9 w-px shrink-0 bg-border/60" aria-hidden />
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-2 hover:!bg-white/10 hover:!text-foreground"
            onClick={handleBulkRetry}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry Selected
          </Button>
        </div>
      )}
      
      {/* Save View Dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Save Current View</DialogTitle>
            <DialogDescription className="text-xs">
              Save the current filters and sorting as a named view.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="View name..."
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            className="text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setSaveViewDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveView}>
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
