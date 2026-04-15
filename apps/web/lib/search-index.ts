'use client';

import { normalizeCategory } from '@/lib/control-plane/category-config';
import { resolveCatalogAvailability } from '@/lib/catalog/availability';
import { formatClinicDateTime, resolveClinicTimezone } from '@/lib/clinic-formatting';
import type { DataProvider } from '@/lib/data/provider';
import { resolveHonestSurfaceState } from '@/lib/honest-ui';
import { resolveInternalNavigation } from '@/lib/internal-navigation';

export type SearchItemType = 'navigate' | 'agent' | 'workflow' | 'pack' | 'run' | 'action';
export type SearchMode = 'clinic' | 'platform_internal';

export interface SearchItem {
  type: SearchItemType;
  id: string;
  label: string;
  keywords: string[];
  href: string;
  icon?: string;
  description?: string;
  category?: string;
}

// Navigation items - available globally in the app
const platformNavigationMetadata: Record<string, Pick<SearchItem, 'keywords' | 'description'>> = {
  dashboard: {
    keywords: ['home', 'overview', 'stats'],
    description: 'View workspace overview',
  },
  approvals: {
    keywords: ['pending', 'hitl', 'review', 'approve', 'reject'],
    description: 'Review pending approvals',
  },
  marketplace: {
    keywords: ['browse', 'agents', 'workflows', 'packs', 'store'],
    description: 'Browse agents and workflows',
  },
  installer: {
    keywords: ['install', 'new', 'add', 'setup'],
    description: 'Review the installer preview',
  },
  fleet: {
    keywords: ['installed', 'my agents', 'my workflows', 'manage'],
    description: 'Manage installed agents',
  },
  runs: {
    keywords: ['executions', 'logs', 'history', 'activity'],
    description: 'View execution history',
  },
  observability: {
    keywords: ['metrics', 'monitoring', 'charts', 'analytics'],
    description: 'Review recent runs and preview analytics',
  },
  security: {
    keywords: ['secrets', 'keys', 'rbac', 'audit', 'policies'],
    description: 'Review security access and preview states',
  },
  'admin-console': {
    keywords: ['admin', 'tenants', 'users', 'impersonation', 'vertical'],
    description: 'Manage tenants, users, and impersonation',
  },
  settings: {
    keywords: ['config', 'preferences', 'workspace', 'billing'],
    description: 'Workspace settings',
  },
};

const clinicNavigationItems: Omit<SearchItem, 'href'>[] = [
  {
    type: 'navigate',
    id: 'nav-dashboard',
    label: 'Resumen',
    keywords: ['home', 'resumen', 'kpis', 'operación'],
    icon: 'layout-dashboard',
    description: 'Vista operativa del centro de recepción',
  },
  {
    type: 'navigate',
    id: 'nav-bandeja',
    label: 'Bandeja',
    keywords: ['inbox', 'whatsapp', 'llamadas', 'escalados'],
    icon: 'inbox',
    description: 'Conversaciones y llamadas en curso',
  },
  {
    type: 'navigate',
    id: 'nav-agenda',
    label: 'Agenda',
    keywords: ['citas', 'calendar', 'agenda'],
    icon: 'calendar-days',
    description: 'Citas del día y cambios recientes',
  },
  {
    type: 'navigate',
    id: 'nav-pacientes',
    label: 'Pacientes',
    keywords: ['pacientes', 'nuevos', 'existentes', 'reactivación'],
    icon: 'users',
    description: 'Listado y contexto del paciente',
  },
  {
    type: 'navigate',
    id: 'nav-seguimiento',
    label: 'Seguimiento',
    keywords: ['formularios', 'confirmaciones', 'huecos'],
    icon: 'clipboard-list',
    description: 'Colas de seguimiento y tareas pendientes',
  },
  {
    type: 'navigate',
    id: 'nav-reactivacion',
    label: 'Reactivación',
    keywords: ['campañas', 'recall', 'reactivación'],
    icon: 'refresh-cw',
    description: 'Campañas y pacientes por recuperar',
  },
  {
    type: 'navigate',
    id: 'nav-rendimiento',
    label: 'Rendimiento',
    keywords: ['kpis', 'conversaciones', 'confirmaciones', 'rendimiento'],
    icon: 'chart-column',
    description: 'Métricas operativas del centro',
  },
  {
    type: 'navigate',
    id: 'nav-configuracion',
    label: 'Configuración',
    keywords: ['módulos', 'canales', 'reglas', 'configuración'],
    icon: 'settings',
    description: 'Configuración del centro de recepción',
  },
];

