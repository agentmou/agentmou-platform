import type { UpdateClinicProfileBody } from '@agentmou/contracts';

import { assertClinicRole } from '../clinic-shared/clinic-access.js';
import { mapClinicProfile } from '../clinic-shared/clinic.mapper.js';
import { ClinicProfileRepository } from './clinic-profile.repository.js';

export class ClinicProfileService {
  constructor(private readonly repository = new ClinicProfileRepository()) {}

  async getProfile(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    const profile = await this.repository.getProfile(tenantId);
    return profile ? mapClinicProfile(profile) : null;
  }

  async updateProfile(tenantId: string, body: UpdateClinicProfileBody, tenantRole?: string) {
    assertClinicRole(tenantRole, 'manage');
    const profile = await this.repository.updateProfile(tenantId, body);
    return profile ? mapClinicProfile(profile) : null;
  }
}
