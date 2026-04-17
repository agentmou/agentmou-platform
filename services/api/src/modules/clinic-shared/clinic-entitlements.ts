/**
 * Entitlement & experience composition.
 *
 * Responsibilities:
 *   - Plan baseline per `TenantPlan` → module enablement.
 *   - Module overrides persisted in `tenant_modules`.
 *   - Role-based permissions and allowed navigation.
 *   - Composition of `TenantExperience` by vertical branch.
 *
 * What lives elsewhere:
 *   - Vertical identity (`active` / `enabled`): `./vertical-resolver.ts`.
 *   - Reflag rollouts: `../feature-flags/*`.
 *
 * TODO (follow-up PR): consider renaming this file to `entitlement-resolver.ts`
 * once the clinic-domain imports are migrated. The `clinic-entitlements` name
 * is kept for now to minimize the blast radius of this change.
 */
import type {
  ChannelType,
  ClinicChannel,
  ClinicExperience,
  ClinicModuleEntitlement,
  ClinicNavigationKey,
  ClinicPermission,
  ClinicProfile,
  ModuleKey,
  ModuleStatus,
  TenantExperience,
  TenantFeatureDecision,
  TenantFeatureDecisions,
  TenantNavigationKey,
  TenantPermission,
  TenantModule,
  TenantPlan,
  TenantSettings,
  TenantVerticalConfig,
} from '@agentmou/contracts';
import { normalizeTenantMembershipRole } from '../../lib/tenant-roles.js';
import {
  FeatureFlagService,
  type ResolvedProductFeatureDecisions,
} from '../feature-flags/feature-flag.service.js';
import { resolveTenantVerticalConfig } from './vertical-resolver.js';

const ACTIVE_MODULE_STATUSES = new Set<ModuleStatus>(['enabled', 'beta']);
const MANAGE_SETTINGS_ROLES = new Set(['owner', 'admin']);
const INTERNAL_PLATFORM_ROLES = new Set(['owner', 'admin']);
const CLINIC_PERMISSION_SET = new Set<ClinicPermission>([
  'view_dashboard',
  'view_inbox',
  'manage_inbox',
  'view_appointments',
  'manage_appointments',
  'view_patients',
  'manage_patients',
  'view_follow_up',
  'manage_follow_up',
  'view_reactivation',
  'manage_reactivation',
  'view_reports',
  'manage_clinic_settings',
  'view_internal_platform',
]);
const CLINIC_NAVIGATION_SET = new Set<ClinicNavigationKey>([
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
  'platform_internal',
]);
const featureFlagService = new FeatureFlagService();

type ModuleBaseline = {
  status: ModuleStatus;
  visibleToClient: boolean;
};

export interface ClinicEntitlementContext {
  tenantId: string;
  plan: TenantPlan;
  settings: TenantSettings;
  profile: ClinicProfile | null;
  modules: TenantModule[];
  channels: ClinicChannel[];
  tenantRole?: string;
}

const MODULE_MIN_PLAN: Record<ModuleKey, TenantPlan> = {
  core_reception: 'free',
  voice: 'pro',
  growth: 'scale',
  advanced_mode: 'enterprise',
  internal_platform: 'enterprise',
};

const MODULE_METADATA: Record<
  ModuleKey,
  {
    displayName: string;
    description: string;
  }
> = {
  core_reception: {
    displayName: 'Core Reception',
    description: 'Resumen, bandeja, agenda, pacientes y configuracion operativa.',
  },
  voice: {
    displayName: 'Voice',
    description: 'Llamadas, callbacks y operativa telefonica.',
  },
  growth: {
    displayName: 'Growth',
    description: 'Huecos, reactivacion y continuidad de pacientes.',
  },
  advanced_mode: {
    displayName: 'Advanced Mode',
    description: 'Filtros expertos, configuraciones avanzadas y vistas beta.',
  },
  internal_platform: {
    displayName: 'Internal Platform',
    description: 'Marketplace, runs, approvals y operaciones internas de Agentmou.',
  },
};

