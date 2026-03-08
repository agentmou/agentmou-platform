'use client'

export interface SavedView {
  id: string
  name: string
  filters: {
    status?: string
    trigger?: string
    agentId?: string
    workflowId?: string
    onlyFailed?: boolean
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  createdAt: string
}

const STORAGE_KEY = 'agentmou-saved-views'

export function getSavedViews(): SavedView[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveView(view: Omit<SavedView, 'id' | 'createdAt'>): SavedView {
  const views = getSavedViews()
  const newView: SavedView = {
    ...view,
    id: `view-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  views.push(newView)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  return newView
}

export function deleteView(viewId: string): void {
  const views = getSavedViews().filter(v => v.id !== viewId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
}

export function renameView(viewId: string, newName: string): void {
  const views = getSavedViews().map(v => 
    v.id === viewId ? { ...v, name: newName } : v
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
}
