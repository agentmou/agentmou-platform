import type { ModuleKey, UpdateTenantModuleBody } from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { assertClinicRole } from '../clinic-shared/clinic-access.js';
import {
  findClinicModuleEntitlement,
  resolveClinicExperience,
} from '../clinic-shared/clinic-entitlements.js';
import { ClinicExperienceRepository } from '../clinic-shared/clinic-experience.repository.js';
import { ClinicModulesRepository } from './clinic-modules.repository.js';

export class ClinicModulesService {
  constructor(
    private readonly repository = new ClinicModulesRepository(),
    private readonly experienceRepository = new ClinicExperienceRepository()
  ) {}

  async listModules(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    const context = await this.experienceRepository.loadContext(tenantId);
    if (!context) {
      return [];
    }

    return resolveClinicExperience({
      ...context,
      tenantRole,
    }).modules;
  }

  async updateModule(
    tenantId: string,
    moduleKey: ModuleKey,
    body: UpdateTenantModuleBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'manage');
    const module = await this.repository.updateModule(tenantId, moduleKey, body);

    if (!module) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.module.updated',
      category: 'security',
      details: {
        moduleKey,
        status: module.status,
        visibleToClient: module.visibleToClient,
      },
    });

    const context = await this.experienceRepository.loadContext(tenantId);
    if (!context) {
      return null;
    }

    return findClinicModuleEntitlement(
      resolveClinicExperience({
        ...context,
        tenantRole,
      }).modules,
      moduleKey
    );
  }
}
