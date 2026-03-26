/**
 * Maps demo template IDs (mock-data / UI) to operational manifest IDs under
 * `catalog/` and `workflows/public/`. When a demo ID is absent here and also
 * absent from the generated operational index under the same ID, the demo
 * provider treats the item as preview ("Coming soon").
 */

/** Demo agent template id -> operational agent manifest id */
export const demoAgentIdToOperationalId: Record<string, string> = {
  'agent-inbox-triage': 'inbox-triage',
};

/** Demo pack template id -> operational pack manifest id */
export const demoPackIdToOperationalId: Record<string, string> = {
  'pack-support-starter': 'support-starter',
  'pack-sales-accelerator': 'sales-accelerator',
};

/** Demo workflow template id -> operational workflow manifest id */
export const demoWorkflowIdToOperationalId: Record<string, string> = {
  'wf-01': 'wf-01-auto-label-gmail',
};
