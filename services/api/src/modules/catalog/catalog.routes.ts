import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CatalogService } from './catalog.service';

export async function catalogRoutes(fastify: FastifyInstance) {
  const catalogService = new CatalogService();

  fastify.get('/agents', async (request: FastifyRequest, reply: FastifyReply) => {
    const { category, tags } = request.query as {
      category?: string;
      tags?: string;
    };
    const parsedTags = tags ? tags.split(',') : undefined;
    const agents = await catalogService.listAgents({ category, tags: parsedTags });
    return reply.send({ agents });
  });

  fastify.get('/agents/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const agent = await catalogService.getAgent(id);
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    return reply.send({ agent });
  });

  fastify.get('/packs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { category } = request.query as { category?: string };
    const packs = await catalogService.listPacks({ category });
    return reply.send({ packs });
  });

  fastify.get('/packs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const pack = await catalogService.getPack(id);
    if (!pack) return reply.status(404).send({ error: 'Pack not found' });
    return reply.send({ pack });
  });

  fastify.get('/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, category } = request.query as {
      status?: string;
      category?: string;
    };
    const workflows = await catalogService.listWorkflows({ status, category });
    return reply.send({ workflows });
  });

  fastify.get('/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const workflow = await catalogService.getWorkflow(id);
    if (!workflow) return reply.status(404).send({ error: 'Workflow not found' });
    return reply.send({ workflow });
  });

  fastify.get('/categories', async (_request: FastifyRequest, reply: FastifyReply) => {
    const categories = await catalogService.listCategories();
    return reply.send({ categories });
  });

  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, type } = request.query as {
      q?: string;
      type?: 'agent' | 'pack' | 'workflow';
    };
    if (!q) return reply.status(400).send({ error: 'Query parameter "q" is required' });
    const results = await catalogService.searchCatalog(q, { type });
    return reply.send({ results });
  });
}
