import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  AgentProfile,
  ApprovalIntent,
  OpenClawCapability,
  OpenClawOperatorMessage,
  OpenClawPlannedDelegation,
  OpenClawPlannedWorkOrder,
} from '@agentmou/contracts';

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

export class FileStateStore {
  private readonly stateDir: string;

  constructor(stateDir = process.env.OPENCLAW_STATE_DIR || './.openclaw-state') {
    this.stateDir = path.resolve(stateDir);
  }

  async initialize() {
    await mkdir(this.tenantsDir(), { recursive: true });
    await mkdir(this.sessionsDir(), { recursive: true });
  }

  async loadTenantRegistry(tenantId: string) {
    return this.readJson<StoredTenantRegistry>(this.tenantRegistryPath(tenantId));
  }

  async saveTenantRegistry(registry: StoredTenantRegistry) {
    await this.writeJson(this.tenantRegistryPath(registry.tenantId), registry);
  }

  async loadSession(remoteSessionId: string) {
    return this.readJson<StoredRemoteSession>(this.sessionPath(remoteSessionId));
  }

  async saveSession(session: StoredRemoteSession) {
    await this.writeJson(this.sessionPath(session.remoteSessionId), session);
  }

  private tenantsDir() {
    return path.join(this.stateDir, 'tenants');
  }

  private sessionsDir() {
    return path.join(this.stateDir, 'sessions');
  }

  private tenantRegistryPath(tenantId: string) {
    return path.join(this.tenantsDir(), `${tenantId}.json`);
  }

  private sessionPath(remoteSessionId: string) {
    return path.join(this.sessionsDir(), `${remoteSessionId}.json`);
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const contents = await readFile(filePath, 'utf8');
      return JSON.parse(contents) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private async writeJson(filePath: string, value: unknown) {
    await mkdir(path.dirname(filePath), { recursive: true });

    const tempPath = `${filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
    await rename(tempPath, filePath);
  }
}
