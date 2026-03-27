import { z } from 'zod';
import { TenantPlanSchema, TenantSettingsSchema, TenantTypeSchema } from '@agentmou/contracts';

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: TenantTypeSchema.default('business'),
  plan: TenantPlanSchema.default('free'),
  ownerId: z.string().uuid('Owner ID must be a valid UUID'),
  settings: TenantSettingsSchema.partial().strict().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: TenantTypeSchema.optional(),
  plan: TenantPlanSchema.optional(),
});

export const tenantSettingsSchema = TenantSettingsSchema.partial().strict();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
