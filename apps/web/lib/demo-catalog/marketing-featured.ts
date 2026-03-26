/**
 * Curated subset of the demo catalog for marketing hero sections.
 * Order is display order. IDs must exist in demo `agentTemplates`, `workflowTemplates`, or `packTemplates`.
 */

export const marketingFeaturedAgentIds: readonly string[] = [
  'agent-inbox-triage',
  'agent-meeting-prep',
  'agent-market-monitor',
  'agent-ticket-router',
] as const;

export const marketingFeaturedWorkflowIds: readonly string[] = [
  'wf-01',
  'wf-04',
  'wf-03',
  'wf-02',
] as const;

/** Pack template `id` values (e.g. pack-support-starter), not slug */
export const marketingFeaturedPackIds: readonly string[] = [
  'pack-support-starter',
  'pack-sales-accelerator',
  'pack-solo-founder',
] as const;
