'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Package,
  ArrowLeft,
  ArrowRight,
  Bot,
  Workflow,
  CheckCircle,
  AlertTriangle,
  Target,
  Clock,
  Shield,
} from 'lucide-react'
import { RiskBadge, IntegrationChip, AvailabilityBadge } from '@/components/badges'
import { SpotlightCard } from '@/components/reactbits/spotlight-card'
import { TiltedCard } from '@/components/reactbits/tilted-card'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import { useDataProvider } from '@/lib/data'
import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface'
import { resolveHonestSurfaceState } from '@/lib/honest-ui'
import { resolveCatalogAvailability } from '@/lib/catalog/availability'
import type { AgentTemplate, WorkflowTemplate, PackTemplate, Integration } from '@agentmou/contracts'

export default function PackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.tenantId as string
  const packId = params.packId as string
  const provider = useDataProvider()
  const installState = resolveHonestSurfaceState('marketplace-install-cta', {
    providerMode: provider.providerMode,
    tenantId,
  })
  const connectState = resolveHonestSurfaceState('marketplace-connect-cta', {
    providerMode: provider.providerMode,
    tenantId,
  })
  const { data: pack, isLoading: loadingPack } = useProviderQuery<PackTemplate | null>(
    (p) => p.getPackTemplate(packId), null, [packId],
  )
  const { data: agentTemplates } = useProviderQuery<AgentTemplate[]>(
    (p) => p.listCatalogAgentTemplates(), [],
  )
  const { data: workflowTemplates } = useProviderQuery<WorkflowTemplate[]>(
    (p) => p.listCatalogWorkflowTemplates(), [],
  )
  const { data: integrations } = useProviderQuery<Integration[]>(
    (p) => p.listIntegrations(), [],
  )
  
  if (loadingPack) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading pack...</p>
        </div>
      </div>
    )
  }

  if (!pack) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Pack not found</p>
          <Link href={`/app/${tenantId}/marketplace`}>
            <Button variant="link">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }
  
  const includedAgentDetails = agentTemplates.filter(a => pack.includedAgents.includes(a.id))
  
  // Derive workflows from included agents (primary) plus any explicitly listed workflows
  const derivedWorkflowIds = new Set<string>()
  includedAgentDetails.forEach(agent => {
    agent.workflows.forEach(wfId => derivedWorkflowIds.add(wfId))
  })
  // Also include explicitly listed workflows
  pack.includedWorkflows.forEach(wfId => derivedWorkflowIds.add(wfId))
  
  const includedWorkflowDetails = workflowTemplates.filter(w => derivedWorkflowIds.has(w.id))
  
  // Collect all unique integrations required by pack contents
  const allRequiredIntegrations = new Set<string>()
  includedAgentDetails.forEach(a => a.requiredIntegrations.forEach(i => allRequiredIntegrations.add(i)))
  includedWorkflowDetails.forEach(w => w.integrations.forEach(i => allRequiredIntegrations.add(i)))
  
  const requiredIntegrationDetails = integrations.filter(i => allRequiredIntegrations.has(i.id))
  const missingIntegrations = requiredIntegrationDetails.filter(i => i.status !== 'connected')
  
  // Included assets that are not generally available yet (preview or planned)
  const hasNonGaIncludedItems = [
    ...includedAgentDetails.filter(
      (a) => resolveCatalogAvailability(a.availability) !== 'available',
    ),
    ...includedWorkflowDetails.filter(
      (w) => resolveCatalogAvailability(w.availability) !== 'available',
    ),
  ].length > 0
  
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
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10">
            <Package className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">{pack.name}</h1>
            <p className="text-lg text-muted-foreground">{pack.description}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <RiskBadge level={pack.riskProfile} />
              <Badge variant="outline" className="capitalize">{pack.vertical}</Badge>
              <span className="text-sm text-muted-foreground">
                {includedAgentDetails.length} agents, {includedWorkflowDetails.length} workflows
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="text-2xl font-bold">
            {pack.monthlyPrice ? `$${pack.monthlyPrice}/mo` : 'Free'}
          </div>
          {installState.tone === 'demo' ? (
            <Link href={`/app/${tenantId}/installer/new?pack=${pack.slug}`}>
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
          )}
          {hasNonGaIncludedItems && (
            <p className="text-xs text-muted-foreground max-w-[200px] text-right">
              Some items in this pack are preview or coming soon
            </p>
          )}
        </div>
      </div>
      
      <Separator />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPIs */}
          <TiltedCard className="h-full">
          <SpotlightCard className="rounded-lg h-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Key Performance Indicators
              </CardTitle>
              <CardDescription>Business outcomes this pack helps you achieve</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {pack.kpis.map((kpi, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <CheckCircle className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="text-sm">{kpi}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          </SpotlightCard>
          </TiltedCard>
          
          {/* Included Agents */}
          <TiltedCard className="h-full">
          <SpotlightCard className="rounded-lg h-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Included Agents ({includedAgentDetails.length})
              </CardTitle>
              <CardDescription>AI agents bundled in this pack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {includedAgentDetails.map((agent) => (
                  <Link 
                    key={agent.id}
                    href={`/app/${tenantId}/marketplace/agents/${agent.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                        <Bot className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{agent.name}</p>
                          <AvailabilityBadge status={resolveCatalogAvailability(agent.availability)} />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{agent.outcome}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          </SpotlightCard>
          </TiltedCard>
          
          {/* Included Workflows */}
          <TiltedCard className="h-full">
          <SpotlightCard className="rounded-lg h-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Included Workflows ({includedWorkflowDetails.length})
              </CardTitle>
              <CardDescription>n8n workflows bundled in this pack</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {includedWorkflowDetails.map((workflow) => (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{workflow.name}</p>
                          <AvailabilityBadge status={resolveCatalogAvailability(workflow.availability)} />
                        </div>
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
          </TiltedCard>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <TiltedCard className="h-full">
          <SpotlightCard className="rounded-lg h-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Vertical
                </span>
                <span className="font-medium capitalize">{pack.vertical}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Setup Time
                </span>
                <span className="font-medium">{pack.setupTimeEstimate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Risk Profile
                </span>
                <span className="font-medium capitalize">{pack.riskProfile}</span>
              </div>
            </CardContent>
          </Card>
          </SpotlightCard>
          </TiltedCard>
          
          {/* Required Integrations */}
          <TiltedCard className="h-full">
          <SpotlightCard className="rounded-lg h-full">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Required Integrations ({requiredIntegrationDetails.length})</CardTitle>
                <HonestSurfaceBadge state={connectState} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <HonestSurfaceNotice state={connectState} />
              {requiredIntegrationDetails.map((integration) => {
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
          </TiltedCard>
          
          {/* All Integrations Summary */}
          <TiltedCard className="h-full">
          <SpotlightCard className="rounded-lg h-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integration Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {Array.from(allRequiredIntegrations).map((int) => (
                  <IntegrationChip key={int} name={int} />
                ))}
              </div>
            </CardContent>
          </Card>
          </SpotlightCard>
          </TiltedCard>
        </div>
      </div>
    </div>
  )
}
