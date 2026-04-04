import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listModules: vi.fn(),
    updateModule: vi.fn(),
  },
}));

vi.mock('./clinic-modules.service.js', () => ({
  ClinicModulesService: vi.fn().mockImplementation(() => mockService),
}));

async function buildClinicModulesApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      tenantRole?: string;
      userId?: string;
    };
    clinicRequest.tenantRole = 'admin';
    clinicRequest.userId = 'user-1';
  });

  const { clinicModulesRoutes } = await import('./clinic-modules.routes.js');
  await app.register(clinicModulesRoutes);
  await app.ready();

  return app;
}

describe('clinicModulesRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns enriched module metadata for the clinic shell', async () => {
    mockService.listModules.mockResolvedValue([
      {
        id: 'module-growth',
        tenantId: 'tenant-1',
        moduleKey: 'growth',
        status: 'enabled',
        visibleToClient: true,
        planLevel: 'scale',
        config: {},
        createdAt: '2025-01-15T09:00:00.000Z',
        updatedAt: '2025-01-15T09:00:00.000Z',
        enabled: true,
        beta: false,
        displayName: 'Growth',
        description: 'Huecos y reactivacion.',
        requiresConfig: false,
        visibilityState: 'visible',
        visibilityReason: 'active',
      },
    ]);

    const app = await buildClinicModulesApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/clinic/modules',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      modules: [
        {
          moduleKey: 'growth',
          displayName: 'Growth',
          visibilityReason: 'active',
        },
      ],
    });

    await app.close();
  });
});
