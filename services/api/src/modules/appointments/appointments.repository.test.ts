import { beforeEach, describe, expect, it, vi } from 'vitest';

const { eqMock, andMock, ascMock, descMock } = vi.hoisted(() => ({
  eqMock: vi.fn(),
  andMock: vi.fn(),
  ascMock: vi.fn(),
  descMock: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: eqMock,
  and: andMock,
  asc: ascMock,
  desc: descMock,
}));

import { AppointmentsRepository } from './appointments.repository.js';

function createSelectCurrentResult<T>(result: T) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

function createUpdateReturning<T>(result: T) {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

describe('AppointmentsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates appointment events and a gap opportunity when rescheduling', async () => {
    const now = new Date('2025-01-15T09:00:00.000Z');
    const currentAppointment = {
      id: 'appointment-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      externalAppointmentId: null,
      serviceId: 'service-1',
      practitionerId: 'practitioner-1',
      locationId: 'location-1',
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
    };
    const updatedAppointment = {
      ...currentAppointment,
      status: 'rescheduled',
      startsAt: new Date('2025-01-16T11:00:00.000Z'),
      endsAt: new Date('2025-01-16T12:00:00.000Z'),
    };
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    const insertMock = vi.fn(() => ({
      values: valuesMock,
    }));

    const repository = new AppointmentsRepository({
      select: vi.fn().mockReturnValue(createSelectCurrentResult([currentAppointment])),
      update: vi.fn().mockReturnValue(createUpdateReturning([updatedAppointment])),
      insert: insertMock,
    } as never);

    const appointment = await repository.rescheduleAppointment('tenant-1', 'appointment-1', {
      startsAt: '2025-01-16T11:00:00.000Z',
      endsAt: '2025-01-16T12:00:00.000Z',
      reason: 'Paciente solicita otro hueco',
    });

    expect(appointment?.status).toBe('rescheduled');
    expect(insertMock).toHaveBeenNthCalledWith(1, expect.objectContaining({}));
    expect(valuesMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: 'tenant-1',
        appointmentId: 'appointment-1',
        eventType: 'rescheduled',
      })
    );
    expect(valuesMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tenantId: 'tenant-1',
        originAppointmentId: 'appointment-1',
        status: 'open',
        origin: 'reschedule',
      })
    );
  });

  it('creates appointment events and a gap opportunity when cancelling', async () => {
    const now = new Date('2025-01-15T09:00:00.000Z');
    const currentAppointment = {
      id: 'appointment-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      externalAppointmentId: null,
      serviceId: 'service-1',
      practitionerId: 'practitioner-1',
      locationId: 'location-1',
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
    };
    const updatedAppointment = {
      ...currentAppointment,
      status: 'cancelled',
      cancellationReason: 'Paciente indispuesto',
    };
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    const insertMock = vi.fn(() => ({
      values: valuesMock,
    }));

    const repository = new AppointmentsRepository({
      select: vi.fn().mockReturnValue(createSelectCurrentResult([currentAppointment])),
      update: vi.fn().mockReturnValue(createUpdateReturning([updatedAppointment])),
      insert: insertMock,
    } as never);

    const appointment = await repository.cancelAppointment('tenant-1', 'appointment-1', {
      cancellationReason: 'Paciente indispuesto',
    });

    expect(appointment?.status).toBe('cancelled');
    expect(valuesMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        appointmentId: 'appointment-1',
        eventType: 'cancelled',
      })
    );
    expect(valuesMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        originAppointmentId: 'appointment-1',
        origin: 'cancellation',
      })
    );
  });
});
