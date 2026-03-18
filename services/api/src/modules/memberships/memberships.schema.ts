import { z } from 'zod';

const membershipRoleSchema = z.enum([
  'owner',
  'admin',
  'member',
  'operator',
  'viewer',
]);

export const addMemberSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  role: membershipRoleSchema,
});

export const updateMemberRoleSchema = z.object({
  role: membershipRoleSchema,
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
