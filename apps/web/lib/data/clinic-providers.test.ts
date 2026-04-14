import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiProvider } from './api-provider';
import { demoProvider } from './demo-provider';
import { mockProvider } from './mock-provider';

describe('clinic data providers', () => {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const env = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    vi.resetModules();
    env.NODE_ENV = 'development';
    env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.NODE_ENV = originalNodeEnv;
    env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.restoreAllMocks();
  });

  it('returns deterministic clinic fixtures from the mock provider', async () => {
    const [patients, conversations, calls, appointments, gaps, campaigns] = await Promise.all([
      mockProvider.listClinicPatients('demo-workspace', {
        hasPendingForm: true,
      }),
      mockProvider.listClinicConversations('demo-workspace', {
        status: 'pending_form',
      }),
      mockProvider.listClinicCalls('demo-workspace', {
        status: 'callback_required',
      }),
      mockProvider.listClinicAppointments('demo-workspace', {
        confirmationStatus: 'pending',
      }),
      mockProvider.listClinicGaps('demo-workspace', {
        status: 'open',
      }),
      mockProvider.listClinicReactivationCampaigns('demo-workspace', {
        status: 'running',
      }),
    ]);

    expect(patients.patients.map((patient) => patient.fullName)).toEqual([
      'Sofia Romero',
      'Pablo Ortiz',
    ]);
    expect(conversations.threads.map((thread) => thread.id)).toEqual([
      'thread-sofia-whatsapp',
      'thread-pablo-whatsapp',
    ]);
    expect(calls.calls).toHaveLength(1);
    expect(calls.calls[0]?.status).toBe('callback_required');
    expect(appointments.appointments.map((appointment) => appointment.id)).toEqual([
      'appointment-ana',
      'appointment-marta',
      'appointment-carmen',
    ]);
    expect(gaps[0]?.outreachAttempts[0]?.status).toBe('sent');
    expect(campaigns.campaigns[0]?.id).toBe('campaign-hygiene-recall');
  });

  it('keeps clinic demo data available through the demo provider', async () => {
    const [dashboard, campaigns, experience, tenantExperience] = await Promise.all([
      demoProvider.getClinicDashboard('demo-workspace'),
      demoProvider.listClinicReactivationCampaigns('demo-workspace'),
      demoProvider.getClinicExperience('demo-workspace'),
      demoProvider.getTenantExperience('demo-workspace'),
    ]);

    expect(dashboard.kpis.pendingConfirmations).toBe(2);
    expect(dashboard.kpis.pendingForms).toBe(2);
    expect(dashboard.prioritizedInbox[0]?.id).toBe('thread-lucia-voice');
    expect(campaigns.campaigns[0]?.name).toContain('higiene');
    expect(experience?.flags.internalPlatformVisible).toBe(false);
    expect(tenantExperience?.activeVertical).toBe('clinic');
    expect(tenantExperience?.shellKey).toBe('clinic');
  });

  it('keeps mock tenant experiences aligned for internal and fisio workspaces', async () => {
    const [internalExperience, fisioExperience] = await Promise.all([
      mockProvider.getTenantExperience('tenant-acme'),
      mockProvider.getTenantExperience('tenant-fisio'),
    ]);

    expect(internalExperience?.activeVertical).toBe('internal');
    expect(internalExperience?.canAccessInternalPlatform).toBe(true);
    expect(internalExperience?.flags.adminConsoleEnabled).toBe(false);
    expect(fisioExperience?.activeVertical).toBe('fisio');
    expect(fisioExperience?.shellKey).toBe('fisio');
    expect(fisioExperience?.settingsSections).toEqual([
      'general',
      'team',
      'integrations',
      'plan',
      'security',
      'care_profile',
      'care_schedule',
    ]);
  });

  it('exposes the admin read model through mock and demo providers', async () => {
    const [mockTenants, demoTenants, detail, usersBeforeCreate] = await Promise.all([
      mockProvider.listAdminTenants('tenant-admin', { limit: 10 }),
      demoProvider.listAdminTenants('tenant-admin', { limit: 10 }),
      mockProvider.getAdminTenantDetail('tenant-admin', 'demo-workspace'),
      mockProvider.listAdminTenantUsers('tenant-admin', 'demo-workspace'),
    ]);
    const createdUser = await mockProvider.createAdminTenantUser('tenant-admin', 'demo-workspace', {
      email: 'new-admin-ui@example.com',
      name: 'New Admin UI',
      role: 'operator',
    });
    const usersAfterCreate = await mockProvider.listAdminTenantUsers(
      'tenant-admin',
      'demo-workspace'
    );

    expect(mockTenants.tenants.length).toBeGreaterThan(0);
    expect(demoTenants.tenants.length).toBeGreaterThan(0);
    expect(detail?.id).toBe('demo-workspace');
    expect(usersAfterCreate.length).toBe(usersBeforeCreate.length + 1);
    expect(usersAfterCreate.some((user) => user.email === 'new-admin-ui@example.com')).toBe(true);
    expect(createdUser.activation?.link).toContain('/reset-password?token=');
  });

  it('unwraps appointment mutation responses in the api provider', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          appointment: {
            id: 'appointment-1',
            tenantId: 'tenant-1',
            patientId: 'patient-1',
            externalAppointmentId: null,
            serviceId: null,
            practitionerId: null,
            locationId: null,
            threadId: null,
            status: 'scheduled',
            source: 'manual',
            startsAt: '2025-01-15T10:00:00.000Z',
            endsAt: '2025-01-15T10:30:00.000Z',
            bookedAt: '2025-01-15T09:00:00.000Z',
            confirmationStatus: 'pending',
            reminderStatus: 'pending',
            cancellationReason: null,
            metadata: {},
            createdAt: '2025-01-15T09:00:00.000Z',
            updatedAt: '2025-01-15T09:00:00.000Z',
            patient: null,
            service: null,
            practitioner: null,
            location: null,
            events: [],
          },
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const appointment = await apiProvider.createClinicAppointment('tenant-1', {
      patientId: 'patient-1',
      startsAt: '2025-01-15T10:00:00.000Z',
      endsAt: '2025-01-15T10:30:00.000Z',
      source: 'manual',
    });

    expect(appointment.id).toBe('appointment-1');
    expect(appointment.status).toBe('scheduled');
  });
});
