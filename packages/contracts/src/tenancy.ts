import { z } from 'zod';

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export const TenantTypeSchema = z.enum(['business', 'personal']);
export type TenantType = z.infer<typeof TenantTypeSchema>;

export const TenantPlanSchema = z.enum(['free', 'starter', 'pro', 'scale', 'enterprise']);
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

export const TenantSettingsSchema = z.object({
  timezone: z.string(),
  defaultHITL: z.boolean(),
  logRetentionDays: z.number(),
  memoryRetentionDays: z.number(),
});
export type TenantSettings = z.infer<typeof TenantSettingsSchema>;

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: TenantTypeSchema,
  plan: TenantPlanSchema,
  createdAt: z.string(),
  ownerId: z.string(),
  settings: TenantSettingsSchema,
});

export type Tenant = z.infer<typeof TenantSchema>;

export const TenantsResponseSchema = z.object({
  tenants: z.array(TenantSchema),
});

export type TenantsResponse = z.infer<typeof TenantsResponseSchema>;

export const TenantResponseSchema = z.object({
  tenant: TenantSchema,
});

export type TenantResponse = z.infer<typeof TenantResponseSchema>;

export const TenantSettingsResponseSchema = z.object({
  settings: TenantSettingsSchema,
});

export type TenantSettingsResponse = z.infer<typeof TenantSettingsResponseSchema>;

// ---------------------------------------------------------------------------
// User & Roles
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(['owner', 'admin', 'operator', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const TenantMemberSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  name: z.string(),
  role: UserRoleSchema,
  joinedAt: z.string(),
  lastActiveAt: z.string(),
});

export type TenantMember = z.infer<typeof TenantMemberSchema>;

export const TenantMembersResponseSchema = z.object({
  members: z.array(TenantMemberSchema),
});

export type TenantMembersResponse = z.infer<typeof TenantMembersResponseSchema>;

export const TenantMemberResponseSchema = z.object({
  member: TenantMemberSchema,
});

export type TenantMemberResponse = z.infer<typeof TenantMemberResponseSchema>;
