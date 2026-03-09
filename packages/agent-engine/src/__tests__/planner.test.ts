import { describe, it, expect, vi } from 'vitest';
import { Planner } from '../planner';

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  steps: [
                    {
                      id: 'step_1',
                      type: 'tool_call',
                      description: 'Read unread emails',
                      toolName: 'gmail-read',
                      toolInput: { query: 'is:unread', maxResults: 10 },
                      dependencies: [],
                    },
                    {
                      id: 'step_2',
                      type: 'tool_call',
                      description: 'Classify emails',
                      toolName: 'analyze-email',
                      toolInput: {},
                      dependencies: ['step_1'],
                    },
                  ],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe('Planner', () => {
  describe('without OpenAI key (fallback)', () => {
    it('should generate default inbox-triage steps', async () => {
      const planner = new Planner();
      const plan = await planner.createPlan('Triage inbox emails');

      expect(plan.steps).toHaveLength(3);
      expect(plan.steps[0].toolName).toBe('gmail-read');
      expect(plan.steps[1].toolName).toBe('analyze-email');
      expect(plan.steps[2].toolName).toBe('gmail-label');
      expect(plan.id).toMatch(/^plan_/);
      expect(plan.goal).toBe('Triage inbox emails');
    });

    it('should include cost and time estimates', async () => {
      const planner = new Planner();
      const plan = await planner.createPlan('Test goal');

      expect(plan.estimatedCost).toBeGreaterThan(0);
      expect(plan.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('with OpenAI key (LLM planning)', () => {
    it('should generate steps from LLM response', async () => {
      const planner = new Planner({ openaiApiKey: 'test-key' });
      const plan = await planner.createPlan('Triage inbox', {
        systemPrompt: 'You are an email triage assistant',
        availableTools: ['gmail-read', 'analyze-email', 'gmail-label'],
      });

      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0].toolName).toBe('gmail-read');
      expect(plan.steps[1].toolName).toBe('analyze-email');
    });
  });

  describe('validatePlan', () => {
    it('should validate a correct plan', async () => {
      const planner = new Planner();
      const plan = await planner.createPlan('Test');
      const result = await planner.validatePlan(plan);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an empty plan', async () => {
      const planner = new Planner();
      const result = await planner.validatePlan({
        id: 'test',
        goal: 'test',
        steps: [],
        createdAt: new Date(),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Plan has no steps');
    });
  });
});
