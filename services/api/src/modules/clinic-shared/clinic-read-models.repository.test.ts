import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppointmentSummary, createWaitlistRequest } from './clinic-test-fixtures.js';

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
});
