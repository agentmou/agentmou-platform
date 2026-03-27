// Mock Chat Engine for Agentmou Assistant
// This file is designed to be easily replaced with OpenAI integration

import type {
  ActionSuggestion,
  ChatMode,
  WorkspaceContextSnapshot,
} from './types'

interface EngineInput {
  mode: ChatMode
  userMessage: string
  context?: WorkspaceContextSnapshot
}

interface EngineOutput {
  content: string
  actions?: ActionSuggestion[]
}

const DEMO_WORKSPACE_ID = 'demo-workspace'

function workspaceHref(workspaceId: string | undefined, path: string): string {
  const tenantId = workspaceId || DEMO_WORKSPACE_ID
  return `/app/${tenantId}${path}`
}

function formatWorkspaceStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const INTENT_PATTERNS = {
  nextSteps: /\b(next|what.*do|after|start|begin|get.*started|help.*setup|readiness|status|progress)\b/i,
  whyBlocked: /\b(why|blocked|not.*activ|can't|cannot|error|issue|problem|stuck)\b/i,
  recommendAgents: /\b(recommend|suggest|agents?|which.*agent|best.*for)\b/i,
  recommendWorkflows: /\b(workflow|automat|connect|sequence)\b/i,
  goLive: /\b(go.*live|activate|launch|deploy|production)\b/i,
  approvals: /\b(approv|pending|review|manual)\b/i,
  integrations: /\b(integrat|connect|slack|hubspot|google|notion|stripe)\b/i,
  pricing: /\b(pric|cost|plan|tier|pay|billing|subscription)\b/i,
  security: /\b(secur\w*|safe|data|privacy|encrypt|compliance)\b/i,
  howItWorks: /\b(how.*work|what.*is|explain|overview|tour|preview)\b/i,
}

function detectIntent(message: string): keyof typeof INTENT_PATTERNS | 'unknown' {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(message)) {
      return intent as keyof typeof INTENT_PATTERNS
    }
  }
  return 'unknown'
}

function generatePublicResponse(userMessage: string): EngineOutput {
  const intent = detectIntent(userMessage)

  switch (intent) {
    case 'nextSteps':
    case 'howItWorks':
      return {
        content: `**How to explore Agentmou today:**

1. **Open the demo workspace** to inspect the product safely
2. **Browse the marketplace** to review agents, workflows, and packs
3. **Use the installer preview** to understand setup requirements
4. **Check labels like Preview, Read-only, and Not yet available** to see which tenant surfaces are still partial
5. **Talk with the team before relying on live rollout behavior** that is not wired in the current UI

Would you like to open the demo workspace or compare plans?`,
        actions: [
          { label: 'Open Demo Workspace', href: workspaceHref(undefined, '/dashboard') },
          { label: 'View Pricing', href: '/pricing' },
        ],
      }

    case 'pricing':
      return {
        content: `**Agentmou pricing today:**

- **Starter** ($29/mo) - 3 agents, 1,000 runs/mo, 5 integrations
- **Pro** ($99/mo) - 10 agents, 10,000 runs/mo, unlimited integrations
- **Scale** (Custom) - Unlimited agents and enterprise support

The pricing page is part of the live marketing site, while billing inside tenant settings is still labeled separately when it is not yet wired.`,
        actions: [
          { label: 'Compare Plans', href: '/pricing' },
          { label: 'Open Demo Workspace', href: workspaceHref(undefined, '/dashboard') },
        ],
      }

    case 'recommendAgents':
      return {
        content: `**Popular catalog items to review in the demo workspace:**

**For Sales:**
- Lead Qualifier - Score and route inbound leads
- Churn Predictor - Identify at-risk customers

**For Support:**
- Support Triage - Categorize and route tickets
- FAQ Bot - Answer common questions instantly

**For Finance:**
- Invoice Processor - Extract and validate invoice data
- Expense Categorizer - Automate expense approvals

The marketplace is the best place to compare them side by side.`,
        actions: [
          { label: 'Browse Agents', href: workspaceHref(undefined, '/marketplace') },
          { label: 'Open Demo Workspace', href: workspaceHref(undefined, '/dashboard') },
        ],
      }

    case 'integrations':
      return {
        content: `**Integrations shown in the current product demo:**

- **CRM:** HubSpot, Salesforce (coming soon)
- **Communication:** Slack, Google Workspace
- **Productivity:** Notion, Google Drive
- **Payments:** Stripe
- **More catalog entries are marked coming soon**

The catalog and demo show what the product aims to support, while tenant-facing connection management is still preview or read-only in parts of the app.`,
        actions: [
          { label: 'Open Demo Workspace', href: workspaceHref(undefined, '/dashboard') },
          { label: 'View Security Page', href: '/security' },
        ],
      }

    case 'security':
      return {
        content: `**Agentmou security surfaces today:**

- **Role-based access patterns** are visible in the product
- **Human-in-the-loop approvals** are part of the operating model
- **Tenant security pages are mixed preview, read-only, or not yet available**
- **Marketing security claims should be read together with their explicit status labels**

I can point you to the marketing security page or the demo workspace if you want to inspect the current messaging.`,
        actions: [
          { label: 'Security Details', href: '/security' },
          { label: 'Open Demo Workspace', href: workspaceHref(undefined, '/dashboard') },
        ],
      }

    case 'goLive':
      return {
        content: `**This assistant does not activate production workspaces.**

I can help you explore the demo, review pricing, and explain which tenant surfaces are still labeled Preview, Read-only, or Not yet available.`,
        actions: [
          { label: 'Open Demo Workspace', href: workspaceHref(undefined, '/dashboard') },
          { label: 'View Docs', href: '/docs' },
        ],
      }

    default:
      return {
        content: `I can help you explore Agentmou without pretending the demo is live. Here are a few good starting points:

- What the demo workspace shows today
- Which tenant surfaces are preview-only
- Pricing and plan structure
- Integrations shown in the catalog
- Security messaging and current limitations

What would you like to know?`,
        actions: [
          { label: 'Open Demo Workspace', href: workspaceHref(undefined, '/dashboard') },
          { label: 'View Docs', href: '/docs' },
        ],
      }
  }
}

