import { Job } from 'bullmq';

export interface ApprovalTimeoutJobData {
  tenantId: string;
  approvalId: string;
  actionOnTimeout: 'auto_approve' | 'auto_reject' | 'escalate';
  escalationTarget?: string;
}

export class ApprovalTimeoutJob {
  static async process(job: Job<ApprovalTimeoutJobData>) {
    const { tenantId, approvalId, actionOnTimeout, escalationTarget } = job.data;

    console.log(`Processing approval timeout for ${approvalId}`);

    try {
      // Get current approval status
      const approval = await this.getApproval(tenantId, approvalId);

      // Check if still pending
      if (approval.status !== 'pending') {
        return { skipped: true, reason: `approval already ${approval.status}` };
      }

      // Take action based on timeout policy
      if (actionOnTimeout === 'auto_approve') {
        return await this.autoApprove(tenantId, approvalId);
      } else if (actionOnTimeout === 'auto_reject') {
        return await this.autoReject(tenantId, approvalId);
      } else if (actionOnTimeout === 'escalate') {
        return await this.escalate(tenantId, approvalId, escalationTarget);
      }

      return { success: true, action: actionOnTimeout };
    } catch (error) {
      console.error('Approval timeout processing failed:', error);
      throw error;
    }
  }

  private static async getApproval(tenantId: string, approvalId: string) {
    // Get approval from database
    return { id: approvalId, status: 'pending' };
  }

  private static async autoApprove(tenantId: string, approvalId: string) {
    // Auto-approve pending approval
    return { action: 'approved', approvedAt: new Date() };
  }

  private static async autoReject(tenantId: string, approvalId: string) {
    // Auto-reject pending approval
    return { action: 'rejected', rejectedAt: new Date() };
  }

  private static async escalate(tenantId: string, approvalId: string, target?: string) {
    // Escalate to another approver
    return { action: 'escalated', escalatedTo: target };
  }
}
