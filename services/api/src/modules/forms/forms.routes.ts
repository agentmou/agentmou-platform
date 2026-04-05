import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  CompleteIntakeFormSubmissionBodySchema,
  IntakeFormSubmissionResponseSchema,
  IntakeFormSubmissionsResponseSchema,
  IntakeFormTemplatesResponseSchema,
  SendIntakeFormSubmissionBodySchema,
  WaiveIntakeFormSubmissionBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  formSubmissionParamsSchema,
  tenantScopedParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { FormsService } from './forms.service.js';

export async function formRoutes(fastify: FastifyInstance) {
  const service = new FormsService();

  fastify.get(
    '/tenants/:tenantId/forms/templates',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const templates = await service.listTemplates(tenantId, request.tenantRole);
        return reply.send(IntakeFormTemplatesResponseSchema.parse({ templates }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/forms/submissions',
    {
      schema: {
        params: tenantScopedParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const submissions = await service.listSubmissions(tenantId, request.tenantRole);
        return reply.send(IntakeFormSubmissionsResponseSchema.parse({ submissions }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/forms/submissions/:submissionId',
    {
      schema: {
        params: formSubmissionParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, submissionId } = request.params as {
          tenantId: string;
          submissionId: string;
        };
        const submission = await service.getSubmission(tenantId, submissionId, request.tenantRole);
        if (!submission) {
          return reply.status(404).send({ error: 'Form submission not found' });
        }
        return reply.send(IntakeFormSubmissionResponseSchema.parse({ submission }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/forms/submissions/:submissionId/send',
    {
      schema: {
        params: formSubmissionParamsSchema,
        body: SendIntakeFormSubmissionBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, submissionId } = request.params as {
          tenantId: string;
          submissionId: string;
        };
        const submission = await service.sendSubmission(
          tenantId,
          submissionId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!submission) {
          return reply.status(404).send({ error: 'Form submission not found' });
        }
        return reply.send(IntakeFormSubmissionResponseSchema.parse({ submission }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/forms/submissions/:submissionId/mark-complete',
    {
      schema: {
        params: formSubmissionParamsSchema,
        body: CompleteIntakeFormSubmissionBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, submissionId } = request.params as {
          tenantId: string;
          submissionId: string;
        };
        const submission = await service.completeSubmission(
          tenantId,
          submissionId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!submission) {
          return reply.status(404).send({ error: 'Form submission not found' });
        }
        return reply.send(IntakeFormSubmissionResponseSchema.parse({ submission }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/forms/submissions/:submissionId/waive',
    {
      schema: {
        params: formSubmissionParamsSchema,
        body: WaiveIntakeFormSubmissionBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, submissionId } = request.params as {
          tenantId: string;
          submissionId: string;
        };
        const submission = await service.waiveSubmission(
          tenantId,
          submissionId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!submission) {
          return reply.status(404).send({ error: 'Form submission not found' });
        }
        return reply.send(IntakeFormSubmissionResponseSchema.parse({ submission }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
