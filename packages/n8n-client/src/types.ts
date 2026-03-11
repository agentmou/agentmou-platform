/**
 * Execution metadata returned when inspecting a workflow run.
 */
export interface N8nWorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  finishedAt?: string;
  data?: unknown;
  error?: string;
}

/**
 * Trigger definition associated with an n8n workflow.
 */
export interface N8nWorkflowTrigger {
  id: string;
  type: string;
  enabled: boolean;
}
