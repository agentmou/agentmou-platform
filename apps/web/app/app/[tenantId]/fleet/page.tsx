'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
Bot,
Workflow,
Search,
Plus,
Play,
Pause,
Settings,
Trash2,
ExternalLink,
CheckCircle2,
AlertTriangle,
Clock,
Activity,
MoreVertical,
RefreshCw,
Zap,
Copy,
Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import { EmptyState } from '@/components/fleetops/empty-state'
import { FadeContent } from '@/components/reactbits/fade-content'
import { SpotlightCard } from '@/components/reactbits/spotlight-card'
import type {
  AgentTemplate,
  WorkflowTemplate,
  InstalledAgent,
  InstalledWorkflow,
} from '@agentmou/contracts'

type ActionType = 'pause' | 'resume' | 'delete' | 'trigger' | 'duplicate'
type ItemType = 'agent' | 'workflow'

interface ActionState {
  type: ActionType
  itemType: ItemType
  itemId: string
  itemName: string
}

export default function FleetPage() {
  const params = useParams()
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
  const { data: rawInstalledAgents } = useProviderQuery<InstalledAgent[]>(
    (p) => p.listTenantInstalledAgents(tenantId),
    [],
    [tenantId],
  )
  const { data: rawInstalledWorkflows } = useProviderQuery<InstalledWorkflow[]>(
    (p) => p.listTenantInstalledWorkflows(tenantId),
    [],
    [tenantId],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [actionState, setActionState] = useState<ActionState | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const installedAgents = useMemo(() => {
    return rawInstalledAgents.map((installation) => {
      const agent = agentTemplates.find((template) => template.id === installation.templateId)
      return {
        ...installation,
        agent,
        agentId: installation.templateId,
        version: '1.0.0',
        metrics: {
          runsToday: Math.floor(installation.runsTotal / 30),
          successRate: installation.runsTotal > 0
            ? Math.round((installation.runsSuccess / installation.runsTotal) * 100)
            : 0,
          lastRunAt: installation.lastRunAt,
        },
      }
    })
  }, [rawInstalledAgents, agentTemplates])

  const installedWorkflows = useMemo(() => {
    return rawInstalledWorkflows.map((installation) => {
      const workflow = workflowTemplates.find((template) => template.id === installation.templateId)
      return {
        ...installation,
        workflow,
        workflowId: installation.templateId,
        metrics: {
          runsToday: Math.floor(installation.runsTotal / 30),
          successRate: installation.runsTotal > 0
            ? Math.round((installation.runsSuccess / installation.runsTotal) * 100)
            : 0,
          lastRunAt: installation.lastRunAt,
        },
      }
    })
  }, [rawInstalledWorkflows, workflowTemplates])
  
  const filteredAgents = installedAgents.filter(ia => 
    ia.agent?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const filteredWorkflows = installedWorkflows.filter(iw =>
    iw.workflow?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-chart-3" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-chart-4" />
      case 'paused':
        return <Pause className="h-4 w-4 text-muted-foreground" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      error: 'destructive',
      paused: 'secondary',
      pending: 'outline',
    }
    return <Badge variant={variants[status] || 'outline'} className="capitalize">{status}</Badge>
  }

  // Action handlers with confirmation
  const openAction = (type: ActionType, itemType: ItemType, itemId: string, itemName: string) => {
    setActionState({ type, itemType, itemId, itemName })
  }

  const closeAction = () => {
    setActionState(null)
    setIsLoading(false)
  }

  const executeAction = async () => {
    if (!actionState) return
    
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const actionMessages: Record<ActionType, string> = {
      pause: `${actionState.itemName} has been paused`,
      resume: `${actionState.itemName} has been resumed`,
      delete: `${actionState.itemName} has been removed from your fleet`,
      trigger: `${actionState.itemName} has been triggered manually`,
      duplicate: `${actionState.itemName} has been duplicated`,
    }
    
    toast.success(actionMessages[actionState.type])
    closeAction()
  }

  const getActionTitle = () => {
    if (!actionState) return ''
    const titles: Record<ActionType, string> = {
      pause: `Pause ${actionState.itemType}`,
      resume: `Resume ${actionState.itemType}`,
      delete: `Remove ${actionState.itemType}`,
      trigger: `Trigger ${actionState.itemType}`,
      duplicate: `Duplicate ${actionState.itemType}`,
    }
    return titles[actionState.type]
  }

  const getActionDescription = () => {
    if (!actionState) return ''
    const descriptions: Record<ActionType, string> = {
      pause: `This will pause "${actionState.itemName}". It will stop processing new events until resumed.`,
      resume: `This will resume "${actionState.itemName}". It will start processing events again.`,
      delete: `This will permanently remove "${actionState.itemName}" from your fleet. This action cannot be undone.`,
      trigger: `This will manually trigger "${actionState.itemName}" to run immediately.`,
      duplicate: `This will create a copy of "${actionState.itemName}" with the same configuration.`,
    }
    return descriptions[actionState.type]
  }

  const isDestructive = actionState?.type === 'delete'

  if (rawInstalledAgents.length === 0 && rawInstalledWorkflows.length === 0) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Fleet</h1>
          <p className="text-muted-foreground">Manage your installed agents and workflows</p>
        </div>
        <EmptyState
          icon={Bot}
          title="No agents installed yet"
          description="Your fleet is empty. Browse the marketplace to find and install agent packs that automate your workflows."
          actionLabel="Browse Marketplace"
          actionHref={`/app/${tenantId}/marketplace`}
        />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Fleet</h1>
          <p className="text-muted-foreground">Manage your installed agents and workflows</p>
        </div>
        <Link href={`/app/${tenantId}/marketplace`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add to Fleet
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search fleet..." 
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SpotlightCard className="rounded-md border border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {installedAgents.filter(a => a.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {installedAgents.length} installed
            </p>
          </CardContent>
        </SpotlightCard>
        <SpotlightCard className="rounded-md border border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {installedWorkflows.filter(w => w.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {installedWorkflows.length} installed
            </p>
          </CardContent>
        </SpotlightCard>
        <SpotlightCard className="rounded-md border border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runs Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {installedAgents.reduce((sum, a) => sum + (a.metrics?.runsToday || 0), 0) +
               installedWorkflows.reduce((sum, w) => sum + (w.metrics?.runsToday || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              across all agents and workflows
            </p>
          </CardContent>
        </SpotlightCard>
        <SpotlightCard className="rounded-md border border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.2%</div>
            <p className="text-xs text-muted-foreground">
              last 24 hours
            </p>
          </CardContent>
        </SpotlightCard>
      </div>

      <FadeContent>
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="h-4 w-4" />
            Agents ({filteredAgents.length})
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-2">
            <Workflow className="h-4 w-4" />
            Workflows ({filteredWorkflows.length})
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Runs Today</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map(ia => (
                    <TableRow key={ia.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{ia.agent?.name || ia.agentId}</p>
                            <p className="text-sm text-muted-foreground">v{ia.version}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ia.status)}
                          {getStatusBadge(ia.status)}
                        </div>
                      </TableCell>
                      <TableCell>{ia.metrics?.runsToday || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={ia.metrics?.successRate || 0} className="w-16 h-2" />
                          <span className="text-sm">{ia.metrics?.successRate || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ia.metrics?.lastRunAt ? formatDate(ia.metrics.lastRunAt) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openAction('trigger', 'agent', ia.id, ia.agent?.name || ia.agentId)}
                                >
                                  <Zap className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Trigger manually</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/app/${tenantId}/runs?agentId=${ia.agentId}`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>View runs</TooltipContent>
                            </Tooltip>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => openAction(
                                    ia.status === 'paused' ? 'resume' : 'pause', 
                                    'agent', 
                                    ia.id, 
                                    ia.agent?.name || ia.agentId
                                  )}
                                >
                                  {ia.status === 'paused' ? (
                                    <><Play className="mr-2 h-4 w-4" /> Resume</>
                                  ) : (
                                    <><Pause className="mr-2 h-4 w-4" /> Pause</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAction('duplicate', 'agent', ia.id, ia.agent?.name || ia.agentId)}>
                                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" /> Configure
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => openAction('delete', 'agent', ia.id, ia.agent?.name || ia.agentId)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No agents installed yet.{' '}
                        <Link href={`/app/${tenantId}/marketplace`} className="text-primary hover:underline">
                          Browse the marketplace
                        </Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Runs Today</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkflows.map(iw => (
                    <TableRow key={iw.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1/10">
                            <Workflow className="h-5 w-5 text-chart-1" />
                          </div>
                          <div>
                            <p className="font-medium">{iw.workflow?.name || iw.workflowId}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {iw.workflow?.trigger || 'manual'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(iw.status)}
                          {getStatusBadge(iw.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {iw.workflow?.trigger || 'manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>{iw.metrics?.runsToday || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {iw.metrics?.lastRunAt ? formatDate(iw.metrics.lastRunAt) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openAction('trigger', 'workflow', iw.id, iw.workflow?.name || iw.workflowId)}
                                >
                                  <Zap className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Trigger manually</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/app/${tenantId}/runs?workflowId=${iw.workflowId}`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>View runs</TooltipContent>
                            </Tooltip>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => openAction(
                                    iw.status === 'paused' ? 'resume' : 'pause', 
                                    'workflow', 
                                    iw.id, 
                                    iw.workflow?.name || iw.workflowId
                                  )}
                                >
                                  {iw.status === 'paused' ? (
                                    <><Play className="mr-2 h-4 w-4" /> Resume</>
                                  ) : (
                                    <><Pause className="mr-2 h-4 w-4" /> Pause</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAction('duplicate', 'workflow', iw.id, iw.workflow?.name || iw.workflowId)}>
                                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Settings className="mr-2 h-4 w-4" /> Configure
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => openAction('delete', 'workflow', iw.id, iw.workflow?.name || iw.workflowId)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredWorkflows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No workflows installed yet.{' '}
                        <Link href={`/app/${tenantId}/marketplace`} className="text-primary hover:underline">
                          Browse the marketplace
                        </Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </FadeContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionState} onOpenChange={(open) => !open && closeAction()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={isLoading}
              className={isDestructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                actionState?.type === 'delete' ? 'Remove' :
                actionState?.type === 'pause' ? 'Pause' :
                actionState?.type === 'resume' ? 'Resume' :
                actionState?.type === 'trigger' ? 'Trigger' :
                'Duplicate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
