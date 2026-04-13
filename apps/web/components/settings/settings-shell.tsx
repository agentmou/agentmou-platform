'use client';

import type { TenantSettingsSection, VerticalKey } from '@agentmou/contracts';

import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getSettingsGroupTitle,
  type ResolvedSettingsSection,
  type SettingsSectionGroup,
} from '@/lib/settings-registry';

const GROUP_ORDER: SettingsSectionGroup[] = ['base', 'care', 'internal'];

function groupSections(sections: ResolvedSettingsSection[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    sections: sections.filter((section) => section.group === group),
  })).filter((entry) => entry.sections.length > 0);
}

export function SettingsShell({
  title,
  description,
  activeVertical,
  sections,
  activeSectionKey,
  onSelect,
}: {
  title: string;
  description: string;
  activeVertical: VerticalKey;
  sections: ResolvedSettingsSection[];
  activeSectionKey: TenantSettingsSection | null;
  onSelect: (key: TenantSettingsSection) => void;
}) {
  const groupedSections = groupSections(sections);
  const activeSection = sections.find((section) => section.key === activeSectionKey) ?? null;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
          {activeVertical === 'internal' ? 'Workspace settings' : 'Configuracion'}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="lg:hidden">
        <Select
          value={activeSectionKey ?? undefined}
          onValueChange={(value) => onSelect(value as TenantSettingsSection)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona una seccion" />
          </SelectTrigger>
          <SelectContent>
            {groupedSections.map((group) => (
              <div key={group.group}>
                {group.sections.map((section) => (
                  <SelectItem key={section.key} value={section.key}>
                    {section.title}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:block lg:sticky lg:top-24">
          <nav className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="space-y-6">
              {groupedSections.map((group) => (
                <div key={group.group} className="space-y-2">
                  <p className="px-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {getSettingsGroupTitle(group.group, activeVertical)}
                  </p>
                  <div className="space-y-1">
                    {group.sections.map((section) => {
                      const isActive = section.key === activeSectionKey;

                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => onSelect(section.key)}
                          className={cn(
                            'flex w-full flex-col items-start rounded-2xl px-3 py-3 text-left transition-colors',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          )}
                        >
                          <span className="text-sm font-medium">{section.title}</span>
                          <span className="mt-1 text-xs leading-relaxed text-inherit/80">
                            {section.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        <div className="min-w-0">
          {activeSection ? (
            <div className="space-y-6">{activeSection.render()}</div>
          ) : (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-6 text-sm text-muted-foreground">
                No hay secciones visibles para este tenant todavia.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
