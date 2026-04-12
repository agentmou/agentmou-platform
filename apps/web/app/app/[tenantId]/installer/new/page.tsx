'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Stepper, Step } from '@/components/reactbits/stepper';
import { SpotlightCard } from '@/components/reactbits/spotlight-card';
import { useToast } from '@/hooks/use-toast';
import { useDataProvider } from '@/lib/providers/context';
import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface';
import { resolveHonestSurfaceState } from '@/lib/honest-ui';
import { Bot, Workflow, Package, Plug, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { normalizeCategory } from '@/lib/control-plane/category-config';
import { resolveCatalogAvailability } from '@/lib/catalog/availability';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import type {
  AgentTemplate,
  Category,
  Integration,
  PackTemplate,
  WorkflowTemplate,
} from '@agentmou/contracts';

const stepLabels = [
  { id: 1, name: 'Outcome' },
  { id: 2, name: 'Components' },
  { id: 3, name: 'Integrations' },
  { id: 4, name: 'Variables' },
  { id: 5, name: 'Risk & HITL' },
  { id: 6, name: 'Review' },
];

const outcomes = [
  {
    id: 'core',
    name: 'Core',
    description: 'Foundation agents for orchestration and general AI capabilities',
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Automate ticket routing, email triage, and customer sentiment tracking',
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Meeting prep, calendar management, and lead qualification',
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Market monitoring, competitor research, and content summarization',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Content generation, social media, and campaign tracking',
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Expense tracking, invoicing, and financial reporting',
  },
  { id: 'ops', name: 'Ops', description: 'Data processing, inventory, and vendor management' },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Inbox management, file archiving, and personal productivity',
  },
];

function InstallerWizardPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tenantId = params.tenantId as string;
  const provider = useDataProvider();
  const installerState = resolveHonestSurfaceState('installer-flow', {
    providerMode: provider.providerMode,
    tenantId,
  });

  const { data: agentTemplates } = useProviderQuery<AgentTemplate[]>(
    (p) => p.listCatalogAgentTemplates(),
    [],
    []
  );
  const { data: workflowTemplates } = useProviderQuery<WorkflowTemplate[]>(
    (p) => p.listCatalogWorkflowTemplates(),
    [],
    []
  );
  const { data: packTemplates } = useProviderQuery<PackTemplate[]>(
    (p) => p.listPackTemplates(),
    [],
    []
  );
  const { data: integrations } = useProviderQuery<Integration[]>(
    (p) => p.listIntegrations(),
    [],
    []
  );

  const [currentStep, setCurrentStep] = React.useState(1);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const [selectedOutcome, setSelectedOutcome] = React.useState<string>('');
  const [selectedPack, setSelectedPack] = React.useState<string>('');
  const [selectedAgents, setSelectedAgents] = React.useState<string[]>([]);
  const [selectedWorkflows, setSelectedWorkflows] = React.useState<string[]>([]);
  const [connectedIntegrations, setConnectedIntegrations] = React.useState<Record<string, boolean>>(
    {}
  );
  const [variables, setVariables] = React.useState<Record<string, string>>({});
  const [hitlSettings, setHitlSettings] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const agentId = searchParams.get('agent');
    const workflowId = searchParams.get('workflow');
    const packId = searchParams.get('pack');

    if (agentId) {
      setSelectedAgents([agentId]);
      const agent = agentTemplates.find((a) => a.id === agentId);
      if (agent) {
        setSelectedOutcome(normalizeCategory(agent.catalogGroup || agent.domain));
        setSelectedWorkflows(agent.workflows);
      }
      setCurrentStep(2);
    } else if (workflowId) {
      setSelectedWorkflows([workflowId]);
      setCurrentStep(2);
    } else if (packId) {
      setSelectedPack(packId);
      const pack = packTemplates.find((p) => p.slug === packId || p.id === packId);
      if (pack) {
        setSelectedOutcome(pack.vertical);
        setSelectedAgents(pack.includedAgents);
        setSelectedWorkflows(pack.includedWorkflows);
      }
      setCurrentStep(2);
    }

    const connected: Record<string, boolean> = {};
    integrations.forEach((i) => {
      connected[i.id] = i.status === 'connected';
    });
    setConnectedIntegrations(connected);
  }, [agentTemplates, integrations, packTemplates, searchParams]);

  const filteredAgents = agentTemplates.filter((a) => {
    if (resolveCatalogAvailability(a.availability) !== 'available') return false;
    if (a.visibility && a.visibility !== 'public') return false;
    const agentCategory = normalizeCategory(a.catalogGroup || a.domain);
    return !selectedOutcome || agentCategory === selectedOutcome;
  });

  const filteredPacks = packTemplates.filter(
    (p) =>
      !selectedOutcome ||
      p.vertical === selectedOutcome ||
      p.includedCategories.includes(selectedOutcome as Category)
  );

  const requiredIntegrations = React.useMemo(() => {
    const ids = new Set<string>();
    selectedAgents.forEach((agentId) => {
      const agent = agentTemplates.find((a) => a.id === agentId);
      agent?.requiredIntegrations.forEach((i) => ids.add(i));
    });
    selectedWorkflows.forEach((workflowId) => {
      const workflow = workflowTemplates.find((w) => w.id === workflowId);
      workflow?.integrations.forEach((i) => ids.add(i));
    });
    return Array.from(ids);
  }, [selectedAgents, selectedWorkflows]);

  const missingIntegrations = requiredIntegrations.filter((i) => !connectedIntegrations[i]);

  const canProceed = (() => {
    switch (currentStep) {
      case 1:
        return !!selectedOutcome;
      case 2:
        return selectedAgents.length > 0 || selectedWorkflows.length > 0;
      case 3:
        return missingIntegrations.length === 0;
      default:
        return true;
    }
  })();

  const handleInstall = async () => {
    setIsInstalling(true);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsInstalling(false);

    if (installerState.tone !== 'demo') {
      toast({
        title: 'Installer preview only',
        description: 'Live tenant installation is not available from this flow yet.',
      });
      return;
    }

    toast({
      title: 'Demo review complete',
      description: `No live installation was performed. You reviewed ${selectedAgents.length} agents and ${selectedWorkflows.length} workflows in demo mode.`,
    });
    router.push(`/app/${tenantId}/marketplace`);
  };

  const handleTestConnection = async (integrationId: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConnectedIntegrations((prev) => ({ ...prev, [integrationId]: true }));
    setIsLoading(false);
    const integrationName =
      integrations.find((integration) => integration.id === integrationId)?.name || integrationId;
    toast({
      title: 'Demo connection updated',
      description: `${integrationName} is marked ready only inside this preview.`,
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-editorial-tiny mb-2">Installer</p>
        <h1 className="text-2xl font-bold tracking-tight">Installer Preview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review the setup flow for agents and workflows before live tenant wiring is available.
        </p>
      </div>

      <HonestSurfaceNotice state={installerState} />

      <div className="max-w-4xl space-y-6">
        <Stepper
          steps={stepLabels}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onComplete={handleInstall}
          canProceed={
            currentStep === stepLabels.length && installerState.tone !== 'demo' ? false : canProceed
          }
          isLoading={isInstalling}
          completeButtonText={
            installerState.tone === 'demo' ? 'Finish Demo Review' : 'Preview Only'
          }
        >
          {/* Step 1: Choose Outcome */}
          <Step>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">What do you want to achieve?</h2>
                <p className="text-sm text-muted-foreground">
                  Select your primary use case to see relevant agents and workflows.
                </p>
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
          </Step>

          {/* Step 2: Select Components */}
          <Step>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Select agents and workflows</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a pack or build your custom stack.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Quick Start Packs
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredPacks.map((pack) => (
                    <SpotlightCard key={pack.id} className="rounded-lg border border-border/50">
                      <Label
                        className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                          selectedPack === pack.id ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          setSelectedPack(pack.id);
                          setSelectedAgents(pack.includedAgents);
                          setSelectedWorkflows(pack.includedWorkflows);
                        }}
                      >
                        <Package className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <p className="font-medium">{pack.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pack.includedAgents.length} agents, {pack.includedWorkflows.length}{' '}
                            workflows
                          </p>
                        </div>
                      </Label>
                    </SpotlightCard>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Or select individually
                </h3>
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
                            setSelectedAgents([...selectedAgents, agent.id]);
                            setSelectedWorkflows([
                              ...new Set([...selectedWorkflows, ...agent.workflows]),
                            ]);
                          } else {
                            setSelectedAgents(selectedAgents.filter((id) => id !== agent.id));
                          }
                          setSelectedPack('');
                        }}
                      />
                      <Bot className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.outcome}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {agent.riskLevel}
                      </Badge>
                    </Label>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">
                  Selected: {selectedAgents.length} agents, {selectedWorkflows.length} workflows
                </p>
              </div>
            </div>
          </Step>

          {/* Step 3: Connect Integrations */}
          <Step>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Review integration requirements</h2>
                  <HonestSurfaceBadge state={installerState} />
                </div>
                <p className="text-sm text-muted-foreground">
                  These integrations are referenced by the selected agents and workflows. Demo mode
                  can simulate readiness without creating real connections.
                </p>
              </div>

              <div className="space-y-3">
                {requiredIntegrations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p>No integration requirements listed for this selection.</p>
                  </div>
                ) : (
                  requiredIntegrations.map((integrationId) => {
                    const integration = integrations.find((i) => i.id === integrationId);
                    const isConnected = connectedIntegrations[integrationId];
                    return (
                      <div
                        key={integrationId}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Plug className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{integration?.name || integrationId}</p>
                            <p className="text-xs text-muted-foreground">
                              {isConnected ? 'Ready in this preview' : 'Needs connection details'}
                            </p>
                          </div>
                        </div>
                        {isConnected ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestConnection(integrationId)}
                            disabled={isLoading || installerState.tone !== 'demo'}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Simulate Connection'
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {missingIntegrations.length > 0 && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm">
                    {installerState.tone === 'demo'
                      ? `${missingIntegrations.length} integration(s) can still be simulated before this demo review is complete.`
                      : `${missingIntegrations.length} integration(s) still need connection details before this flow can move beyond preview.`}
                  </p>
                </div>
              )}
            </div>
          </Step>

          {/* Step 4: Configure Variables */}
          <Step>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Draft variables</h2>
                <p className="text-sm text-muted-foreground">
                  Capture the values you would want in a future live setup.
                </p>
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
          </Step>

          {/* Step 5: Risk & HITL */}
          <Step>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Risk & Approval Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Review human-in-the-loop defaults for a future live setup.
                </p>
              </div>

              <div className="space-y-4">
                {selectedAgents.map((agentId) => {
                  const agent = agentTemplates.find((a) => a.id === agentId);
                  if (!agent) return null;
                  return (
                    <div
                      key={agentId}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
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
                          onCheckedChange={(checked) =>
                            setHitlSettings({ ...hitlSettings, [agentId]: checked })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  These approval settings stay inside this preview until a live install flow exists.
                </p>
              </div>
            </div>
          </Step>

          {/* Step 6: Review Setup */}
          <Step>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Review Setup</h2>
                <p className="text-sm text-muted-foreground">
                  Review this setup summary before leaving the preview.
                </p>
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
                      <Badge key={i} variant="outline">
                        {i}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <h3 className="font-medium mb-2">HITL Enabled</h3>
                  <p className="text-sm text-muted-foreground">
                    {Object.values(hitlSettings).filter(Boolean).length} of {selectedAgents.length}{' '}
                    agents require approval
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="font-medium mb-2">Estimated Monthly Cost Preview</h3>
                  <p className="text-2xl font-bold">
                    $
                    {selectedAgents.reduce((sum, id) => {
                      const agent = agentTemplates.find((a) => a.id === id);
                      return sum + (agent?.monthlyPrice || 0);
                    }, 0)}
                    /mo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Illustrative only, plus estimated LLM usage.
                  </p>
                </div>
              </div>
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  );
}

export default function InstallerWizardPage() {
  return <InstallerWizardPageContent />;
}
