/**
 * Type-safe re-exports of the Reflag flag namespaces.
 *
 * Browser code imports `PlanFlagKey` from here instead of reaching into the
 * server catalog, which would leak a server module to the client bundle.
 * Both namespaces are maintained in:
 *
 *   services/api/src/modules/feature-flags/catalog.ts
 *
 * Adding a new key requires updating the server catalog, the Zod schema in
 * packages/contracts/src/feature-flags.ts, and — for `plan.*` only — the
 * pricing mapping in apps/web/lib/marketing/clinic-site.ts.
 */
export type { PlanFlagKey } from '@agentmou/contracts';
