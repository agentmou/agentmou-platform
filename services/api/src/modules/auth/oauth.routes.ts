import { FastifyInstance } from 'fastify';
import {
  startB2cOAuth,
  completeB2cOAuthCallback,
  exchangeOAuthLoginCode,
  isOAuthProviderConfigured,
  type B2CProvider,
} from './oauth.service.js';
import { checkOAuthRateLimit, clientIp } from './oauth-rate-limit.js';
import { oauthExchangeSchema, type OauthExchangeInput } from './auth.schema.js';
import { setAuthSessionCookie } from '../../lib/auth-sessions.js';

export function registerB2cOAuthRoutes(fastify: FastifyInstance) {
  fastify.get('/oauth/providers', async () => ({
    google: isOAuthProviderConfigured('google'),
    microsoft: isOAuthProviderConfigured('microsoft'),
  }));

  fastify.get<{
    Params: { provider: string };
    Querystring: { return_url?: string };
  }>('/oauth/:provider/authorize', async (request, reply) => {
    if (!checkOAuthRateLimit(clientIp(request))) {
      return reply.status(429).send({ message: 'Too many requests' });
    }
    const provider = request.params.provider as B2CProvider;
    if (provider !== 'google' && provider !== 'microsoft') {
      return reply.status(400).send({ message: 'Unknown provider' });
    }
    const returnUrl = request.query.return_url;
    if (!returnUrl) {
      return reply.status(400).send({ message: 'return_url is required' });
    }
    try {
      const { redirectUrl } = await startB2cOAuth(provider, returnUrl);
      return reply.redirect(redirectUrl);
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string };
      return reply.status(err.statusCode ?? 500).send({ message: err.message ?? 'OAuth error' });
    }
  });

  fastify.get<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>('/oauth/:provider/callback', async (request, reply) => {
    if (!checkOAuthRateLimit(clientIp(request))) {
      return reply.status(429).send({ message: 'Too many requests' });
    }
    if (request.query.error) {
      return reply.status(400).send({ message: request.query.error });
    }
    const provider = request.params.provider as B2CProvider;
    if (provider !== 'google' && provider !== 'microsoft') {
      return reply.status(400).send({ message: 'Unknown provider' });
    }
    const code = request.query.code;
    const state = request.query.state;
    if (!code || !state) {
      return reply.status(400).send({ message: 'Missing code or state' });
    }
    try {
      const { redirectTo } = await completeB2cOAuthCallback(provider, code, state);
      return reply.redirect(redirectTo);
    } catch (e: unknown) {
      const err = e as { statusCode?: number; message?: string };
      return reply
        .status(err.statusCode ?? 500)
        .send({ message: err.message ?? 'OAuth callback error' });
    }
  });

  fastify.post<{ Body: OauthExchangeInput }>(
    '/oauth/exchange',
    {
      schema: {
        body: oauthExchangeSchema,
      },
    },
    async (request, reply) => {
      if (!checkOAuthRateLimit(clientIp(request))) {
        return reply.status(429).send({ message: 'Too many requests' });
      }
      try {
        const result = await exchangeOAuthLoginCode(request.body.code);
        await setAuthSessionCookie(reply, result.cookieSession);
        const { cookieSession: _cookieSession, ...response } = result;
        return reply.send(response);
      } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        return reply
          .status(err.statusCode ?? 500)
          .send({ message: err.message ?? 'Exchange failed' });
      }
    }
  );
}
