'use client'

import { normalizeCategory } from '@/lib/fleetops/category-config'
import type { DataProvider } from '@/lib/data/provider'
import { resolveHonestSurfaceState } from '@/lib/honest-ui'

export type SearchItemType = 'navigate' | 'agent' | 'workflow' | 'pack' | 'run' | 'action'

export interface SearchItem {
  type: SearchItemType
  id: string
  label: string
  keywords: string[]
  href: string
  icon?: string
  description?: string
  category?: string
}

// Navigation items - available globally in the app
const navigationItems: Omit<SearchItem, 'href'>[] = [
  { type: 'navigate', id: 'nav-dashboard', label: 'Dashboard', keywords: ['home', 'overview', 'stats'], icon: 'layout-dashboard', description: 'View workspace overview' },
  { type: 'navigate', id: 'nav-marketplace', label: 'Marketplace', keywords: ['browse', 'agents', 'workflows', 'packs', 'store'], icon: 'store', description: 'Browse agents and workflows' },
  { type: 'navigate', id: 'nav-installer', label: 'Installer', keywords: ['install', 'new', 'add', 'setup'], icon: 'download', description: 'Review the installer preview' },
  { type: 'navigate', id: 'nav-fleet', label: 'Fleet', keywords: ['installed', 'my agents', 'my workflows', 'manage'], icon: 'package', description: 'Manage installed agents' },
  { type: 'navigate', id: 'nav-runs', label: 'Runs', keywords: ['executions', 'logs', 'history', 'activity'], icon: 'activity', description: 'View execution history' },
  { type: 'navigate', id: 'nav-approvals', label: 'Approvals', keywords: ['pending', 'hitl', 'review', 'approve', 'reject'], icon: 'check-circle', description: 'Review pending approvals' },
  { type: 'navigate', id: 'nav-observability', label: 'Observability', keywords: ['metrics', 'monitoring', 'charts', 'analytics'], icon: 'eye', description: 'Review recent runs and preview analytics' },
  { type: 'navigate', id: 'nav-security', label: 'Security', keywords: ['secrets', 'keys', 'rbac', 'audit', 'policies'], icon: 'shield', description: 'Review security access and preview states' },
  { type: 'navigate', id: 'nav-settings', label: 'Settings', keywords: ['config', 'preferences', 'workspace', 'billing'], icon: 'settings', description: 'Workspace settings' },
]

