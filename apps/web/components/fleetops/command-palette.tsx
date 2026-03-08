'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Store,
  Download,
  Package,
  Eye,
  CheckCircle,
  Shield,
  Settings,
  Bot,
  Workflow,
  Play,
  RefreshCw,
  Check,
  Plus,
  XCircle,
  Clock,
} from 'lucide-react'
import { buildSearchIndex, searchItems, groupSearchItems, type SearchItem } from '@/lib/search-index'
import { toast } from 'sonner'

const iconMap: Record<string, React.ElementType> = {
  'layout-dashboard': LayoutDashboard,
  'store': Store,
  'download': Download,
  'package': Package,
  'eye': Eye,
  'check-circle': CheckCircle,
  'shield': Shield,
  'settings': Settings,
  'bot': Bot,
  'workflow': Workflow,
  'play': Play,
  'refresh-cw': RefreshCw,
  'check': Check,
  'plus': Plus,
  'x-circle': XCircle,
  'clock': Clock,
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.tenantId as string
  
  const [query, setQuery] = React.useState('')
  
  // Build search index with current tenant
  const searchIndex = React.useMemo(() => {
    return buildSearchIndex(tenantId)
  }, [tenantId])
  
  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    return searchItems(searchIndex, query)
  }, [searchIndex, query])
  
  // Group filtered items
  const groupedItems = React.useMemo(() => {
    return groupSearchItems(filteredItems)
  }, [filteredItems])
  
  // Handle item selection
  const handleSelect = React.useCallback((item: SearchItem) => {
    onOpenChange(false)
    setQuery('')
    
    // Handle quick actions with mock behavior
    if (item.type === 'action') {
      switch (item.id) {
        case 'action-installer':
          router.push(`/app/${tenantId}/installer/new`)
          return
        case 'action-retry':
          toast.success('Retrying last failed run...', {
            description: 'A new run has been queued.',
          })
          router.push(`/app/${tenantId}/runs`)
          return
        case 'action-approve':
          toast.success('Navigating to approvals...', {
            description: 'Opening the next pending approval.',
          })
          router.push(`/app/${tenantId}/approvals`)
          return
        case 'action-test':
          toast.success('Running smoke test...', {
            description: 'Test execution started.',
          })
          router.push(`/app/${tenantId}/runs`)
          return
      }
    }
    
    // Navigate to item href
    router.push(item.href)
  }, [router, tenantId, onOpenChange])
  
  // Keyboard shortcut to focus search when "/" is pressed
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === '/') {
        e.preventDefault()
        // Focus is handled by cmdk
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])
  
  const getIcon = (iconName?: string) => {
    if (!iconName) return null
    const Icon = iconMap[iconName]
    return Icon ? <Icon className="h-4 w-4" /> : null
  }
  
  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search for pages, agents, workflows, or run quick actions"
    >
      <CommandInput 
        placeholder="Search pages, agents, workflows..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {Object.entries(groupedItems).map(([groupName, items], index) => (
          <React.Fragment key={groupName}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={groupName}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted/50">
                    {getIcon(item.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                  {item.category && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.category}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
