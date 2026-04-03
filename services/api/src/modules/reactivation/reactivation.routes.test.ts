import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';
import { ClinicFeatureUnavailableRouteError } from '../clinic-shared/clinic.errors.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listCampaigns: vi.fn(),
    getCampaign: vi.fn(),
    createCampaign: vi.fn(),
    startCampaign: vi.fn(),
    pauseCampaign: vi.fn(),
    resumeCampaign: vi.fn(),
    listRecipients: vi.fn(),
  },
}));

vi.mock('./reactivation.service.js', () => ({
  ReactivationService: vi.fn().mockImplementation(() => mockService),
}));

async function buildReactivationApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      tenantRole?: string;
    };
    clinicRequest.tenantRole = 'viewer';
  });

  const { reactivationRoutes } = await import('./reactivation.routes.js');
  await app.register(reactivationRoutes);
  await app.ready();

  return app;
}

describe('reactivationRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a structured 409 when the growth module is inactive', async () => {
    mockService.listCampaigns.mockRejectedValue(
      new ClinicFeatureUnavailableRouteError({
        reason: 'module_inactive',
        moduleKey: 'growth',
        detail: 'Growth is disabled for this tenant.',
      })
    );

    const app = await buildReactivationApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/reactivation/campaigns',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'Clinic feature unavailable',
      code: 'clinic_feature_unavailable',
      reason: 'module_inactive',
      moduleKey: 'growth',
      detail: 'Growth is disabled for this tenant.',
    });

    await app.close();
  });
});