function generateCopilotResponse(
  userMessage: string,
  context: WorkspaceContextSnapshot,
): EngineOutput {
  const intent = detectIntent(userMessage)
  const readinessStatus = formatWorkspaceStatus(context.workspaceStatus)
  const blockedAgents = context.installedAgents.filter((agent) => agent.reasons.length > 0)
  const missingIntegrations = context.integrations.filter(
    (integration) => integration.status === 'disconnected',
  )
  const incompleteIntegrations = context.integrations.filter(
    (integration) => integration.missingScopes.length > 0,
  )
  const incompleteTasks = context.pendingTasks.filter((task) => !task.completed)

  switch (intent) {
    case 'nextSteps':
      if (incompleteTasks.length > 0) {
        const nextTask = incompleteTasks[0]
        return {
          content: `**Next review step: ${nextTask.label}**

${nextTask.description}

You've reviewed ${context.checklistProgress} of ${context.checklistTotal} checklist items in this preview.`,
          actions: getActionsForTask(nextTask.label, context.workspaceId),
        }
      }
      if (context.workspaceStatus === 'GO_LIVE_READY') {
        return {
          content: `**Readiness preview looks complete.**

This snapshot does not show remaining blockers, but the assistant cannot activate a workspace or confirm production rollout from chat.`,
          actions: [
            { label: 'Review Fleet', href: workspaceHref(context.workspaceId, '/fleet') },
            { label: 'Open Runs', href: workspaceHref(context.workspaceId, '/runs') },
          ],
        }
      }
      return {
        content: `**Current readiness status: ${readinessStatus}**

Your checklist is ${context.checklistProgress}/${context.checklistTotal} complete. I can point you to the relevant preview surfaces, but I will not change tenant state from chat.`,
        actions: [
          {
            label: 'Open Installer Preview',
            href: workspaceHref(context.workspaceId, '/installer/new'),
          },
        ],
      }

    case 'whyBlocked':
      if (blockedAgents.length > 0) {
        const agentIssues = blockedAgents
          .map((agent) => {
            const reasons = agent.reasons.map((reason) => formatReason(reason)).join(', ')
            return `- **${agent.name}**: ${reasons}`
          })
          .join('\n')

        return {
          content: `**${blockedAgents.length} agent(s) need follow-up in this snapshot:**

${agentIssues}

I can point you to the surfaces that describe the missing pieces.`,
          actions: getActionsForReasons(blockedAgents[0].reasons, context.workspaceId),
        }
      }
      if (missingIntegrations.length > 0) {
        return {
          content: `**Missing integrations in the current snapshot:**

${missingIntegrations.map((integration) => `- ${integration.name} is not connected`).join('\n')}

This assistant cannot connect them for you, but it can point you to the relevant review surface.`,
          actions: [
            {
              label: 'Review Security Surface',
              href: workspaceHref(context.workspaceId, '/security'),
            },
          ],
        }
      }
      if (incompleteIntegrations.length > 0) {
        return {
          content: `**Some integrations need more permissions in this snapshot:**

${incompleteIntegrations.map((integration) => `- ${integration.name}: missing scopes (${integration.missingScopes.join(', ')})`).join('\n')}

Re-authorize these integrations from the connection surface when that workflow is available.`,
          actions: [
            {
              label: 'Review Security Surface',
              href: workspaceHref(context.workspaceId, '/security'),
            },
          ],
        }
      }
      return {
        content: `This preview snapshot does not show an active blocker right now.

If you want, I can point you to dashboard, runs, or security for a more specific review path.`,
        actions: [
          { label: 'View Dashboard', href: workspaceHref(context.workspaceId, '/dashboard') },
        ],
      }

    case 'recommendAgents':
      return {
        content: `**Recommended catalog items to review for this workspace:**

Based on the current snapshot, consider:

- **Lead Qualifier** - Automatically qualify inbound leads
- **Support Triage** - Categorize and route tickets
- **FAQ Bot** - Answer customer questions instantly

You currently have ${context.installedAgents.length} installed agent(s) in the snapshot.`,
        actions: [
          { label: 'Browse All Agents', href: workspaceHref(context.workspaceId, '/marketplace') },
        ],
      }

    case 'goLive':
      if (context.workspaceStatus === 'GO_LIVE_READY') {
        return {
          content: `**This workspace looks ready for handoff in the preview snapshot.**

I cannot activate production from chat, but I can point you to the surfaces you would review before a real rollout.`,
          actions: [
            { label: 'Review Fleet', href: workspaceHref(context.workspaceId, '/fleet') },
            { label: 'Open Runs', href: workspaceHref(context.workspaceId, '/runs') },
          ],
        }
      }
      if (incompleteTasks.length > 0) {
        return {
          content: `**Readiness blockers remain: ${incompleteTasks.length} item(s) still need review.**

${incompleteTasks.slice(0, 3).map((task) => `- ${task.label}`).join('\n')}${incompleteTasks.length > 3 ? `\n- ...and ${incompleteTasks.length - 3} more` : ''}

Complete these review steps before treating the workspace as production-ready.`,
          actions: [
            {
              label: 'Open Installer Preview',
              href: workspaceHref(context.workspaceId, '/installer/new'),
            },
          ],
        }
      }
      return {
        content: `I can summarize readiness, but I cannot activate a workspace from this assistant. Current status: **${readinessStatus}**.`,
        actions: [
          {
            label: 'Open Installer Preview',
            href: workspaceHref(context.workspaceId, '/installer/new'),
          },
        ],
      }

    case 'approvals':
      if (context.pendingApprovalsCount > 0) {
        return {
          content: `**You have ${context.pendingApprovalsCount} pending approval(s) in this snapshot**

Agent runs that require human review are waiting for your action. Review them from the approvals surface.`,
          actions: [
            {
              label: 'Review Approvals',
              href: workspaceHref(context.workspaceId, '/approvals?status=pending'),
            },
          ],
        }
      }
      return {
        content: `No pending approvals appear in this snapshot.

Human-in-the-loop controls are part of the workflow model, but related policy surfaces are still partially preview-only in the UI.`,
        actions: [
          {
            label: 'Review Security Surface',
            href: workspaceHref(context.workspaceId, '/security'),
          },
        ],
      }

    case 'integrations': {
      const connected = context.integrations.filter(
        (integration) => integration.status === 'connected',
      ).length
      const total = context.integrations.length

      return {
        content: `**Integration snapshot: ${connected}/${total} marked connected**

${context.integrations.map((integration) => `- ${integration.name}: ${integration.status === 'connected' ? 'Connected in snapshot' : 'Needs connection'}${integration.missingScopes.length > 0 ? ' (missing scopes)' : ''}`).join('\n')}

This assistant cannot create or repair those connections from chat.`,
        actions: [
          {
            label: 'Review Security Surface',
            href: workspaceHref(context.workspaceId, '/security'),
          },
        ],
      }
    }

    case 'pricing':
      return {
        content: `**Billing in the tenant workspace is still a partial surface.**

You can review the current plan label from Settings, but spend, payment methods, and invoice actions are still preview or not yet available depending on the workspace.`,
        actions: [
          { label: 'Open Settings', href: workspaceHref(context.workspaceId, '/settings') },
        ],
      }

    case 'security':
      return {
        content: `**Security in this tenant UI is intentionally partial right now.**

- Team membership is visible as read-only
- Secrets management is not yet available from the tenant screen
- Audit export and other actions stay disabled until backend wiring exists

I can point you to the current surface, but not execute security changes from chat.`,
        actions: [
          { label: 'Open Security', href: workspaceHref(context.workspaceId, '/security') },
        ],
      }

    default:
      return {
        content: `I'm the Agentmou assistant preview for this workspace. I can help you with:

- **Next review steps** in the current checklist
- **Troubleshooting context** for blockers shown in the snapshot
- **Catalog recommendations** for agents and workflows
- **Readiness summaries** without changing workspace state

Current readiness status: **${readinessStatus}** (${context.checklistProgress}/${context.checklistTotal} complete)

What would you like help with?`,
        actions: [
          { label: 'View Dashboard', href: workspaceHref(context.workspaceId, '/dashboard') },
          {
            label: 'Open Installer Preview',
            href: workspaceHref(context.workspaceId, '/installer/new'),
          },
        ],
      }
  }
}

