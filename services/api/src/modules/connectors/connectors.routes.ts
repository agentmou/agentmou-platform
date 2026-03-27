import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  ConnectorsResponseSchema,
  ConnectorResponseSchema,
} from '@agentmou/contracts';
import { getApiConfig } from '../../config.js';
import { ConnectorsService } from './connectors.service.js';
import { OAuthService, OAuthError } from './oauth.service.js';

export async function connectorRoutes(fastify: FastifyInstance) {
  const service = new ConnectorsService();
  const oauthService = new OAuthService();

  fastify.get('/tenants/:tenantId/connectors', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const connectors = await service.listConnectors(tenantId);
    return reply.send(ConnectorsResponseSchema.parse({ connectors }));
  });

  fastify.get('/tenants/:tenantId/connectors/:connectorId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, connectorId } = request.params as { tenantId: string; connectorId: string };
    const connector = await service.getConnector(tenantId, connectorId);
    if (!connector) return reply.status(404).send({ error: 'Connector not found' });
    return reply.send(ConnectorResponseSchema.parse({ connector }));
  });

  fastify.post('/tenants/:tenantId/connectors', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { provider, scopes } = request.body as { provider: string; scopes?: string[] };
    const connector = await service.createConnector(
      tenantId,
      provider,
      scopes,
      request.userId,
    );
    return reply.status(201).send(ConnectorResponseSchema.parse({ connector }));
  });

  fastify.delete('/tenants/:tenantId/connectors/:connectorId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, connectorId } = request.params as { tenantId: string; connectorId: string };
    await service.deleteConnector(tenantId, connectorId, request.userId);
    return reply.send({ success: true });
  });

  fastify.post('/tenants/:tenantId/connectors/:connectorId/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, connectorId } = request.params as { tenantId: string; connectorId: string };
    const result = await service.testConnection(
      tenantId,
      connectorId,
      request.userId,
    );
    return reply.send(result);
  });

  // --- OAuth: initiate flow (tenant-scoped, requires auth) ------------------

  fastify.get(
    '/tenants/:tenantId/connectors/oauth/:provider/authorize',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId, provider } = request.params as {
        tenantId: string;
        provider: string;
      };
      const { redirect_url } = (request.query as { redirect_url?: string });

      try {
        const url = await oauthService.getAuthorizeUrl(tenantId, provider, redirect_url);
        return reply.send({ url });
      } catch (err) {
        if (err instanceof OAuthError) {
          return reply.status(400).send({ error: err.message, code: err.code });
        }
        throw err;
      }
    }
  );
}

/**
 * Public OAuth callback route — registered outside auth middleware
 * because Google redirects here without a JWT.
 */
export async function oauthCallbackRoutes(fastify: FastifyInstance) {
  const oauthService = new OAuthService();
  const { webAppBaseUrl: WEB_BASE_URL } = getApiConfig();

  fastify.get('/oauth/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code, state, error } = request.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      return reply.redirect(
        `${WEB_BASE_URL}/auth/error?reason=oauth_denied&provider=gmail`
      );
    }

    if (!code || !state) {
      return reply.status(400).send({ error: 'Missing code or state parameter' });
    }

    try {
      const result = await oauthService.handleCallback(code, state);

      const redirectTarget = result.redirectUrl
        || `${WEB_BASE_URL}/app/${result.tenantId}/settings`;

      const separator = redirectTarget.includes('?') ? '&' : '?';
      return reply.redirect(
        `${redirectTarget}${separator}connector=${result.provider}&status=connected`
      );
    } catch (err) {
      fastify.log.error(err, 'OAuth callback failed');

      if (err instanceof OAuthError) {
        return reply.redirect(
          `${WEB_BASE_URL}/auth/error?reason=${err.code}&provider=gmail`
        );
      }

      return reply.redirect(
        `${WEB_BASE_URL}/auth/error?reason=unknown&provider=gmail`
      );
    }
  });
}
