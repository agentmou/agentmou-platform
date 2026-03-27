import type {
  AgentProfile,
  ApprovalIntent,
  OpenClawCapability,
  OpenClawOperatorMessage,
  OpenClawPlannedDelegation,
  OpenClawPlannedWorkOrder,
} from '@agentmou/contracts';

export interface OpenClawStorageConfig {
  mode: 'file';
  stateDir: string;
}

export interface StoredTenantRegistry {
  tenantId: string;
  agentProfiles: AgentProfile[];
  capabilities: OpenClawCapability[];
  updatedAt: string;
}

export interface StoredTurnRecord {
  turnId: string;
  timestamp: string;
  trigger: 'telegram_message' | 'approval_resolution' | 'system_resume';
  operatorMessage: string;
  approvalIntent?: ApprovalIntent;
  activeAgentId: string;
  summary: string;
  status: 'active' | 'waiting_approval' | 'completed' | 'blocked' | 'cancelled';
  participants: string[];
  toolCalls: string[];
  delegations: OpenClawPlannedDelegation[];
  workOrders: OpenClawPlannedWorkOrder[];
  operatorMessages: OpenClawOperatorMessage[];
  checkpointToken?: string;
}

export interface StoredTraceEvent {
  id: string;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface StoredRemoteSession {
  tenantId: string;
  objectiveId: string;
  remoteSessionId: string;
  activeAgentId: string;
  status: 'active' | 'waiting_approval' | 'completed' | 'blocked' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  checkpointToken?: string;
  traceReference: Record<string, unknown>;
  turns: StoredTurnRecord[];
  traceEvents: StoredTraceEvent[];
}

export interface OpenClawStateStore {
  initialize(): Promise<void>;
  loadTenantRegistry(tenantId: string): Promise<StoredTenantRegistry | null>;
  saveTenantRegistry(registry: StoredTenantRegistry): Promise<void>;
  loadSession(remoteSessionId: string): Promise<StoredRemoteSession | null>;
  saveSession(session: StoredRemoteSession): Promise<void>;
}
