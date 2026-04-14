import {
  type ChannelType,
  type ClinicModuleEntitlement,
  type ClinicPermission,
  type ModuleKey,
  type UserRole,
} from '@agentmou/contracts';
import { db, clinicChannels } from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

import { normalizeTenantMembershipRole } from '../../lib/tenant-roles.js';
import { ClinicFeatureUnavailableRouteError, ClinicForbiddenRouteError } from './clinic.errors.js';
import {
  findClinicModuleEntitlement,
  resolveClinicModuleEntitlements,
  resolveClinicPermissions,
  resolveTenantExperienceWithDecisions,
} from './clinic-entitlements.js';
import { ClinicExperienceRepository } from './clinic-experience.repository.js';

const ACTIVE_MODULE_STATUSES = new Set(['enabled', 'beta']);
const READ_ROLES: UserRole[] = ['owner', 'admin', 'operator', 'viewer'];
const OPERATE_ROLES: UserRole[] = ['owner', 'admin', 'operator'];
const MANAGE_ROLES: UserRole[] = ['owner', 'admin'];
const FEATURE_DECISION_KEY = {
  voice_inbound: 'voiceInboundEnabled',
  voice_outbound: 'voiceOutboundEnabled',
  forms: 'intakeFormsEnabled',
  confirmations: 'appointmentConfirmationsEnabled',
  gaps: 'smartGapFillEnabled',
  reactivation: 'reactivationEnabled',
} as const;

export type ClinicRoleScope = 'read' | 'operate' | 'manage';
export type ClinicFeatureGate =
  | 'voice_inbound'
  | 'voice_outbound'
  | 'forms'
  | 'confirmations'
  | 'gaps'
  | 'reactivation';

export function normalizeClinicRole(role: string | undefined): UserRole | undefined {
  return normalizeTenantMembershipRole(role);
}

export function assertClinicRole(role: string | undefined, scope: ClinicRoleScope) {
  const normalizedRole = normalizeClinicRole(role);
  const allowedRoles =
    scope === 'manage' ? MANAGE_ROLES : scope === 'operate' ? OPERATE_ROLES : READ_ROLES;

  if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
    throw new ClinicForbiddenRouteError('Insufficient tenant permissions for clinic API');
  }
}

export function getClinicListLimit(limit?: number) {
  return Math.min(limit ?? 50, 100);
}

export function getFeatureModuleForChannel(channelType: ChannelType): ModuleKey {
  return channelType === 'voice' ? 'voice' : 'core_reception';
}

function getFeatureUnavailableReason(reason?: ClinicModuleEntitlement['visibilityReason']) {
  return !reason || reason === 'active' ? 'not_in_plan' : reason;
}

export async function assertClinicModuleAvailable(tenantId: string, moduleKey: ModuleKey) {
  const repository = new ClinicExperienceRepository();
  const context = await repository.loadContext(tenantId);

  if (!context) {
    throw new ClinicFeatureUnavailableRouteError({
      reason: 'not_in_plan',
      moduleKey,
      detail: `Module "${moduleKey}" is not available for this tenant.`,
    });
  }

  const module = findClinicModuleEntitlement(resolveClinicModuleEntitlements(context), moduleKey);

  if (
    !module ||
    !ACTIVE_MODULE_STATUSES.has(module.status) ||
    module.visibilityReason !== 'active'
  ) {
    throw new ClinicFeatureUnavailableRouteError({
      reason: getFeatureUnavailableReason(module?.visibilityReason),
      moduleKey,
      detail: `Module "${moduleKey}" is not active for this tenant.`,
    });
  }

  return module;
}

export async function assertClinicFeatureAvailable(
  tenantId: string,
  featureKey: ClinicFeatureGate,
  tenantRole?: string
) {
  const repository = new ClinicExperienceRepository();
  const context = await repository.loadContext(tenantId);

  if (!context) {
    throw new ClinicFeatureUnavailableRouteError({
      reason: 'not_in_plan',
      detail: `Feature "${featureKey}" is not available for this tenant.`,
    });
  }

  const { decisions } = await resolveTenantExperienceWithDecisions({
    ...context,
    tenantRole,
  });
  const decision = decisions[FEATURE_DECISION_KEY[featureKey]];

  if (!decision.enabled) {
    throw new ClinicFeatureUnavailableRouteError({
      reason: decision.reason ?? 'not_in_plan',
      moduleKey: decision.moduleKey,
      channelType: decision.channelType,
      detail: `Feature "${featureKey}" is not available for this tenant.`,
    });
  }

  return decision;
}

export async function assertClinicChannelAvailable(tenantId: string, channelType: ChannelType) {
  const channels = await db
    .select()
    .from(clinicChannels)
    .where(and(eq(clinicChannels.tenantId, tenantId), eq(clinicChannels.channelType, channelType)));

  if (channels.length === 0) {
    throw new ClinicFeatureUnavailableRouteError({
      reason: 'channel_missing',
      moduleKey: getFeatureModuleForChannel(channelType),
      channelType,
      detail: `No ${channelType} channel has been configured for this tenant.`,
    });
  }

  const activeChannel =
    channels.find((channel) => channel.status === 'active') ??
    [...channels].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];

  if (!activeChannel || activeChannel.status !== 'active') {
    throw new ClinicFeatureUnavailableRouteError({
      reason: 'channel_inactive',
      moduleKey: getFeatureModuleForChannel(channelType),
      channelType,
      detail: `The ${channelType} channel is not active for this tenant.`,
    });
  }

  return activeChannel;
}

export function assertClinicPermission(
  permission: ClinicPermission,
  params: {
    tenantRole?: string;
    canAccessInternalPlatform?: boolean;
  }
) {
  const permissions = resolveClinicPermissions({
    tenantRole: params.tenantRole,
    canAccessInternalPlatform: Boolean(params.canAccessInternalPlatform),
  });

  if (!permissions.includes(permission)) {
    throw new ClinicForbiddenRouteError('Insufficient tenant permissions for clinic API');
  }
}