const PLAN_BASELINES: Record<TenantPlan, Record<ModuleKey, ModuleBaseline>> = {
  free: {
    core_reception: { status: 'enabled', visibleToClient: true },
    voice: { status: 'disabled', visibleToClient: false },
    growth: { status: 'disabled', visibleToClient: false },
    advanced_mode: { status: 'disabled', visibleToClient: false },
    internal_platform: { status: 'hidden', visibleToClient: false },
  },
  starter: {
    core_reception: { status: 'enabled', visibleToClient: true },
    voice: { status: 'disabled', visibleToClient: false },
    growth: { status: 'disabled', visibleToClient: false },
    advanced_mode: { status: 'disabled', visibleToClient: false },
    internal_platform: { status: 'hidden', visibleToClient: false },
  },
  pro: {
    core_reception: { status: 'enabled', visibleToClient: true },
    voice: { status: 'enabled', visibleToClient: true },
    growth: { status: 'disabled', visibleToClient: false },
    advanced_mode: { status: 'disabled', visibleToClient: false },
    internal_platform: { status: 'hidden', visibleToClient: false },
  },
  scale: {
    core_reception: { status: 'enabled', visibleToClient: true },
    voice: { status: 'enabled', visibleToClient: true },
    growth: { status: 'enabled', visibleToClient: true },
    advanced_mode: { status: 'beta', visibleToClient: true },
    internal_platform: { status: 'hidden', visibleToClient: false },
  },
  enterprise: {
    core_reception: { status: 'enabled', visibleToClient: true },
    voice: { status: 'enabled', visibleToClient: true },
    growth: { status: 'enabled', visibleToClient: true },
    advanced_mode: { status: 'enabled', visibleToClient: true },
    internal_platform: { status: 'hidden', visibleToClient: false },
  },
};

function hasConfiguredChannel(channels: ClinicChannel[], channelType: ChannelType) {
  return channels.some((channel) => channel.channelType === channelType);
}

function hasEnabledDirection(
  channels: ClinicChannel[],
  channelType: ChannelType,
  direction: 'inbound' | 'outbound'
) {
  return channels.some((channel) => {
    if (channel.channelType !== channelType || channel.status !== 'active') {
      return false;
    }

    const policyKey = direction === 'inbound' ? 'inboundEnabled' : 'outboundEnabled';
    return channel.directionPolicy?.[policyKey] !== false;
  });
}

function getModuleSourceModule(modules: TenantModule[], moduleKey: ModuleKey) {
  return modules.find((module) => module.moduleKey === moduleKey) ?? null;
}

function requiresModuleConfiguration(params: {
  moduleKey: ModuleKey;
  enabled: boolean;
  channels: ClinicChannel[];
}): boolean {
  if (!params.enabled) {
    return false;
  }

  if (params.moduleKey === 'voice') {
    return !hasConfiguredChannel(params.channels, 'voice');
  }

  if (params.moduleKey === 'growth') {
    return (
      !hasEnabledDirection(params.channels, 'whatsapp', 'outbound') &&
      !hasEnabledDirection(params.channels, 'voice', 'outbound')
    );
  }

  return false;
}

export function resolveClinicModuleEntitlements(
  context: Omit<ClinicEntitlementContext, 'tenantRole'>
): ClinicModuleEntitlement[] {
  const baseline = PLAN_BASELINES[context.plan];

  return (Object.keys(MODULE_METADATA) as ModuleKey[]).map((moduleKey) => {
    const persisted = getModuleSourceModule(context.modules, moduleKey);
    const baselineModule = baseline[moduleKey];
    const status = persisted?.status ?? baselineModule.status;
    const visibleToClient = persisted?.visibleToClient ?? baselineModule.visibleToClient;
    const enabled = ACTIVE_MODULE_STATUSES.has(status);
    const beta = status === 'beta';
    const requiresConfig = requiresModuleConfiguration({
      moduleKey,
      enabled,
      channels: context.channels,
    });

    let visibilityReason: ClinicModuleEntitlement['visibilityReason'] = 'active';
    if (moduleKey === 'internal_platform') {
      visibilityReason = 'hidden_internal_only';
    } else if (!baselineModule.visibleToClient && !persisted) {
      visibilityReason = 'not_in_plan';
    } else if (!enabled || !visibleToClient || status === 'hidden') {
      visibilityReason =
        baselineModule.visibleToClient || Boolean(persisted) ? 'disabled_by_tenant' : 'not_in_plan';
    } else if (requiresConfig) {
      visibilityReason = 'requires_configuration';
    }

    const visibilityState =
      visibilityReason === 'active'
        ? 'visible'
        : visibilityReason === 'hidden_internal_only'
          ? 'internal_only'
          : visibilityReason === 'requires_configuration'
            ? 'requires_configuration'
            : 'hidden';

    return {
      id: persisted?.id ?? `baseline-${context.tenantId}-${moduleKey}`,
      tenantId: context.tenantId,
      moduleKey,
      status,
      visibleToClient,
      planLevel: persisted?.planLevel ?? MODULE_MIN_PLAN[moduleKey],
      config: persisted?.config ?? {},
      createdAt: persisted?.createdAt ?? new Date(0).toISOString(),
      updatedAt: persisted?.updatedAt ?? new Date(0).toISOString(),
      enabled,
      beta,
      displayName: MODULE_METADATA[moduleKey].displayName,
      description: MODULE_METADATA[moduleKey].description,
      requiresConfig,
      visibilityState,
      visibilityReason,
    } satisfies ClinicModuleEntitlement;
  });
}

