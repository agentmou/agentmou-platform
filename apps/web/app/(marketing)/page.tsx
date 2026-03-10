'use client'

import Link from 'next/link'
import { ArrowRight, Mail, MessageSquare, TrendingUp, Calendar, Users, Zap, Shield, Bot, Workflow, FileText, Lock, Eye, Key } from 'lucide-react'
import { HalftoneBackground } from '@/components/brand/halftone-background'
import { HalftoneIllustration } from '@/components/brand/halftone-illustration'
import { BrandFrame, BrandStrip } from '@/components/brand/brand-frame'
import { MinimalButton } from '@/components/ui/minimal-button'
import { motion } from 'framer-motion'
import { normalizeCategory } from '@/lib/fleetops/category-config'
import {
  listMarketplaceAgentTemplates,
  listMarketplaceWorkflowTemplates,
  listPackTemplates,
} from '@/lib/data/catalog-sync'

// Compute real stats from catalog
const agentTemplates = listMarketplaceAgentTemplates()
const workflowTemplates = listMarketplaceWorkflowTemplates()
const packTemplates = listPackTemplates()
const publicAgents = agentTemplates
const publicWorkflows = workflowTemplates
const featuredAgentIds = ['agent-inbox-triage', 'agent-ticket-router', 'agent-market-monitor', 'agent-meeting-prep']
const featuredWorkflowIds = ['wf-01', 'wf-02', 'wf-05', 'wf-10']

// Map icon components for featured agents
const iconMap: Record<string, typeof Mail> = {
  'agent-inbox-triage': Mail,
  'agent-ticket-router': MessageSquare,
  'agent-market-monitor': TrendingUp,
  'agent-meeting-prep': Calendar,
}

// Get real featured agents from catalog
const featuredAgents = featuredAgentIds
  .map(id => agentTemplates.find(a => a.id === id))
  .filter(Boolean)
  .map(agent => ({
    id: agent!.id,
    name: agent!.name,
    category: normalizeCategory(agent!.catalogGroup || agent!.domain),
    description: agent!.outcome,
    icon: iconMap[agent!.id] || Bot,
    metrics: { timeSaved: `${agent!.setupTimeMinutes * 2}h/week`, accuracy: '94%' },
  }))

// Get real featured workflows from catalog
const featuredWorkflows = featuredWorkflowIds
  .map(id => workflowTemplates.find(w => w.id === id))
  .filter(Boolean)
  .map(wf => ({
    id: wf!.id,
    name: wf!.name,
    trigger: wf!.trigger,
    action: wf!.output.split(' ').slice(0, 3).join(' '),
  }))

// Get real packs from catalog (use slug for linking)
const packs = packTemplates.slice(0, 3).map(pack => ({
  id: pack.slug,
  name: pack.name,
  description: pack.description,
  agents: pack.includedAgents.length,
  workflows: pack.includedWorkflows.length,
  outcome: pack.kpis[0] || 'Streamline operations',
}))

const stats = [
  { value: `${publicAgents.length}+`, label: 'Agents' },
  { value: `${publicWorkflows.length}+`, label: 'Workflows' },
  { value: '94%', label: 'Accuracy' },
  { value: '70%', label: 'Time saved' },
]

