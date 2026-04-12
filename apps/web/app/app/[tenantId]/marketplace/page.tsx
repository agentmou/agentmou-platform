'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Workflow, Package, Search, ArrowRight } from 'lucide-react';
import {
  RiskBadge,
  ChannelBadge,
  IntegrationChip,
  SpecLine,
  AvailabilityBadge,
  DomainBadge,
} from '@/components/badges';
import { FadeContent } from '@/components/reactbits/fade-content';
import { SpotlightCard } from '@/components/reactbits/spotlight-card';
import { TiltedCard } from '@/components/reactbits/tilted-card';
import { CATEGORY_OPTIONS, normalizeCategory } from '@/lib/control-plane/category-config';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import { resolveCatalogAvailability } from '@/lib/catalog/availability';
import type { AgentTemplate, WorkflowTemplate, PackTemplate } from '@agentmou/contracts';

function MarketplacePageContent() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { data: agentTemplates } = useProviderQuery<AgentTemplate[]>(
    (p) => p.listMarketplaceAgentTemplates(),
    []
  );
  const { data: workflowTemplates } = useProviderQuery<WorkflowTemplate[]>(
    (p) => p.listMarketplaceWorkflowTemplates(),
    []
  );
  const { data: packTemplates } = useProviderQuery<PackTemplate[]>(
    (p) => p.listPackTemplates(),
    []
  );

  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [riskFilter, setRiskFilter] = React.useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = React.useState<string>('all');
  const [audienceFilter, setAudienceFilter] = React.useState<string>('all');

  // Filter agents first
  const filteredAgents = React.useMemo(() => {
    return agentTemplates.filter((agent) => {
      // Hide variant, hidden, and deprecated items from main marketplace
      if (agent.visibility && agent.visibility !== 'public') return false;

      if (
        search &&
        !agent.name.toLowerCase().includes(search.toLowerCase()) &&
        !agent.outcome.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      // Normalize the agent's category for filtering
      const agentCategory = normalizeCategory(agent.catalogGroup || agent.domain);
      if (categoryFilter !== 'all' && agentCategory !== categoryFilter) return false;
      if (riskFilter !== 'all' && agent.riskLevel !== riskFilter) return false;
      if (
        availabilityFilter !== 'all' &&
        resolveCatalogAvailability(agent.availability) !== availabilityFilter
      ) {
        return false;
      }
      if (
        audienceFilter !== 'all' &&
        agent.audience &&
        agent.audience !== 'both' &&
        agent.audience !== audienceFilter
      )
        return false;
      return true;
    });
  }, [search, categoryFilter, riskFilter, availabilityFilter, audienceFilter, agentTemplates]);

  // Workflows are listed independently of agents (agents may orchestrate workflows; workflows stay first-class).
  const filteredWorkflows = React.useMemo(() => {
    return workflowTemplates.filter((workflow) => {
      if (
        workflow.visibility &&
        (workflow.visibility === 'hidden' || workflow.visibility === 'deprecated')
      ) {
        return false;
      }

      if (
        search &&
        !workflow.name.toLowerCase().includes(search.toLowerCase()) &&
        !workflow.summary.toLowerCase().includes(search.toLowerCase()) &&
        !workflow.useCase.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      if (categoryFilter !== 'all') {
        const groups = workflow.catalogGroups ?? [];
        const matchesGroup = groups.some((g) => normalizeCategory(g) === categoryFilter);
        if (groups.length > 0 && !matchesGroup) return false;
      }

      if (riskFilter !== 'all' && workflow.riskLevel !== riskFilter) return false;
      if (
        availabilityFilter !== 'all' &&
        resolveCatalogAvailability(workflow.availability) !== availabilityFilter
      ) {
        return false;
      }
      return true;
    });
  }, [workflowTemplates, search, categoryFilter, riskFilter, availabilityFilter]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header — aligned with Dashboard */}
      <div>
        <p className="text-editorial-tiny mb-2">Marketplace</p>
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and install agents, workflows, and packs to automate your operations.
        </p>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search marketplace..."
              className="pl-9 h-9 text-sm border-border/50 bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Risk
              </SelectItem>
              <SelectItem value="low" className="text-xs">
                Low Risk
              </SelectItem>
              <SelectItem value="medium" className="text-xs">
                Medium Risk
              </SelectItem>
              <SelectItem value="high" className="text-xs">
                High Risk
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Status
              </SelectItem>
              <SelectItem value="available" className="text-xs">
                Available
              </SelectItem>
              <SelectItem value="preview" className="text-xs">
                In catalog
              </SelectItem>
              <SelectItem value="planned" className="text-xs">
                Planned
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={audienceFilter} onValueChange={setAudienceFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-border/50">
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Audiences
              </SelectItem>
              <SelectItem value="business" className="text-xs">
                Business
              </SelectItem>
              <SelectItem value="personal" className="text-xs">
                Personal
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

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
            <TabsTrigger value="packs" className="gap-2">
              <Package className="h-4 w-4" />
              Packs ({packTemplates.length})
            </TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            <FadeContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => (
                  <SpotlightCard
                    key={agent.id}
                    className="flex flex-col rounded-md border border-border/50 bg-card"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted/50">
                          <Bot className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="flex gap-1.5">
                          <AvailabilityBadge
                            status={resolveCatalogAvailability(agent.availability)}
                          />
                          <DomainBadge
                            domain={normalizeCategory(agent.catalogGroup || agent.domain)}
                          />
                          {agent.channel === 'beta' && <ChannelBadge channel="beta" />}
                        </div>
                      </div>
                      <CardTitle className="text-sm font-medium mt-3">{agent.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {agent.outcome}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-4">
                      {/* Spec line */}
                      <div className="space-y-3">
                        <SpecLine
                          hitl={agent.hitl as 'optional' | 'recommended' | 'required'}
                          complexity={agent.complexity}
                          setupMinutes={agent.setupTimeMinutes}
                        />
                        <div className="flex flex-wrap gap-1">
                          {agent.requiredIntegrations.slice(0, 3).map((int) => (
                            <IntegrationChip key={int} name={int} />
                          ))}
                          {agent.requiredIntegrations.length > 3 && (
                            <IntegrationChip name={`+${agent.requiredIntegrations.length - 3}`} />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/30">
                        {/* Price as microcopy */}
                        <span className="text-xs text-muted-foreground">
                          {agent.monthlyPrice ? `$${agent.monthlyPrice} / mo` : 'Free'}
                        </span>
                        <Link href={`/app/${tenantId}/marketplace/agents/${agent.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </SpotlightCard>
                ))}
              </div>
            </FadeContent>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-4">
            <FadeContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredWorkflows.map((workflow) => (
                  <SpotlightCard
                    key={workflow.id}
                    className="flex flex-col rounded-md border border-border/50 bg-card"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted/50">
                          <Workflow className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="flex gap-1.5">
                          <AvailabilityBadge
                            status={resolveCatalogAvailability(workflow.availability)}
                          />
                          <RiskBadge level={workflow.riskLevel} showIcon={false} />
                        </div>
                      </div>
                      <CardTitle className="text-sm font-medium mt-3">{workflow.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {workflow.summary}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Trigger: {workflow.trigger}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {workflow.integrations.slice(0, 3).map((int) => (
                            <IntegrationChip key={int} name={int} />
                          ))}
                          {workflow.integrations.length > 3 && (
                            <IntegrationChip name={`+${workflow.integrations.length - 3}`} />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/30">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          v{workflow.version}
                        </span>
                        <Link href={`/app/${tenantId}/marketplace/workflows/${workflow.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </SpotlightCard>
                ))}
              </div>
            </FadeContent>
          </TabsContent>

          {/* Packs Tab */}
          <TabsContent value="packs" className="space-y-4">
            <FadeContent>
              <div className="grid gap-4 md:grid-cols-2">
                {packTemplates.map((pack) => (
                  <TiltedCard key={pack.id} className="h-full">
                    <SpotlightCard className="h-full rounded-md border border-border/50 bg-card">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted/50">
                            <Package className="h-5 w-5 text-foreground" />
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            <RiskBadge level={pack.riskProfile} showIcon={false} />
                            {pack.includedCategories.slice(0, 2).map((cat) => (
                              <DomainBadge key={cat} domain={cat} />
                            ))}
                          </div>
                        </div>
                        <CardTitle className="text-sm font-medium mt-3">{pack.name}</CardTitle>
                        <CardDescription className="text-xs">{pack.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Includes
                            </p>
                            <p className="text-sm font-medium">
                              {pack.includedAgents.length} agents, {pack.includedWorkflows.length}{' '}
                              workflows
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Setup Time
                            </p>
                            <p className="text-sm font-medium">{pack.setupTimeEstimate}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                            Outcomes
                          </p>
                          <ul className="space-y-1">
                            {pack.kpis.slice(0, 3).map((kpi, i) => (
                              <li
                                key={i}
                                className="text-xs flex items-center gap-2 text-muted-foreground"
                              >
                                <div className="h-1 w-1 rounded-full bg-accent" />
                                {kpi}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-border/30">
                          <span className="text-xs text-muted-foreground">
                            {pack.monthlyPrice ? `$${pack.monthlyPrice} / mo` : 'Free'}
                          </span>
                          <Link href={`/app/${tenantId}/marketplace/packs/${pack.slug}`}>
                            <Button size="sm" className="h-8 text-xs">
                              View Pack
                              <ArrowRight className="ml-1.5 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </SpotlightCard>
                  </TiltedCard>
                ))}
              </div>
            </FadeContent>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return <MarketplacePageContent />;
}