export async function buildSearchIndex(
  tenantId: string,
  provider: DataProvider,
  mode: SearchMode = 'platform_internal'
): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  const navigationItems = clinicNavigationItems;

  if (mode === 'clinic') {
    const experience = await provider.getTenantExperience(tenantId).catch(() => null);
    const allowedNavigation = new Set(experience?.allowedNavigation ?? []);
    const shouldShowClinicNav = (navId: string) => {
      const key = {
        'nav-dashboard': 'dashboard',
        'nav-bandeja': 'inbox',
        'nav-agenda': 'appointments',
        'nav-pacientes': 'patients',
        'nav-seguimiento': 'follow_up',
        'nav-reactivacion': 'reactivation',
        'nav-rendimiento': 'reports',
        'nav-configuracion': 'configuration',
      }[navId];

      return !key || allowedNavigation.size === 0 || allowedNavigation.has(key as never);
    };

    for (const navItem of navigationItems) {
      if (!shouldShowClinicNav(navItem.id)) {
        continue;
      }

      const href =
        navItem.id === 'nav-dashboard'
          ? `/app/${tenantId}/dashboard`
          : `/app/${tenantId}/${navItem.id.replace('nav-', '')}`;

      items.push({
        ...navItem,
        href,
      });
    }

    const [tenant, clinicProfile, patients, conversations, appointments, campaigns] =
      await Promise.all([
        provider.getTenant(tenantId).catch(() => null),
        provider.getClinicProfile(tenantId).catch(() => null),
        provider.listClinicPatients(tenantId, { limit: 8 }).catch(() => ({ patients: [] })),
        provider.listClinicConversations(tenantId).catch(() => ({ threads: [] })),
        provider.listClinicAppointments(tenantId, { limit: 8 }).catch(() => ({ appointments: [] })),
        provider.listClinicReactivationCampaigns(tenantId).catch(() => ({ campaigns: [] })),
      ]);
    const clinicTimezone = resolveClinicTimezone({
      profileTimezone: clinicProfile?.timezone,
      tenantTimezone: tenant?.settings.timezone,
    });

    items.push(
      ...(allowedNavigation.size === 0 || allowedNavigation.has('patients')
        ? patients.patients.slice(0, 6).map((patient) => ({
            type: 'action' as const,
            id: `patient-${patient.id}`,
            label: patient.fullName,
            keywords: [patient.status, patient.phone ?? '', patient.email ?? ''].filter(Boolean),
            href: `/app/${tenantId}/pacientes`,
            icon: 'users',
            description: patient.isReactivationCandidate
              ? 'Paciente para reactivar'
              : patient.hasPendingForm
                ? 'Paciente con formulario pendiente'
                : 'Abrir listado de pacientes',
            category: patient.isExisting ? 'Paciente existente' : 'Nuevo paciente',
          }))
        : []),
      ...(allowedNavigation.size === 0 || allowedNavigation.has('inbox')
        ? conversations.threads.slice(0, 6).map((thread) => ({
            type: 'action' as const,
            id: `thread-${thread.id}`,
            label: thread.patient?.fullName ?? 'Conversacion sin identificar',
            keywords: [thread.channelType, thread.status, thread.intent, thread.priority],
            href: `/app/${tenantId}/bandeja`,
            icon: thread.channelType === 'voice' ? 'phone' : 'inbox',
            description: thread.lastMessagePreview ?? 'Abrir bandeja',
            category: 'Bandeja',
          }))
        : []),
      ...(allowedNavigation.size === 0 || allowedNavigation.has('appointments')
        ? appointments.appointments.slice(0, 6).map((appointment) => ({
            type: 'action' as const,
            id: `appointment-${appointment.id}`,
            label: appointment.patient?.fullName ?? 'Cita agendada',
            keywords: [
              appointment.status,
              appointment.confirmationStatus,
              appointment.location?.name ?? '',
              appointment.service?.name ?? '',
            ].filter(Boolean),
            href: `/app/${tenantId}/agenda`,
            icon: 'calendar-days',
            description: `Cita ${formatClinicDateTime(appointment.startsAt, clinicTimezone)}`,
            category: 'Agenda',
          }))
        : []),
      ...(allowedNavigation.size === 0 || allowedNavigation.has('reactivation')
        ? campaigns.campaigns.slice(0, 4).map((campaign) => ({
            type: 'action' as const,
            id: `campaign-${campaign.id}`,
            label: campaign.name,
            keywords: [campaign.campaignType, campaign.status],
            href: `/app/${tenantId}/reactivacion`,
            icon: 'refresh-cw',
            description: `Campaña ${campaign.status}`,
            category: 'Reactivación',
          }))
        : []),
      ...(allowedNavigation.size === 0 || allowedNavigation.has('forms')
        ? [
            {
              type: 'action' as const,
              id: 'action-forms',
              label: 'Abrir formularios pendientes',
              keywords: ['formularios', 'seguimiento', 'pendientes'],
              href: `/app/${tenantId}/seguimiento/formularios`,
              icon: 'clipboard-list',
              description: 'Revisar formularios enviados y pendientes',
              category: 'Seguimiento',
            },
          ]
        : []),
      ...(allowedNavigation.size === 0 || allowedNavigation.has('gaps')
        ? [
            {
              type: 'action' as const,
              id: 'action-gaps',
              label: 'Abrir huecos activos',
              keywords: ['huecos', 'cancelaciones', 'gaps'],
              href: `/app/${tenantId}/seguimiento/huecos`,
              icon: 'calendar-days',
              description: 'Ver huecos y oportunidades de relleno',
              category: 'Seguimiento',
            },
          ]
        : [])
    );

    return items;
  }

  const marketplaceAgents = await provider.listMarketplaceAgentTemplates();
  const marketplaceWorkflows = await provider.listMarketplaceWorkflowTemplates();
  const packTemplates = await provider.listPackTemplates();
  const quickActionState = resolveHonestSurfaceState('command-palette-quick-actions', {
    providerMode: provider.providerMode,
    tenantId,
  });

  const experience = await provider.getTenantExperience(tenantId).catch(() => null);
  const navigation = resolveInternalNavigation({
    allowedNavigation: experience?.allowedNavigation ?? [],
    canAccessAdminConsole: experience?.canAccessAdminConsole ?? false,
  });

  for (const navItem of [
    ...navigation.sections.flatMap((section) => section.items),
    ...(navigation.footerItem ? [navigation.footerItem] : []),
  ]) {
    const metadata = platformNavigationMetadata[navItem.key];

    items.push({
      type: 'navigate',
      id: `nav-${navItem.key}`,
      label: navItem.label,
      keywords: metadata?.keywords ?? [],
      href: `/app/${tenantId}${navItem.href}`,
      icon: navItem.icon,
      description: metadata?.description,
    });
  }

  // Agent templates from marketplace (only public visibility)
  for (const agent of marketplaceAgents) {
    // Normalize category for search (always returns a valid Category)
    const normalizedCategory = normalizeCategory(agent.catalogGroup || agent.domain);

    const keywords = [
      normalizedCategory,
      agent.family || '',
      agent.outcome,
      ...agent.requiredIntegrations,
      ...(agent.tags || []),
      resolveCatalogAvailability(agent.availability),
      agent.audience || 'both',
    ].filter(Boolean);

    items.push({
      type: 'agent',
      id: agent.id,
      label: agent.name,
      keywords,
      href: `/app/${tenantId}/marketplace/agents/${agent.id}`,
      icon: 'bot',
      description: agent.outcome,
      category: normalizedCategory,
    });
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
      resolveCatalogAvailability(workflow.availability),
    ].filter(Boolean);

    items.push({
      type: 'workflow',
      id: workflow.id,
      label: workflow.name,
      keywords,
      href: `/app/${tenantId}/marketplace/workflows/${workflow.id}`,
      icon: 'workflow',
      description: workflow.summary,
    });
  }

  // Pack templates from marketplace
  for (const pack of packTemplates) {
    const normalizedCategory = normalizeCategory(pack.vertical);
    const keywords = [
      normalizedCategory,
      ...pack.includedCategories.map((c) => normalizeCategory(c)),
      ...pack.kpis,
      ...(pack.tags || []),
    ].filter(Boolean);

    items.push({
      type: 'pack',
      id: pack.id,
      label: pack.name,
      keywords,
      href: `/app/${tenantId}/marketplace/packs/${pack.slug}`,
      icon: 'package',
      description: pack.description,
      category: normalizedCategory,
    });
  }

  // Recent runs (tenant-specific)
  const allRuns = await provider.listTenantRuns(tenantId);
  const tenantRuns = allRuns.slice(0, 10);
  for (const run of tenantRuns) {
    const agent = marketplaceAgents.find((template) => template.id === run.agentId);
    items.push({
      type: 'run',
      id: run.id,
      label: `Run ${run.id}`,
      keywords: [run.status, run.triggeredBy, agent?.name || ''],
      href: `/app/${tenantId}/runs/${run.id}`,
      icon:
        run.status === 'success' ? 'check-circle' : run.status === 'failed' ? 'x-circle' : 'clock',
      description: `${agent?.name || 'Unknown'} - ${run.status}`,
    });
  }

  const quickActions: SearchItem[] = [
    {
      type: 'action',
      id: 'action-installer',
      label: quickActionState.tone === 'demo' ? 'Open Demo Installer' : 'Open Installer Preview',
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
  ];

  items.push(...quickActions);

  return items;
}

