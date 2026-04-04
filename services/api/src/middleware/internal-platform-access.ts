import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ClinicFeatureUnavailableReason } from '@agentmou/contracts';

import { findClinicModuleEntitlement, resolveClinicExperience } from '../modules/clinic-shared/clinic-entitlements.js';
import { ClinicExperienceRepository } from '../modules/clinic-shared/clinic-experience.repository.js';
import { ClinicFeatureUnavailableRouteError } from '../modules/clinic-shared/clinic.errors.js';

function getFeatureUnavailableReason(reason?: string): ClinicFeatureUnavailableReason {
  return !reason || reason === 'active' ? 'not_in_plan' : (reason as ClinicFeatureUnavailableReason);
}

export async function requireInternalPlatformAccess(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { tenantId } = request.params as { tenantId: string };
  const repository = new ClinicExperienceRepository();
  const context = await repository.loadContext(tenantId);

  if (!context) {
    return reply.status(404).send({ error: 'Tenant not found' });
  }

  const experience = resolveClinicExperience({
    ...context,
    tenantRole: request.tenantRole,
  });
  const internalModule = findClinicModuleEntitlement(experience.modules, 'internal_platform');

  if (!internalModule || !internalModule.enabled || !experience.flags.internalPlatformVisible) {
    const reason = getFeatureUnavailableReason(internalModule?.visibilityReason);
    return reply.status(409).send(
      new ClinicFeatureUnavailableRouteError({
        reason,
        moduleKey: 'internal_platform',
        detail: 'Internal platform access is not available for this tenant.',
      }).body
    );
  }

  if (!experience.permissions.includes('view_internal_platform')) {
    return reply.status(403).send({ error: 'Internal platform access is restricted' });
  }
}