export function resolveClinicPermissions(params: {
  tenantRole?: string;
  canAccessInternalPlatform: boolean;
}): ClinicPermission[] {
  const normalizedRole = normalizeTenantMembershipRole(params.tenantRole);

  if (!normalizedRole) {
    return [];
  }

  if (normalizedRole === 'viewer') {
    return [
      'view_dashboard',
      'view_inbox',
      'view_appointments',
      'view_patients',
      'view_follow_up',
      'view_reactivation',
      'view_reports',
    ];
  }

  if (normalizedRole === 'operator') {
    return [
      'view_dashboard',
      'view_inbox',
      'manage_inbox',
      'view_appointments',
      'manage_appointments',
      'view_patients',
      'manage_patients',
      'view_follow_up',
      'manage_follow_up',
      'view_reactivation',
      'manage_reactivation',
      'view_reports',
    ];
  }

  const permissions: ClinicPermission[] = [
    'view_dashboard',
    'view_inbox',
    'manage_inbox',
    'view_appointments',
    'manage_appointments',
    'view_patients',
    'manage_patients',
    'view_follow_up',
    'manage_follow_up',
    'view_reactivation',
    'manage_reactivation',
    'view_reports',
    'manage_clinic_settings',
  ];

  if (params.canAccessInternalPlatform) {
    permissions.push('view_internal_platform');
  }

  return permissions;
}

function canRoleManageSettings(role?: string) {
  return MANAGE_SETTINGS_ROLES.has(normalizeTenantMembershipRole(role) ?? '');
}

function canRoleAccessInternalPlatform(role?: string) {
  return INTERNAL_PLATFORM_ROLES.has(normalizeTenantMembershipRole(role) ?? '');
}

function buildBaseFlags(settings: TenantSettings): TenantExperience['flags'] {
  return {
    activeVertical: settings.activeVertical,
    isPlatformAdminTenant: Boolean(settings.isPlatformAdminTenant),
    adminConsoleEnabled: false,
    verticalClinicUi: Boolean(settings.verticalClinicUi),
    clinicDentalMode: Boolean(settings.clinicDentalMode),
    voiceInboundEnabled: false,
    voiceOutboundEnabled: false,
    whatsappOutboundEnabled: false,
    intakeFormsEnabled: false,
    appointmentConfirmationsEnabled: false,
    smartGapFillEnabled: false,
    reactivationEnabled: false,
    advancedClinicModeEnabled: false,
    internalPlatformVisible: false,
  };
}

function buildInternalAccessDecision(params: {
  enabled: boolean;
  reason?: TenantFeatureDecision['reason'];
  moduleKey?: ModuleKey;
  detail?: string;
}): TenantFeatureDecision {
  return {
    enabled: params.enabled,
    source: 'internal_access',
    reason: params.reason,
    moduleKey: params.moduleKey,
    detail: params.detail,
  };
}