export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  if (!query.trim()) return items.slice(0, 12);

  const lowerQuery = query.toLowerCase();

  return items
    .filter((item) => {
      // Match label
      if (item.label.toLowerCase().includes(lowerQuery)) return true;
      // Match keywords
      if (item.keywords.some((k) => k.toLowerCase().includes(lowerQuery))) return true;
      // Match description
      if (item.description?.toLowerCase().includes(lowerQuery)) return true;
      // Match category
      if (item.category?.toLowerCase().includes(lowerQuery)) return true;
      return false;
    })
    .slice(0, 20);
}

export function groupSearchItems(items: SearchItem[]): Record<string, SearchItem[]> {
  const groups: Record<string, SearchItem[]> = {
    Navigate: [],
    Agents: [],
    Workflows: [],
    Packs: [],
    Runs: [],
    Shortcuts: [],
  };

  for (const item of items) {
    switch (item.type) {
      case 'navigate':
        groups['Navigate'].push(item);
        break;
      case 'agent':
        groups['Agents'].push(item);
        break;
      case 'workflow':
        groups['Workflows'].push(item);
        break;
      case 'pack':
        groups['Packs'].push(item);
        break;
      case 'run':
        groups['Runs'].push(item);
        break;
      case 'action':
        groups['Shortcuts'].push(item);
        break;
    }
  }

  // Remove empty groups
  return Object.fromEntries(Object.entries(groups).filter(([, items]) => items.length > 0));
}
