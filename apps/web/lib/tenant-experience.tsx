'use client';

import * as React from 'react';
import type {
  ClinicChannel,
  ClinicProfile,
  Tenant,
  TenantModule,
  TenantSettings,
} from '@agentmou/contracts';
import { usePathname } from 'next/navigation';

import type { DataProvider } from '@/lib/data/provider';
import { useAuthStore } from '@/lib/auth/store';

export type TenantShellMode = 'clinic' | 'platform';

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
  profile: ClinicProfile | null;
  modules: TenantModule[];
  channels: ClinicChannel[];
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

export function isClinicUiEnabled(settings?: Partial<TenantSettings> | null) {
  return Boolean(settings?.verticalClinicUi);
}

export function isClinicDentalMode(settings?: Partial<TenantSettings> | null) {
  return Boolean(settings?.clinicDentalMode);
}

function isModuleEnabled(modules: TenantModule[], moduleKey: TenantModule['moduleKey']) {
  return modules.some(
    (module) =>
      module.moduleKey === moduleKey &&
      (module.status === 'enabled' || module.status === 'beta')
  );
}

function hasActiveChannel(channels: ClinicChannel[], channelType: ClinicChannel['channelType']) {
  return channels.some((channel) => channel.channelType === channelType && channel.status === 'active');
}

export function resolveClinicCapabilities(params: {
  modules: TenantModule[];
  channels: ClinicChannel[];
  profile: ClinicProfile | null;
  role?: string;
}): ClinicUiCapabilities {
  const { modules, channels, profile, role } = params;
  const normalizedRole = normalizeMemberRole(role);
  const coreReceptionEnabled = isModuleEnabled(modules, 'core_reception');
  const voiceEnabled = isModuleEnabled(modules, 'voice');
  const growthEnabled = isModuleEnabled(modules, 'growth');
  const internalPlatformEnabled = isModuleEnabled(modules, 'internal_platform');
  const whatsappAvailable = hasActiveChannel(channels, 'whatsapp');
  const voiceChannelAvailable = hasActiveChannel(channels, 'voice');
  const formsEnabled = coreReceptionEnabled && Boolean(profile?.requiresNewPatientForm);
  const confirmationsEnabled =
    coreReceptionEnabled && profile?.confirmationPolicy.enabled !== false;
  const gapsEnabled = growthEnabled && profile?.gapRecoveryPolicy.enabled !== false;
  const reactivationEnabled = growthEnabled && profile?.reactivationPolicy.enabled !== false;
  const multiLocationEnabled = channels.length > 1;
  const canAccessInternalPlatform =
    internalPlatformEnabled && (normalizedRole === 'owner' || normalizedRole === 'admin');

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

export function useResolvedTenantExperience(tenantId: string, provider: DataProvider) {
  const pathname = usePathname();
  const hydrate = useAuthStore((state) => state.hydrate);
  const authTenants = useAuthStore((state) => state.tenants);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const [tenant, setTenant] = React.useState<Tenant | null>(null);
  const [profile, setProfile] = React.useState<ClinicProfile | null>(null);
  const [modules, setModules] = React.useState<TenantModule[]>([]);
  const [channels, setChannels] = React.useState<ClinicChannel[]>([]);
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

      const [resolvedTenant, resolvedProfile] = await Promise.all([
        provider.getTenant(tenantId).catch(() => null),
        provider.getClinicProfile(tenantId).catch(() => null),
      ]);

      if (!active) {
        return;
      }

      const nextTenant = resolvedTenant;
      const shouldLoadClinicContext =
        isClinicUiEnabled(nextTenant?.settings) || resolvedProfile !== null;

      let nextModules: TenantModule[] = [];
      let nextChannels: ClinicChannel[] = [];

      if (shouldLoadClinicContext) {
        [nextModules, nextChannels] = await Promise.all([
          provider.listClinicModules(tenantId).catch(() => []),
          provider.listClinicChannels(tenantId).catch(() => []),
        ]);

        if (!active) {
          return;
        }
      }

      setTenant(nextTenant);
      setProfile(resolvedProfile);
      setModules(nextModules);
      setChannels(nextChannels);
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
  const isClinicTenant = isClinicUiEnabled(tenant?.settings) || profile !== null;
  const isPlatformRoute = pathname ? isPlatformPath(pathname, tenantId) : false;
  const capabilities = React.useMemo(
    () =>
      isClinicTenant
        ? resolveClinicCapabilities({ modules, channels, profile, role })
        : DEFAULT_CAPABILITIES,
    [channels, isClinicTenant, modules, profile, role]
  );
  const canAccessInternalPlatform = capabilities.canAccessInternalPlatform;
  const mode: TenantShellMode =
    isClinicTenant && !isPlatformRoute ? 'clinic' : 'platform';

  return {
    tenantId,
    tenant,
    role,
    profile,
    modules,
    channels,
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
