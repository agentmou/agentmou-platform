'use client';

import * as React from 'react';
import type {
  ClinicChannel,
  ClinicModuleEntitlement,
  ClinicNavigationKey,
  ClinicProfile,
  Tenant,
  TenantExperience,
  TenantNavigationKey,
  TenantShellKey,
} from '@agentmou/contracts';

import { useAuthStore } from '@/lib/auth/store';
import type { DataProvider } from '@/lib/data/provider';
import type { TenantSearchMode } from '@/lib/vertical-registry';
import { getTenantDefaultHref, getVerticalRegistryEntry } from '@/lib/vertical-registry';
import {
  isSharedVertical,
  resolveActiveVertical as resolveTenantVertical,
} from '@/lib/tenant-vertical';

export {
  isClinicDentalMode,
  isClinicUiEnabled,
  resolveActiveVertical,
} from '@/lib/tenant-vertical';

export type TenantShellMode = TenantShellKey;

export interface ClinicUiCapabilities {
  coreReceptionEnabled: boolean;
  voiceEnabled: boolean;
  growthEnabled: boolean;
  formsEnabled: boolean;
  confirmationsEnabled: boolean;
  gapsEnabled: boolean;
  reactivationEnabled: boolean;
  multiLocationEnabled: boolean;
  whatsappAvailable: boolean;
  voiceChannelAvailable: boolean;
  internalPlatformEnabled: boolean;
  canAccessInternalPlatform: boolean;
}

export interface TenantExperienceState {
  tenantId: string;
  tenant: Tenant | null;
  role?: string;
  normalizedRole?: string;
  profile: ClinicProfile | null;
  modules: ClinicModuleEntitlement[];
  channels: ClinicChannel[];
  resolvedExperience: TenantExperience | null;
  permissions: TenantExperience['permissions'];
  allowedNavigation: TenantNavigationKey[];
  activeVertical: TenantExperience['activeVertical'];
  shellKey: TenantShellKey;
  defaultRoute: string;
  searchMode: TenantSearchMode;
  isClinicTenant: boolean;
  isSharedVertical: boolean;
  mode: TenantShellMode;
  canAccessInternalPlatform: boolean;
  capabilities: ClinicUiCapabilities;
  hasTenantAccess: boolean;
  fallbackTenantId: string | null;
  isLoading: boolean;
}

const DEFAULT_CAPABILITIES: ClinicUiCapabilities = {
  coreReceptionEnabled: false,
  voiceEnabled: false,
  growthEnabled: false,
  formsEnabled: false,
  confirmationsEnabled: false,
  gapsEnabled: false,
  reactivationEnabled: false,
  multiLocationEnabled: false,
  whatsappAvailable: false,
  voiceChannelAvailable: false,
  internalPlatformEnabled: false,
  canAccessInternalPlatform: false,
};

const TenantExperienceContext = React.createContext<TenantExperienceState | null>(null);

export function TenantExperienceProvider({
  value,
  children,
}: {
  value: TenantExperienceState;
  children: React.ReactNode;
}) {
  return (
    <TenantExperienceContext.Provider value={value}>{children}</TenantExperienceContext.Provider>
  );
}

export function useTenantExperience() {
  const context = React.useContext(TenantExperienceContext);

  if (!context) {
    throw new Error('useTenantExperience must be used within TenantExperienceProvider');
  }

  return context;
}

export function normalizeMemberRole(role?: string) {
  if (!role) {
    return undefined;
  }

  return role === 'member' ? 'operator' : role;
}

function isModuleEnabled(
  modules: Array<{ moduleKey: string; status: string; enabled?: boolean }>,
  moduleKey: string
) {
  return modules.some(
    (module) =>
      module.moduleKey === moduleKey &&
      ((module.enabled ?? false) || module.status === 'enabled' || module.status === 'beta')
  );
}

function hasActiveChannel(channels: ClinicChannel[], channelType: ClinicChannel['channelType']) {
  return channels.some(
    (channel) => channel.channelType === channelType && channel.status === 'active'
  );
}

