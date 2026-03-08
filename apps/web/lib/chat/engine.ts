// Mock Chat Engine for AgentMou Assistant
// This file is designed to be easily replaced with OpenAI integration

import type { ChatMessage, ChatMode, WorkspaceContextSnapshot, ActionSuggestion } from './types'

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

// Intent detection patterns
const INTENT_PATTERNS = {
  nextSteps: /\b(next|what.*do|after|start|begin|get.*started|help.*setup)\b/i,
  whyBlocked: /\b(why|blocked|not.*activ|can't|cannot|error|issue|problem|stuck)\b/i,
  recommendAgents: /\b(recommend|suggest|agents?|which.*agent|best.*for)\b/i,
  recommendWorkflows: /\b(workflow|automat|connect|sequence)\b/i,
  goLive: /\b(go.*live|activate|launch|deploy|production)\b/i,
  approvals: /\b(approv|pending|review|manual)\b/i,
  integrations: /\b(integrat|connect|slack|hubspot|google|notion|stripe)\b/i,
  pricing: /\b(pric|cost|plan|tier|pay|billing|subscription)\b/i,
  security: /\b(secur|safe|data|privacy|encrypt|compliance)\b/i,
  howItWorks: /\b(how.*work|what.*is|explain|overview)\b/i,
}

function detectIntent(message: string): keyof typeof INTENT_PATTERNS | 'unknown' {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(message)) {
      return intent as keyof typeof INTENT_PATTERNS
    }
  }
  return 'unknown'
}

// Public mode responses
function generatePublicResponse(userMessage: string): EngineOutput {
  const intent = detectIntent(userMessage)

  switch (intent) {
    case 'nextSteps':
    case 'howItWorks':
      return {
        content: `**Getting started with AgentMou is easy:**

1. **Create a workspace** - Sign up and name your workspace
2. **Connect integrations** - Link your CRM, Slack, email, and other tools
3. **Install agents** - Browse our marketplace and install agents for sales, support, finance, or ops
4. **Configure & test** - Set up each agent and run tests
5. **Go live** - Enable your agents in production

Would you like to create a workspace now?`,
        actions: [
          { label: 'Get Started', href: workspaceHref(undefined, '/dashboard') },
          { label: 'View Pricing', href: '/pricing' },
        ],
      }

    case 'pricing':
      return {
        content: `**AgentMou Pricing Plans:**

- **Starter** ($49/mo) - 3 agents, 1,000 runs/mo, basic integrations
- **Pro** ($149/mo) - 10 agents, 10,000 runs/mo, all integrations, workflows
- **Scale** (Custom) - Unlimited agents & runs, dedicated support, SLA

All plans include a 14-day free trial. No credit card required to start.`,
        actions: [
          { label: 'Compare Plans', href: '/pricing' },
          { label: 'Start Free Trial', href: workspaceHref(undefined, '/dashboard') },
        ],
      }

    case 'recommendAgents':
      return {
        content: `**Popular agents by use case:**

**For Sales:**
- Lead Qualifier - Score and route inbound leads
- Churn Predictor - Identify at-risk customers

**For Support:**
- Support Triage - Categorize and route tickets
- FAQ Bot - Answer common questions instantly

**For Finance:**
- Invoice Processor - Extract and validate invoice data
- Expense Categorizer - Automate expense approvals

Create a workspace to explore the full catalog!`,
        actions: [
          { label: 'Browse Agents', href: workspaceHref(undefined, '/marketplace') },
          { label: 'Get Started', href: workspaceHref(undefined, '/dashboard') },
        ],
      }

    case 'integrations':
      return {
        content: `**Supported integrations:**

- **CRM:** HubSpot, Salesforce (coming soon)
- **Communication:** Slack, email via Google Workspace
- **Productivity:** Notion, Google Drive
- **Payments:** Stripe
- **More coming soon!**

All integrations use OAuth for secure authentication. You control exactly what data agents can access.`,
        actions: [
          { label: 'View All Integrations', href: workspaceHref(undefined, '/security') },
        ],
      }

    case 'security':
      return {
        content: `**AgentMou Security:**

- **SOC 2 Type II** compliant
- **End-to-end encryption** for all data
- **Role-based access control** (RBAC)
- **Audit logs** for all actions
- **Human-in-the-loop** controls for critical actions
- **Secrets management** with automatic rotation

Your data never leaves your control. Agents only access what you explicitly permit.`,
        actions: [
          { label: 'Security Details', href: '/security' },
        ],
      }

    default:
      return {
        content: `I can help you learn about AgentMou! Here are some things I can answer:

- How AgentMou works
- Pricing and plans
- Available integrations
- Security and compliance
- Agent recommendations

What would you like to know?`,
        actions: [
          { label: 'Get Started', href: workspaceHref(undefined, '/dashboard') },
          { label: 'View Docs', href: '/docs' },
        ],
      }
  }
}

