'use client';

import * as React from 'react';
import type {
  ClinicChannel,
  ClinicExperience,
  ClinicModuleEntitlement,
  ClinicNavigationKey,
  ClinicProfile,
  Tenant,
  TenantSettings,
  VerticalKey,
} from '@agentmou/contracts';
import { usePathname } from 'next/navigation';

import type { DataProvider } from '@/lib/data/provider';
import { useAuthStore } from '@/lib/auth/store';

export type TenantShellMode = 'clinic' | 'platform_internal';

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
  resolvedExperience: ClinicExperience | null;
  permissions: ClinicExperience['permissions'];
  allowedNavigation: ClinicNavigationKey[];
  isClinicTenant: boolean;
  isPlatformRoute: boolean;
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

export function resolveActiveVertical(settings?: Partial<TenantSettings> | null): VerticalKey {
  if (
    settings?.activeVertical === 'internal' ||
    settings?.activeVertical === 'clinic' ||
    settings?.activeVertical === 'fisio'
  ) {
    return settings.activeVertical;
  }

  if (typeof settings?.verticalClinicUi === 'boolean') {
    return settings.verticalClinicUi ? 'clinic' : 'internal';
  }

  return 'internal';
}

export function isClinicUiEnabled(settings?: Partial<TenantSettings> | null) {
  return resolveActiveVertical(settings) === 'clinic';
}

export function isClinicDentalMode(settings?: Partial<TenantSettings> | null) {
  return isClinicUiEnabled(settings) && Boolean(settings?.clinicDentalMode);
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
  experience?: ClinicExperience | null;
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
  const pathname = usePathname();
  const hydrate = useAuthStore((state) => state.hydrate);
  const authTenants = useAuthStore((state) => state.tenants);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const [tenant, setTenant] = React.useState<Tenant | null>(null);
  const [profile, setProfile] = React.useState<ClinicProfile | null>(null);
  const [modules, setModules] = React.useState<ClinicModuleEntitlement[]>([]);
  const [channels, setChannels] = React.useState<ClinicChannel[]>([]);
  const [resolvedExperience, setResolvedExperience] = React.useState<ClinicExperience | null>(null);
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

      const [resolvedTenant, resolvedProfile, nextExperience] = await Promise.all([
        provider.getTenant(tenantId).catch(() => null),
        provider.getClinicProfile(tenantId).catch(() => null),
        provider.getClinicExperience(tenantId).catch(() => null),
      ]);

      if (!active) {
        return;
      }

      const nextTenant = resolvedTenant;
      const shouldLoadClinicContext =
        resolveActiveVertical(nextTenant?.settings) === 'clinic' ||
        resolvedProfile !== null ||
        nextExperience !== null;

      let nextModules: ClinicModuleEntitlement[] = nextExperience?.modules ?? [];
      let nextChannels: ClinicChannel[] = [];

      if (shouldLoadClinicContext) {
        const [loadedModules, loadedChannels] = await Promise.all([
          nextModules.length > 0
            ? Promise.resolve(nextModules)
            : provider.listClinicModules(tenantId).catch(() => []),
          provider.listClinicChannels(tenantId).catch(() => []),
        ]);
        nextModules = loadedModules;
        nextChannels = loadedChannels;

        if (!active) {
          return;
        }
      }

      setTenant(nextTenant);
      setProfile(resolvedProfile);
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
  const isClinicTenant =
    resolvedExperience?.isClinicTenant ??
    (resolveActiveVertical(tenant?.settings) === 'clinic' || profile !== null);
  const isPlatformRoute = pathname ? isPlatformPath(pathname, tenantId) : false;
  const capabilities = React.useMemo(
    () =>
      isClinicTenant
        ? resolveClinicCapabilities({
            modules,
            channels,
            profile,
            role,
            experience: resolvedExperience,
          })
        : DEFAULT_CAPABILITIES,
    [channels, isClinicTenant, modules, profile, resolvedExperience, role]
  );
  const canAccessInternalPlatform =
    resolvedExperience?.permissions.includes('view_internal_platform') ??
    capabilities.canAccessInternalPlatform;
  const mode: TenantShellMode = isClinicTenant && !isPlatformRoute ? 'clinic' : 'platform_internal';
  const normalizedRole = resolvedExperience?.normalizedRole ?? normalizeMemberRole(role);

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
    allowedNavigation: resolvedExperience?.allowedNavigation ?? [],
    isClinicTenant,
    isPlatformRoute,
    mode,
    canAccessInternalPlatform,
    capabilities,
    hasTenantAccess,
    fallbackTenantId,
    isLoading: !isHydrated || isLoading,
  } satisfies TenantExperienceState;
}

export function getPlatformPath(tenantId: string, path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/app/${tenantId}/platform${normalized}`;
}

export function isPlatformPath(pathname: string, tenantId: string) {
  const base = `/app/${tenantId}`;
  const platformPrefixes = [
    '/platform',
    '/approvals',
    '/marketplace',
    '/installer',
    '/fleet',
    '/runs',
    '/observability',
    '/security',
    '/settings',
  ];

  return platformPrefixes.some((prefix) => pathname.startsWith(`${base}${prefix}`));
}
