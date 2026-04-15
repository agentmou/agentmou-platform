import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from './auth.schema.js';
import { registerB2cOAuthRoutes } from './oauth.routes.js';
import { clearAuthSessionCookie, setAuthSessionCookie } from '../../lib/auth-sessions.js';

export async function authRoutes(fastify: FastifyInstance) {
  const service = new AuthService();

  registerB2cOAuthRoutes(fastify);

  fastify.post(
    '/register',
    {
      schema: {
        body: registerSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as RegisterInput;
      const result = await service.register(body);
      await setAuthSessionCookie(reply, result.cookieSession);
      const { cookieSession: _cookieSession, ...response } = result;
      return reply.status(201).send(response);
    }
  );

  fastify.post(
    '/login',
    {
      schema: {
        body: loginSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as LoginInput;
      const result = await service.login(body);
      await setAuthSessionCookie(reply, result.cookieSession);
      const { cookieSession: _cookieSession, ...response } = result;
      return reply.send(response);
    }
  );

  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await service.getCurrentUser({
      cookieHeader: request.headers.cookie,
      authorization: request.headers.authorization,
    });
    return reply.send(result);
  });

  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await service.logout({
      cookieHeader: request.headers.cookie,
    });
    await clearAuthSessionCookie(reply);
    return reply.send(result);
  });

  fastify.post(
    '/forgot-password',
    {
      schema: {
        body: forgotPasswordSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as ForgotPasswordInput;
      const result = await service.forgotPassword(body.email);
      return reply.send(result);
    }
  );

  fastify.post(
    '/reset-password',
    {
      schema: {
        body: resetPasswordSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as ResetPasswordInput;
      const result = await service.resetPassword(body.token, body.password);
      return reply.send(result);
    }
  );
}
