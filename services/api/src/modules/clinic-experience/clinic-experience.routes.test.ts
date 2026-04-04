import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    getExperience: vi.fn(),
  },
}));

vi.mock('./clinic-experience.service.js', () => ({
  ClinicExperienceService: vi.fn().mockImplementation(() => mockService),
}));

async function buildClinicExperienceApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      tenantRole?: string;
    };
    clinicRequest.tenantRole = 'admin';
  });

  const { clinicExperienceRoutes } = await import('./clinic-experience.routes.js');
  await app.register(clinicExperienceRoutes);
  await app.ready();

  return app;
}

describe('clinicExperienceRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the resolved clinic experience envelope', async () => {
    mockService.getExperience.mockResolvedValue({
      tenantId: 'tenant-1',
      isClinicTenant: true,
      defaultMode: 'clinic',
      role: 'admin',
      normalizedRole: 'admin',
      isInternalUser: true,
      permissions: ['view_dashboard', 'manage_clinic_settings', 'view_internal_platform'],
      flags: {
        verticalClinicUi: true,
        clinicDentalMode: true,
        voiceInboundEnabled: true,
        voiceOutboundEnabled: false,
        whatsappOutboundEnabled: true,
        intakeFormsEnabled: true,
        appointmentConfirmationsEnabled: true,
        smartGapFillEnabled: false,
        reactivationEnabled: false,
        advancedClinicModeEnabled: false,
        internalPlatformVisible: true,
      },
      modules: [
        {
          id: 'module-core',
          tenantId: 'tenant-1',
          moduleKey: 'core_reception',
          status: 'enabled',
          visibleToClient: true,
          planLevel: 'starter',
          config: {},
          createdAt: '2025-01-15T09:00:00.000Z',
          updatedAt: '2025-01-15T09:00:00.000Z',
          enabled: true,
          beta: false,
          displayName: 'Core Reception',
          description: 'Resumen e inbox',
          requiresConfig: false,
          visibilityState: 'visible',
          visibilityReason: 'active',
        },
      ],
      allowedNavigation: ['dashboard', 'configuration', 'platform_internal'],
    });

    const app = await buildClinicExperienceApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/clinic/experience',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      experience: {
        tenantId: 'tenant-1',
        normalizedRole: 'admin',
        allowedNavigation: ['dashboard', 'configuration', 'platform_internal'],
      },
    });

    await app.close();
  });
});
