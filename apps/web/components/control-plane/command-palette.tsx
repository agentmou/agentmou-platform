'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Activity,
  CalendarDays,
  ChartColumn,
  ClipboardList,
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
  Inbox,
  Phone,
  Users,
} from 'lucide-react';
import {
  buildSearchIndex,
  searchItems,
  groupSearchItems,
  type SearchMode,
  type SearchItem,
} from '@/lib/search-index';
import { useDataProvider } from '@/lib/providers/context';

const iconMap: Record<string, React.ElementType> = {
  activity: Activity,
  'layout-dashboard': LayoutDashboard,
  store: Store,
  download: Download,
  package: Package,
  eye: Eye,
  'check-circle': CheckCircle,
  shield: Shield,
  settings: Settings,
  bot: Bot,
  workflow: Workflow,
  play: Play,
  'refresh-cw': RefreshCw,
  check: Check,
  plus: Plus,
  'x-circle': XCircle,
  clock: Clock,
  inbox: Inbox,
  phone: Phone,
  users: Users,
  'calendar-days': CalendarDays,
  'clipboard-list': ClipboardList,
  'chart-column': ChartColumn,
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: SearchMode;
}

export function CommandPalette({
  open,
  onOpenChange,
  mode = 'platform_internal',
}: CommandPaletteProps) {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const provider = useDataProvider();
  const [query, setQuery] = React.useState('');

  // Build search index with current tenant
  const [searchIndex, setSearchIndex] = React.useState<SearchItem[]>([]);
  React.useEffect(() => {
    buildSearchIndex(tenantId, provider, mode)
      .then(setSearchIndex)
      .catch(() => setSearchIndex([]));
  }, [mode, tenantId, provider]);

  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    return searchItems(searchIndex, query);
  }, [searchIndex, query]);

  // Group filtered items
  const groupedItems = React.useMemo(() => {
    return groupSearchItems(filteredItems);
  }, [filteredItems]);

  // Handle item selection
  const handleSelect = React.useCallback(
    (item: SearchItem) => {
      onOpenChange(false);
      setQuery('');
      router.push(item.href);
    },
    [router, onOpenChange]
  );

  // Keyboard shortcut to focus search when "/" is pressed
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === '/') {
        e.preventDefault();
        // Focus is handled by cmdk
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = iconMap[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description={
        mode === 'clinic'
          ? 'Busca pacientes, citas, conversaciones y tareas operativas'
          : 'Search for internal platform pages, agents, workflows, and shortcuts'
      }
    >
      <CommandInput
        placeholder={
          mode === 'clinic'
            ? 'Buscar pacientes, citas, conversaciones o seguimientos...'
            : 'Search internal pages, agents, workflows, or shortcuts...'
        }
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {mode === 'clinic'
            ? 'No se encontraron pacientes, citas o accesos directos.'
            : 'No matching pages or previews found.'}
        </CommandEmpty>

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
  );
}
