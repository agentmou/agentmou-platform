import { ClinicDashboardResponseSchema } from '@agentmou/contracts';

import { assertClinicModuleAvailable, assertClinicRole } from '../clinic-shared/clinic-access.js';
import {
  mapConfirmationRequest,
  mapIntakeFormSubmission,
  mapReactivationCampaign,
} from '../clinic-shared/clinic.mapper.js';
import { ClinicDashboardRepository } from './clinic-dashboard.repository.js';

export class ClinicDashboardService {
  constructor(private readonly repository = new ClinicDashboardRepository()) {}

  async getDashboard(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');

    const dashboard = await this.repository.getDashboard(tenantId);

    return ClinicDashboardResponseSchema.parse({
      dashboard: {
        ...dashboard,
        pendingForms: dashboard.pendingForms.map(mapIntakeFormSubmission),
        pendingConfirmations: dashboard.pendingConfirmations.map(mapConfirmationRequest),
        activeCampaigns: dashboard.activeCampaigns.map(mapReactivationCampaign),
      },
    }).dashboard;
  }
}