// Copilot mode responses with workspace context
function generateCopilotResponse(userMessage: string, context: WorkspaceContextSnapshot): EngineOutput {
  const intent = detectIntent(userMessage)

  // Check for blocking issues first
  const blockedAgents = context.installedAgents.filter(a => a.reasons.length > 0)
  const missingIntegrations = context.integrations.filter(i => i.status === 'disconnected')
  const incompleteIntegrations = context.integrations.filter(i => i.missingScopes.length > 0)
  const incompleteTasks = context.pendingTasks.filter(t => !t.completed)

  switch (intent) {
    case 'nextSteps':
      if (incompleteTasks.length > 0) {
        const nextTask = incompleteTasks[0]
        return {
          content: `**Your next step: ${nextTask.label}**

${nextTask.description}

You've completed ${context.checklistProgress} of ${context.checklistTotal} activation steps. Keep going!`,
          actions: getActionsForTask(nextTask.label, context.workspaceId),
        }
      }
      if (context.workspaceStatus === 'GO_LIVE_READY') {
        return {
          content: `**You're ready to go live!**

All your agents are configured, integrations connected, and tests passed. Click the button below to activate your workspace in production.`,
          actions: [
            { label: 'Go Live Now', href: workspaceHref(context.workspaceId, '/fleet') },
          ],
        }
      }
      return {
        content: `**Current status: ${context.workspaceStatus}**

Your workspace is ${context.checklistProgress}/${context.checklistTotal} complete. Check the Activation Center for detailed progress.`,
        actions: [
          { label: 'Open Installer', href: workspaceHref(context.workspaceId, '/installer/new') },
        ],
      }

    case 'whyBlocked':
      if (blockedAgents.length > 0) {
        const agentIssues = blockedAgents.map(a => {
          const reasons = a.reasons.map(r => formatReason(r)).join(', ')
          return `- **${a.name}**: ${reasons}`
        }).join('\n')

        return {
          content: `**${blockedAgents.length} agent(s) need attention:**

${agentIssues}

Let me help you resolve these issues.`,
          actions: getActionsForReasons(blockedAgents[0].reasons, context.workspaceId),
        }
      }
      if (missingIntegrations.length > 0) {
        return {
          content: `**Missing integrations:**

${missingIntegrations.map(i => `- ${i.name} is not connected`).join('\n')}

Connect these integrations to unblock your agents.`,
          actions: [
            { label: 'Connect Integrations', href: workspaceHref(context.workspaceId, '/security') },
          ],
        }
      }
      if (incompleteIntegrations.length > 0) {
        return {
          content: `**Integrations need additional permissions:**

${incompleteIntegrations.map(i => `- ${i.name}: missing scopes (${i.missingScopes.join(', ')})`).join('\n')}

Re-authorize these integrations to grant the required permissions.`,
          actions: [
            { label: 'Fix Integrations', href: workspaceHref(context.workspaceId, '/security') },
          ],
        }
      }
      return {
        content: `Everything looks good! Your workspace status is **${context.workspaceStatus}**.

If you're experiencing a specific issue, please describe it in more detail.`,
        actions: [
          { label: 'View Dashboard', href: workspaceHref(context.workspaceId, '/dashboard') },
        ],
      }

    case 'recommendAgents':
      return {
        content: `**Recommended agents for your workspace:**

Based on your setup, consider adding:

- **Lead Qualifier** - Automatically qualify inbound leads (Sales)
- **Support Triage** - Categorize and route tickets (Support)
- **FAQ Bot** - Answer customer questions instantly (Support)

You currently have ${context.installedAgents.length} agent(s) installed.`,
        actions: [
          { label: 'Browse All Agents', href: workspaceHref(context.workspaceId, '/marketplace') },
        ],
      }

    case 'goLive':
      if (context.workspaceStatus === 'GO_LIVE_READY') {
        return {
          content: `**Ready to go live!**

All prerequisites are met. Your agents will start processing real data once you activate.`,
          actions: [
            { label: 'Go Live', href: workspaceHref(context.workspaceId, '/fleet') },
          ],
        }
      }
      if (incompleteTasks.length > 0) {
        return {
          content: `**Before going live, you need to complete ${incompleteTasks.length} task(s):**

${incompleteTasks.slice(0, 3).map(t => `- ${t.label}`).join('\n')}${incompleteTasks.length > 3 ? `\n- ...and ${incompleteTasks.length - 3} more` : ''}

Complete these in the Activation Center.`,
          actions: [
            { label: 'Open Installer', href: workspaceHref(context.workspaceId, '/installer/new') },
          ],
        }
      }
      return {
        content: `Your current status is **${context.workspaceStatus}**. Visit the Activation Center to see what's needed to go live.`,
        actions: [
          { label: 'Open Installer', href: workspaceHref(context.workspaceId, '/installer/new') },
        ],
      }

    case 'approvals':
      if (context.pendingApprovalsCount > 0) {
        return {
          content: `**You have ${context.pendingApprovalsCount} pending approval(s)**

Agent runs that require human review are waiting for your action. Review and approve or reject them in the Runs page.`,
          actions: [
            { label: 'Review Approvals', href: workspaceHref(context.workspaceId, '/approvals?status=pending') },
          ],
        }
      }
      return {
        content: `No pending approvals right now.

Human-in-the-loop approvals can be configured per-agent in the Policies section. This is useful for critical actions like sending campaigns or processing payments.`,
        actions: [
          { label: 'Configure Policies', href: workspaceHref(context.workspaceId, '/security') },
        ],
      }

    case 'integrations': {
      const connected = context.integrations.filter(i => i.status === 'connected').length
      const total = context.integrations.length
      return {
        content: `**Integration status: ${connected}/${total} connected**

${context.integrations.map(i => `- ${i.name}: ${i.status === 'connected' ? 'Connected' : 'Not connected'}${i.missingScopes.length > 0 ? ' (missing scopes)' : ''}`).join('\n')}`,
        actions: [
          { label: 'Manage Integrations', href: workspaceHref(context.workspaceId, '/security') },
        ],
      }
    }

    default:
      return {
        content: `I'm your AgentMou Copilot! I can help you with:

- **Next steps** - What to do next in your activation
- **Troubleshooting** - Why something isn't working
- **Recommendations** - Which agents to install
- **Going live** - How to activate your workspace

Your current status: **${context.workspaceStatus}** (${context.checklistProgress}/${context.checklistTotal} complete)

What would you like help with?`,
        actions: [
          { label: 'View Dashboard', href: workspaceHref(context.workspaceId, '/dashboard') },
          { label: 'Open Installer', href: workspaceHref(context.workspaceId, '/installer/new') },
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

function getActionsForTask(taskLabel: string, workspaceId: string): ActionSuggestion[] {
  const lower = taskLabel.toLowerCase()
  if (lower.includes('integration')) return [{ label: 'Go to Security', href: workspaceHref(workspaceId, '/security') }]
  if (lower.includes('agent') || lower.includes('install')) return [{ label: 'Open Marketplace', href: workspaceHref(workspaceId, '/marketplace') }]
  if (lower.includes('config')) return [{ label: 'Configure Fleet', href: workspaceHref(workspaceId, '/fleet') }]
  if (lower.includes('polic')) return [{ label: 'Set Policies', href: workspaceHref(workspaceId, '/security') }]
  if (lower.includes('test')) return [{ label: 'Open Runs', href: workspaceHref(workspaceId, '/runs') }]
  if (lower.includes('secret')) return [{ label: 'Manage Secrets', href: workspaceHref(workspaceId, '/security') }]
  return [{ label: 'Open Installer', href: workspaceHref(workspaceId, '/installer/new') }]
}

function getActionsForReasons(
  reasons: Array<{ type: string; [key: string]: unknown }>,
  workspaceId: string,
): ActionSuggestion[] {
  const actions: ActionSuggestion[] = []
  for (const reason of reasons) {
    if (reason.type === 'missing_integrations' || reason.type === 'missing_scopes') {
      actions.push({ label: 'Fix Integrations', href: workspaceHref(workspaceId, '/security') })
    } else if (reason.type === 'missing_secrets') {
      actions.push({ label: 'Add Secrets', href: workspaceHref(workspaceId, '/security') })
    } else if (reason.type === 'missing_fields') {
      actions.push({ label: 'Configure Agent', href: workspaceHref(workspaceId, '/fleet') })
    } else if (reason.type === 'blocked_by_policy') {
      actions.push({ label: 'Update Policies', href: workspaceHref(workspaceId, '/security') })
    }
  }
  // Dedupe and limit to 3
  const unique = actions.filter((a, i, arr) => arr.findIndex(b => b.href === a.href) === i)
  return unique.slice(0, 3)
}

// Main export
export function generateResponse(input: EngineInput): EngineOutput {
  const { mode, userMessage, context } = input

  if (mode === 'public') {
    return generatePublicResponse(userMessage)
  }

  if (mode === 'copilot' && context) {
    return generateCopilotResponse(userMessage, context)
  }

  // Fallback
  return {
    content: 'I\'m not sure how to help with that. Could you try rephrasing your question?',
    actions: [],
  }
}

// Simulate streaming by returning chunks
export async function* generateResponseStream(input: EngineInput): AsyncGenerator<{ content: string; done: boolean; actions?: ActionSuggestion[] }> {
  const response = generateResponse(input)
  const words = response.content.split(' ')
  
  let accumulated = ''
  for (let i = 0; i < words.length; i++) {
    accumulated += (i === 0 ? '' : ' ') + words[i]
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30))
    yield { 
      content: accumulated, 
      done: i === words.length - 1,
      actions: i === words.length - 1 ? response.actions : undefined
    }
  }
}
