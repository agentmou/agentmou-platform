'use client';

import type React from 'react';
import type {
  Integration,
  Invoice,
  N8nConnection,
  SecurityFinding,
  SecurityPolicy,
  Tenant,
  TenantMember,
  TenantSettingsSection,
  VerticalKey,
} from '@agentmou/contracts';

import type { FleetAuditEvent, FleetBillingInfo } from '@/lib/data/provider';
import type { DataProviderMode } from '@/lib/data/provider';
import type { TenantExperienceState } from '@/lib/tenant-experience';
import {
  CareConfirmationsSettingsSection,
  CareFormsSettingsSection,
  CareGapRecoverySettingsSection,
  CareProfileSettingsSection,
  CareReactivationSettingsSection,
  CareScheduleSettingsSection,
  CareServicesSettingsSection,
  GeneralSettingsSection,
  IntegrationsSettingsSection,
  InternalApprovalsSettingsSection,
  InternalDefaultsSettingsSection,
  PlanSettingsSection,
  SecuritySettingsSection,
  TeamSettingsSection,
} from '@/components/settings/settings-sections';

export type SettingsSectionGroup = 'base' | 'care' | 'internal';

export interface SettingsRegistryContext {
  providerMode: DataProviderMode;
  experience: TenantExperienceState;
  tenant: Tenant;
  members: TenantMember[];
  integrations: Integration[];
  billing: FleetBillingInfo;
  invoices: Invoice[];
  securityFindings: SecurityFinding[];
  securityPolicies: SecurityPolicy[];
  auditEvents: FleetAuditEvent[];
  n8nConnection: N8nConnection | null;
}

interface SettingsSectionDefinition {
  key: TenantSettingsSection;
  order: number;
  group: SettingsSectionGroup;
  verticals: VerticalKey[] | 'all';
  title: string | ((context: SettingsRegistryContext) => string);
  description: string | ((context: SettingsRegistryContext) => string);
  when?: (context: SettingsRegistryContext) => boolean;
  render: (context: SettingsRegistryContext) => React.ReactNode;
}

export interface ResolvedSettingsSection
  extends Omit<SettingsSectionDefinition, 'title' | 'description' | 'render'> {
  title: string;
  description: string;
  render: () => React.ReactNode;
}

function resolveCopy(
  value: string | ((context: SettingsRegistryContext) => string),
  context: SettingsRegistryContext
) {
  return typeof value === 'function' ? value(context) : value;
}

function isSharedCareVertical(context: SettingsRegistryContext) {
  return (
    context.experience.activeVertical === 'clinic' || context.experience.activeVertical === 'fisio'
  );
}

