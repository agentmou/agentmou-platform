import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MembershipsService } from './memberships.service';
import { addMemberSchema, updateMemberRoleSchema } from './memberships.schema';

export async function membershipRoutes(fastify: FastifyInstance) {
  const membershipsService = new MembershipsService();

  fastify.get('/tenants/:tenantId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const members = await membershipsService.listMembers(tenantId);
    return reply.send({ members });
  });

  fastify.post('/tenants/:tenantId/members', {
    schema: { body: addMemberSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const { tenantId } = request.params as { tenantId: string };
      const membership = await membershipsService.addMember(tenantId, request.body as any);
      return reply.send({ membership });
    },
  });

  fastify.get('/tenants/:tenantId/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, memberId } = request.params as { tenantId: string; memberId: string };
    const member = await membershipsService.getMember(tenantId, memberId);
    if (!member) {
      return reply.status(404).send({ error: 'Member not found' });
    }
    return reply.send({ member });
  });

  fastify.put('/tenants/:tenantId/members/:memberId', {
    schema: { body: updateMemberRoleSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const { tenantId, memberId } = request.params as { tenantId: string; memberId: string };
      const membership = await membershipsService.updateMemberRole(tenantId, memberId, (request.body as any).role);
      if (!membership) {
        return reply.status(404).send({ error: 'Member not found' });
      }
      return reply.send({ membership });
    },
  });

  fastify.delete('/tenants/:tenantId/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, memberId } = request.params as { tenantId: string; memberId: string };
    const result = await membershipsService.removeMember(tenantId, memberId);
    return reply.send(result);
  });
}
