'use client';

import type { TenantSettingsSection, VerticalKey } from '@agentmou/contracts';

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
    <div className="space-y-6">
      <div className="page-head">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {activeVertical === 'internal' ? 'Workspace settings' : 'Configuración'}
          </p>
          <h1>{title}</h1>
          <p className="sub max-w-3xl">{description}</p>
        </div>
      </div>

      <div className="lg:hidden">
        <Select
          value={activeSectionKey ?? undefined}
          onValueChange={(value) => onSelect(value as TenantSettingsSection)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona una sección" />
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

      <div className="settings-shell hidden lg:grid">
        <aside className="settings-nav">
          {groupedSections.map((group) => (
            <div key={group.group}>
              <div className="settings-nav-sect">
                {getSettingsGroupTitle(group.group, activeVertical)}
              </div>
              {group.sections.map((section) => {
                const isActive = section.key === activeSectionKey;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => onSelect(section.key)}
                    className={cn('settings-nav-item', isActive && 'active')}
                  >
                    <span className="truncate">{section.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          {activeSection ? (
            <div className="settings-card">
              <div className="settings-sect-title">{activeSection.title}</div>
              {activeSection.description ? (
                <div className="settings-sect-sub">{activeSection.description}</div>
              ) : null}
              {activeSection.render()}
            </div>
          ) : (
            <div className="settings-card">
              <div className="empty-state-app">
                <p className="text-text-primary text-sm font-medium">Sin secciones disponibles</p>
                <p className="max-w-xs text-xs">
                  No hay secciones visibles para este tenant todavía.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        {activeSection ? (
          <div className="settings-card">
            <div className="settings-sect-title">{activeSection.title}</div>
            {activeSection.description ? (
              <div className="settings-sect-sub">{activeSection.description}</div>
            ) : null}
            {activeSection.render()}
          </div>
        ) : (
          <div className="settings-card">
            <div className="empty-state-app">
              <p className="text-text-primary text-sm font-medium">Sin secciones disponibles</p>
              <p className="max-w-xs text-xs">
                No hay secciones visibles para este tenant todavía.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
