export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  constraints: Constraint[];
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval' | 'limit';
  parameters?: Record<string, unknown>;
}

export interface Constraint {
  type: 'rate_limit' | 'cost_limit' | 'scope_limit' | 'time_limit';
  value: unknown;
  description?: string;
}

export interface PolicyEvaluation {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  constraints?: Constraint[];
}

/**
 * Parsed representation of a `policy.yaml` from the catalog.
 */
export interface AgentPolicyConfig {
  permissions: Record<string, Record<string, boolean>>;
  rate_limits?: Record<string, unknown>;
  constraints?: {
    max_emails_per_run?: number;
    min_confidence_threshold?: number;
    require_human_review_for?: string[];
  };
  audit?: Record<string, unknown>;
}

/**
 * Evaluates agent actions against loaded policies.
 *
 * When a policy config from `policy.yaml` is loaded, the engine checks
 * permissions, risk-based approval requirements, and rate limits.
 */
export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();
  private policyConfig: AgentPolicyConfig | null = null;

  registerPolicy(policy: Policy) {
    this.policies.set(policy.id, policy);
  }

  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  /**
   * Load a policy configuration from a parsed `policy.yaml`.
   */
  loadPolicyConfig(config: AgentPolicyConfig): void {
    this.policyConfig = config;
  }

  /**
   * Evaluates whether an action is allowed under the loaded policies.
   *
   * @param action - The action being attempted (e.g. "gmail.read", "gmail.write")
   * @param context - Additional context (risk level, action type, etc.)
   */
  async evaluate(
    action: string,
    context?: {
      agentId?: string;
      riskLevel?: 'low' | 'medium' | 'high';
      actionType?: string;
    }
  ): Promise<PolicyEvaluation> {
    // Check permission-based policies from config
    if (this.policyConfig) {
      const permResult = this.checkPermission(action);
      if (!permResult.allowed) return permResult;

      const approvalResult = this.checkApprovalRequired(action, context);
      if (approvalResult.requiresApproval) return approvalResult;
    }

    // Check registered policy rules
    for (const policy of this.policies.values()) {
      for (const rule of policy.rules) {
        if (this.matchesCondition(rule.condition, action, context)) {
          if (rule.action === 'deny') {
            return {
              allowed: false,
              requiresApproval: false,
              reason: `Denied by policy: ${policy.name}`,
            };
          }
          if (rule.action === 'require_approval') {
            return {
              allowed: true,
              requiresApproval: true,
              reason: `Requires approval per policy: ${policy.name}`,
            };
          }
        }
      }
    }

    return { allowed: true, requiresApproval: false };
  }

  private checkPermission(action: string): PolicyEvaluation {
    if (!this.policyConfig) {
      return { allowed: true, requiresApproval: false };
    }

    // Parse action: "gmail.read" → provider="gmail", operation="read"
    const [provider, operation] = action.split('.');
    if (!provider || !operation) {
      return { allowed: true, requiresApproval: false };
    }

    const providerPerms = this.policyConfig.permissions[provider];
    if (!providerPerms) {
      return { allowed: true, requiresApproval: false };
    }

    if (providerPerms[operation] === false) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Permission denied: ${provider}.${operation} is not allowed`,
      };
    }

    return { allowed: true, requiresApproval: false };
  }

  private checkApprovalRequired(
    action: string,
    context?: { riskLevel?: string; actionType?: string }
  ): PolicyEvaluation {
    const reviewActions = this.policyConfig?.constraints?.require_human_review_for ?? [];

    // Check if action type matches any HITL requirement
    if (context?.actionType && reviewActions.includes(context.actionType)) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `Human review required for: ${context.actionType}`,
      };
    }

    // High-risk actions always require approval
    if (context?.riskLevel === 'high') {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'High-risk action requires human approval',
      };
    }

    return { allowed: true, requiresApproval: false };
  }

  private matchesCondition(
    condition: string,
    action: string,
    context?: Record<string, unknown>
  ): boolean {
    // Simple wildcard matching: "*" matches all, "gmail.*" matches gmail actions
    if (condition === '*') return true;
    if (condition === action) return true;

    const [condProvider] = condition.split('.');
    const [actionProvider] = action.split('.');
    if (condition.endsWith('.*') && condProvider === actionProvider) return true;

    return false;
  }

  async checkConstraints(
    constraints: Constraint[],
    usage: Record<string, number>
  ): Promise<{ valid: boolean; violations: string[] }> {
    const violations: string[] = [];

    for (const constraint of constraints) {
      if (!this.checkConstraint(constraint, usage)) {
        violations.push(`Constraint violation: ${constraint.type} — ${constraint.description ?? ''}`);
      }
    }

    return { valid: violations.length === 0, violations };
  }

  private checkConstraint(constraint: Constraint, usage: Record<string, number>): boolean {
    if (constraint.type === 'rate_limit' && typeof constraint.value === 'number') {
      const currentUsage = usage[constraint.description ?? 'default'] ?? 0;
      return currentUsage < constraint.value;
    }
    return true;
  }
}
