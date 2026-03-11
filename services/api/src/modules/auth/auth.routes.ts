import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from './auth.schema.js';

export async function authRoutes(fastify: FastifyInstance) {
  const service = new AuthService();

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
}
