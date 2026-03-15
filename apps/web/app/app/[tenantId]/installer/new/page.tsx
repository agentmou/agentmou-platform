'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Stepper } from '@/components/reactbits/stepper'
import { SpotlightCard } from '@/components/reactbits/spotlight-card'
import { useToast } from '@/hooks/use-toast'
import {
  Bot,
  Workflow,
  Package,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plug,
  Settings2,
  Shield,
  Rocket,
  Target,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { normalizeCategory } from '@/lib/fleetops/category-config'
import { BrandStrip } from '@/components/brand/brand-frame'
import { HalftoneIllustration } from '@/components/brand/halftone-illustration'
import { useProviderQuery } from '@/lib/data/use-provider-query'
import type { AgentTemplate, WorkflowTemplate, PackTemplate, Integration } from '@agentmou/contracts'

const steps = [
  { id: 1, name: 'Choose Outcome', icon: Target },
  { id: 2, name: 'Select Components', icon: Package },
  { id: 3, name: 'Connect Integrations', icon: Plug },
  { id: 4, name: 'Configure Variables', icon: Settings2 },
  { id: 5, name: 'Risk & HITL', icon: Shield },
  { id: 6, name: 'Review & Install', icon: Rocket },
]

// Canonical category-based outcomes (matches CATEGORY_OPTIONS)
const outcomes = [
  { id: 'core', name: 'Core', description: 'Foundation agents for orchestration and general AI capabilities' },
  { id: 'support', name: 'Support', description: 'Automate ticket routing, email triage, and customer sentiment tracking' },
  { id: 'sales', name: 'Sales', description: 'Meeting prep, calendar management, and lead qualification' },
  { id: 'research', name: 'Research', description: 'Market monitoring, competitor research, and content summarization' },
  { id: 'marketing', name: 'Marketing', description: 'Content generation, social media, and campaign tracking' },
  { id: 'finance', name: 'Finance', description: 'Expense tracking, invoicing, and financial reporting' },
  { id: 'ops', name: 'Ops', description: 'Data processing, inventory, and vendor management' },
  { id: 'personal', name: 'Personal', description: 'Inbox management, file archiving, and personal productivity' },
]

export default function InstallerWizardPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
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
  const { data: packTemplates } = useProviderQuery<PackTemplate[]>(
    (p) => p.listPackTemplates(),
    [],
    [],
  )
  const { data: integrations } = useProviderQuery<Integration[]>(
    (p) => p.listIntegrations(),
    [],
    [],
  )

  const [currentStep, setCurrentStep] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isInstalling, setIsInstalling] = React.useState(false)
  
  // Form state
  const [selectedOutcome, setSelectedOutcome] = React.useState<string>('')
  const [selectedPack, setSelectedPack] = React.useState<string>('')
  const [selectedAgents, setSelectedAgents] = React.useState<string[]>([])
  const [selectedWorkflows, setSelectedWorkflows] = React.useState<string[]>([])
  const [connectedIntegrations, setConnectedIntegrations] = React.useState<Record<string, boolean>>({})
  const [variables, setVariables] = React.useState<Record<string, string>>({})
  const [hitlSettings, setHitlSettings] = React.useState<Record<string, boolean>>({})
  
  // Pre-populate from URL params
  React.useEffect(() => {
    const agentId = searchParams.get('agent')
    const workflowId = searchParams.get('workflow')
    const packId = searchParams.get('pack')
    
    if (agentId) {
      setSelectedAgents([agentId])
      const agent = agentTemplates.find(a => a.id === agentId)
      if (agent) {
        setSelectedOutcome(normalizeCategory(agent.catalogGroup || agent.domain))
        setSelectedWorkflows(agent.workflows)
      }
      setCurrentStep(2)
    } else if (workflowId) {
      setSelectedWorkflows([workflowId])
      setCurrentStep(2)
    } else if (packId) {
      setSelectedPack(packId)
      // Find pack by slug or id for backwards compatibility
      const pack = packTemplates.find(p => p.slug === packId || p.id === packId)
      if (pack) {
        setSelectedOutcome(pack.vertical)
        setSelectedAgents(pack.includedAgents)
        setSelectedWorkflows(pack.includedWorkflows)
      }
      setCurrentStep(2)
    }
    
    // Initialize connected integrations
    const connected: Record<string, boolean> = {}
    integrations.forEach(i => {
      connected[i.id] = i.status === 'connected'
    })
    setConnectedIntegrations(connected)
  }, [searchParams])
  
  const progress = (currentStep / steps.length) * 100
  
  // Filter to only show available agents (not planned) and match selected category
  const filteredAgents = agentTemplates.filter(a => {
    // Only show available agents in installer
    if ((a.availability || 'available') !== 'available') return false
    // Hide variant/hidden agents
    if (a.visibility && a.visibility !== 'public') return false
    // Normalize the agent's category
    const agentCategory = normalizeCategory(a.catalogGroup || a.domain)
    // Match normalized category or show all if no outcome selected
    return !selectedOutcome || agentCategory === selectedOutcome
  })
  
  const filteredPacks = packTemplates.filter(p => 
    !selectedOutcome || p.vertical === selectedOutcome || p.includedCategories.includes(selectedOutcome as any)
  )
  
  const requiredIntegrations = React.useMemo(() => {
    const integrationIds = new Set<string>()
    selectedAgents.forEach(agentId => {
      const agent = agentTemplates.find(a => a.id === agentId)
      agent?.requiredIntegrations.forEach(i => integrationIds.add(i))
    })
    selectedWorkflows.forEach(workflowId => {
      const workflow = workflowTemplates.find(w => w.id === workflowId)
      workflow?.integrations.forEach(i => integrationIds.add(i))
    })
    return Array.from(integrationIds)
  }, [selectedAgents, selectedWorkflows])
  
  const missingIntegrations = requiredIntegrations.filter(i => !connectedIntegrations[i])
  
  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedOutcome
      case 2: return selectedAgents.length > 0 || selectedWorkflows.length > 0
      case 3: return missingIntegrations.length === 0
      case 4: return true
      case 5: return true
      case 6: return true
      default: return false
    }
  }
  
  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleInstall = async () => {
    setIsInstalling(true)
    
    // Simulate installation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    toast({
      title: 'Installation complete!',
      description: `Successfully installed ${selectedAgents.length} agents and ${selectedWorkflows.length} workflows.`,
    })
    
    router.push(`/app/${tenantId}/fleet`)
  }
  
  const handleTestConnection = async (integrationId: string) => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setConnectedIntegrations(prev => ({ ...prev, [integrationId]: true }))
    setIsLoading(false)
    toast({
      title: 'Connection successful',
      description: `${integrationId} is now connected.`,
    })
  }
  
  return (
    <div className="space-y-6">
      {/* Header with brand strip */}
      <BrandStrip className="relative h-20 -mx-6 lg:-mx-8 -mt-6 lg:-mt-8 px-6 lg:px-8 flex items-end pb-4">
        <div className="flex items-center justify-between w-full max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Install New</h1>
            <p className="text-muted-foreground text-sm">
              Set up agents and workflows in a few simple steps.
            </p>
          </div>
          <Button variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
        {/* Mini robot crop */}
        <div className="pointer-events-none absolute right-8 top-0 bottom-0 w-16 hidden md:flex items-center">
          <HalftoneIllustration type="robot-head" opacity={0.05} />
        </div>
      </BrandStrip>
      
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Stepper */}
      <Stepper
        steps={steps}
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) setCurrentStep(step)
        }}
      />
      
      <Card>
        <CardContent className="p-6">
          {/* Step 1: Choose Outcome */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">What do you want to achieve?</h2>
                <p className="text-sm text-muted-foreground">Select your primary use case to see relevant agents and workflows.</p>
              </div>
              <RadioGroup value={selectedOutcome} onValueChange={setSelectedOutcome}>
                <div className="grid gap-4 md:grid-cols-2">
                  {outcomes.map((outcome) => (
                    <SpotlightCard key={outcome.id} className="rounded-lg border border-border/50">
                      <Label
                        htmlFor={outcome.id}
                        className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                          selectedOutcome === outcome.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <RadioGroupItem value={outcome.id} id={outcome.id} />
                        <div>
                          <p className="font-medium">{outcome.name}</p>
                          <p className="text-sm text-muted-foreground">{outcome.description}</p>
                        </div>
                      </Label>
                    </SpotlightCard>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Step 2: Select Components */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Select agents and workflows</h2>
                <p className="text-sm text-muted-foreground">Choose a pack or build your custom stack.</p>
              </div>
              
              {/* Packs */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Quick Start Packs</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredPacks.map((pack) => (
                    <SpotlightCard key={pack.id} className="rounded-lg border border-border/50">
                      <Label
                        className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                          selectedPack === pack.id ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          setSelectedPack(pack.id)
                          setSelectedAgents(pack.includedAgents)
                          setSelectedWorkflows(pack.includedWorkflows)
                        }}
                      >
                        <Package className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <p className="font-medium">{pack.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pack.includedAgents.length} agents, {pack.includedWorkflows.length} workflows
                          </p>
                        </div>
                      </Label>
                    </SpotlightCard>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Individual Agents */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Or select individually</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredAgents.map((agent) => (
                    <Label
                      key={agent.id}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAgents([...selectedAgents, agent.id])
                            setSelectedWorkflows([...new Set([...selectedWorkflows, ...agent.workflows])])
                          } else {
                            setSelectedAgents(selectedAgents.filter(id => id !== agent.id))
                          }
                          setSelectedPack('')
                        }}
                      />
                      <Bot className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.outcome}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{agent.riskLevel}</Badge>
                    </Label>
                  ))}
                </div>
              </div>
              
              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Selected: {selectedAgents.length} agents, {selectedWorkflows.length} workflows</p>
              </div>
            </div>
          )}
          
          {/* Step 3: Connect Integrations */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Connect integrations</h2>
                <p className="text-sm text-muted-foreground">These integrations are required for your selected agents and workflows.</p>
              </div>
              
              <div className="space-y-3">
                {requiredIntegrations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p>No additional integrations required!</p>
                  </div>
                ) : (
                  requiredIntegrations.map((integrationId) => {
                    const integration = integrations.find(i => i.id === integrationId)
                    const isConnected = connectedIntegrations[integrationId]
                    return (
                      <div key={integrationId} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Plug className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{integration?.name || integrationId}</p>
                            <p className="text-xs text-muted-foreground">
                              {isConnected ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        {isConnected ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleTestConnection(integrationId)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              
              {missingIntegrations.length > 0 && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">{missingIntegrations.length} integration(s) still need to be connected.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Step 4: Configure Variables */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Configure variables</h2>
                <p className="text-sm text-muted-foreground">Set up parameters for your agents and workflows.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tone">Response Tone</Label>
                  <Input 
                    id="tone" 
                    placeholder="e.g., Professional, Friendly, Casual"
                    value={variables.tone || ''}
                    onChange={(e) => setVariables({ ...variables, tone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slackChannel">Default Slack Channel</Label>
                  <Input 
                    id="slackChannel" 
                    placeholder="e.g., #alerts, #daily-digest"
                    value={variables.slackChannel || ''}
                    onChange={(e) => setVariables({ ...variables, slackChannel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule (for cron workflows)</Label>
                  <Input 
                    id="schedule" 
                    placeholder="e.g., 9:00 AM daily"
                    value={variables.schedule || ''}
                    onChange={(e) => setVariables({ ...variables, schedule: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Step 5: Risk & HITL */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Risk & Approval Settings</h2>
                <p className="text-sm text-muted-foreground">Configure human-in-the-loop approvals for sensitive actions.</p>
              </div>
              
              <div className="space-y-4">
                {selectedAgents.map((agentId) => {
                  const agent = agentTemplates.find(a => a.id === agentId)
                  if (!agent) return null
                  return (
                    <div key={agentId} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Risk: {agent.riskLevel} | HITL: {agent.hitl}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`hitl-${agentId}`} className="text-sm">
                          Require Approval
                        </Label>
                        <Switch
                          id={`hitl-${agentId}`}
                          checked={hitlSettings[agentId] ?? agent.hitl !== 'optional'}
                          onCheckedChange={(checked) => setHitlSettings({ ...hitlSettings, [agentId]: checked })}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  When HITL is enabled, sensitive actions will be sent to your Approvals inbox before execution.
                </p>
              </div>
            </div>
          )}
          
          {/* Step 6: Review & Install */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Review & Install</h2>
                <p className="text-sm text-muted-foreground">Review your configuration before installing.</p>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <h3 className="font-medium mb-2">Components</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span>{selectedAgents.length} Agents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-chart-2" />
                      <span>{selectedWorkflows.length} Workflows</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border">
                  <h3 className="font-medium mb-2">Integrations</h3>
                  <div className="flex flex-wrap gap-2">
                    {requiredIntegrations.map((i) => (
                      <Badge key={i} variant="outline">{i}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border">
                  <h3 className="font-medium mb-2">HITL Enabled</h3>
                  <p className="text-sm text-muted-foreground">
                    {Object.values(hitlSettings).filter(Boolean).length} of {selectedAgents.length} agents require approval
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="font-medium mb-2">Estimated Monthly Cost</h3>
                  <p className="text-2xl font-bold">
                    ${selectedAgents.reduce((sum, id) => {
                      const agent = agentTemplates.find(a => a.id === id)
                      return sum + (agent?.monthlyPrice || 0)
                    }, 0)}/mo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">+ usage-based LLM costs</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {currentStep < steps.length ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleInstall} disabled={isInstalling}>
            {isInstalling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Install Now
              </>
            )}
          </Button>
        )}
      </div>
      </div>
    </div>
  )
}
