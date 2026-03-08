export interface N8nWorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  finishedAt?: string;
  data?: unknown;
  error?: string;
}

export interface N8nWorkflowTrigger {
  id: string;
  type: string;
  enabled: boolean;
}
