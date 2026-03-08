import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.string().min(1).default('business'),
  plan: z.string().min(1).default('free'),
  ownerId: z.string().uuid('Owner ID must be a valid UUID'),
  settings: z.record(z.unknown()).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.string().min(1).optional(),
  plan: z.string().min(1).optional(),
});

export const tenantSettingsSchema = z.record(z.unknown());

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
