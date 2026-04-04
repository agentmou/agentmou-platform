import { assertClinicRole } from '../clinic-shared/clinic-access.js';
import { resolveClinicExperience } from '../clinic-shared/clinic-entitlements.js';
import { ClinicExperienceRepository } from '../clinic-shared/clinic-experience.repository.js';

export class ClinicExperienceService {
  constructor(private readonly repository = new ClinicExperienceRepository()) {}

  async getExperience(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');

    const context = await this.repository.loadContext(tenantId);
    if (!context) {
      return null;
    }

    return resolveClinicExperience({
      ...context,
      tenantRole,
    });
  }
}
