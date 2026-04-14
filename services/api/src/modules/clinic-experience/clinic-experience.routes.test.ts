import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    getTenantExperience: vi.fn(),
    getClinicExperience: vi.fn(),
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

  it('returns the resolved tenant experience envelope for internal workspaces', async () => {
    mockService.getTenantExperience.mockResolvedValue({
      tenantId: 'tenant-1',
      activeVertical: 'internal',
      shellKey: 'platform_internal',
      defaultRoute: '/app/tenant-1/dashboard',
      role: 'admin',
      normalizedRole: 'admin',
      permissions: ['view_internal_platform', 'view_admin_console'],
      allowedNavigation: ['platform_internal', 'admin_console'],
      modules: [],
      flags: {
        activeVertical: 'internal',
        isPlatformAdminTenant: true,
        adminConsoleEnabled: true,
        verticalClinicUi: false,
        clinicDentalMode: false,
        voiceInboundEnabled: false,
        voiceOutboundEnabled: false,
        whatsappOutboundEnabled: false,
        intakeFormsEnabled: false,
        appointmentConfirmationsEnabled: false,
        smartGapFillEnabled: false,
        reactivationEnabled: false,
        advancedClinicModeEnabled: false,
        internalPlatformVisible: true,
      },
      settingsSections: [
        'general',
        'team',
        'integrations',
        'plan',
        'security',
        'internal_defaults',
        'internal_approvals',
      ],
      canAccessInternalPlatform: true,
      canAccessAdminConsole: true,
    });

    const app = await buildClinicExperienceApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/experience',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      experience: {
        tenantId: 'tenant-1',
        activeVertical: 'internal',
        shellKey: 'platform_internal',
        allowedNavigation: ['platform_internal', 'admin_console'],
      },
    });

    await app.close();
  });

  it('returns the resolved tenant experience envelope for fisio workspaces', async () => {
    mockService.getTenantExperience.mockResolvedValue({
      tenantId: 'tenant-1',
      activeVertical: 'fisio',
      shellKey: 'fisio',
      defaultRoute: '/app/tenant-1/dashboard',
      role: 'admin',
      normalizedRole: 'admin',
      permissions: [],
      allowedNavigation: ['dashboard', 'configuration'],
      modules: [],
      flags: {
        activeVertical: 'fisio',
        isPlatformAdminTenant: false,
        adminConsoleEnabled: false,
        verticalClinicUi: false,
        clinicDentalMode: false,
        voiceInboundEnabled: false,
        voiceOutboundEnabled: false,
        whatsappOutboundEnabled: false,
        intakeFormsEnabled: false,
        appointmentConfirmationsEnabled: false,
        smartGapFillEnabled: false,
        reactivationEnabled: false,
        advancedClinicModeEnabled: false,
        internalPlatformVisible: false,
      },
      settingsSections: [
        'general',
        'team',
        'integrations',
        'plan',
        'security',
        'care_profile',
        'care_schedule',
      ],
      canAccessInternalPlatform: false,
      canAccessAdminConsole: false,
    });

    const app = await buildClinicExperienceApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/experience',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      experience: {
        activeVertical: 'fisio',
        shellKey: 'fisio',
        allowedNavigation: ['dashboard', 'configuration'],
      },
    });

    await app.close();
  });

  it('returns the resolved tenant experience envelope for clinic workspaces', async () => {
    mockService.getTenantExperience.mockResolvedValue({
      tenantId: 'tenant-1',
      activeVertical: 'clinic',
      shellKey: 'clinic',
      defaultRoute: '/app/tenant-1/dashboard',
      role: 'admin',
      normalizedRole: 'admin',
      permissions: ['view_dashboard', 'manage_clinic_settings'],
      allowedNavigation: ['dashboard', 'inbox', 'configuration'],
      modules: [],
      flags: {
        activeVertical: 'clinic',
        isPlatformAdminTenant: false,
        adminConsoleEnabled: false,
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
        internalPlatformVisible: false,
      },
      settingsSections: [
        'general',
        'team',
        'integrations',
        'plan',
        'security',
        'care_profile',
        'care_schedule',
        'care_services',
        'care_forms',
        'care_confirmations',
      ],
      canAccessInternalPlatform: false,
      canAccessAdminConsole: false,
    });

    const app = await buildClinicExperienceApp();
    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/experience',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      experience: {
        activeVertical: 'clinic',
        shellKey: 'clinic',
        allowedNavigation: ['dashboard', 'inbox', 'configuration'],
      },
    });

    await app.close();
  });

  it('returns the resolved clinic experience envelope', async () => {
    mockService.getClinicExperience.mockResolvedValue({
      tenantId: 'tenant-1',
      isClinicTenant: true,
      defaultMode: 'clinic',
      role: 'admin',
      normalizedRole: 'admin',
      isInternalUser: false,
      permissions: ['view_dashboard', 'manage_clinic_settings'],
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
        internalPlatformVisible: false,
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
      allowedNavigation: ['dashboard', 'configuration'],
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
        allowedNavigation: ['dashboard', 'configuration'],
      },
    });

    await app.close();
  });
});
