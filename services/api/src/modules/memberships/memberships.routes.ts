import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  TenantMemberResponseSchema,
  TenantMembersResponseSchema,
  TenantMemberSchema,
} from '@agentmou/contracts';
import { z } from 'zod';
import { MembershipsService } from './memberships.service.js';
import {
  addMemberSchema,
  updateMemberRoleSchema,
  type AddMemberInput,
  type UpdateMemberRoleInput,
} from './memberships.schema.js';

const membershipResponseSchema = z.object({
  membership: TenantMemberSchema,
});

export async function membershipRoutes(fastify: FastifyInstance) {
  const membershipsService = new MembershipsService();

  fastify.get('/tenants/:tenantId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const members = await membershipsService.listMembers(tenantId);
    return reply.send(TenantMembersResponseSchema.parse({ members }));
  });

  fastify.post('/tenants/:tenantId/members', {
    schema: { body: addMemberSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const { tenantId } = request.params as { tenantId: string };
      const membership = await membershipsService.addMember(
        tenantId,
        request.body as AddMemberInput,
      );
      return reply.send(membershipResponseSchema.parse({ membership }));
    },
  });

  fastify.get('/tenants/:tenantId/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, memberId } = request.params as { tenantId: string; memberId: string };
    const member = await membershipsService.getMember(tenantId, memberId);
    if (!member) {
      return reply.status(404).send({ error: 'Member not found' });
    }
    return reply.send(TenantMemberResponseSchema.parse({ member }));
  });

  fastify.put('/tenants/:tenantId/members/:memberId', {
    schema: { body: updateMemberRoleSchema },
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const { tenantId, memberId } = request.params as { tenantId: string; memberId: string };
      const membership = await membershipsService.updateMemberRole(
        tenantId,
        memberId,
        (request.body as UpdateMemberRoleInput).role,
      );
      if (!membership) {
        return reply.status(404).send({ error: 'Member not found' });
      }
      return reply.send(membershipResponseSchema.parse({ membership }));
    },
  });

  fastify.delete('/tenants/:tenantId/members/:memberId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, memberId } = request.params as { tenantId: string; memberId: string };
    const result = await membershipsService.removeMember(tenantId, memberId);
    return reply.send(result);
  });
}
