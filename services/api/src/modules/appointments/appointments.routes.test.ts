import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';
import { createAppointmentDetail } from '../clinic-shared/clinic-test-fixtures.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listAppointments: vi.fn(),
    getAppointment: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    rescheduleAppointment: vi.fn(),
    cancelAppointment: vi.fn(),
    confirmAppointment: vi.fn(),
  },
}));

vi.mock('./appointments.service.js', () => ({
  AppointmentsService: vi.fn().mockImplementation(() => mockService),
}));

async function buildAppointmentsApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      userId?: string;
      tenantRole?: string;
    };
    clinicRequest.userId = 'user-123';
    clinicRequest.tenantRole = 'operator';
  });

  const { appointmentRoutes } = await import('./appointments.routes.js');
  await app.register(appointmentRoutes);
  await app.ready();

  return app;
}

describe('appointmentRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.rescheduleAppointment.mockResolvedValue(
      createAppointmentDetail({
        status: 'rescheduled',
        startsAt: '2025-01-16T11:00:00.000Z',
        endsAt: '2025-01-16T12:00:00.000Z',
      })
    );
    mockService.cancelAppointment.mockResolvedValue(
      createAppointmentDetail({
        status: 'cancelled',
        cancellationReason: 'Paciente indispuesto',
      })
    );
  });

  it('delegates reschedule and cancel actions with the authenticated operator context', async () => {
    const app = await buildAppointmentsApp();

    const rescheduleResponse = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/appointments/appointment-1/reschedule',
      payload: {
        startsAt: '2025-01-16T11:00:00.000Z',
        endsAt: '2025-01-16T12:00:00.000Z',
        reason: 'Hueco mejor para el paciente',
      },
    });
    const cancelResponse = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/appointments/appointment-1/cancel',
      payload: {
        cancellationReason: 'Paciente indispuesto',
      },
    });

    expect(rescheduleResponse.statusCode).toBe(200);
    expect(cancelResponse.statusCode).toBe(200);
    expect(mockService.rescheduleAppointment).toHaveBeenCalledWith(
      'tenant-1',
      'appointment-1',
      {
        startsAt: '2025-01-16T11:00:00.000Z',
        endsAt: '2025-01-16T12:00:00.000Z',
        reason: 'Hueco mejor para el paciente',
      },
      'user-123',
      'operator'
    );
    expect(mockService.cancelAppointment).toHaveBeenCalledWith(
      'tenant-1',
      'appointment-1',
      {
        cancellationReason: 'Paciente indispuesto',
      },
      'user-123',
      'operator'
    );

    await app.close();
  });
});
