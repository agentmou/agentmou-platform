import { z } from 'zod';

import {
  ClinicModuleEntitlementSchema,
  ModuleKeySchema,
  TenantFeatureDecisionsSchema,
  TenantResolvedFlagsSchema,
} from './clinic';
import { PlanFlagKeySchema } from './feature-flags';
import {
  TenantPlanSchema,
  TenantSettingsSchema,
  TenantTypeSchema,
  UserRoleSchema,
} from './tenancy';
import { VerticalKeySchema } from './verticals';

export const AdminTenantListSortBySchema = z.enum(['name', 'plan', 'vertical', 'createdAt']);
export type AdminTenantListSortBy = z.infer<typeof AdminTenantListSortBySchema>;

export const AdminTenantListSortDirSchema = z.enum(['asc', 'desc']);
export type AdminTenantListSortDir = z.infer<typeof AdminTenantListSortDirSchema>;

export const AdminTenantListFiltersSchema = z.object({
  q: z.string().optional(),
  plan: TenantPlanSchema.optional(),
  vertical: VerticalKeySchema.optional(),
  isPlatformAdminTenant: z.boolean().optional(),
  sortBy: AdminTenantListSortBySchema.optional(),
  sortDir: AdminTenantListSortDirSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});
export type AdminTenantListFilters = z.infer<typeof AdminTenantListFiltersSchema>;

export const AdminTenantVerticalConfigSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  verticalKey: VerticalKeySchema,
  config: z.record(z.unknown()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminTenantVerticalConfig = z.infer<typeof AdminTenantVerticalConfigSchema>;

export const AdminTenantSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: TenantTypeSchema,
  plan: TenantPlanSchema,
  ownerId: z.string(),
  createdAt: z.string(),
  activeVertical: VerticalKeySchema,
  isPlatformAdminTenant: z.boolean(),
  userCount: z.number().int().nonnegative(),
});
export type AdminTenantSummary = z.infer<typeof AdminTenantSummarySchema>;

export const AdminTenantDetailSchema = AdminTenantSummarySchema.extend({
  settings: TenantSettingsSchema,
  verticalConfigs: z.array(AdminTenantVerticalConfigSchema),
});
export type AdminTenantDetail = z.infer<typeof AdminTenantDetailSchema>;

export const AdminTenantListResponseSchema = z.object({
  tenants: z.array(AdminTenantSummarySchema),
  nextCursor: z.string().optional(),
});
export type AdminTenantListResponse = z.infer<typeof AdminTenantListResponseSchema>;

export const AdminTenantDetailResponseSchema = z.object({
  tenant: AdminTenantDetailSchema,
});
export type AdminTenantDetailResponse = z.infer<typeof AdminTenantDetailResponseSchema>;

export const AdminTenantUserSchema = z.object({
  userId: z.string(),
  membershipId: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: UserRoleSchema,
  hasPassword: z.boolean(),
  joinedAt: z.string(),
  lastActiveAt: z.string(),
});
export type AdminTenantUser = z.infer<typeof AdminTenantUserSchema>;

export const AdminTenantUsersResponseSchema = z.object({
  users: z.array(AdminTenantUserSchema),
});
export type AdminTenantUsersResponse = z.infer<typeof AdminTenantUsersResponseSchema>;

export const AdminUserActivationSchema = z.object({
  token: z.string(),
  link: z.string(),
  expiresAt: z.string(),
});
export type AdminUserActivation = z.infer<typeof AdminUserActivationSchema>;

export const AdminCreateTenantUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: UserRoleSchema,
});
export type AdminCreateTenantUserInput = z.infer<typeof AdminCreateTenantUserSchema>;

export const AdminUpdateTenantUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: UserRoleSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.role !== undefined, {
    message: 'Provide at least one field to update',
  });
export type AdminUpdateTenantUserInput = z.infer<typeof AdminUpdateTenantUserSchema>;

