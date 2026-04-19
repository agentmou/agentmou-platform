import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AdminDeleteTenantUserResponseSchema,
  AdminStartImpersonationResponseSchema,
  AdminStopImpersonationResponseSchema,
  AdminTenantDetailResponseSchema,
  AdminTenantFeatureResolutionResponseSchema,
  AdminTenantListResponseSchema,
  AdminTenantUserMutationResponseSchema,
  AdminTenantUsersResponseSchema,
} from '@agentmou/contracts';

import {
  adminChangeTenantVerticalSchema,
  adminCreateTenantUserSchema,
  adminStartImpersonationSchema,
  adminStopImpersonationSchema,
  adminTenantListQuerySchema,
  adminTenantParamsSchema,
  adminTenantUserParamsSchema,
  adminUpdateTenantStatusSchema,
  adminUpdateTenantEnabledVerticalsSchema,
  adminUpdateTenantUserSchema,
} from './admin.schema.js';
import { AdminService } from './admin.service.js';
import { setAuthSessionCookie } from '../../lib/auth-sessions.js';

function handleAdminRouteError(reply: FastifyReply, error: unknown) {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = Number((error as { statusCode: number }).statusCode);
    const message =
      'message' in error && typeof (error as { message?: string }).message === 'string'
        ? (error as { message: string }).message
        : 'Request failed';

    return reply.status(statusCode).send({ error: message });
  }

  throw error;
}

export async function adminRoutes(fastify: FastifyInstance) {
  const service = new AdminService();

  fastify.get(
    '/tenants',
    {
      schema: {
        querystring: adminTenantListQuerySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const response = await service.listTenants(request.query as never);
        return reply.send(AdminTenantListResponseSchema.parse(response));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId',
    {
      schema: {
        params: adminTenantParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const tenant = await service.getTenantDetail(tenantId);
        if (!tenant) {
          return reply.status(404).send({ error: 'Tenant not found' });
        }

        return reply.send(AdminTenantDetailResponseSchema.parse({ tenant }));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.patch(
    '/tenants/:tenantId/status',
    {
      schema: {
        params: adminTenantParamsSchema,
        body: adminUpdateTenantStatusSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };

        const tenant = await service.changeTenantStatus({
          tenantId,
          body: request.body as never,
          actorUserId: request.userId!,
          actorTenantId: request.adminTenantId!,
        });

        return reply.send(AdminTenantDetailResponseSchema.parse({ tenant }));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.patch(
    '/tenants/:tenantId/vertical',
    {
      schema: {
        params: adminTenantParamsSchema,
        body: adminChangeTenantVerticalSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const body = request.body as { activeVertical: 'internal' | 'clinic' | 'fisio' };

        const tenant = await service.changeTenantVertical({
          tenantId,
          activeVertical: body.activeVertical,
          actorUserId: request.userId!,
          actorTenantId: request.adminTenantId!,
        });

        return reply.send(AdminTenantDetailResponseSchema.parse({ tenant }));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.patch(
    '/tenants/:tenantId/verticals-enabled',
    {
      schema: {
        params: adminTenantParamsSchema,
        body: adminUpdateTenantEnabledVerticalsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const body = request.body as { enabled: ('internal' | 'clinic' | 'fisio')[] };

        const tenant = await service.updateTenantEnabledVerticals({
          tenantId,
          enabled: body.enabled,
          actorUserId: request.userId!,
          actorTenantId: request.adminTenantId!,
        });

        return reply.send(AdminTenantDetailResponseSchema.parse({ tenant }));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/users',
    {
      schema: {
        params: adminTenantParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const response = await service.listTenantUsers(tenantId);
        return reply.send(AdminTenantUsersResponseSchema.parse(response));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/feature-resolution',
    {
      schema: {
        params: adminTenantParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const resolution = await service.getTenantFeatureResolution(tenantId);
        if (!resolution) {
          return reply.status(404).send({ error: 'Tenant not found' });
        }
        return reply.send(AdminTenantFeatureResolutionResponseSchema.parse({ resolution }));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/users',
    {
      schema: {
        params: adminTenantParamsSchema,
        body: adminCreateTenantUserSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const response = await service.createTenantUser({
          tenantId,
          body: request.body as never,
          actorUserId: request.userId!,
          actorTenantId: request.adminTenantId!,
        });

        return reply.status(201).send(AdminTenantUserMutationResponseSchema.parse(response));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.patch(
    '/tenants/:tenantId/users/:userId',
    {
      schema: {
        params: adminTenantUserParamsSchema,
        body: adminUpdateTenantUserSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = request.params as { tenantId: string; userId: string };
        const response = await service.updateTenantUser({
          tenantId,
          userId,
          body: request.body as never,
          actorUserId: request.userId!,
          actorTenantId: request.adminTenantId!,
        });

        return reply.send(AdminTenantUserMutationResponseSchema.parse(response));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.delete(
    '/tenants/:tenantId/users/:userId',
    {
      schema: {
        params: adminTenantUserParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = request.params as { tenantId: string; userId: string };
        const response = await service.deleteTenantUser({
          tenantId,
          userId,
          actorUserId: request.userId!,
          actorTenantId: request.adminTenantId!,
        });

        return reply.send(AdminDeleteTenantUserResponseSchema.parse(response));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/impersonation',
    {
      schema: {
        params: adminTenantParamsSchema,
        body: adminStartImpersonationSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const response = await service.startImpersonation({
          tenantId,
          body: request.body as never,
          actorUserId: request.userId!,
          actorTenantId: request.adminTenantId!,
        });

        await setAuthSessionCookie(reply, response.cookieSession);
        const { cookieSession: _cookieSession, ...payload } = response;
        return reply.status(201).send(AdminStartImpersonationResponseSchema.parse(payload));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );
}

export async function adminImpersonationSessionRoutes(fastify: FastifyInstance) {
  const service = new AdminService();

  fastify.post(
    '/impersonation/stop',
    {
      schema: {
        body: adminStopImpersonationSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const response = await service.stopImpersonation({
          body: request.body as never,
          authContext: request.authContext,
          authSessionId: request.authSession?.id,
        });

        await setAuthSessionCookie(reply, response.cookieSession);
        const { cookieSession: _cookieSession, ...payload } = response;
        return reply.send(AdminStopImpersonationResponseSchema.parse(payload));
      } catch (error) {
        return handleAdminRouteError(reply, error);
      }
    }
  );
}