export async function buildSearchIndex(tenantId: string, provider: DataProvider): Promise<SearchItem[]> {
  const items: SearchItem[] = []
  const marketplaceAgents = await provider.listMarketplaceAgentTemplates()
  const marketplaceWorkflows = await provider.listMarketplaceWorkflowTemplates()
  const packTemplates = await provider.listPackTemplates()
  const quickActionState = resolveHonestSurfaceState(
    'command-palette-quick-actions',
    {
      providerMode: provider.providerMode,
      tenantId,
    },
  )
  
  // Navigation items with tenant-specific hrefs
  for (const navItem of navigationItems) {
    const href = navItem.id === 'nav-dashboard' 
      ? `/app/${tenantId}/dashboard`
      : `/app/${tenantId}/${navItem.id.replace('nav-', '')}`
    
    items.push({
      ...navItem,
      href,
    })
  }
  
  // Agent templates from marketplace (only public visibility)
  for (const agent of marketplaceAgents) {
    // Normalize category for search (always returns a valid Category)
    const normalizedCategory = normalizeCategory(agent.catalogGroup || agent.domain)
    
    const keywords = [
      normalizedCategory,
      agent.family || '',
      agent.outcome, 
      ...agent.requiredIntegrations,
      ...(agent.tags || []),
      agent.availability || 'available',
      agent.audience || 'both',
    ].filter(Boolean)
    
    items.push({
      type: 'agent',
      id: agent.id,
      label: agent.name,
      keywords,
      href: `/app/${tenantId}/marketplace/agents/${agent.id}`,
      icon: 'bot',
      description: agent.outcome,
      category: normalizedCategory,
    })
  }
  
  // Workflow templates from marketplace (listed independently of agents)
  for (const workflow of marketplaceWorkflows) {
    const keywords = [
      workflow.trigger, 
      workflow.useCase, 
      ...workflow.integrations,
      ...(workflow.catalogGroups || []),
      workflow.family || '',
      ...(workflow.tags || []),
      workflow.availability || 'available',
    ].filter(Boolean)
    
    items.push({
      type: 'workflow',
      id: workflow.id,
      label: workflow.name,
      keywords,
      href: `/app/${tenantId}/marketplace/workflows/${workflow.id}`,
      icon: 'workflow',
      description: workflow.summary,
    })
  }
  
  // Pack templates from marketplace
  for (const pack of packTemplates) {
    const normalizedCategory = normalizeCategory(pack.vertical)
    const keywords = [
      normalizedCategory,
      ...pack.includedCategories.map(c => normalizeCategory(c)),
      ...pack.kpis,
      ...(pack.tags || []),
    ].filter(Boolean)
    
    items.push({
      type: 'pack',
      id: pack.id,
      label: pack.name,
      keywords,
      href: `/app/${tenantId}/marketplace/packs/${pack.slug}`,
      icon: 'package',
      description: pack.description,
      category: normalizedCategory,
    })
  }
  
  // Recent runs (tenant-specific)
  const allRuns = await provider.listTenantRuns(tenantId)
  const tenantRuns = allRuns.slice(0, 10)
  for (const run of tenantRuns) {
    const agent = marketplaceAgents.find((template) => template.id === run.agentId)
    items.push({
      type: 'run',
      id: run.id,
      label: `Run ${run.id}`,
      keywords: [run.status, run.triggeredBy, agent?.name || ''],
      href: `/app/${tenantId}/runs/${run.id}`,
      icon: run.status === 'success' ? 'check-circle' : run.status === 'failed' ? 'x-circle' : 'clock',
      description: `${agent?.name || 'Unknown'} - ${run.status}`,
    })
  }
  
  const quickActions: SearchItem[] = [
    {
      type: 'action',
      id: 'action-installer',
      label:
        quickActionState.tone === 'demo'
          ? 'Open Demo Installer'
          : 'Open Installer Preview',
      keywords: ['installer', 'setup', 'preview', 'demo'],
      href: `/app/${tenantId}/installer/new`,
      icon: 'plus',
      description:
        quickActionState.tone === 'demo'
          ? 'Review the guided setup flow in demo mode.'
          : 'Review the tenant installer without triggering a live install.',
      category: quickActionState.label,
    },
    {
      type: 'action',
      id: 'action-approvals',
      label: 'Review Pending Approvals',
      keywords: ['approvals', 'review', 'pending', 'hitl'],
      href: `/app/${tenantId}/approvals`,
      icon: 'check',
      description: 'Open the approvals queue for review-only follow-up.',
      category: quickActionState.label,
    },
    {
      type: 'action',
      id: 'action-runs',
      label: 'Inspect Recent Runs',
      keywords: ['runs', 'errors', 'history', 'review'],
      href: `/app/${tenantId}/runs`,
      icon: 'refresh-cw',
      description: 'Open recent executions instead of retrying anything from here.',
      category: quickActionState.label,
    },
    {
      type: 'action',
      id: 'action-security',
      label: 'Review Security Surface',
      keywords: ['security', 'secrets', 'audit', 'rbac'],
      href: `/app/${tenantId}/security`,
      icon: 'shield',
      description:
        quickActionState.tone === 'demo'
          ? 'Inspect the demo security surface and read-only examples.'
          : 'Inspect read-only and preview security states for this tenant.',
      category: quickActionState.label,
    },
  ]

  items.push(...quickActions)
  
  return items
}

export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  if (!query.trim()) return items.slice(0, 12)
  
  const lowerQuery = query.toLowerCase()
  
  return items.filter(item => {
    // Match label
    if (item.label.toLowerCase().includes(lowerQuery)) return true
    // Match keywords
    if (item.keywords.some(k => k.toLowerCase().includes(lowerQuery))) return true
    // Match description
    if (item.description?.toLowerCase().includes(lowerQuery)) return true
    // Match category
    if (item.category?.toLowerCase().includes(lowerQuery)) return true
    return false
  }).slice(0, 20)
}

export function groupSearchItems(items: SearchItem[]): Record<string, SearchItem[]> {
  const groups: Record<string, SearchItem[]> = {
    'Navigate': [],
    'Agents': [],
    'Workflows': [],
    'Packs': [],
    'Runs': [],
    'Shortcuts': [],
  }
  
  for (const item of items) {
    switch (item.type) {
      case 'navigate':
        groups['Navigate'].push(item)
        break
      case 'agent':
        groups['Agents'].push(item)
        break
      case 'workflow':
        groups['Workflows'].push(item)
        break
      case 'pack':
        groups['Packs'].push(item)
        break
      case 'run':
        groups['Runs'].push(item)
        break
      case 'action':
        groups['Shortcuts'].push(item)
        break
    }
  }
  
  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, items]) => items.length > 0)
  )
}
