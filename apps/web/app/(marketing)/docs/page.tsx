'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { HalftoneBackground } from '@/components/brand/halftone-background';
import { FadeContent } from '@/components/reactbits/fade-content';
import { BookOpen, Bot, Workflow, Plug, Code, Shield, ChevronRight } from 'lucide-react';

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    items: [
      { id: 'introduction', title: 'Introduction' },
      { id: 'quickstart', title: 'Quickstart' },
      { id: 'concepts', title: 'Core Concepts' },
    ],
  },
  {
    id: 'agents',
    title: 'Agents',
    icon: Bot,
    items: [
      { id: 'agent-overview', title: 'Overview' },
      { id: 'installing-agents', title: 'Installing Agents' },
      { id: 'hitl', title: 'Human-in-the-Loop' },
    ],
  },
  {
    id: 'workflows',
    title: 'Workflows',
    icon: Workflow,
    items: [
      { id: 'workflow-overview', title: 'Overview' },
      { id: 'triggers', title: 'Triggers' },
      { id: 'n8n-integration', title: 'n8n Integration' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: Plug,
    items: [
      { id: 'integration-overview', title: 'Overview' },
      { id: 'oauth-setup', title: 'OAuth Setup' },
      { id: 'secrets', title: 'Secrets Management' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    items: [
      { id: 'rbac', title: 'Access Control' },
      { id: 'audit-logs', title: 'Audit Logs' },
      { id: 'approvals', title: 'Approval Policies' },
    ],
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: Code,
    items: [
      { id: 'authentication', title: 'Authentication' },
      { id: 'agents-api', title: 'Agents API' },
      { id: 'runs-api', title: 'Runs API' },
    ],
  },
];

const content: Record<string, { title: string; content: string }> = {
  introduction: {
    title: 'Introduction',
    content: `# Welcome to Agentmou

Agentmou is a platform for deploying and managing AI agents that automate your business operations.

## What is Agentmou?

Agentmou provides a marketplace of pre-built AI agents and n8n workflows that you can install into your workspace. Each agent is designed for specific business tasks across 8 categories:

- **Core**: Foundation agents for orchestration and AI capabilities
- **Support**: Inbox triage, ticket routing, sentiment tracking
- **Sales**: Meeting prep, calendar management, lead research
- **Research**: Market monitoring, competitor intel, web summarization
- **Marketing**: Content research, trend monitoring, competitive analysis
- **Finance**: Expense tracking, invoicing, collections
- **Ops**: Document processing, admin automation, HR screening
- **Personal**: Inbox management, file archiving, personal productivity

## Platform Features

- **Agent Marketplace**: 80+ agents across 8 categories
- **n8n Workflows**: 40+ pre-built automation templates
- **30+ Integrations**: Gmail, Slack, Linear, Notion, Google Sheets, and more
- **Packs**: Pre-configured bundles for common use cases
- **Human-in-the-Loop**: Require approvals for high-risk actions
- **Full Observability**: Logs, metrics, and token usage tracking
- **Security**: RBAC, audit logs, and encrypted secrets

## Getting Help

- Browse this documentation
- Contact support at support@agentmou.io
- Join our Discord community`,
  },
  quickstart: {
    title: 'Quickstart',
    content: `# Quickstart Guide

Get up and running with Agentmou in under 10 minutes.

## Step 1: Explore the Marketplace

Browse agents by category (Core, Support, Sales, Research, Marketing, Finance, Ops, Personal) or search for specific use cases. Filter by availability to see what is generally available, in catalog (preview), or planned.

## Step 2: Try a Pack

Packs are pre-configured bundles for common use cases:

- **Support Starter**: Email triage, ticket routing, sentiment tracking
- **Sales Accelerator**: Meeting prep, calendar optimization, competitive intel
- **Research & Intel**: Market monitoring, competitive research, web summarization
- **Backoffice**: Document processing, attachment archival, HR screening
- **Marketing Engine**: Content research, trend monitoring
- **Solo Founder**: Inbox management, file archiving, research tools

## Step 3: Connect Integrations

Before installing, connect the required integrations:

- Gmail / Google Workspace
- Slack, Linear, Notion
- Google Sheets, Google Drive
- Apify, Exa, SerpAPI
- And 20+ more...

OAuth connections are one-click. API keys are stored encrypted.

## Step 4: Install via Wizard

Our guided installer walks you through:

1. Select category and agent
2. Connect required integrations
3. Configure agent settings
4. Set HITL policies (optional)
5. Review and activate

## Step 5: Monitor Runs

Once active, view your agent runs in the Observability dashboard:

- Real-time run status
- Token usage and costs
- Logs and step timeline
- Error tracking

## Next Steps

- Set up approval policies for high-risk actions
- Create custom workflows with n8n
- Invite team members with RBAC roles`,
  },
  concepts: {
    title: 'Core Concepts',
    content: `# Core Concepts

## Tenants (Workspaces)

A tenant is your isolated workspace in Agentmou. Each tenant has:
- Its own agents and workflows
- Separate integrations and secrets
- Independent team members and RBAC
- Isolated run history and logs

## Categories

Agents are organized into 8 canonical categories:
- **Core**: Foundation agents, orchestration, AI infrastructure
- **Support**: Customer support, ticketing, sentiment
- **Sales**: Revenue, GTM, meetings, calendar
- **Research**: Intelligence, monitoring, synthesis
- **Marketing**: Content, trends, campaigns
- **Finance**: Invoicing, collections, expense tracking
- **Ops**: Admin, HR, document processing
- **Personal**: Productivity, inbox, file management

## Agents

Agents are AI-powered automations built on n8n workflows. Each agent has:

- **Outcome**: The business result it delivers
- **Category**: One of the 8 canonical categories
- **Availability**: Available now or planned
- **Risk Level**: Low, medium, or high risk
- **HITL Policy**: Whether human approval is required
- **Required Integrations**: Tools the agent connects to

## Workflows

Workflows are the underlying n8n automations that power agents:

- **Trigger**: What starts the workflow (email, cron, webhook)
- **Nodes**: Steps in the automation pipeline
- **Integrations**: External services used
- Workflows are linked to agents that use them

## Packs

Packs are pre-configured bundles of agents and workflows:

- Organized by use case (Support, Sales, Research, etc.)
- Include multiple agents that work together
- Derived workflows from included agents
- Quick setup for common scenarios

## Runs

A run is a single execution of an agent or workflow:

- **Status**: running, success, failed, pending_approval
- **Timeline**: Step-by-step execution details
- **Tokens**: LLM token usage
- **Cost**: Estimated execution cost

## Human-in-the-Loop (HITL)

HITL policies require human approval before agents execute high-risk actions:

- **send_email**: Sending emails on your behalf
- **create_ticket**: Creating tickets in external systems
- **update_calendar**: Modifying calendar events
- **post_message**: Posting to Slack/Discord

## Integrations

OAuth-based connections to external services. Agentmou supports 30+ integrations:
- Gmail, Google Calendar, Google Sheets, Google Drive
- Slack, Linear, Notion, Airtable
- Apify, Exa, SerpAPI, Trustpilot
- WhatsApp, RSS, OpenAI
- And more...`,
  },
  'agent-overview': {
    title: 'Agent Overview',
    content: `# Agent Overview

Agents are pre-built AI automations that solve specific business problems. The catalog contains 80+ agents across 8 categories.

## Agent Categories

### Core
- Omnichannel router, action extractor, document processing
- RAG answer copilot, n8n commander, data hygiene

### Support
- **Inbox Triage**: Classify emails, draft replies, flag urgent items
- **Ticket Router**: Route support tickets to the right team
- **Sentiment Tracker**: Monitor review sentiment on Trustpilot
- SLA monitoring, bug normalization, refund triage

### Sales
- **Meeting Prep**: Research attendees, generate briefings
- **Calendar Resolver**: Detect and resolve scheduling conflicts
- Competitive battlecards, outbound personalization, lead enrichment

### Research
- **Market Monitor**: Daily digest from RSS feeds and news
- **Competitor Intel**: Track competitors via search APIs
- **Web Summarizer**: On-demand webpage summarization

### Marketing
- Content research, trend monitoring, brand listening
- Social media scheduling, campaign analytics

### Finance
- Invoice processing, collections follow-up
- Expense tracking, financial reporting

### Ops
- Document processing, attachment archival
- HR screening, vendor management, inventory

### Personal
- Inbox zero, file organization, learning notes
- Personal research, content curation

## Agent Properties

Each agent template includes:

| Property | Description |
|----------|-------------|
| Outcome | Business result the agent delivers |
| Category | One of 8 categories (core, support, sales, etc.) |
| Availability | Available now or planned |
| Complexity | S, M, or L (affects setup time) |
| Risk Level | Low, medium, or high |
| HITL | Optional, recommended, or required |
| Integrations | Required OAuth connections |
| KPIs | Metrics to track agent performance |`,
  },
  'installing-agents': {
    title: 'Installing Agents',
    content: `# Installing Agents

## Using the Installer Wizard

Our guided installer walks you through setup:

### 1. Select Agent
Choose an agent from the marketplace. Review:
- Required integrations
- Risk level and HITL policy
- Setup time estimate

### 2. Connect Integrations
Link all required integrations via OAuth. The installer shows which integrations are already connected and which need setup.

### 3. Configure Settings
Set agent-specific configuration:
- Input parameters
- Output preferences
- Custom prompts (if applicable)

### 4. Set Policies
Define Human-in-the-Loop policies:
- Which actions require approval
- Approval timeout
- Escalation rules

### 5. Run Tests
Execute test cases to verify setup:
- Sample inputs
- Expected outputs
- Integration connectivity

### 6. Review & Activate
Final review before going live:
- Configuration summary
- Monthly cost estimate
- Activation confirmation`,
  },
  hitl: {
    title: 'Human-in-the-Loop',
    content: `# Human-in-the-Loop (HITL)

HITL policies ensure humans remain in control of high-risk AI actions.

## How HITL Works

1. Agent determines it needs to take a high-risk action
2. Action is paused and approval request is created
3. Team member reviews the request in Approvals queue
4. Approve: action executes immediately
5. Reject: action is cancelled, run fails gracefully

## Configurable Actions

| Action | Risk Level | Default Policy |
|--------|-----------|----------------|
| send_email | Medium | Recommended |
| create_ticket | Low | Optional |
| update_calendar | Medium | Recommended |
| post_message | Low | Optional |
| execute_api | High | Required |

## Approval Request Details

Each approval request shows:
- Action type and risk level
- Full payload preview
- Context (inputs, sources, previous messages)
- Approve / Reject buttons
- Optional rejection reason

## Best Practices

- Start with HITL enabled for new agents
- Review approval patterns weekly
- Gradually relax policies as confidence grows
- Keep HITL required for truly high-risk actions`,
  },
  'workflow-overview': {
    title: 'Workflow Overview',
    content: `# Workflow Overview

Workflows are n8n automation templates that power agents. The catalog contains 40+ workflows.

## Example Workflows

- **Auto-label Gmail with AI**: Classify and label incoming emails
- **Slack to Linear Ticketing**: Convert messages to tickets with dedupe
- **RSS to Slack Digest**: AI-summarized news from RSS feeds
- **Meeting Prep to WhatsApp**: Research attendees, send briefing
- **Competitor Research to Notion**: Track competitors via search APIs
- **Trustpilot Sentiment**: Monitor review sentiment trends
- **Gmail + Calendar Coordinator**: Auto-schedule meetings from emails
- **Attachment Evaluator**: Screen documents with AI scoring
- **Attachment Archiver**: Auto-save attachments to Google Drive
- **Weekly Bookkeeper Summary**: Expense categorization reports
- **Resume Screen to Notion**: HR candidate screening automation

## Workflow Properties

| Property | Description |
|----------|-------------|
| Trigger | What starts the workflow |
| Integrations | Services the workflow connects to |
| Output | What the workflow produces |
| Risk Level | Low, medium, or high |
| Linked Agents | Agents that use this workflow |

## Triggers

- **Email**: New email in Gmail
- **Event**: Slack reaction, webhook
- **Cron**: Scheduled (daily, hourly, weekly)
- **Webhook**: On-demand via API

## Workflow Filtering

Workflows are filtered based on visible agents. When you filter by category, only workflows used by agents in that category are shown.`,
  },
};

export default function DocsPage() {
  const [activeItem, setActiveItem] = useState('introduction');

  const currentContent = content[activeItem] || content.introduction;

  return (
    <HalftoneBackground
      variant="mintTop"
      intensity="med"
      className="min-h-[calc(100vh-4rem)] border-t border-border/50"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <nav className="space-y-6 pr-4">
                {sections.map((section) => (
                  <div key={section.id}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <section.icon className="h-4 w-4" />
                      {section.title}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => setActiveItem(item.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                              activeItem === item.id
                                ? 'bg-muted font-medium'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            )}
                          >
                            <ChevronRight
                              className={cn(
                                'h-3 w-3 transition-transform',
                                activeItem === item.id && 'rotate-90'
                              )}
                            />
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </aside>

          {/* Content */}
          <main>
            <FadeContent key={activeItem} duration={0.3}>
              <Card>
                <CardContent className="p-8">
                  <article className="prose prose-neutral max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {currentContent.content}
                    </div>
                  </article>
                </CardContent>
              </Card>
            </FadeContent>
          </main>
        </div>
      </div>
    </HalftoneBackground>
  );
}
