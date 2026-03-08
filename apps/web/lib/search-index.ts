'use client'

import { normalizeCategory } from '@/lib/fleetops/category-config'
import {
  listMarketplaceAgentTemplates,
  listMarketplaceWorkflowTemplates,
  listPackTemplates,
  listTenantRuns,
} from '@/lib/fleetops/read-model'

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
  { type: 'navigate', id: 'nav-installer', label: 'Installer', keywords: ['install', 'new', 'add', 'setup'], icon: 'download', description: 'Install new agents' },
  { type: 'navigate', id: 'nav-fleet', label: 'Fleet', keywords: ['installed', 'my agents', 'my workflows', 'manage'], icon: 'package', description: 'Manage installed agents' },
  { type: 'navigate', id: 'nav-runs', label: 'Runs', keywords: ['executions', 'logs', 'history', 'activity'], icon: 'eye', description: 'View execution history' },
  { type: 'navigate', id: 'nav-approvals', label: 'Approvals', keywords: ['pending', 'hitl', 'review', 'approve', 'reject'], icon: 'check-circle', description: 'Review pending approvals' },
  { type: 'navigate', id: 'nav-observability', label: 'Observability', keywords: ['metrics', 'monitoring', 'charts', 'analytics'], icon: 'eye', description: 'View metrics and analytics' },
  { type: 'navigate', id: 'nav-security', label: 'Security', keywords: ['secrets', 'keys', 'rbac', 'audit', 'policies'], icon: 'shield', description: 'Manage security settings' },
  { type: 'navigate', id: 'nav-settings', label: 'Settings', keywords: ['config', 'preferences', 'workspace', 'billing'], icon: 'settings', description: 'Workspace settings' },
]

// Quick actions - mock operations
const quickActions: Omit<SearchItem, 'href'>[] = [
  { type: 'action', id: 'action-installer', label: 'Start Installer', keywords: ['install', 'new agent', 'setup'], icon: 'plus', description: 'Begin installing a new agent' },
  { type: 'action', id: 'action-retry', label: 'Retry Last Failed Run', keywords: ['retry', 'failed', 'rerun'], icon: 'refresh-cw', description: 'Retry the most recent failed execution' },
  { type: 'action', id: 'action-approve', label: 'Approve Next Request', keywords: ['approve', 'hitl', 'accept'], icon: 'check', description: 'Approve the next pending request' },
  { type: 'action', id: 'action-test', label: 'Run Workflow Smoke Test', keywords: ['test', 'smoke', 'validate'], icon: 'play', description: 'Run a quick test on workflows' },
]

export function buildSearchIndex(tenantId: string): SearchItem[] {
  const items: SearchItem[] = []
  const marketplaceAgents = listMarketplaceAgentTemplates()
  const marketplaceWorkflows = listMarketplaceWorkflowTemplates()
  const packTemplates = listPackTemplates()
  
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
  
  // Workflow templates from marketplace (only public/utility visibility)
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
  const tenantRuns = listTenantRuns(tenantId).slice(0, 10)
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
  
  // Quick actions with tenant-specific hrefs
  for (const action of quickActions) {
    let href = `/app/${tenantId}/dashboard`
    if (action.id === 'action-installer') href = `/app/${tenantId}/installer/new`
    else if (action.id === 'action-retry') href = `/app/${tenantId}/runs?action=retry-last`
    else if (action.id === 'action-approve') href = `/app/${tenantId}/approvals?action=approve-next`
    else if (action.id === 'action-test') href = `/app/${tenantId}/runs?action=smoke-test`
    
    items.push({
      ...action,
      href,
    })
  }
  
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
    'Quick Actions': [],
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
        groups['Quick Actions'].push(item)
        break
    }
  }
  
  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, items]) => items.length > 0)
  )
}
