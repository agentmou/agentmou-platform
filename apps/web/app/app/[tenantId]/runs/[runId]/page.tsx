'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Bot,
  Workflow,
  Zap,
  Brain,
  Play,
  Terminal,
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import {
  getTenantRun,
  listCatalogAgentTemplates,
  listCatalogWorkflowTemplates,
} from '@/lib/fleetops/read-model'

const statusColors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  timeout: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
}

const stepTypeIcons = {
  trigger: Zap,
  transform: Play,
  llm: Brain,
  action: Play,
  fetch: Workflow,
  extract: Workflow,
  output: CheckCircle,
  approval: Clock,
}

export default function RunDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const runId = params.runId as string
  const agentTemplates = React.useMemo(() => listCatalogAgentTemplates(), [])
  const workflowTemplates = React.useMemo(
    () => listCatalogWorkflowTemplates(),
    [],
  )
  
  const run = getTenantRun(tenantId, runId)
  
  if (!run) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Run not found</p>
          <Button variant="link" onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    )
  }
  
  const agent = agentTemplates.find(a => a.id === run.agentId)
  const workflow = workflowTemplates.find(w => w.id === run.workflowId)
  
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {agent ? (
              <Bot className="h-6 w-6 text-primary" />
            ) : (
              <Workflow className="h-6 w-6 text-chart-2" />
            )}
            <h1 className="text-2xl font-bold">{agent?.name || workflow?.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusColors[run.status]} variant="secondary">
              {run.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {run.status === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
              {(run.status === 'failed' || run.status === 'error') && <XCircle className="h-3 w-3 mr-1" />}
              {run.status === 'pending_approval' && <Clock className="h-3 w-3 mr-1" />}
              {run.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground font-mono">{run.id}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Retry Run</Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-2xl font-bold">
              {run.durationMs ? `${(run.durationMs / 1000).toFixed(2)}s` : 'Running...'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tokens Used</p>
            <p className="text-2xl font-bold">{formatNumber(run.tokensUsed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Est. Cost</p>
            <p className="text-2xl font-bold">${run.costEstimate.toFixed(4)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Triggered By</p>
            <p className="text-2xl font-bold capitalize">{run.triggeredBy}</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
        </TabsList>
        
        {/* Timeline */}
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution Timeline</CardTitle>
              <CardDescription>Step-by-step execution flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {run.timeline.map((step, index) => {
                  const StepIcon = stepTypeIcons[step.type] || Play
                  const isLast = index === run.timeline.length - 1
                  return (
                    <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
                      {/* Connector */}
                      <div className="relative flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                          step.status === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
                          step.status === 'failed' || step.status === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                          step.status === 'running' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' :
                          'border-muted bg-muted'
                        }`}>
                          {step.status === 'running' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                          ) : (
                            <StepIcon className={`h-5 w-5 ${
                              step.status === 'success' ? 'text-green-500' :
                              step.status === 'failed' || step.status === 'error' ? 'text-red-500' :
                              'text-muted-foreground'
                            }`} />
                          )}
                        </div>
                        {!isLast && (
                          <div className="absolute top-10 h-full w-0.5 bg-border" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{step.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">{step.type}</Badge>
                              {step.durationMs && (
                                <span className="text-xs text-muted-foreground">{step.durationMs}ms</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(step.startedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {step.error && (
                          <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
                            {step.error}
                          </div>
                        )}
                        {step.tokenUsage && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Tokens: {formatNumber(step.tokenUsage)} | Cost: ${step.cost?.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Logs */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Execution Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="font-mono text-sm space-y-1 bg-muted/50 p-4 rounded-lg">
                  {run.logs.map((log, index) => (
                    <div key={index} className={`${
                      log.includes('ERROR') || log.includes('Error') ? 'text-red-500' :
                      log.includes('Success') || log.includes('completed') ? 'text-green-500' :
                      'text-muted-foreground'
                    }`}>
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Input */}
        <TabsContent value="input" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
              <CardDescription>Data received when the run was triggered</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-sm font-mono">
                {JSON.stringify(run.timeline[0]?.input || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Output */}
        <TabsContent value="output" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Output Data</CardTitle>
              <CardDescription>Final result of the execution</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/50 p-4 rounded-lg overflow-auto text-sm font-mono">
                {JSON.stringify(run.timeline[run.timeline.length - 1]?.output || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