export function resolveClinicCapabilities(params: {
  modules: ClinicModuleEntitlement[];
  channels: ClinicChannel[];
  profile: ClinicProfile | null;
  role?: string;
  experience?: Pick<TenantExperience, 'flags' | 'permissions' | 'canAccessInternalPlatform'> | null;
}): ClinicUiCapabilities {
  const { modules, channels, profile, role, experience } = params;
  const moduleByKey = Object.fromEntries(
    modules.map((module) => [module.moduleKey, module])
  ) as Record<string, ClinicModuleEntitlement>;
  const normalizedRole = normalizeMemberRole(role);
  const coreReceptionEnabled =
    moduleByKey.core_reception?.enabled ?? isModuleEnabled(modules, 'core_reception');
  const voiceEnabled = moduleByKey.voice?.enabled ?? isModuleEnabled(modules, 'voice');
  const growthEnabled = moduleByKey.growth?.enabled ?? isModuleEnabled(modules, 'growth');
  const internalPlatformEnabled =
    moduleByKey.internal_platform?.enabled ?? isModuleEnabled(modules, 'internal_platform');
  const whatsappAvailable = hasActiveChannel(channels, 'whatsapp');
  const voiceChannelAvailable = hasActiveChannel(channels, 'voice');
  const formsEnabled =
    experience?.flags.intakeFormsEnabled ??
    (coreReceptionEnabled && Boolean(profile?.requiresNewPatientForm));
  const confirmationsEnabled =
    experience?.flags.appointmentConfirmationsEnabled ??
    (coreReceptionEnabled && profile?.confirmationPolicy.enabled !== false);
  const gapsEnabled =
    experience?.flags.smartGapFillEnabled ??
    (growthEnabled && profile?.gapRecoveryPolicy.enabled !== false);
  const reactivationEnabled =
    experience?.flags.reactivationEnabled ??
    (growthEnabled && profile?.reactivationPolicy.enabled !== false);
  const multiLocationEnabled = channels.length > 1;
  const canAccessInternalPlatform =
    experience?.canAccessInternalPlatform ??
    experience?.permissions.includes('view_internal_platform') ??
    (internalPlatformEnabled && (normalizedRole === 'owner' || normalizedRole === 'admin'));

  return {
    coreReceptionEnabled,
    voiceEnabled,
    growthEnabled,
    formsEnabled,
    confirmationsEnabled,
    gapsEnabled,
    reactivationEnabled,
    multiLocationEnabled,
    whatsappAvailable,
    voiceChannelAvailable,
    internalPlatformEnabled,
    canAccessInternalPlatform,
  };
}

export function hasClinicNavigationAccess(
  experience: Pick<TenantExperienceState, 'allowedNavigation' | 'capabilities'>,
  key: ClinicNavigationKey
) {
  if (experience.allowedNavigation.length > 0) {
    return experience.allowedNavigation.includes(key);
  }

  const fallbackMap: Record<ClinicNavigationKey, boolean> = {
    dashboard: true,
    inbox: experience.capabilities.coreReceptionEnabled,
    appointments: experience.capabilities.coreReceptionEnabled,
    patients: experience.capabilities.coreReceptionEnabled,
    follow_up: experience.capabilities.coreReceptionEnabled,
    forms: experience.capabilities.formsEnabled,
    confirmations: experience.capabilities.confirmationsEnabled,
    gaps: experience.capabilities.gapsEnabled,
    reactivation: experience.capabilities.reactivationEnabled,
    reports: experience.capabilities.coreReceptionEnabled,
    configuration: true,
    platform_internal: experience.capabilities.canAccessInternalPlatform,
  };

  return fallbackMap[key];
}