function formatReason(reason: { type: string; [key: string]: unknown }): string {
  switch (reason.type) {
    case 'missing_integrations':
      return `needs ${(reason.integrations as string[]).join(', ')}`
    case 'missing_scopes':
      return 'missing OAuth scopes'
    case 'missing_secrets':
      return `needs secrets: ${(reason.secrets as string[]).join(', ')}`
    case 'missing_fields':
      return `needs config: ${(reason.fields as string[]).join(', ')}`
    case 'blocked_by_policy':
      return `blocked by policy: ${reason.policy}`
    case 'degraded_error_rate':
      return `high error rate (${reason.errorRate}%)`
    default:
      return reason.type.replace(/_/g, ' ')
  }
}

function getActionsForTask(
  taskLabel: string,
  workspaceId: string,
): ActionSuggestion[] {
  const lower = taskLabel.toLowerCase()

  if (lower.includes('integration')) {
    return [
      {
        label: 'Review Security Surface',
        href: workspaceHref(workspaceId, '/security'),
      },
    ]
  }
  if (lower.includes('agent') || lower.includes('install')) {
    return [{ label: 'Open Marketplace', href: workspaceHref(workspaceId, '/marketplace') }]
  }
  if (lower.includes('config')) {
    return [{ label: 'Review Fleet', href: workspaceHref(workspaceId, '/fleet') }]
  }
  if (lower.includes('polic')) {
    return [
      {
        label: 'Review Security Surface',
        href: workspaceHref(workspaceId, '/security'),
      },
    ]
  }
  if (lower.includes('test')) {
    return [{ label: 'Open Runs', href: workspaceHref(workspaceId, '/runs') }]
  }
  if (lower.includes('secret')) {
    return [
      {
        label: 'Review Security Surface',
        href: workspaceHref(workspaceId, '/security'),
      },
    ]
  }

  return [
    {
      label: 'Open Installer Preview',
      href: workspaceHref(workspaceId, '/installer/new'),
    },
  ]
}

