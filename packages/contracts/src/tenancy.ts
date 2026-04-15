import { z } from 'zod';
import { VerticalKeySchema } from './verticals';

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

/** Supported tenant categories for the control plane. */
export const TenantTypeSchema = z.enum(['business', 'personal']);

/** TypeScript view of supported tenant categories. */
export type TenantType = z.infer<typeof TenantTypeSchema>;

/** Commercial plans available to a tenant. */
export const TenantPlanSchema = z.enum(['free', 'starter', 'pro', 'scale', 'enterprise']);

/** TypeScript view of supported tenant plans. */
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

/** Persisted tenant-level defaults used by the platform runtime. */
export const TenantSettingsSchema = z.object({
  timezone: z.string(),
  defaultHITL: z.boolean(),
  logRetentionDays: z.number(),
  memoryRetentionDays: z.number(),
  activeVertical: VerticalKeySchema.default('internal'),
  isPlatformAdminTenant: z.boolean().default(false),
  settingsVersion: z.number().default(2),
  // Legacy compatibility flags kept only while older tenant/bootstrap paths
  // still need to parse pre-activeVertical data. New decision logic should use
  // activeVertical plus resolved tenant experience instead.
  verticalClinicUi: z.boolean().default(false),
  clinicDentalMode: z.boolean().default(false),
  internalPlatformVisible: z.boolean().default(false),
});

/** TypeScript shape for tenant settings. */
export type TenantSettings = z.infer<typeof TenantSettingsSchema>;

/** Core tenant record returned by the API. */
export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: TenantTypeSchema,
  plan: TenantPlanSchema,
  createdAt: z.string(),
  ownerId: z.string(),
  settings: TenantSettingsSchema,
});

/** TypeScript shape for a tenant record. */
export type Tenant = z.infer<typeof TenantSchema>;

/** Response payload for listing tenants. */
export const TenantsResponseSchema = z.object({
  tenants: z.array(TenantSchema),
});

/** TypeScript shape for the tenant list response. */
export type TenantsResponse = z.infer<typeof TenantsResponseSchema>;

/** Response payload for a single tenant lookup. */
export const TenantResponseSchema = z.object({
  tenant: TenantSchema,
});

/** TypeScript shape for a single tenant response. */
export type TenantResponse = z.infer<typeof TenantResponseSchema>;

/** Response payload for tenant settings reads. */
export const TenantSettingsResponseSchema = z.object({
  settings: TenantSettingsSchema,
});

/** TypeScript shape for a tenant settings response. */
export type TenantSettingsResponse = z.infer<typeof TenantSettingsResponseSchema>;

// ---------------------------------------------------------------------------
// User & Roles
// ---------------------------------------------------------------------------

/** Roles that a tenant member can hold. */
export const UserRoleSchema = z.enum(['owner', 'admin', 'operator', 'viewer']);

/** TypeScript view of tenant member roles. */
export type UserRole = z.infer<typeof UserRoleSchema>;

/** Membership record that links a user to a tenant. */
export const TenantMemberSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  name: z.string(),
  role: UserRoleSchema,
  joinedAt: z.string(),
  lastActiveAt: z.string(),
});

/** TypeScript shape for a tenant membership record. */
export type TenantMember = z.infer<typeof TenantMemberSchema>;

/** Response payload for listing tenant members. */
export const TenantMembersResponseSchema = z.object({
  members: z.array(TenantMemberSchema),
});

/** TypeScript shape for a tenant member list response. */
export type TenantMembersResponse = z.infer<typeof TenantMembersResponseSchema>;

/** Response payload for a single tenant member lookup. */
export const TenantMemberResponseSchema = z.object({
  member: TenantMemberSchema,
});

/** TypeScript shape for a single tenant member response. */
export type TenantMemberResponse = z.infer<typeof TenantMemberResponseSchema>;
