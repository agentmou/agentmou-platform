'use client';

import type {
  TenantExperience,
  TenantNavigationKey,
  TenantSettings,
  TenantSettingsSection,
  TenantShellKey,
  VerticalKey,
} from '@agentmou/contracts';

import { resolveActiveVertical } from './tenant-vertical';

export type TenantRouteKind = 'shared' | 'internal' | 'vertical_shared';
export type TenantSearchMode = 'clinic' | 'platform_internal';

export interface VerticalRegistryEntry {
  key: VerticalKey;
  shellKey: TenantShellKey;
  defaultRoute: string;
  allowedRouteKinds: TenantRouteKind[];
  navigationSchema: TenantNavigationKey[];
  settingsExtensions: TenantSettingsSection[];
  searchMode: TenantSearchMode;
  copyTokens?: {
    workspaceLabel: string;
  };
}

const CLINIC_NAVIGATION: TenantNavigationKey[] = [
  'dashboard',
  'inbox',
  'appointments',
  'patients',
  'follow_up',
  'forms',
  'confirmations',
  'gaps',
  'reactivation',
  'reports',
  'configuration',
];

const INTERNAL_NAVIGATION: TenantNavigationKey[] = ['platform_internal', 'admin_console'];

const VERTICAL_REGISTRY: Record<VerticalKey, VerticalRegistryEntry> = {
  internal: {
    key: 'internal',
    shellKey: 'platform_internal',
    defaultRoute: '/dashboard',
    allowedRouteKinds: ['shared', 'internal'],
    navigationSchema: INTERNAL_NAVIGATION,
    settingsExtensions: ['internal_defaults', 'internal_approvals'],
    searchMode: 'platform_internal',
    copyTokens: {
      workspaceLabel: 'Workspace',
    },
  },
  clinic: {
    key: 'clinic',
    shellKey: 'clinic',
    defaultRoute: '/dashboard',
    allowedRouteKinds: ['shared', 'vertical_shared'],
    navigationSchema: CLINIC_NAVIGATION,
    settingsExtensions: [
      'care_profile',
      'care_schedule',
      'care_services',
      'care_forms',
      'care_confirmations',
      'care_gap_recovery',
      'care_reactivation',
    ],
    searchMode: 'clinic',
    copyTokens: {
      workspaceLabel: 'Clinica',
    },
  },
  fisio: {
    key: 'fisio',
    shellKey: 'fisio',
    defaultRoute: '/dashboard',
    allowedRouteKinds: ['shared', 'vertical_shared'],
    navigationSchema: ['dashboard', 'configuration'],
    settingsExtensions: ['care_profile', 'care_schedule'],
    searchMode: 'clinic',
    copyTokens: {
      workspaceLabel: 'Centro',
    },
  },
};

type VerticalSource =
  | VerticalKey
  | Pick<TenantExperience, 'activeVertical'>
  | Partial<TenantSettings>
  | null
  | undefined;

export function resolveRegistryVertical(source: VerticalSource): VerticalKey {
  if (!source) {
    return 'internal';
  }

  if (source === 'internal' || source === 'clinic' || source === 'fisio') {
    return source;
  }

  if ('activeVertical' in source) {
    return resolveActiveVertical(source);
  }

  return resolveActiveVertical(source);
}

export function getVerticalRegistryEntry(source: VerticalSource): VerticalRegistryEntry {
  return VERTICAL_REGISTRY[resolveRegistryVertical(source)];
}

export function getTenantDefaultHref(tenantId: string, source: VerticalSource) {
  const entry = getVerticalRegistryEntry(source);
  return `/app/${tenantId}${entry.defaultRoute}`;
}
