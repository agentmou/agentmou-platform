import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('clinic api client', () => {
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

  it('parses clinic dashboard responses through the shared contracts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          dashboard: {
            tenantId: 'tenant-1',
            generatedAt: '2025-01-15T09:00:00.000Z',
            kpis: {
              openThreads: 1,
              pendingConfirmations: 1,
              pendingForms: 1,
              activeGaps: 1,
              activeCampaigns: 1,
              todaysAppointments: 1,
              patientsNew: 1,
              patientsExisting: 0,
            },
            prioritizedInbox: [
              {
                id: 'thread-1',
                tenantId: 'tenant-1',
                patientId: 'patient-1',
                channelType: 'whatsapp',
                status: 'in_progress',
                intent: 'book_appointment',
                priority: 'high',
                source: 'whatsapp',
                assignedUserId: null,
                lastMessageAt: '2025-01-15T09:00:00.000Z',
                lastInboundAt: '2025-01-15T09:00:00.000Z',
                lastOutboundAt: null,
                requiresHumanReview: false,
                resolution: null,
                createdAt: '2025-01-15T09:00:00.000Z',
                updatedAt: '2025-01-15T09:00:00.000Z',
                patient: {
                  id: 'patient-1',
                  tenantId: 'tenant-1',
                  externalPatientId: null,
                  status: 'new_lead',
                  isExisting: false,
                  firstName: 'Ana',
                  lastName: 'Garcia',
                  fullName: 'Ana Garcia',
                  phone: '+34123456789',
                  email: 'ana@example.com',
                  dateOfBirth: null,
                  notes: null,
                  consentFlags: {},
                  source: 'manual',
                  lastInteractionAt: null,
                  nextSuggestedActionAt: null,
                  createdAt: '2025-01-15T09:00:00.000Z',
                  updatedAt: '2025-01-15T09:00:00.000Z',
                  upcomingAppointmentCount: 1,
                  hasPendingForm: false,
                  isReactivationCandidate: false,
                },
                lastMessagePreview: 'Hola, necesito una cita',
                nextSuggestedAction: 'Responder disponibilidad',
                unreadCount: 1,
              },
            ],
            agenda: [
              {
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
                patient: {
                  id: 'patient-1',
                  tenantId: 'tenant-1',
                  externalPatientId: null,
                  status: 'new_lead',
                  isExisting: false,
                  firstName: 'Ana',
                  lastName: 'Garcia',
                  fullName: 'Ana Garcia',
                  phone: '+34123456789',
                  email: 'ana@example.com',
                  dateOfBirth: null,
                  notes: null,
                  consentFlags: {},
                  source: 'manual',
                  lastInteractionAt: null,
                  nextSuggestedActionAt: null,
                  createdAt: '2025-01-15T09:00:00.000Z',
                  updatedAt: '2025-01-15T09:00:00.000Z',
                  upcomingAppointmentCount: 1,
                  hasPendingForm: false,
                  isReactivationCandidate: false,
                },
                service: null,
                practitioner: null,
                location: null,
              },
            ],
            pendingForms: [
              {
                id: 'submission-1',
                tenantId: 'tenant-1',
                templateId: 'template-1',
                patientId: 'patient-1',
                threadId: 'thread-1',
                status: 'sent',
                answers: {},
                sentAt: '2025-01-15T09:00:00.000Z',
                openedAt: null,
                completedAt: null,
                expiresAt: null,
                requiredForBooking: true,
                createdAt: '2025-01-15T09:00:00.000Z',
                updatedAt: '2025-01-15T09:00:00.000Z',
              },
            ],
            pendingConfirmations: [
              {
                id: 'confirmation-1',
                tenantId: 'tenant-1',
                appointmentId: 'appointment-1',
                channelType: 'whatsapp',
                status: 'pending',
                requestedAt: '2025-01-15T09:00:00.000Z',
                dueAt: '2025-01-15T10:00:00.000Z',
                respondedAt: null,
                responsePayload: {},
                createdAt: '2025-01-15T09:00:00.000Z',
                updatedAt: '2025-01-15T09:00:00.000Z',
              },
            ],
            activeGaps: [
              {
                id: 'gap-1',
                tenantId: 'tenant-1',
                originAppointmentId: 'appointment-1',
                serviceId: null,
                practitionerId: null,
                locationId: null,
                startsAt: '2025-01-15T11:00:00.000Z',
                endsAt: '2025-01-15T11:30:00.000Z',
                status: 'open',
                origin: 'cancellation',
                createdAt: '2025-01-15T09:00:00.000Z',
                updatedAt: '2025-01-15T09:00:00.000Z',
                outreachAttempts: [],
              },
            ],
            activeCampaigns: [
              {
                id: 'campaign-1',
                tenantId: 'tenant-1',
                name: 'Recall',
                campaignType: 'recall',
                status: 'running',
                audienceDefinition: {},
                messageTemplate: {
                  body: 'Hola, te ayudamos a reservar',
                },
                channelPolicy: {},
                scheduledAt: null,
                startedAt: '2025-01-15T09:00:00.000Z',
                completedAt: null,
                createdAt: '2025-01-15T09:00:00.000Z',
                updatedAt: '2025-01-15T09:00:00.000Z',
              },
            ],
            patientMix: {
              newPatients: 1,
              existingPatients: 0,
            },
          },
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const { fetchClinicDashboard } = await import('./clinic');
    const dashboard = await fetchClinicDashboard('tenant-1');

    expect(dashboard.kpis.openThreads).toBe(1);
    expect(dashboard.prioritizedInbox[0]?.patient?.fullName).toBe('Ana Garcia');
  });

  it('raises a clinic feature-unavailable error for structured 409 payloads', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Clinic feature unavailable',
          code: 'clinic_feature_unavailable',
          reason: 'module_inactive',
          moduleKey: 'voice',
          detail: 'Voice is disabled for this tenant.',
        }),
        {
          status: 409,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    ) as typeof fetch;

    const { ClinicFeatureUnavailableApiError, fetchCalls } = await import('./clinic');
    const promise = fetchCalls('tenant-1');

    await expect(promise).rejects.toBeInstanceOf(ClinicFeatureUnavailableApiError);
    await expect(promise).rejects.toMatchObject({
      status: 409,
      feature: {
        reason: 'module_inactive',
        moduleKey: 'voice',
      },
    });
  });
});
