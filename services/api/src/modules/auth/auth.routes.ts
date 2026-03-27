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
      return reply.status(201).send(result);
    },
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
      return reply.send(result);
    },
  );

  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await service.getCurrentUser(request.headers.authorization);
    return reply.send({ user });
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
    },
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
    },
  );
}