export function useResolvedTenantExperience(tenantId: string, provider: DataProvider) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const authTenants = useAuthStore((state) => state.tenants);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const [tenant, setTenant] = React.useState<Tenant | null>(null);
  const [profile, setProfile] = React.useState<ClinicProfile | null>(null);
  const [modules, setModules] = React.useState<ClinicModuleEntitlement[]>([]);
  const [channels, setChannels] = React.useState<ClinicChannel[]>([]);
  const [resolvedExperience, setResolvedExperience] = React.useState<TenantExperience | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    let active = true;

    async function load() {
      if (!isHydrated) {
        return;
      }

      setIsLoading(true);

      const [resolvedTenant, nextExperience] = await Promise.all([
        provider.getTenant(tenantId).catch(() => null),
        provider.getTenantExperience(tenantId).catch(() => null),
      ]);

      if (!active) {
        return;
      }

      const nextVertical =
        nextExperience?.activeVertical ?? resolveTenantVertical(resolvedTenant?.settings);
      const shouldLoadClinicContext = isSharedVertical(nextVertical);

      let nextProfile: ClinicProfile | null = null;
      let nextModules: ClinicModuleEntitlement[] = nextExperience?.modules ?? [];
      let nextChannels: ClinicChannel[] = [];

      if (shouldLoadClinicContext) {
        const [loadedProfile, loadedModules, loadedChannels] = await Promise.all([
          provider.getClinicProfile(tenantId).catch(() => null),
          nextModules.length > 0
            ? Promise.resolve(nextModules)
            : provider.listClinicModules(tenantId).catch(() => []),
          provider.listClinicChannels(tenantId).catch(() => []),
        ]);

        if (!active) {
          return;
        }

        nextProfile = loadedProfile;
        nextModules = loadedModules;
        nextChannels = loadedChannels;
      }

      setTenant(resolvedTenant);
      setProfile(nextProfile);
      setModules(nextModules);
      setChannels(nextChannels);
      setResolvedExperience(nextExperience);
      setIsLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [authTenants, isHydrated, provider, tenantId]);

  const role = authTenants.find((item) => item.id === tenantId)?.role;
  const hasTenantAccess =
    tenantId === 'demo-workspace' || authTenants.some((item) => item.id === tenantId);
  const fallbackTenantId = authTenants[0]?.id ?? null;
  const activeVertical =
    resolvedExperience?.activeVertical ?? resolveTenantVertical(tenant?.settings);
  const registryEntry = getVerticalRegistryEntry(resolvedExperience ?? tenant?.settings);
  const sharedVertical = isSharedVertical(activeVertical);
  const isClinicTenant = activeVertical === 'clinic';
  const normalizedRole = resolvedExperience?.normalizedRole ?? normalizeMemberRole(role);
  const capabilities = React.useMemo(
    () =>
      sharedVertical
        ? resolveClinicCapabilities({
            modules,
            channels,
            profile,
            role,
            experience: resolvedExperience,
          })
        : DEFAULT_CAPABILITIES,
    [channels, modules, profile, resolvedExperience, role, sharedVertical]
  );
  const canAccessInternalPlatform =
    resolvedExperience?.canAccessInternalPlatform ??
    (activeVertical === 'internal' && capabilities.canAccessInternalPlatform);
  const shellKey = resolvedExperience?.shellKey ?? registryEntry.shellKey;
  const defaultRoute =
    resolvedExperience?.defaultRoute ??
    getTenantDefaultHref(tenantId, resolvedExperience ?? tenant?.settings);

  return {
    tenantId,
    tenant,
    role,
    normalizedRole,
    profile,
    modules,
    channels,
    resolvedExperience,
    permissions: resolvedExperience?.permissions ?? [],
    allowedNavigation: resolvedExperience?.allowedNavigation ?? registryEntry.navigationSchema,
    activeVertical,
    shellKey,
    defaultRoute,
    searchMode: registryEntry.searchMode,
    isClinicTenant,
    isSharedVertical: sharedVertical,
    mode: shellKey,
    canAccessInternalPlatform,
    capabilities,
    hasTenantAccess,
    fallbackTenantId,
    isLoading: !isHydrated || isLoading,
  } satisfies TenantExperienceState;
}
