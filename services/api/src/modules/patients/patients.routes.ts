import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CreatePatientBodySchema,
  CreateWaitlistRequestBodySchema,
  PatientResponseSchema,
  PatientsResponseSchema,
  ReactivatePatientBodySchema,
  UpdatePatientBodySchema,
  WaitlistRequestResponseSchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  patientFiltersSchema,
  patientParamsSchema,
  tenantScopedParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { PatientsService } from './patients.service.js';

export async function patientRoutes(fastify: FastifyInstance) {
  const service = new PatientsService();

  fastify.get(
    '/tenants/:tenantId/patients',
    {
      schema: {
        params: tenantScopedParamsSchema,
        querystring: patientFiltersSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const result = await service.listPatients(
          tenantId,
          request.query as never,
          request.tenantRole
        );
        return reply.send(PatientsResponseSchema.parse(result));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/patients/:patientId',
    {
      schema: {
        params: patientParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, patientId } = request.params as { tenantId: string; patientId: string };
        const patient = await service.getPatient(tenantId, patientId, request.tenantRole);
        if (!patient) {
          return reply.status(404).send({ error: 'Patient not found' });
        }
        return reply.send(PatientResponseSchema.parse(patient));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/patients',
    {
      schema: {
        params: tenantScopedParamsSchema,
        body: CreatePatientBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const patient = await service.createPatient(
          tenantId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        return reply.status(201).send(PatientResponseSchema.parse(patient));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.put(
    '/tenants/:tenantId/patients/:patientId',
    {
      schema: {
        params: patientParamsSchema,
        body: UpdatePatientBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, patientId } = request.params as { tenantId: string; patientId: string };
        const patient = await service.updatePatient(
          tenantId,
          patientId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!patient) {
          return reply.status(404).send({ error: 'Patient not found' });
        }
        return reply.send(PatientResponseSchema.parse(patient));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/patients/:patientId/reactivate',
    {
      schema: {
        params: patientParamsSchema,
        body: ReactivatePatientBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, patientId } = request.params as { tenantId: string; patientId: string };
        const patient = await service.reactivatePatient(
          tenantId,
          patientId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!patient) {
          return reply.status(404).send({ error: 'Patient not found' });
        }
        return reply.send(PatientResponseSchema.parse(patient));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/patients/:patientId/waitlist',
    {
      schema: {
        params: patientParamsSchema,
        body: CreateWaitlistRequestBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, patientId } = request.params as { tenantId: string; patientId: string };
        const waitlistRequest = await service.createWaitlistRequest(
          tenantId,
          patientId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        return reply.status(201).send(WaitlistRequestResponseSchema.parse({ waitlistRequest }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
