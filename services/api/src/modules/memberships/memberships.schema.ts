import { z } from 'zod';

export const addMemberSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