function getActionsForReasons(
  reasons: Array<{ type: string; [key: string]: unknown }>,
  workspaceId: string,
): ActionSuggestion[] {
  const actions: ActionSuggestion[] = []

  for (const reason of reasons) {
    if (reason.type === 'missing_integrations' || reason.type === 'missing_scopes') {
      actions.push({
        label: 'Review Security Surface',
        href: workspaceHref(workspaceId, '/security'),
      })
    } else if (reason.type === 'missing_secrets') {
      actions.push({
        label: 'Review Security Surface',
        href: workspaceHref(workspaceId, '/security'),
      })
    } else if (reason.type === 'missing_fields') {
      actions.push({
        label: 'Review Fleet',
        href: workspaceHref(workspaceId, '/fleet'),
      })
    } else if (reason.type === 'blocked_by_policy') {
      actions.push({
        label: 'Review Security Surface',
        href: workspaceHref(workspaceId, '/security'),
      })
    }
  }

  const unique = actions.filter(
    (action, index, all) => all.findIndex((candidate) => candidate.href === action.href) === index,
  )
  return unique.slice(0, 3)
}

export function generateResponse(input: EngineInput): EngineOutput {
  const { mode, userMessage, context } = input

  if (mode === 'public') {
    return generatePublicResponse(userMessage)
  }

  if (mode === 'copilot' && context) {
    return generateCopilotResponse(userMessage, context)
  }

  return {
    content: "I'm not sure how to help with that. Could you try rephrasing your question?",
    actions: [],
  }
}

export async function* generateResponseStream(
  input: EngineInput,
): AsyncGenerator<{ content: string; done: boolean; actions?: ActionSuggestion[] }> {
  const response = generateResponse(input)
  const words = response.content.split(' ')

  let accumulated = ''
  for (let index = 0; index < words.length; index += 1) {
    accumulated += (index === 0 ? '' : ' ') + words[index]
    await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 30))
    yield {
      content: accumulated,
      done: index === words.length - 1,
      actions: index === words.length - 1 ? response.actions : undefined,
    }
  }
}
