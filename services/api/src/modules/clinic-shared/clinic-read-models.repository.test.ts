import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAppointmentSummary,
  createPatientListItem,
  createWaitlistRequest,
} from './clinic-test-fixtures.js';

const { eqMock, andMock, gteMock, inArrayMock, neMock, descMock } = vi.hoisted(() => ({
  eqMock: vi.fn(),
  andMock: vi.fn(),
  gteMock: vi.fn(),
  inArrayMock: vi.fn(),
  neMock: vi.fn(),
  descMock: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
  gte: gteMock,
  inArray: inArrayMock,
  ne: neMock,
  desc: descMock,
}));

import { ClinicReadModelsRepository } from './clinic-read-models.repository.js';

function createWhereResult<T>(result: T) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(result),
    })),
  };
}

function createWhereOrderByResult<T>(result: T) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

describe('ClinicReadModelsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assembles the patient detail read model from identities, appointments, and waitlist joins', async () => {
    const now = new Date('2025-01-15T09:00:00.000Z');
    const patientRow = {
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
      createdAt: now,
      updatedAt: now,
    };
    const identityRows = [
      {
        id: 'identity-1',
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        identityType: 'phone',
        identityValue: '+34123456789',
        isPrimary: true,
        confidenceScore: 1,
        createdAt: now,
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
        startsAt: now,
        endsAt: new Date('2025-01-15T10:00:00.000Z'),
        bookedAt: now,
        confirmationStatus: 'pending',
        reminderStatus: 'pending',
        cancellationReason: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      },
    ];
    const waitlistRows = [
      {
        id: 'waitlist-1',
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        serviceId: null,
        practitionerId: null,
        locationId: null,
        preferredWindows: [],
        status: 'active',
        priorityScore: 25,
        notes: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const database = {
      select: vi
        .fn()
        .mockReturnValueOnce(createWhereResult(identityRows))
        .mockReturnValueOnce(createWhereOrderByResult(appointmentRows))
        .mockReturnValueOnce(createWhereOrderByResult(waitlistRows)),
    };

    const repository = new ClinicReadModelsRepository(database as never);
    vi.spyOn(repository, 'loadAppointmentSummaries').mockResolvedValue([
      createAppointmentSummary(),
    ]);

    const detail = await repository.loadPatientDetail('tenant-1', patientRow);

    expect(detail).toMatchObject({
      patient: {
        id: 'patient-1',
        fullName: 'Ana Garcia',
      },
      identities: [
        {
          id: 'identity-1',
        },
      ],
      upcomingAppointments: [
        {
          id: 'appointment-1',
        },
      ],
      waitlistRequests: [
        createWaitlistRequest({
          priorityScore: 25,
        }),
      ],
    });
  });

  it('derives inbox list items with unread counts and next actions from conversation activity', async () => {
    const now = new Date('2025-01-15T09:00:00.000Z');
    const threadRows = [
      {
        id: 'thread-1',
        tenantId: 'tenant-1',
        patientId: 'patient-1',
        channelType: 'whatsapp',
        status: 'pending_form',
        intent: 'new_patient',
        priority: 'high',
        source: 'whatsapp',
        assignedUserId: null,
        lastMessageAt: now,
        lastInboundAt: now,
        lastOutboundAt: new Date('2025-01-15T08:55:00.000Z'),
        requiresHumanReview: false,
        resolution: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'thread-2',
        tenantId: 'tenant-1',
        patientId: 'patient-2',
        channelType: 'voice',
        status: 'pending_human',
        intent: 'human_handoff',
        priority: 'urgent',
        source: 'voice',
        assignedUserId: 'user-1',
        lastMessageAt: new Date('2025-01-15T08:40:00.000Z'),
        lastInboundAt: new Date('2025-01-15T08:40:00.000Z'),
        lastOutboundAt: null,
        requiresHumanReview: true,
        resolution: null,
        metadata: {},
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
        status: 'existing',
        isExisting: true,
        firstName: 'Lucia',
        lastName: 'Perez',
        fullName: 'Lucia Perez',
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
    const messageRows = [
      {
        id: 'message-2',
        tenantId: 'tenant-1',
        threadId: 'thread-1',
        patientId: 'patient-1',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Ya complete el formulario.',
        payload: {},
        deliveryStatus: 'read',
        providerMessageId: null,
        sentAt: null,
        receivedAt: now,
        createdAt: now,
      },
      {
        id: 'message-1',
        tenantId: 'tenant-1',
        threadId: 'thread-2',
        patientId: 'patient-2',
        direction: 'inbound',
        channelType: 'voice',
        messageType: 'call_summary',
        body: 'Necesita callback antes de las 12.',
        payload: {},
        deliveryStatus: 'received',
        providerMessageId: null,
        sentAt: null,
        receivedAt: new Date('2025-01-15T08:40:00.000Z'),
        createdAt: new Date('2025-01-15T08:40:00.000Z'),
      },
    ];

    const database = {
      select: vi
        .fn()
        .mockReturnValueOnce(createWhereResult(patientRows))
        .mockReturnValueOnce(createWhereOrderByResult(messageRows)),
    };

    const repository = new ClinicReadModelsRepository(database as never);
    vi.spyOn(repository, 'loadPatientListItemMap').mockResolvedValue(
      new Map([
        ['patient-1', createPatientListItem({ id: 'patient-1', fullName: 'Ana Garcia' })],
        ['patient-2', createPatientListItem({ id: 'patient-2', fullName: 'Lucia Perez' })],
      ])
    );

    const listItems = await repository.loadConversationListItems('tenant-1', threadRows);

    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toMatchObject({
      id: 'thread-1',
      unreadCount: 1,
      lastMessagePreview: 'Ya complete el formulario.',
    });
    expect(listItems[1]).toMatchObject({
      id: 'thread-2',
      unreadCount: 1,
      nextSuggestedAction: 'Assign to reception',
    });
  });

  it('hydrates reactivation campaign details with all recipients', async () => {
    const now = new Date('2025-01-15T09:00:00.000Z');
    const campaignRow = {
      id: 'campaign-1',
      tenantId: 'tenant-1',
      name: 'Revisiones de primavera',
      campaignType: 'hygiene_recall',
      status: 'running',
      audienceDefinition: {},
      messageTemplate: {},
      channelPolicy: {},
      scheduledAt: now,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const recipientRows = [
      {
        id: 'recipient-1',
        tenantId: 'tenant-1',
        campaignId: 'campaign-1',
        patientId: 'patient-1',
        status: 'booked',
        lastContactAt: now,
        lastResponseAt: now,
        result: 'Booked',
        generatedAppointmentId: 'appointment-1',
        metadata: {},
        createdAt: now,
      },
      {
        id: 'recipient-2',
        tenantId: 'tenant-1',
        campaignId: 'campaign-1',
        patientId: 'patient-2',
        status: 'contacted',
        lastContactAt: now,
        lastResponseAt: null,
        result: 'Awaiting reply',
        generatedAppointmentId: null,
        metadata: {},
        createdAt: now,
      },
    ];

    const database = {
      select: vi.fn().mockReturnValue(createWhereOrderByResult(recipientRows)),
    };

    const repository = new ClinicReadModelsRepository(database as never);
    const detail = await repository.loadCampaignDetail('tenant-1', campaignRow);

    expect(detail).toMatchObject({
      id: 'campaign-1',
      recipients: [
        { id: 'recipient-1', status: 'booked' },
        { id: 'recipient-2', status: 'contacted' },
      ],
    });
  });
});
