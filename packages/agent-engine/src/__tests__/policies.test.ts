import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine, type AgentPolicyConfig } from '../policies';

const inboxTriagePolicy: AgentPolicyConfig = {
  permissions: {
    gmail: { read: true, write: true, delete: false },
    slack: { read: false, write: false },
    drive: { read: false, write: false },
  },
  constraints: {
    max_emails_per_run: 50,
    min_confidence_threshold: 0.5,
    require_human_review_for: ['high_priority_deletion', 'spam_marking_above_0.9'],
  },
};

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
    engine.loadPolicyConfig(inboxTriagePolicy);
  });

  describe('permission checks', () => {
    it('should allow gmail.read when permitted', async () => {
      const result = await engine.evaluate('gmail.read');
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('should allow gmail.write when permitted', async () => {
      const result = await engine.evaluate('gmail.write');
      expect(result.allowed).toBe(true);
    });

    it('should deny gmail.delete when not permitted', async () => {
      const result = await engine.evaluate('gmail.delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('should deny slack operations when not permitted', async () => {
      const result = await engine.evaluate('slack.read');
      expect(result.allowed).toBe(false);
    });

    it('should allow unknown providers (no explicit deny)', async () => {
      const result = await engine.evaluate('api.invoke');
      expect(result.allowed).toBe(true);
    });

    it('should allow actions without provider.operation format', async () => {
      const result = await engine.evaluate('execute');
      expect(result.allowed).toBe(true);
    });
  });

  describe('approval requirements', () => {
    it('should require approval for high_priority_deletion', async () => {
      const result = await engine.evaluate('gmail.write', {
        actionType: 'high_priority_deletion',
      });
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });

    it('should require approval for high-risk actions', async () => {
      const result = await engine.evaluate('gmail.write', {
        riskLevel: 'high',
      });
      expect(result.requiresApproval).toBe(true);
    });

    it('should not require approval for low-risk actions', async () => {
      const result = await engine.evaluate('gmail.read', {
        riskLevel: 'low',
      });
      expect(result.requiresApproval).toBe(false);
    });

    it('should not require approval when action type is not in review list', async () => {
      const result = await engine.evaluate('gmail.write', {
        actionType: 'label_application',
      });
      expect(result.requiresApproval).toBe(false);
    });
  });

  describe('registered policy rules', () => {
    it('should deny when a registered policy rule denies', async () => {
      engine.registerPolicy({
        id: 'no-external-api',
        name: 'No External API',
        description: 'Block external API calls',
        rules: [{ id: 'r1', condition: 'api.*', action: 'deny' }],
        constraints: [],
      });

      const result = await engine.evaluate('api.invoke');
      expect(result.allowed).toBe(false);
    });

    it('should require approval when a rule says so', async () => {
      engine.registerPolicy({
        id: 'approve-writes',
        name: 'Approve Writes',
        description: 'All writes need approval',
        rules: [{ id: 'r1', condition: 'gmail.write', action: 'require_approval' }],
        constraints: [],
      });

      const result = await engine.evaluate('gmail.write');
      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('without policy config', () => {
    it('should allow everything when no config is loaded', async () => {
      const emptyEngine = new PolicyEngine();
      const result = await emptyEngine.evaluate('anything.goes');
      expect(result.allowed).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });
  });
});
