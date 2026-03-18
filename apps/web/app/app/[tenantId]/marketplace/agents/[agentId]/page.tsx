'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bot,
  ArrowLeft,
  Shield,
  Users,
  Zap,
  Clock,
  Workflow,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { SpotlightCard } from '@/components/reactbits/spotlight-card'
import { AvailabilityBadge, AudienceBadge, DomainBadge } from '@/components/badges'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import { useDataProvider } from '@/lib/data'
import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface'
import { resolveHonestSurfaceState } from '@/lib/honest-ui'
import type { AgentTemplate, WorkflowTemplate, Integration } from '@agentmou/contracts'

const riskColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const hitlColors = {
  optional: 'text-muted-foreground',
  recommended: 'text-yellow-600',
  required: 'text-red-600',
}

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const agentId = params.agentId as string
  const provider = useDataProvider()
  const installState = resolveHonestSurfaceState('marketplace-install-cta', {
    providerMode: provider.providerMode,
    tenantId,
  })
  const connectState = resolveHonestSurfaceState('marketplace-connect-cta', {
    providerMode: provider.providerMode,
    tenantId,
  })
  const { data: agent, isLoading: loadingAgent } = useProviderQuery<AgentTemplate | null>(
    (p) => p.getAgentTemplate(agentId), null, [agentId],
  )
  const { data: workflowTemplates } = useProviderQuery<WorkflowTemplate[]>(
    (p) => p.listCatalogWorkflowTemplates(), [],
  )
  const { data: integrations } = useProviderQuery<Integration[]>(
    (p) => p.listIntegrations(), [],
  )
  
  if (loadingAgent) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading agent...</p>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Agent not found</p>
          <Link href={`/app/${tenantId}/marketplace`}>
            <Button variant="link">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }
  
  const linkedWorkflows = workflowTemplates.filter(w => agent.workflows.includes(w.id))
  const requiredIntegrations = integrations.filter(i => agent.requiredIntegrations.includes(i.id))
  const missingIntegrations = requiredIntegrations.filter(i => i.status !== 'connected')
  
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
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              {agent.channel === 'beta' && (
                <Badge variant="outline">beta</Badge>
              )}
            </div>
            <p className="text-lg text-muted-foreground">{agent.outcome}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <AvailabilityBadge status={agent.availability || 'available'} />
              <DomainBadge domain={agent.domain} />
              {agent.audience && <AudienceBadge audience={agent.audience} />}
              <Badge className={riskColors[agent.riskLevel]} variant="secondary">
                {agent.riskLevel} risk
              </Badge>
              <span className="text-sm text-muted-foreground">v{agent.version}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="text-2xl font-bold">
            {agent.monthlyPrice ? `$${agent.monthlyPrice}/mo` : 'Free'}
          </div>
          {(agent.availability || 'available') === 'available' ? (
            installState.tone === 'demo' ? (
              <Link href={`/app/${tenantId}/installer/new?agent=${agent.id}`}>
                <Button size="lg">
                  Open Demo Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col gap-2 items-end">
                <Button size="lg" disabled>
                  Install Preview
                </Button>
                <p className="text-xs text-muted-foreground max-w-[220px] text-right">
                  {installState.description}
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-2 items-end">
              <Button size="lg" variant="outline" disabled>
                Coming Soon
              </Button>
              {agent.statusNote && (
                <p className="text-xs text-muted-foreground max-w-[200px] text-right">{agent.statusNote}</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <Separator />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{agent.description}</p>
            </CardContent>
          </Card>
          
          {/* Inputs & Outputs */}
          <div className="grid gap-4 md:grid-cols-2">
            <SpotlightCard className="rounded-lg">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inputs</CardTitle>
                </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {agent.inputs.map((input) => (
                    <li key={input} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{input}</code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            </SpotlightCard>
            <SpotlightCard className="rounded-lg">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Outputs</CardTitle>
                </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {agent.outputs.map((output) => (
                    <li key={output} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-chart-2" />
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{output}</code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            </SpotlightCard>
          </div>
          
          {/* KPIs */}
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
              <CardDescription>Metrics this agent helps you track</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {agent.kpis.map((kpi) => (
                  <div key={kpi.name} className="p-4 rounded-lg border">
                    <p className="font-medium">{kpi.name}</p>
                    <p className="text-sm text-muted-foreground">{kpi.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Linked Workflows */}
          <SpotlightCard className="rounded-lg">
            <Card>
              <CardHeader>
                <CardTitle>Linked Workflows</CardTitle>
                <CardDescription>n8n workflows this agent orchestrates</CardDescription>
              </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {linkedWorkflows.map((workflow) => (
                  <Link 
                    key={workflow.id}
                    href={`/app/${tenantId}/marketplace/workflows/${workflow.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                        <Workflow className="h-5 w-5 text-chart-2" />
                      </div>
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{workflow.summary}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          </SpotlightCard>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <SpotlightCard className="rounded-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Info</CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Domain
                </span>
                <span className="font-medium capitalize">{agent.domain}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Complexity
                </span>
                <span className="font-medium">
                  {agent.complexity === 'S' ? 'Simple' : agent.complexity === 'M' ? 'Medium' : 'Large'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Setup Time
                </span>
                <span className="font-medium">{agent.setupTimeMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Human-in-the-loop
                </span>
                <span className={`font-medium capitalize ${hitlColors[agent.hitl]}`}>
                  {agent.hitl}
                </span>
              </div>
            </CardContent>
          </Card>
          </SpotlightCard>
          
          {/* Required Integrations */}
          <SpotlightCard className="rounded-lg">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Required Integrations</CardTitle>
                  <HonestSurfaceBadge state={connectState} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
              <HonestSurfaceNotice state={connectState} />
              {requiredIntegrations.map((integration) => {
                const isConnected = integration.status === 'connected'
                return (
                  <div key={integration.id} className="flex items-center justify-between">
                    <span className="text-sm">{integration.name}</span>
                    {isConnected ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {connectState.tone === 'demo' ? 'Demo ready' : 'Listed as ready'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {connectState.tone === 'demo' ? 'Needs demo setup' : 'Needs setup'}
                      </Badge>
                    )}
                  </div>
                )
              })}
              {missingIntegrations.length > 0 && (
                connectState.tone === 'demo' ? (
                  <Link href={`/app/${tenantId}/security`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Open Demo Integrations
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" className="w-full mt-2" disabled>
                    Connections Not Yet Available
                  </Button>
                )
              )}
              </CardContent>
            </Card>
          </SpotlightCard>
          
          {/* Risk Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Risk Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                This agent has a <strong className="text-foreground">{agent.riskLevel}</strong> risk level.
              </p>
              {agent.hitl === 'required' && (
                <p className="text-yellow-600">
                  Human approval is required for all actions performed by this agent.
                </p>
              )}
              {agent.hitl === 'recommended' && (
                <p>
                  Human approval is recommended for sensitive actions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
