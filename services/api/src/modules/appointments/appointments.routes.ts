import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AppointmentResponseSchema,
  AppointmentsResponseSchema,
  CancelAppointmentBodySchema,
  ConfirmAppointmentBodySchema,
  CreateAppointmentBodySchema,
  RescheduleAppointmentBodySchema,
  UpdateAppointmentBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import { appointmentFiltersSchema, appointmentParamsSchema, tenantScopedParamsSchema } from '../clinic-shared/clinic.schema.js';
import { AppointmentsService } from './appointments.service.js';

export async function appointmentRoutes(fastify: FastifyInstance) {
  const service = new AppointmentsService();

  fastify.get(
    '/tenants/:tenantId/appointments',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: appointmentFiltersSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const result = await service.listAppointments(tenantId, request.query as never, request.tenantRole);
        return reply.send(AppointmentsResponseSchema.parse(result));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/appointments/:appointmentId',
    {
      schema: {
        params: appointmentParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, appointmentId } = request.params as {
          tenantId: string;
          appointmentId: string;
        };
        const appointment = await service.getAppointment(tenantId, appointmentId, request.tenantRole);
        if (!appointment) {
          return reply.status(404).send({ error: 'Appointment not found' });
        }
        return reply.send(AppointmentResponseSchema.parse({ appointment }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/appointments',
    {
      schema: {
        params: tenantScopedParamsSchema,
        body: CreateAppointmentBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const appointment = await service.createAppointment(
          tenantId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        return reply.status(201).send(AppointmentResponseSchema.parse({ appointment }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.put(
    '/tenants/:tenantId/appointments/:appointmentId',
    {
      schema: {
        params: appointmentParamsSchema,
        body: UpdateAppointmentBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, appointmentId } = request.params as {
          tenantId: string;
          appointmentId: string;
        };
        const appointment = await service.updateAppointment(
          tenantId,
          appointmentId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!appointment) {
          return reply.status(404).send({ error: 'Appointment not found' });
        }
        return reply.send(AppointmentResponseSchema.parse({ appointment }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/appointments/:appointmentId/reschedule',
    {
      schema: {
        params: appointmentParamsSchema,
        body: RescheduleAppointmentBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, appointmentId } = request.params as {
          tenantId: string;
          appointmentId: string;
        };
        const appointment = await service.rescheduleAppointment(
          tenantId,
          appointmentId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!appointment) {
          return reply.status(404).send({ error: 'Appointment not found' });
        }
        return reply.send(AppointmentResponseSchema.parse({ appointment }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/appointments/:appointmentId/cancel',
    {
      schema: {
        params: appointmentParamsSchema,
        body: CancelAppointmentBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, appointmentId } = request.params as {
          tenantId: string;
          appointmentId: string;
        };
        const appointment = await service.cancelAppointment(
          tenantId,
          appointmentId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!appointment) {
          return reply.status(404).send({ error: 'Appointment not found' });
        }
        return reply.send(AppointmentResponseSchema.parse({ appointment }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/appointments/:appointmentId/confirm',
    {
      schema: {
        params: appointmentParamsSchema,
        body: ConfirmAppointmentBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, appointmentId } = request.params as {
          tenantId: string;
          appointmentId: string;
        };
        const appointment = await service.confirmAppointment(
          tenantId,
          appointmentId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!appointment) {
          return reply.status(404).send({ error: 'Appointment not found' });
        }
        return reply.send(AppointmentResponseSchema.parse({ appointment }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
