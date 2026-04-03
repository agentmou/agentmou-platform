import {
  type ChannelType,
  type ModuleKey,
  type UserRole,
} from '@agentmou/contracts';
import { db, clinicChannels, tenantModules } from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

import {
  ClinicFeatureUnavailableRouteError,
  ClinicForbiddenRouteError,
} from './clinic.errors.js';

const ACTIVE_MODULE_STATUSES = new Set(['enabled', 'beta']);
const READ_ROLES: UserRole[] = ['owner', 'admin', 'operator', 'viewer'];
const OPERATE_ROLES: UserRole[] = ['owner', 'admin', 'operator'];
const MANAGE_ROLES: UserRole[] = ['owner', 'admin'];

export type ClinicRoleScope = 'read' | 'operate' | 'manage';

export function normalizeClinicRole(role: string | undefined): UserRole | undefined {
  if (!role) {
    return undefined;
  }

  return (role === 'member' ? 'operator' : role) as UserRole;
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

export async function assertClinicModuleAvailable(tenantId: string, moduleKey: ModuleKey) {
  const [module] = await db
    .select()
    .from(tenantModules)
    .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, moduleKey)))
    .limit(1);

  if (!module || !ACTIVE_MODULE_STATUSES.has(module.status) || !module.visibleToClient) {
    throw new ClinicFeatureUnavailableRouteError({
      reason: 'module_inactive',
      moduleKey,
      detail: `Module "${moduleKey}" is not active for this tenant.`,
    });
  }

  return module;
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
