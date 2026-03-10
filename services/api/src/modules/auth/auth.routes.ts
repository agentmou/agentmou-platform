import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';

export async function authRoutes(fastify: FastifyInstance) {
  const service = new AuthService();

  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { email: string; password: string; name: string };
    const result = await service.register(body);
    return reply.status(201).send(result);
  });

  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { email: string; password: string };
    const result = await service.login(body);
    return reply.send(result);
  });

  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await service.getCurrentUser(request.headers.authorization);
    return reply.send({ user });
  });
}
