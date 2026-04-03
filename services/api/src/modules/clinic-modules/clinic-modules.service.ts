import type { ModuleKey, UpdateTenantModuleBody } from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { assertClinicRole } from '../clinic-shared/clinic-access.js';
import { mapTenantModule } from '../clinic-shared/clinic.mapper.js';
import { ClinicModulesRepository } from './clinic-modules.repository.js';

export class ClinicModulesService {
  constructor(private readonly repository = new ClinicModulesRepository()) {}

  async listModules(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    const modules = await this.repository.listModules(tenantId);
    return modules.map(mapTenantModule);
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

    return mapTenantModule(module);
  }
}
