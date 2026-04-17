import { z } from 'zod';

/** Canonical product verticals that a tenant can activate. */
export const VerticalKeySchema = z.enum(['internal', 'clinic', 'fisio']);

/** TypeScript view of supported tenant verticals. */
export type VerticalKey = z.infer<typeof VerticalKeySchema>;

/**
 * Vertical identity for a tenant: which verticals are available to operate
 * in (`enabled`) and which one is currently rendered (`active`).
 *
 * `active` must always be a member of `enabled`. Today every tenant has
 * exactly one enabled vertical (`enabled = [active]`); the schema supports
 * `enabled.length > 1` so the data model can grow into multi-vertical
 * tenants without a contract migration.
 *
 * Entitlements (plan, modules, feature flags) are orthogonal to vertical
 * identity and live in `TenantExperience.flags` + `modules`.
 */
export const TenantVerticalConfigSchema = z
  .object({
    active: VerticalKeySchema,
    enabled: z.array(VerticalKeySchema).min(1),
  })
  .refine((value) => value.enabled.includes(value.active), {
    message: 'active vertical must appear in the enabled list',
    path: ['active'],
  });

/** TypeScript shape for the vertical identity of a tenant. */
export type TenantVerticalConfig = z.infer<typeof TenantVerticalConfigSchema>;

/** Response payload for `GET /api/v1/tenants/:id/verticals`. */
export const TenantVerticalsResponseSchema = z.object({
  verticals: TenantVerticalConfigSchema,
});

/** TypeScript shape for the tenant verticals endpoint response. */
export type TenantVerticalsResponse = z.infer<typeof TenantVerticalsResponseSchema>;