export const AdminTenantUserMutationResponseSchema = z.object({
  user: AdminTenantUserSchema,
  activation: AdminUserActivationSchema.optional(),
});
export type AdminTenantUserMutationResponse = z.infer<typeof AdminTenantUserMutationResponseSchema>;

export const AdminDeleteTenantUserResponseSchema = z.object({
  success: z.boolean(),
});
export type AdminDeleteTenantUserResponse = z.infer<typeof AdminDeleteTenantUserResponseSchema>;

export const AdminChangeTenantVerticalSchema = z.object({
  activeVertical: VerticalKeySchema,
});
export type AdminChangeTenantVerticalInput = z.infer<typeof AdminChangeTenantVerticalSchema>;

/**
 * Payload for PATCH /admin/tenants/:id/verticals-enabled.
 *
 * Overwrites the tenant's `tenant_vertical_configs` rows so the list
 * on the server matches `enabled`. The backend enforces that the
 * tenant's current `activeVertical` stays in the list — changing the
 * active vertical is a separate operation (/admin/tenants/:id/vertical).
 */
export const AdminUpdateTenantEnabledVerticalsSchema = z.object({
  enabled: z.array(VerticalKeySchema).min(1),
});
export type AdminUpdateTenantEnabledVerticalsInput = z.infer<
  typeof AdminUpdateTenantEnabledVerticalsSchema
>;

export const AdminStartImpersonationSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});
export type AdminStartImpersonationInput = z.infer<typeof AdminStartImpersonationSchema>;

export const AdminStartImpersonationResponseSchema = z.object({
  sessionId: z.string(),
  expiresAt: z.string(),
});
export type AdminStartImpersonationResponse = z.infer<typeof AdminStartImpersonationResponseSchema>;

export const AdminStopImpersonationSchema = z.object({});
export type AdminStopImpersonationInput = z.infer<typeof AdminStopImpersonationSchema>;

export const AdminStopImpersonationResponseSchema = z.object({
  sessionId: z.string(),
  endedAt: z.string(),
});
export type AdminStopImpersonationResponse = z.infer<typeof AdminStopImpersonationResponseSchema>;

// ---------------------------------------------------------------------------
// Feature resolution (admin trace of plan baseline + Reflag overrides)
// ---------------------------------------------------------------------------

/**
 * One row in the admin feature-resolution trace. The same shape covers both
 * `plan.*` decisions (where `source` is plan-baseline or reflag-plan-override)
 * and `rollout.*` decisions (where `source` is entitlement, readiness, or
 * rollout). The admin UI groups by `kind` to render two separate tables.
 */
export const AdminFeatureDecisionSchema = z.object({
  key: z.string(),
  kind: z.enum(['plan', 'rollout']),
  enabled: z.boolean(),
  source: z.string(),
  reason: z.string().optional(),
  moduleKey: ModuleKeySchema.optional(),
  detail: z.string().optional(),
});
export type AdminFeatureDecision = z.infer<typeof AdminFeatureDecisionSchema>;

export const AdminTenantFeatureResolutionSchema = z.object({
  tenantId: z.string(),
  plan: TenantPlanSchema,
  activeVertical: VerticalKeySchema,
  modules: z.array(ClinicModuleEntitlementSchema),
  planEntitlements: z.record(PlanFlagKeySchema, z.boolean()),
  rolloutFlags: TenantResolvedFlagsSchema,
  decisions: z.array(AdminFeatureDecisionSchema),
  rolloutDecisionsTrace: TenantFeatureDecisionsSchema,
});
export type AdminTenantFeatureResolution = z.infer<typeof AdminTenantFeatureResolutionSchema>;

export const AdminTenantFeatureResolutionResponseSchema = z.object({
  resolution: AdminTenantFeatureResolutionSchema,
});
export type AdminTenantFeatureResolutionResponse = z.infer<
  typeof AdminTenantFeatureResolutionResponseSchema
>;
