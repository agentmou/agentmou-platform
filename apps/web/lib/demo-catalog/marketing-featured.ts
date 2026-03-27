/**
 * Curated subset of the demo catalog for marketing hero sections.
 * Order is display order. Every id must exist in demo data, map to an operational
 * manifest, and use `availability: 'available'` (generally available), or
 * `buildMarketingFeaturedCatalog` throws at build time.
 */

export const marketingFeaturedAgentIds: readonly string[] = ['agent-inbox-triage'] as const;

export const marketingFeaturedWorkflowIds: readonly string[] = ['wf-01'] as const;

/** Pack template `id` values (e.g. pack-support-starter), not slug */
export const marketingFeaturedPackIds: readonly string[] = [
  'pack-support-starter',
  'pack-sales-accelerator',
] as const;