const securityFeatures = [
  { icon: Shield, title: 'Workspace isolation', description: 'Multi-tenant architecture with complete data isolation.' },
  { icon: Lock, title: 'Human-in-the-Loop', description: 'Require approvals for high-risk actions before execution.' },
  { icon: Eye, title: 'Full observability', description: 'Detailed logs, run history, and token usage tracking.' },
  { icon: Key, title: 'Secrets vault', description: 'Encrypted API keys with automatic rotation support.' },
]

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section - Full brand expression */}
      <div className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Halftone background - high intensity */}
        <HalftoneBackground 
          variant="mint" 
          intensity="high" 
          className="absolute inset-0"
        >
          <div className="absolute inset-0" />
        </HalftoneBackground>
        
        {/* Charcoal vignette overlay */}
        <HalftoneBackground 
          variant="charcoalVignette" 
          intensity="low" 
          className="absolute inset-0"
        >
          <div className="absolute inset-0" />
        </HalftoneBackground>
        
        {/* Robot illustration - right side, cropped/floating */}
        <motion.div 
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-[45%] max-w-xl hidden lg:block overflow-hidden"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          style={{ 
            maskImage: 'linear-gradient(to left, black 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to left, black 60%, transparent 100%)',
          }}
        >
          <HalftoneIllustration 
            type="robot" 
            className="w-full translate-x-[15%]" 
            opacity={0.14} 
          />
        </motion.div>
        
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-editorial-tiny mb-6">AI Agent Fleet + n8n Orchestration</p>
              
              <h1 className="text-editorial-headline">
                Your business,<br />
                <span className="text-muted-foreground">running on</span><br />
                agents.
              </h1>
              
              <p className="mt-8 text-editorial-subhead max-w-lg">
                Install AI agents for support, sales, marketing, research, finance, and ops. 
                Connect to n8n workflows. Measure outcomes.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link href="/app/demo-workspace/dashboard">
                  <MinimalButton size="lg" className="w-full sm:w-auto">
                    Try the demo
                    <ArrowRight className="h-4 w-4" />
                  </MinimalButton>
                </Link>
                <Link href="/app/demo-workspace/marketplace">
                  <MinimalButton variant="outline" size="lg" className="w-full sm:w-auto">
                    Browse marketplace
                  </MinimalButton>
                </Link>
              </div>
              
              {/* Stats row */}
              <div className="mt-16 flex gap-12">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                    <p className="text-editorial-tiny mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tracks Section */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-editorial-tiny mb-4">Choose your path</p>
          <h2 className="text-3xl font-bold tracking-tight mb-16">Two tracks, one platform</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Link 
              href="/app/demo-workspace/marketplace?track=business"
              className="group p-8 border border-border/50 rounded-md hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <Bot className="h-5 w-5" />
                <span className="text-editorial-tiny">Business</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">For teams</h3>
              <p className="text-muted-foreground mb-6">
                Multi-user workspaces. RBAC. Human-in-the-loop approvals. Audit logs.
              </p>
              <span className="text-sm font-medium group-hover:underline">
                Explore business agents
                <ArrowRight className="inline-block ml-1 h-4 w-4" />
              </span>
            </Link>
            
            <Link 
              href="/app/demo-workspace/marketplace?track=personal"
              className="group p-8 border border-border/50 rounded-md hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-5 w-5" />
                <span className="text-editorial-tiny">Personal</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">For individuals</h3>
              <p className="text-muted-foreground mb-6">
                Personal productivity. Inbox management, file archiving, research, and more. Start free.
              </p>
              <span className="text-sm font-medium group-hover:underline">
                Explore personal agents
                <ArrowRight className="inline-block ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Agents */}
      <section className="py-24 border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-editorial-tiny mb-4">Marketplace</p>
              <h2 className="text-3xl font-bold tracking-tight">Featured agents</h2>
            </div>
            <Link href="/app/demo-workspace/marketplace">
              <MinimalButton variant="text">
                View all
                <ArrowRight className="h-4 w-4" />
              </MinimalButton>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredAgents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Link 
                  href={`/app/demo-workspace/marketplace/agents/${agent.id}`}
                  className="group block p-6 bg-background border border-border/50 rounded-md hover:border-accent/50 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                      <agent.icon className="h-4 w-4" />
                    </div>
                    <span className="text-editorial-tiny">{agent.category}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{agent.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {Object.entries(agent.metrics).map(([key, value]) => (
                      <span key={key}>{value}</span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflows Section */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-editorial-tiny mb-4">n8n Integration</p>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Pre-built workflows</h2>
              <p className="text-muted-foreground mb-8">
                Connect agents to n8n workflows. Trigger on events. Transform data. 
                Take actions across your stack.
              </p>
              
              <div className="space-y-3">
                {featuredWorkflows.map((wf) => (
                  <div 
                    key={wf.id}
                    className="flex items-center justify-between p-4 border border-border/50 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{wf.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{wf.trigger}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{wf.action}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link href="/app/demo-workspace/marketplace" className="inline-block mt-8">
                <MinimalButton variant="outline">
                  Browse all workflows
                  <ArrowRight className="h-4 w-4" />
                </MinimalButton>
              </Link>
            </div>
            
            <div className="hidden lg:block">
              <HalftoneIllustration type="ai-device" className="w-full max-w-xs mx-auto" opacity={0.10} />
            </div>
          </div>
        </div>
      </section>

      {/* Packs Section */}
      <section className="py-24 border-t border-border/50 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-editorial-tiny mb-4">Bundles</p>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Curated packs</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Pre-configured agent + workflow bundles for specific outcomes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {packs.map((pack, i) => (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-8 bg-background border border-border/50 rounded-md"
              >
                <h3 className="text-xl font-semibold mb-2">{pack.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{pack.description}</p>
                
                <div className="flex gap-6 mb-6">
                  <div>
                    <p className="text-2xl font-bold">{pack.agents}</p>
                    <p className="text-editorial-tiny">Agents</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pack.workflows}</p>
                    <p className="text-editorial-tiny">Workflows</p>
                  </div>
                </div>
                
                <div className="p-3 bg-accent/10 rounded text-sm">
                  <Zap className="inline-block h-4 w-4 mr-2 text-accent" />
                  {pack.outcome}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-editorial-tiny mb-4">Enterprise-ready</p>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Human in the loop</h2>
              <p className="text-muted-foreground mb-8">
                Keep humans in control. Approve high-risk actions. Audit everything. 
                Set policies per agent.
              </p>
              
              <div className="space-y-4">
                {securityFeatures.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <feature.icon className="h-4 w-4 mt-0.5 text-accent" />
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link href="/security" className="inline-block mt-8">
                <MinimalButton variant="text">
                  Learn about security
                  <ArrowRight className="h-4 w-4" />
                </MinimalButton>
              </Link>
            </div>
            
            <div className="hidden lg:flex justify-center">
              <HalftoneIllustration type="robot-head" className="w-48" opacity={0.08} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Halftone bookend */}
      <HalftoneBackground variant="mintTop" intensity="med" className="py-32 border-t border-border/50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Start building your fleet</h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
            Create your workspace and install your first agent in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/app/demo-workspace/dashboard">
              <MinimalButton size="xl">
                Try the demo
                <ArrowRight className="h-5 w-5" />
              </MinimalButton>
            </Link>
            <Link href="/docs">
              <MinimalButton variant="outline" size="xl">
                Read the docs
              </MinimalButton>
            </Link>
          </div>
        </div>
      </HalftoneBackground>
    </div>
  )
}