function buildInternalAccessDecisions(params: {
  activeVertical: TenantExperience['activeVertical'];
  isPlatformAdminTenant: boolean;
  tenantRole?: string;
}): Pick<TenantFeatureDecisions, 'internalPlatformVisible' | 'adminConsoleEnabled'> {
  if (params.activeVertical !== 'internal') {
    return {
      internalPlatformVisible: buildInternalAccessDecision({
        enabled: false,
        reason: 'hidden_internal_only',
        moduleKey: 'internal_platform',
        detail: 'Solo visible en workspaces internos.',
      }),
      adminConsoleEnabled: buildInternalAccessDecision({
        enabled: false,
        reason: 'hidden_internal_only',
        detail: 'La consola de admin solo existe en workspaces internos.',
      }),
    };
  }

  if (!canRoleAccessInternalPlatform(params.tenantRole)) {
    return {
      internalPlatformVisible: buildInternalAccessDecision({
        enabled: false,
        reason: 'insufficient_role',
        moduleKey: 'internal_platform',
        detail: 'Hace falta un rol owner o admin para ver la plataforma interna.',
      }),
      adminConsoleEnabled: buildInternalAccessDecision({
        enabled: false,
        reason: 'insufficient_role',
        detail: 'Hace falta un rol owner o admin para abrir la consola de admin.',
      }),
    };
  }

  return {
    internalPlatformVisible: buildInternalAccessDecision({
      enabled: true,
      moduleKey: 'internal_platform',
      detail: 'Acceso resuelto por workspace interno y rol operativo.',
    }),
    adminConsoleEnabled: params.isPlatformAdminTenant
      ? buildInternalAccessDecision({
          enabled: true,
          detail: 'Acceso resuelto por workspace admin interno y rol operativo.',
        })
      : buildInternalAccessDecision({
          enabled: false,
          reason: 'not_admin_tenant',
          detail: 'Este workspace interno no tiene visibilidad de consola global.',
        }),
  };
}

function combineFeatureDecisions(params: {
  productDecisions: ResolvedProductFeatureDecisions;
  internalDecisions: Pick<
    TenantFeatureDecisions,
    'internalPlatformVisible' | 'adminConsoleEnabled'
  >;
}): TenantFeatureDecisions {
  return {
    ...params.productDecisions,
    internalPlatformVisible: params.internalDecisions.internalPlatformVisible,
    adminConsoleEnabled: params.internalDecisions.adminConsoleEnabled,
  };
}

function buildClinicSettingsSections(
  flags: Pick<
    TenantExperience['flags'],
    | 'intakeFormsEnabled'
    | 'appointmentConfirmationsEnabled'
    | 'smartGapFillEnabled'
    | 'reactivationEnabled'
  >
) {
  const sections: TenantExperience['settingsSections'] = [
    'general',
    'team',
    'integrations',
    'plan',
    'security',
    'care_profile',
    'care_schedule',
    'care_services',
  ];
  if (flags.intakeFormsEnabled) {
    sections.push('care_forms');
  }
  if (flags.appointmentConfirmationsEnabled) {
    sections.push('care_confirmations');
  }
  if (flags.smartGapFillEnabled) {
    sections.push('care_gap_recovery');
  }
  if (flags.reactivationEnabled) {
    sections.push('care_reactivation');
  }
  return sections;
}

function buildInternalSettingsSections(canAccessAdminConsole: boolean) {
  const sections: TenantExperience['settingsSections'] = [
    'general',
    'team',
    'integrations',
    'plan',
    'security',
    'internal_defaults',
  ];
  if (canAccessAdminConsole) {
    sections.push('internal_approvals');
  }
  return sections;
}

function buildFisioSettingsSections() {
  const sections: TenantExperience['settingsSections'] = [
    'general',
    'team',
    'integrations',
    'plan',
    'security',
    'care_profile',
    'care_schedule',
  ];
  return sections;
}

function toClinicExperience(experience: TenantExperience): ClinicExperience {
  const permissions = experience.permissions.filter((permission): permission is ClinicPermission =>
    CLINIC_PERMISSION_SET.has(permission as ClinicPermission)
  );
  const allowedNavigation = experience.allowedNavigation.filter((key): key is ClinicNavigationKey =>
    CLINIC_NAVIGATION_SET.has(key as ClinicNavigationKey)
  );

  return {
    tenantId: experience.tenantId,
    isClinicTenant: experience.activeVertical === 'clinic',
    defaultMode: experience.shellKey === 'platform_internal' ? 'platform_internal' : 'clinic',
    role: experience.role,
    normalizedRole: experience.normalizedRole,
    isInternalUser: experience.canAccessInternalPlatform,
    permissions,
    flags: {
      verticalClinicUi: experience.flags.verticalClinicUi,
      clinicDentalMode: experience.flags.clinicDentalMode,
      voiceInboundEnabled: experience.flags.voiceInboundEnabled,
      voiceOutboundEnabled: experience.flags.voiceOutboundEnabled,
      whatsappOutboundEnabled: experience.flags.whatsappOutboundEnabled,
      intakeFormsEnabled: experience.flags.intakeFormsEnabled,
      appointmentConfirmationsEnabled: experience.flags.appointmentConfirmationsEnabled,
      smartGapFillEnabled: experience.flags.smartGapFillEnabled,
      reactivationEnabled: experience.flags.reactivationEnabled,
      advancedClinicModeEnabled: experience.flags.advancedClinicModeEnabled,
      internalPlatformVisible: experience.flags.internalPlatformVisible,
    },
    modules: experience.modules,
    allowedNavigation,
  };
}