const SETTINGS_SECTION_DEFINITIONS: SettingsSectionDefinition[] = [
  {
    key: 'general',
    order: 10,
    group: 'base',
    verticals: 'all',
    title: 'General',
    description: (context) =>
      context.experience.activeVertical === 'internal'
        ? 'Workspace identity, defaults, and environment basics.'
        : 'Nombre visible, zona horaria y datos base del centro.',
    render: (context) => <GeneralSettingsSection context={context} />,
  },
  {
    key: 'team',
    order: 20,
    group: 'base',
    verticals: 'all',
    title: (context) =>
      context.experience.activeVertical === 'internal' ? 'Users and roles' : 'Usuarios y roles',
    description: (context) =>
      context.experience.activeVertical === 'internal'
        ? 'Membership, access level, and workspace roles.'
        : 'Miembros, acceso y roles del equipo.',
    render: (context) => <TeamSettingsSection context={context} />,
  },
  {
    key: 'integrations',
    order: 30,
    group: 'base',
    verticals: 'all',
    title: (context) =>
      context.experience.activeVertical === 'internal'
        ? 'Integrations and channels'
        : 'Integraciones y canales',
    description: (context) =>
      context.experience.activeVertical === 'internal'
        ? 'Connector health and platform-managed workflow runtime.'
        : 'Canales activos, conectores y estado operativo.',
    render: (context) => <IntegrationsSettingsSection context={context} />,
  },
  {
    key: 'plan',
    order: 40,
    group: 'base',
    verticals: 'all',
    title: (context) =>
      context.experience.activeVertical === 'internal' ? 'Plan and modules' : 'Plan y módulos',
    description: (context) =>
      context.experience.activeVertical === 'internal'
        ? 'Commercial entitlements, internal access, rollout posture, and capability state.'
        : 'Entitlements del plan, readiness operativa, rollout y compatibilidad legacy.',
    render: (context) => <PlanSettingsSection context={context} />,
  },
  {
    key: 'security',
    order: 50,
    group: 'base',
    verticals: 'all',
    title: (context) =>
      context.experience.activeVertical === 'internal'
        ? 'Security and audit'
        : 'Seguridad y auditoría',
    description: (context) =>
      context.experience.activeVertical === 'internal'
        ? 'Read-only security posture, audit coverage, and guarded actions.'
        : 'Resumen de hallazgos, políticas y trazabilidad operativa.',
    render: (context) => <SecuritySettingsSection context={context} />,
  },
  {
    key: 'care_profile',
    order: 60,
    group: 'care',
    verticals: ['clinic', 'fisio'],
    title: 'Perfil del centro',
    description: (context) =>
      context.experience.activeVertical === 'fisio'
        ? 'Identidad, especialidad y canal principal del centro.'
        : 'Identidad operativa y canal principal de la clínica.',
    render: (context) => <CareProfileSettingsSection context={context} />,
  },
  {
    key: 'care_schedule',
    order: 70,
    group: 'care',
    verticals: ['clinic', 'fisio'],
    title: 'Agenda y reglas',
    description: (context) =>
      context.experience.activeVertical === 'fisio'
        ? 'Horarios, políticas y reglas base de la agenda.'
        : 'Horarios, reglas de agenda y políticas de seguimiento.',
    render: (context) => <CareScheduleSettingsSection context={context} />,
  },
  {
    key: 'care_services',
    order: 80,
    group: 'care',
    verticals: ['clinic', 'fisio'],
    title: 'Servicios y profesionales',
    description: () => 'Estructura preparada para servicios, duraciones y responsables.',
    render: (context) => <CareServicesSettingsSection context={context} />,
  },
  {
    key: 'care_forms',
    order: 90,
    group: 'care',
    verticals: ['clinic', 'fisio'],
    title: 'Formularios',
    description: () => 'Plantillas activas y progreso de formularios enviados.',
    when: (context) =>
      isSharedCareVertical(context) && context.experience.capabilities.formsEnabled,
    render: (context) => <CareFormsSettingsSection context={context} />,
  },
  {
    key: 'care_confirmations',
    order: 100,
    group: 'care',
    verticals: ['clinic', 'fisio'],
    title: 'Confirmaciones',
    description: () => 'Estado de confirmaciones, recordatorios y escalados pendientes.',
    when: (context) =>
      isSharedCareVertical(context) && context.experience.capabilities.confirmationsEnabled,
    render: (context) => <CareConfirmationsSettingsSection context={context} />,
  },
  {
    key: 'care_gap_recovery',
    order: 110,
    group: 'care',
    verticals: ['clinic', 'fisio'],
    title: 'Recuperación de huecos',
    description: () => 'Huecos activos, outreach y capacidad de recolocacion.',
    when: (context) => isSharedCareVertical(context) && context.experience.capabilities.gapsEnabled,
    render: (context) => <CareGapRecoverySettingsSection context={context} />,
  },
  {
    key: 'care_reactivation',
    order: 120,
    group: 'care',
    verticals: ['clinic', 'fisio'],
    title: 'Reactivación',
    description: () => 'Campañas activas, cobertura y pacientes reenganchados.',
    when: (context) =>
      isSharedCareVertical(context) && context.experience.capabilities.reactivationEnabled,
    render: (context) => <CareReactivationSettingsSection context={context} />,
  },
  {
    key: 'internal_defaults',
    order: 130,
    group: 'internal',
    verticals: ['internal'],
    title: 'Operational defaults',
    description: () => 'Workspace preferences, HITL defaults, and preview-only controls.',
    render: (context) => <InternalDefaultsSettingsSection context={context} />,
  },
  {
    key: 'internal_approvals',
    order: 140,
    group: 'internal',
    verticals: ['internal'],
    title: 'Approvals',
    description: () => 'Approval posture, backlog summary, and escalation entry points.',
    when: (context) => context.experience.canAccessAdminConsole,
    render: (context) => <InternalApprovalsSettingsSection context={context} />,
  },
];

export function getSettingsSectionDefinition(key: TenantSettingsSection) {
  return SETTINGS_SECTION_DEFINITIONS.find((definition) => definition.key === key) ?? null;
}

export function getVisibleSettingsSections(
  context: SettingsRegistryContext
): ResolvedSettingsSection[] {
  const eligibleSections = new Set(
    context.experience.resolvedExperience?.settingsSections ?? ['general']
  );

  return SETTINGS_SECTION_DEFINITIONS.filter((definition) => {
    const verticalMatch =
      definition.verticals === 'all' ||
      definition.verticals.includes(context.experience.activeVertical);
    const predicateMatch = definition.when ? definition.when(context) : true;

    return eligibleSections.has(definition.key) && verticalMatch && predicateMatch;
  })
    .sort((left, right) => left.order - right.order)
    .map((definition) => ({
      ...definition,
      title: resolveCopy(definition.title, context),
      description: resolveCopy(definition.description, context),
      render: () => definition.render(context),
    }));
}

export function resolveActiveSettingsSection(
  sections: ResolvedSettingsSection[],
  requestedKey: string | null
) {
  const requested = requestedKey ? sections.find((section) => section.key === requestedKey) : null;

  return requested ?? sections[0] ?? null;
}

export function getSettingsGroupTitle(group: SettingsSectionGroup, activeVertical: VerticalKey) {
  if (group === 'base') {
    return activeVertical === 'internal' ? 'Core' : 'Base común';
  }

  if (group === 'care') {
    return 'Operación asistencial';
  }

  return 'Operación interna';
}
