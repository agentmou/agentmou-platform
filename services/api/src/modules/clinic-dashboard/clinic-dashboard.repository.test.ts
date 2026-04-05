import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAppointmentSummary,
  createConversationThreadListItem,
  createGapDetail,
} from '../clinic-shared/clinic-test-fixtures.js';

const { eqMock, andMock, gteMock, neMock, ascMock, descMock } = vi.hoisted(() => ({
  eqMock: vi.fn(),
  andMock: vi.fn(),
  gteMock: vi.fn(),
  neMock: vi.fn(),
  ascMock: vi.fn(),
  descMock: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
  gte: gteMock,
  ne: neMock,
  asc: ascMock,
  desc: descMock,
  inArray: vi.fn(),
}));

import { ClinicDashboardRepository } from './clinic-dashboard.repository.js';

function createWhereOrderByResult<T>(result: T) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

function createWhereResult<T>(result: T) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(result),
    })),
  };
}

describe('ClinicDashboardRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates clinic KPI queues from tenant-scoped records', async () => {
    const now = new Date('2025-01-15T09:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const threadRows = [
      {
        id: 'thread-1',
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        channelType: 'whatsapp',
        status: 'new',
        intent: 'book_appointment',
        priority: 'high',
        source: 'whatsapp',
        assignedUserId: null,
        lastMessageAt: new Date('2025-01-15T08:55:00.000Z'),
        lastInboundAt: new Date('2025-01-15T08:55:00.000Z'),
        lastOutboundAt: null,
        requiresHumanReview: false,
        resolution: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'thread-2',
        tenantId: 'tenant-1',
        patientId: 'patient-2',
        channelType: 'whatsapp',
        status: 'pending_human',
        intent: 'change_appointment',
        priority: 'normal',
        source: 'whatsapp',
        assignedUserId: 'user-1',
        lastMessageAt: new Date('2025-01-15T08:40:00.000Z'),
        lastInboundAt: new Date('2025-01-15T08:40:00.000Z'),
        lastOutboundAt: null,
        requiresHumanReview: true,
        resolution: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'thread-3',
        tenantId: 'tenant-1',
        patientId: 'patient-3',
        channelType: 'whatsapp',
        status: 'resolved',
        intent: 'faq',
        priority: 'low',
        source: 'whatsapp',
        assignedUserId: null,
        lastMessageAt: new Date('2025-01-15T07:40:00.000Z'),
        lastInboundAt: new Date('2025-01-15T07:40:00.000Z'),
        lastOutboundAt: null,
        requiresHumanReview: false,
        resolution: 'done',
        createdAt: now,
        updatedAt: now,
      },
    ];
    const patientRows = [
      {
        id: 'patient-1',
        tenantId: 'tenant-1',
        externalPatientId: null,
        status: 'new_lead',
        isExisting: false,
        firstName: 'Ana',
        lastName: 'Garcia',
        fullName: 'Ana Garcia',
        phone: null,
        email: null,
        dateOfBirth: null,
        notes: null,
        consentFlags: {},
        source: 'manual',
        lastInteractionAt: null,
        nextSuggestedActionAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'patient-2',
        tenantId: 'tenant-1',
        externalPatientId: null,
        status: 'active',
        isExisting: true,
        firstName: 'Luis',
        lastName: 'Perez',
        fullName: 'Luis Perez',
        phone: null,
        email: null,
        dateOfBirth: null,
        notes: null,
        consentFlags: {},
        source: 'manual',
        lastInteractionAt: null,
        nextSuggestedActionAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const formRows = [
      {
        id: 'submission-1',
        tenantId: 'tenant-1',
        templateId: 'template-1',
        patientId: 'patient-1',
        threadId: 'thread-1',
        status: 'sent',
        answers: {},
        sentAt: now,
        openedAt: null,
        completedAt: null,
        expiresAt: null,
        requiredForBooking: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'submission-2',
        tenantId: 'tenant-1',
        templateId: 'template-1',
        patientId: 'patient-2',
        threadId: 'thread-2',
        status: 'completed',
        answers: {},
        sentAt: now,
        openedAt: now,
        completedAt: now,
        expiresAt: null,
        requiredForBooking: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const confirmationRows = [
      {
        id: 'confirmation-1',
        tenantId: 'tenant-1',
        appointmentId: 'appointment-1',
        channelType: 'whatsapp',
        status: 'pending',
        requestedAt: now,
        dueAt: new Date('2025-01-15T09:30:00.000Z'),
        respondedAt: null,
        responsePayload: {},
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'confirmation-2',
        tenantId: 'tenant-1',
        appointmentId: 'appointment-2',
        channelType: 'whatsapp',
        status: 'confirmed',
        requestedAt: now,
        dueAt: new Date('2025-01-15T10:30:00.000Z'),
        respondedAt: now,
        responsePayload: {},
        createdAt: now,
        updatedAt: now,
      },
    ];
    const gapRows = [
      {
        id: 'gap-1',
        tenantId: 'tenant-1',
        originAppointmentId: 'appointment-2',
        serviceId: null,
        practitionerId: null,
        locationId: null,
        startsAt: now,
        endsAt: new Date('2025-01-15T10:00:00.000Z'),
        status: 'open',
        origin: 'cancellation',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'gap-2',
        tenantId: 'tenant-1',
        originAppointmentId: 'appointment-3',
        serviceId: null,
        practitionerId: null,
        locationId: null,
        startsAt: now,
        endsAt: new Date('2025-01-15T11:00:00.000Z'),
        status: 'closed',
        origin: 'cancellation',
        createdAt: now,
        updatedAt: now,
      },
    ];
    const campaignRows = [
      {
        id: 'campaign-1',
        tenantId: 'tenant-1',
        name: 'Recall',
        campaignType: 'recall',
        status: 'running',
        audienceDefinition: {},
        messageTemplate: {},
        channelPolicy: {},
        scheduledAt: null,
        startedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'campaign-2',
        tenantId: 'tenant-1',
        name: 'Dormant',
        campaignType: 'hygiene_recall',
        status: 'draft',
        audienceDefinition: {},
        messageTemplate: {},
        channelPolicy: {},
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const appointmentRows = [
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
        startsAt: new Date('2025-01-15T10:00:00.000Z'),
        endsAt: new Date('2025-01-15T10:30:00.000Z'),
        bookedAt: now,
        confirmationStatus: 'pending',
        reminderStatus: 'pending',
        cancellationReason: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'appointment-2',
        tenantId: 'tenant-1',
        patientId: 'patient-2',
        externalAppointmentId: null,
        serviceId: null,
        practitionerId: null,
        locationId: null,
        threadId: null,
        status: 'scheduled',
        source: 'manual',
        startsAt: new Date('2025-01-16T10:00:00.000Z'),
        endsAt: new Date('2025-01-16T10:30:00.000Z'),
        bookedAt: now,
        confirmationStatus: 'pending',
        reminderStatus: 'pending',
        cancellationReason: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      },
    ];

    const selectMock = vi
      .fn()
      .mockReturnValueOnce(createWhereOrderByResult(threadRows))
      .mockReturnValueOnce(createWhereResult(patientRows))
      .mockReturnValueOnce(createWhereOrderByResult(formRows))
      .mockReturnValueOnce(createWhereOrderByResult(confirmationRows))
      .mockReturnValueOnce(createWhereOrderByResult(gapRows))
      .mockReturnValueOnce(createWhereOrderByResult(campaignRows))
      .mockReturnValueOnce(createWhereOrderByResult(appointmentRows));

    const repository = new ClinicDashboardRepository({
      select: selectMock,
    } as never);

    const mockReadModels = {
      loadConversationListItems: vi.fn().mockResolvedValue([createConversationThreadListItem()]),
      loadAppointmentSummaries: vi.fn().mockResolvedValue([createAppointmentSummary()]),
      loadGapDetails: vi.fn().mockResolvedValue([createGapDetail()]),
    };
    (repository as unknown as { readModels: typeof mockReadModels }).readModels = mockReadModels;

    const dashboard = await repository.getDashboard('tenant-1');

    expect(dashboard.kpis).toEqual({
      openThreads: 2,
      pendingConfirmations: 1,
      pendingForms: 1,
      activeGaps: 1,
      activeCampaigns: 1,
      todaysAppointments: 1,
      patientsNew: 1,
      patientsExisting: 1,
    });
    expect(dashboard.patientMix).toEqual({
      newPatients: 1,
      existingPatients: 1,
    });
    expect(mockReadModels.loadConversationListItems).toHaveBeenCalledWith(
      'tenant-1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'thread-1' }),
        expect.objectContaining({ id: 'thread-2' }),
      ])
    );
    expect(mockReadModels.loadAppointmentSummaries).toHaveBeenCalledWith('tenant-1', [
      appointmentRows[0],
    ]);
    expect(mockReadModels.loadGapDetails).toHaveBeenCalledWith('tenant-1', [gapRows[0]]);

    vi.useRealTimers();
  });
});
