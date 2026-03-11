import OpenAI from 'openai';

/**
 * Single executable step inside an agent plan.
 */
export interface PlanStep {
  id: string;
  type: 'tool_call' | 'agent_invoke' | 'condition' | 'loop' | 'approval';
  description: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  dependencies?: string[];
  config?: Record<string, unknown>;
}

/**
 * Structured plan generated before tools are executed.
 */
export interface ExecutionPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  createdAt: Date;
  estimatedCost?: number;
  estimatedTime?: number;
}

/**
 * Planner configuration for model-backed plan generation.
 */
export interface PlannerConfig {
  openaiApiKey: string;
  model?: string;
}

/**
 * Generates structured execution plans via GPT-4o-mini.
 *
 * Given an agent's system prompt and user input, the planner asks the
 * LLM to decompose the task into tool-call steps that the Toolkit can
 * execute sequentially.
 */
export class Planner {
  private openai: OpenAI | null = null;
  private model: string;

  constructor(config?: PlannerConfig) {
    if (config?.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
    this.model = config?.model ?? 'gpt-4o-mini';
  }

  async createPlan(
    goal: string,
    context?: {
      systemPrompt?: string;
      input?: unknown;
      availableTools?: string[];
    }
  ): Promise<ExecutionPlan> {
    const steps = this.openai
      ? await this.generateStepsWithLLM(goal, context)
      : this.generateDefaultSteps(goal);

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      createdAt: new Date(),
      estimatedCost: steps.length * 0.002,
      estimatedTime: steps.length * 2000,
    };
  }

  private async generateStepsWithLLM(
    goal: string,
    context?: {
      systemPrompt?: string;
      input?: unknown;
      availableTools?: string[];
    }
  ): Promise<PlanStep[]> {
    const toolList = context?.availableTools?.join(', ') ?? 'gmail-read, analyze-email, gmail-label';

    const response = await this.openai!.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an execution planner. Given a goal and available tools, produce a JSON plan.

Available tools: ${toolList}

Respond with a JSON object:
{
  "steps": [
    {
      "id": "step_1",
      "type": "tool_call",
      "description": "Short description of what this step does",
      "toolName": "tool-name",
      "toolInput": { ... input params ... },
      "dependencies": []
    }
  ]
}

Keep plans concise — 2-6 steps. Each step should use one of the available tools.`,
        },
        {
          role: 'user',
          content: `Goal: ${goal}\n\nContext: ${JSON.stringify(context?.input ?? {})}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return this.generateDefaultSteps(goal);
    }

    try {
      const parsed = JSON.parse(content) as { steps: PlanStep[] };
      return parsed.steps.map((step, i) => ({
        id: step.id || `step_${i + 1}`,
        type: step.type || 'tool_call',
        description: step.description,
        toolName: step.toolName,
        toolInput: step.toolInput,
        dependencies: step.dependencies ?? [],
      }));
    } catch {
      return this.generateDefaultSteps(goal);
    }
  }

  /**
   * Fallback plan when no LLM is available — suitable for inbox triage.
   */
  private generateDefaultSteps(goal: string): PlanStep[] {
    return [
      {
        id: 'step_1',
        type: 'tool_call',
        description: 'Fetch recent unread emails from inbox',
        toolName: 'gmail-read',
        toolInput: { query: 'is:unread label:inbox', maxResults: 20 },
      },
      {
        id: 'step_2',
        type: 'tool_call',
        description: 'Analyze each email for priority and category',
        toolName: 'analyze-email',
        toolInput: {},
        dependencies: ['step_1'],
      },
      {
        id: 'step_3',
        type: 'tool_call',
        description: 'Apply labels based on analysis results',
        toolName: 'gmail-label',
        toolInput: {},
        dependencies: ['step_2'],
      },
    ];
  }

  async optimizePlan(plan: ExecutionPlan): Promise<ExecutionPlan> {
    return plan;
  }

  async validatePlan(plan: ExecutionPlan): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (plan.steps.length === 0) errors.push('Plan has no steps');
    for (const step of plan.steps) {
      if (!step.id) errors.push(`Step missing id`);
      if (step.type === 'tool_call' && !step.toolName) {
        errors.push(`Tool call step ${step.id} missing toolName`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
