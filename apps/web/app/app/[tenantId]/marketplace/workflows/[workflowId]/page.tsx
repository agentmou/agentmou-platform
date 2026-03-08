'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Workflow,
  ArrowLeft,
  ArrowRight,
  Play,
  Zap,
  Clock,
  FileCode,
} from 'lucide-react'
import { AvailabilityBadge } from '@/components/badges'
import {
  listCatalogWorkflowTemplates,
  listIntegrations,
} from '@/lib/fleetops/read-model'

const riskColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const nodeTypeColors: Record<string, string> = {
  trigger: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ai: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  action: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  logic: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  fetch: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  extract: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
}

export default function WorkflowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const workflowId = params.workflowId as string
  const workflowTemplates = React.useMemo(
    () => listCatalogWorkflowTemplates(),
    [],
  )
  const integrations = React.useMemo(() => listIntegrations(), [])
  
  const workflow = workflowTemplates.find(w => w.id === workflowId)
  
  if (!workflow) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Workflow not found</p>
          <Link href={`/app/${tenantId}/marketplace`}>
            <Button variant="link">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }
  
  const workflowIntegrations = integrations.filter(i => workflow.integrations.includes(i.id))
  
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-chart-2/10">
            <Workflow className="h-8 w-8 text-chart-2" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">{workflow.name}</h1>
            <p className="text-lg text-muted-foreground">{workflow.summary}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <AvailabilityBadge status={workflow.availability || 'available'} />
              <Badge className={riskColors[workflow.riskLevel]} variant="secondary">
                {workflow.riskLevel} risk
              </Badge>
              <Badge variant="outline" className="capitalize">{workflow.trigger} trigger</Badge>
              <span className="text-sm text-muted-foreground">v{workflow.version}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {(workflow.availability || 'available') === 'available' ? (
            <>
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </Button>
              <Link href={`/app/${tenantId}/installer/new?workflow=${workflow.id}`}>
                <Button>
                  Install Workflow
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : (
            <div className="flex flex-col gap-1 items-end">
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
              {workflow.statusNote && (
                <p className="text-xs text-muted-foreground max-w-[200px] text-right">{workflow.statusNote}</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Separator />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Use Case */}
          <Card>
            <CardHeader>
              <CardTitle>Use Case</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{workflow.useCase}</p>
            </CardContent>
          </Card>
          
          {/* Nodes Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Nodes</CardTitle>
              <CardDescription>The steps this workflow executes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {workflow.nodesOverview.map((node, index) => (
                  <div key={node.id} className="flex items-start gap-4">
                    {/* Connector line */}
                    {index < workflow.nodesOverview.length - 1 && (
                      <div className="absolute left-5 top-10 w-0.5 h-12 bg-border" style={{ top: `${index * 80 + 40}px` }} />
                    )}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{node.name}</span>
                        <Badge className={nodeTypeColors[node.type] || 'bg-muted'} variant="secondary">
                          {node.type}
                        </Badge>
                      </div>
                      {node.description && (
                        <p className="text-sm text-muted-foreground">{node.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Changelog */}
          <Card>
            <CardHeader>
              <CardTitle>Changelog</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {workflow.changelog.map((entry, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <FileCode className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <span>{entry}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Trigger
                </span>
                <span className="font-medium capitalize">{workflow.trigger}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Nodes
                </span>
                <span className="font-medium">{workflow.nodesOverview.length}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{workflow.output}</p>
            </CardContent>
          </Card>
          
          {/* Required Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workflowIntegrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between">
                  <span className="text-sm">{integration.name}</span>
                  <Badge variant={integration.status === 'connected' ? 'default' : 'outline'}>
                    {integration.status}
                  </Badge>
                </div>
              ))}
              {workflow.integrations.filter(i => !integrations.find(int => int.id === i)).map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{i}</span>
                  <Badge variant="outline">Required</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