export async function resolveTenantExperienceWithDecisions(
  context: ClinicEntitlementContext
): Promise<{
  experience: TenantExperience;
  decisions: TenantFeatureDecisions;
}> {
  const normalizedRole = normalizeTenantMembershipRole(context.tenantRole);
  const verticalConfig: TenantVerticalConfig = resolveTenantVerticalConfig({
    settings: context.settings,
  });

  if (context.settings.activeVertical === 'internal') {
    const flagResolution = await featureFlagService.resolve({
      tenantId: context.tenantId,
      activeVertical: 'internal',
      isPlatformAdminTenant: Boolean(context.settings.isPlatformAdminTenant),
      plan: context.plan,
      modules: [],
      channels: [],
      profile: null,
    });
    const internalDecisions = buildInternalAccessDecisions({
      activeVertical: 'internal',
      isPlatformAdminTenant: Boolean(context.settings.isPlatformAdminTenant),
      tenantRole: context.tenantRole,
    });
    const decisions = combineFeatureDecisions({
      productDecisions: flagResolution.decisions,
      internalDecisions,
    });
    const canAccessInternalPlatform = decisions.internalPlatformVisible.enabled;
    const canAccessAdminConsole = decisions.adminConsoleEnabled.enabled;
    const permissions: TenantPermission[] = [];
    const allowedNavigation: TenantNavigationKey[] = [];

    if (canAccessInternalPlatform) {
      permissions.push('view_internal_platform');
      allowedNavigation.push('platform_internal');
    }
    if (canAccessAdminConsole) {
      permissions.push('view_admin_console');
      allowedNavigation.push('admin_console');
    }

    return {
      experience: {
        tenantId: context.tenantId,
        activeVertical: 'internal',
        verticalConfig,
        shellKey: 'platform_internal',
        defaultRoute: `/app/${context.tenantId}/dashboard`,
        role: context.tenantRole,
        normalizedRole,
        permissions,
        allowedNavigation,
        modules: [],
        flags: {
          ...buildBaseFlags(context.settings),
          ...flagResolution.flags,
          internalPlatformVisible: decisions.internalPlatformVisible.enabled,
          adminConsoleEnabled: decisions.adminConsoleEnabled.enabled,
        },
        featureDecisions: decisions,
        settingsSections: buildInternalSettingsSections(canAccessAdminConsole),
        canAccessInternalPlatform,
        canAccessAdminConsole,
      },
      decisions,
    };
  }

  if (context.settings.activeVertical === 'fisio') {
    const flagResolution = await featureFlagService.resolve({
      tenantId: context.tenantId,
      activeVertical: 'fisio',
      isPlatformAdminTenant: Boolean(context.settings.isPlatformAdminTenant),
      plan: context.plan,
      modules: [],
      channels: context.channels,
      profile: context.profile,
    });
    const internalDecisions = buildInternalAccessDecisions({
      activeVertical: 'fisio',
      isPlatformAdminTenant: Boolean(context.settings.isPlatformAdminTenant),
      tenantRole: context.tenantRole,
    });
    const decisions = combineFeatureDecisions({
      productDecisions: flagResolution.decisions,
      internalDecisions,
    });

    return {
      experience: {
        tenantId: context.tenantId,
        activeVertical: 'fisio',
        verticalConfig,
        shellKey: 'fisio',
        defaultRoute: `/app/${context.tenantId}/dashboard`,
        role: context.tenantRole,
        normalizedRole,
        permissions: [],
        allowedNavigation: ['dashboard', 'configuration'],
        modules: [],
        flags: {
          ...buildBaseFlags(context.settings),
          ...flagResolution.flags,
          internalPlatformVisible: decisions.internalPlatformVisible.enabled,
          adminConsoleEnabled: decisions.adminConsoleEnabled.enabled,
        },
        featureDecisions: decisions,
        settingsSections: buildFisioSettingsSections(),
        canAccessInternalPlatform: decisions.internalPlatformVisible.enabled,
        canAccessAdminConsole: decisions.adminConsoleEnabled.enabled,
      },
      decisions,
    };
  }

  const modules = resolveClinicModuleEntitlements(context);
  const moduleByKey = Object.fromEntries(
    modules.map((module) => [module.moduleKey, module] as const)
  ) as Record<ModuleKey, ClinicModuleEntitlement>;
  const flagResolution = await featureFlagService.resolve({
    tenantId: context.tenantId,
    activeVertical: 'clinic',
    isPlatformAdminTenant: Boolean(context.settings.isPlatformAdminTenant),
    plan: context.plan,
    modules,
    channels: context.channels,
    profile: context.profile,
  });
  const internalDecisions = buildInternalAccessDecisions({
    activeVertical: 'clinic',
    isPlatformAdminTenant: Boolean(context.settings.isPlatformAdminTenant),
    tenantRole: context.tenantRole,
  });
  const decisions = combineFeatureDecisions({
    productDecisions: flagResolution.decisions,
    internalDecisions,
  });
  const canAccessInternalPlatform = decisions.internalPlatformVisible.enabled;
  const canAccessAdminConsole = decisions.adminConsoleEnabled.enabled;
  const flags = {
    ...buildBaseFlags(context.settings),
    ...flagResolution.flags,
    internalPlatformVisible: decisions.internalPlatformVisible.enabled,
    adminConsoleEnabled: decisions.adminConsoleEnabled.enabled,
  } satisfies TenantExperience['flags'];

  const permissions = resolveClinicPermissions({
    tenantRole: context.tenantRole,
    canAccessInternalPlatform,
  }) as TenantPermission[];
  const allowedNavigation: TenantNavigationKey[] = [];

  const permissionSet = new Set(permissions);
  if (moduleByKey.core_reception.enabled && permissionSet.has('view_dashboard')) {
    allowedNavigation.push('dashboard');
  }
  if (moduleByKey.core_reception.enabled && permissionSet.has('view_inbox')) {
    allowedNavigation.push('inbox');
  }
  if (moduleByKey.core_reception.enabled && permissionSet.has('view_appointments')) {
    allowedNavigation.push('appointments');
  }
  if (moduleByKey.core_reception.enabled && permissionSet.has('view_patients')) {
    allowedNavigation.push('patients');
  }
  if (moduleByKey.core_reception.enabled && permissionSet.has('view_follow_up')) {
    allowedNavigation.push('follow_up');
  }
  if (flags.intakeFormsEnabled && permissionSet.has('view_follow_up')) {
    allowedNavigation.push('forms');
  }
  if (flags.appointmentConfirmationsEnabled && permissionSet.has('view_follow_up')) {
    allowedNavigation.push('confirmations');
  }
  if (flags.smartGapFillEnabled && permissionSet.has('view_follow_up')) {
    allowedNavigation.push('gaps');
  }
  if (flags.reactivationEnabled && permissionSet.has('view_reactivation')) {
    allowedNavigation.push('reactivation');
  }
  if (permissionSet.has('view_reports')) {
    allowedNavigation.push('reports');
  }
  if (canRoleManageSettings(context.tenantRole)) {
    allowedNavigation.push('configuration');
  }
  if (permissionSet.has('view_internal_platform')) {
    allowedNavigation.push('platform_internal');
  }
  if (canAccessAdminConsole) {
    allowedNavigation.push('admin_console');
    permissions.push('view_admin_console');
  }

  return {
    experience: {
      tenantId: context.tenantId,
      activeVertical: 'clinic',
      verticalConfig,
      shellKey: 'clinic',
      defaultRoute: `/app/${context.tenantId}/dashboard`,
      role: context.tenantRole,
      normalizedRole,
      permissions,
      allowedNavigation,
      modules,
      flags,
      featureDecisions: decisions,
      settingsSections: buildClinicSettingsSections(flags),
      canAccessInternalPlatform,
      canAccessAdminConsole,
    },
    decisions,
  };
}

export async function resolveTenantExperience(
  context: ClinicEntitlementContext
): Promise<TenantExperience> {
  const result = await resolveTenantExperienceWithDecisions(context);
  return result.experience;
}

export async function resolveClinicExperience(
  context: ClinicEntitlementContext
): Promise<ClinicExperience> {
  return toClinicExperience(await resolveTenantExperience(context));
}

export function findClinicModuleEntitlement(
  modules: ClinicModuleEntitlement[],
  moduleKey: ModuleKey
) {
  return modules.find((module) => module.moduleKey === moduleKey) ?? null;
}
