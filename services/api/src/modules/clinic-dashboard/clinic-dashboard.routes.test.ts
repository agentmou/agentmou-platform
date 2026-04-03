import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';
import { createDashboard } from '../clinic-shared/clinic-test-fixtures.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    getDashboard: vi.fn(),
  },
}));

vi.mock('./clinic-dashboard.service.js', () => ({
  ClinicDashboardService: vi.fn().mockImplementation(() => mockService),
}));

async function buildClinicDashboardApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      tenantRole?: string;
    };
    clinicRequest.tenantRole = 'viewer';
  });

  const { clinicDashboardRoutes } = await import('./clinic-dashboard.routes.js');
  await app.register(clinicDashboardRoutes);
  await app.ready();

  return app;
}

describe('clinicDashboardRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the clinic dashboard envelope with a validated contract shape', async () => {
    mockService.getDashboard.mockResolvedValue(createDashboard());

    const app = await buildClinicDashboardApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/clinic/dashboard',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      dashboard: {
        tenantId: 'tenant-1',
        kpis: {
          openThreads: 1,
          pendingForms: 1,
        },
      },
    });
    expect(mockService.getDashboard).toHaveBeenCalledWith('tenant-1', 'viewer');

    await app.close();
  });
});
