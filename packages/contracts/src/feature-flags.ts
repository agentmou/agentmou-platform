import { z } from 'zod';

/**
 * Feature flag taxonomy.
 *
 * Two orthogonal namespaces live in Reflag — each with a different lifecycle
 * and a different consumer:
 *
 *   - `rollout.<vertical>.<feature>` — deployment strategy. A rollout flag is
 *     created when a feature enters canary, flipped to 100% when it ships, and
 *     **deleted** when the rollout ends. Rollouts are short-lived.
 *
 *   - `plan.<vertical>.<capability>` — commercial entitlement. A plan flag
 *     represents something a tenant has purchased (or not) based on its plan
 *     tier. Plan flags live **as long as the capability exists** in the
 *     product. They are the backing implementation of the pricing page.
 *
 * Authorization decisions must be driven by `plan.*` flags (resolved
 * server-side and surfaced in `TenantExperience.flags`). `rollout.*` flags
 * should never be checked from the client for authz.
 */

/**
 * Commercial-entitlement flag keys for the clinic vertical.
 *
 * These map 1:1 to the capabilities listed on the public pricing page and
 * to the `ModuleKey` surface of `tenant_modules`. New plan flags must be
 * added both here and in the pricing mapping in
 * `apps/web/lib/marketing/clinic-site.ts`.
 */
export const PlanFlagKeySchema = z.enum([
  'plan.clinic.core_reception',
  'plan.clinic.voice.inbound',
  'plan.clinic.voice.outbound',
  'plan.clinic.forms',
  'plan.clinic.confirmations',
  'plan.clinic.gap_recovery',
  'plan.clinic.reactivation',
  'plan.clinic.waitlist',
  'plan.clinic.multi_location',
  'plan.clinic.advanced_settings',
  'plan.clinic.priority_support',
]);

/** TypeScript view of the plan-entitlement flag namespace. */
export type PlanFlagKey = z.infer<typeof PlanFlagKeySchema>;

/** Response payload for a resolved plan-entitlement set. */
export const PlanEntitlementsSchema = z.record(PlanFlagKeySchema, z.boolean());

/** TypeScript view of a resolved plan-entitlement set. */
export type PlanEntitlements = z.infer<typeof PlanEntitlementsSchema>;
