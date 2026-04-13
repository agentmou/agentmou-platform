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
  TenantNavigationKey,
  TenantPermission,
  TenantModule,
  TenantPlan,
  TenantSettings,
} from '@agentmou/contracts';
import { normalizeTenantMembershipRole } from '../../lib/tenant-roles.js';

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
    internalPlatformVisible: Boolean(settings.internalPlatformVisible),
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

export function resolveTenantExperience(context: ClinicEntitlementContext): TenantExperience {
  const normalizedRole = normalizeTenantMembershipRole(context.tenantRole);
  const canAccessAdminConsole =
    Boolean(context.settings.isPlatformAdminTenant) &&
    canRoleAccessInternalPlatform(context.tenantRole);

  if (context.settings.activeVertical === 'internal') {
    const permissions: TenantPermission[] = [];
    const allowedNavigation: TenantNavigationKey[] = ['platform_internal'];

    if (canRoleAccessInternalPlatform(context.tenantRole)) {
      permissions.push('view_internal_platform');
    }
    if (canAccessAdminConsole) {
      permissions.push('view_admin_console');
      allowedNavigation.push('admin_console');
    }

    return {
      tenantId: context.tenantId,
      activeVertical: 'internal',
      shellKey: 'platform_internal',
      defaultRoute: `/app/${context.tenantId}/dashboard`,
      role: context.tenantRole,
      normalizedRole,
      permissions,
      allowedNavigation,
      modules: [],
      flags: {
        ...buildBaseFlags(context.settings),
        internalPlatformVisible: canRoleAccessInternalPlatform(context.tenantRole),
      },
      settingsSections: buildInternalSettingsSections(canAccessAdminConsole),
      canAccessInternalPlatform: canRoleAccessInternalPlatform(context.tenantRole),
      canAccessAdminConsole,
    };
  }

  if (context.settings.activeVertical === 'fisio') {
    return {
      tenantId: context.tenantId,
      activeVertical: 'fisio',
      shellKey: 'fisio',
      defaultRoute: `/app/${context.tenantId}/dashboard`,
      role: context.tenantRole,
      normalizedRole,
      permissions: [],
      allowedNavigation: ['dashboard', 'configuration'],
      modules: [],
      flags: buildBaseFlags(context.settings),
      settingsSections: buildFisioSettingsSections(),
      canAccessInternalPlatform: false,
      canAccessAdminConsole: false,
    };
  }

  const modules = resolveClinicModuleEntitlements(context);
  const moduleByKey = Object.fromEntries(
    modules.map((module) => [module.moduleKey, module] as const)
  ) as Record<ModuleKey, ClinicModuleEntitlement>;

  const coreEnabled = moduleByKey.core_reception.enabled;
  const growthEnabled = moduleByKey.growth.enabled;
  const advancedEnabled = moduleByKey.advanced_mode.enabled;
  const canAccessInternalPlatform = false;

  const flags = {
    activeVertical: 'clinic',
    isPlatformAdminTenant: Boolean(context.settings.isPlatformAdminTenant),
    verticalClinicUi: Boolean(context.settings.verticalClinicUi),
    clinicDentalMode: Boolean(context.settings.clinicDentalMode),
    voiceInboundEnabled:
      moduleByKey.voice.enabled && hasEnabledDirection(context.channels, 'voice', 'inbound'),
    voiceOutboundEnabled:
      moduleByKey.voice.enabled && hasEnabledDirection(context.channels, 'voice', 'outbound'),
    whatsappOutboundEnabled:
      coreEnabled && hasEnabledDirection(context.channels, 'whatsapp', 'outbound'),
    intakeFormsEnabled: coreEnabled && Boolean(context.profile?.requiresNewPatientForm),
    appointmentConfirmationsEnabled:
      coreEnabled && context.profile?.confirmationPolicy.enabled !== false,
    smartGapFillEnabled: growthEnabled && context.profile?.gapRecoveryPolicy.enabled !== false,
    reactivationEnabled: growthEnabled && context.profile?.reactivationPolicy.enabled !== false,
    advancedClinicModeEnabled: advancedEnabled,
    internalPlatformVisible: false,
  } satisfies TenantExperience['flags'];

  const permissions = resolveClinicPermissions({
    tenantRole: context.tenantRole,
    canAccessInternalPlatform,
  }) as TenantPermission[];
  const allowedNavigation: TenantNavigationKey[] = [];

  const permissionSet = new Set(permissions);
  if (coreEnabled && permissionSet.has('view_dashboard')) {
    allowedNavigation.push('dashboard');
  }
  if (coreEnabled && permissionSet.has('view_inbox')) {
    allowedNavigation.push('inbox');
  }
  if (coreEnabled && permissionSet.has('view_appointments')) {
    allowedNavigation.push('appointments');
  }
  if (coreEnabled && permissionSet.has('view_patients')) {
    allowedNavigation.push('patients');
  }
  if (coreEnabled && permissionSet.has('view_follow_up')) {
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
    tenantId: context.tenantId,
    activeVertical: 'clinic',
    shellKey: 'clinic',
    defaultRoute: `/app/${context.tenantId}/dashboard`,
    role: context.tenantRole,
    normalizedRole,
    permissions,
    allowedNavigation,
    modules,
    flags,
    settingsSections: buildClinicSettingsSections(flags),
    canAccessInternalPlatform,
    canAccessAdminConsole,
  };
}

export function resolveClinicExperience(context: ClinicEntitlementContext): ClinicExperience {
  return toClinicExperience(resolveTenantExperience(context));
}

export function findClinicModuleEntitlement(
  modules: ClinicModuleEntitlement[],
  moduleKey: ModuleKey
) {
  return modules.find((module) => module.moduleKey === moduleKey) ?? null;
}
