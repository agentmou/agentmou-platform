import { createServiceLogger } from '@agentmou/observability';

/**
 * Approval gate definition attached to high-risk execution paths.
 */
const logger = createServiceLogger('agent-engine', {
  component: 'approval-gates',
});

export interface ApprovalGate {
  id: string;
  name: string;
  description: string;
  conditions: ApprovalCondition[];
  approvers: string[];
  timeout?: number; // seconds
  escalationPolicy?: EscalationPolicy;
}

/**
 * Condition checked to determine whether approval is required.
 */
export interface ApprovalCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'matches';
  value: any;
}

/**
 * Escalation path triggered when an approval is not answered in time.
 */
export interface EscalationPolicy {
  type: 'user' | 'role' | 'webhook';
  target: string;
  delaySeconds: number;
}

/**
 * Persistable approval request created for a gated action.
 */
export interface ApprovalRequest {
  id: string;
  gateId: string;
  runId: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: string;
  reason?: string;
  context: any;
}

/**
 * Decision payload submitted by an approver.
 */
export interface ApprovalResponse {
  approved: boolean;
  reason?: string;
  respondedBy: string;
  respondedAt: Date;
}

/**
 * Coordinates approval gate evaluation, request creation, and responses.
 */
export class ApprovalGateManager {
  private gates: Map<string, ApprovalGate> = new Map();
  private requests: Map<string, ApprovalRequest> = new Map();

  registerGate(gate: ApprovalGate) {
    this.gates.set(gate.id, gate);
  }

  getGate(id: string): ApprovalGate | undefined {
    return this.gates.get(id);
  }

  async shouldRequireApproval(
    gateId: string,
    context: any
  ): Promise<{ requiresApproval: boolean; gate?: ApprovalGate }> {
    const gate = this.getGate(gateId);
    if (!gate) {
      return { requiresApproval: false };
    }

    const matchesCondition = await this.evaluateConditions(gate.conditions, context);
    return { requiresApproval: matchesCondition.length > 0, gate };
  }

  async requestApproval(gateId: string, runId: string, context: any): Promise<ApprovalRequest> {
    const gate = this.getGate(gateId);
    if (!gate) {
      throw new Error(`Gate ${gateId} not found`);
    }

    const request: ApprovalRequest = {
      id: `approval_${Date.now()}`,
      gateId,
      runId,
      status: 'pending',
      requestedAt: new Date(),
      context,
    };

    this.requests.set(request.id, request);

    // Notify approvers
    await this.notifyApprovers(gate, request);

    // Schedule timeout if configured
    if (gate.timeout) {
      this.scheduleTimeout(request, gate.timeout);
    }

    return request;
  }

  async respondToApproval(requestId: string, response: ApprovalResponse): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    request.status = response.approved ? 'approved' : 'rejected';
    request.respondedAt = response.respondedAt;
    request.respondedBy = response.respondedBy;
    request.reason = response.reason;

    return request;
  }

  private async evaluateConditions(
    conditions: ApprovalCondition[],
    context: any
  ): Promise<ApprovalCondition[]> {
    // Evaluate conditions against context
    return conditions;
  }

  private async notifyApprovers(gate: ApprovalGate, request: ApprovalRequest) {
    // Notify all approvers (email, Slack, etc.)
    logger.info(
      {
        approvers: gate.approvers,
        gateId: gate.id,
        requestId: request.id,
      },
      'Notifying approvers for approval request'
    );
  }

  private scheduleTimeout(request: ApprovalRequest, timeoutSeconds: number) {
    // Schedule timeout handling
    setTimeout(async () => {
      if (request.status === 'pending') {
        request.status = 'timeout';
        // Handle escalation if configured
      }
    }, timeoutSeconds * 1000);
  }

  async getRequest(requestId: string): Promise<ApprovalRequest | undefined> {
    return this.requests.get(requestId);
  }

  async getRequestsByRun(runId: string): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values()).filter((r) => r.runId === runId);
  }
}
