import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';
import { ClinicFeatureUnavailableRouteError } from '../clinic-shared/clinic.errors.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listCalls: vi.fn(),
    getCall: vi.fn(),
    scheduleCallback: vi.fn(),
    resolveCall: vi.fn(),
  },
}));

vi.mock('./calls.service.js', () => ({
  CallsService: vi.fn().mockImplementation(() => mockService),
}));

async function buildCallsApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      tenantRole?: string;
    };
    clinicRequest.tenantRole = 'viewer';
  });

  const { callRoutes } = await import('./calls.routes.js');
  await app.register(callRoutes);
  await app.ready();

  return app;
}

describe('callRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a structured 409 when the voice module is inactive', async () => {
    mockService.listCalls.mockRejectedValue(
      new ClinicFeatureUnavailableRouteError({
        reason: 'module_inactive',
        moduleKey: 'voice',
        detail: 'Voice is disabled for this tenant.',
      })
    );

    const app = await buildCallsApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/calls',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: 'Clinic feature unavailable',
      code: 'clinic_feature_unavailable',
      reason: 'module_inactive',
      moduleKey: 'voice',
      detail: 'Voice is disabled for this tenant.',
    });

    await app.close();
  });
});
