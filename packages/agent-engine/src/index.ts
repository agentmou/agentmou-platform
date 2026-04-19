import { randomUUID } from 'node:crypto';
import type { GmailConnector } from '@agentmou/connectors';

import { Planner, type PlannerConfig } from './planner';
import { PolicyEngine, type AgentPolicyConfig } from './policies';
import { Toolkit, builtinTools, type ToolContext } from './tools';
import { MemoryManager } from './memory';
import { WorkflowDispatcher } from './workflow-dispatch';
import { ApprovalGateManager } from './approval-gates';
import { RunLogger } from './run-logger';
import { TemplatesManager } from './templates';

export { Planner, type ExecutionPlan, type PlanStep } from './planner';
export {
  PolicyEngine,
  type Policy,
  type PolicyRule,
  type Constraint,
  type AgentPolicyConfig,
} from './policies';
export { Toolkit, type Tool, type ToolContext, type ToolDefinition, builtinTools } from './tools';
export { MemoryManager, type Memory, type ConversationTurn } from './memory';
export {
  WorkflowDispatcher,
  type WorkflowDefinition,
  type WorkflowNode,
} from './workflow-dispatch';
export { ApprovalGateManager, type ApprovalGate, type ApprovalRequest } from './approval-gates';
export { RunLogger, type LogEntry, type RunMetrics, type RunStep } from './run-logger';
export { TemplatesManager, type AgentTemplate } from './templates';
export {
  getOpenAiToolDefinitions,
  toolRegistry,
  type ReceptionistToolDefinition,
  type ReceptionistToolHandlerContext,
  type ReceptionistToolRegistry,
} from './receptionist-tools/registry';

/**
 * Runtime dependencies injected into the agent engine.
 */
export interface EngineConfig {
  openaiApiKey?: string;
  agentsApiUrl?: string;
  agentsApiKey?: string;
}

/**
 * Inputs required to execute a single agent run.
 */
export interface ExecuteOptions {
  runId: string;
  tenantId: string;
  templateId: string;
  systemPrompt: string;
  input?: unknown;
  connectors?: Map<string, GmailConnector>;
  policyConfig?: AgentPolicyConfig;
  userId?: string;
}

/**
 * High-level outcome returned after an agent run finishes or fails.
 */
export interface AgentExecutionResult {
  success: boolean;
  output: unknown;
  runId: string;
  duration: number;
  tokensUsed?: { input: number; output: number; total: number };
  cost?: number;
  stepsCompleted: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Core runtime for executing AI agents.
 *
 * Orchestrates plan generation (via LLM), policy checks, tool execution,
 * and step-level logging to the database.
 */
export class AgentEngine {
  private planner: Planner;
  private policyEngine: PolicyEngine;
  private toolkit: Toolkit;
  private memoryManager: MemoryManager;
  private workflowDispatcher: WorkflowDispatcher;
  private approvalManager: ApprovalGateManager;
  private logger: RunLogger;
  private templatesManager: TemplatesManager;
  private config: EngineConfig;

  constructor(config?: EngineConfig) {
    this.config = config ?? {};

    const plannerConfig: PlannerConfig | undefined = config?.openaiApiKey
      ? { openaiApiKey: config.openaiApiKey }
      : undefined;

    this.planner = new Planner(plannerConfig);
    this.policyEngine = new PolicyEngine();
    this.toolkit = new Toolkit();
    this.memoryManager = new MemoryManager();
    this.workflowDispatcher = new WorkflowDispatcher();
    this.approvalManager = new ApprovalGateManager();
    this.logger = new RunLogger();
    this.templatesManager = new TemplatesManager();

    for (const tool of Object.values(builtinTools)) {
      this.toolkit.registerTool(tool);
    }
  }

  /**
   * Executes an agent run end-to-end:
   * 1. Load policy config
   * 2. Generate an execution plan
   * 3. For each step: check policy → execute tool → log step
   * 4. Finish run with aggregated metrics
   */
  async execute(options: ExecuteOptions): Promise<AgentExecutionResult> {
    const { runId, tenantId, systemPrompt, input, connectors, policyConfig, userId } = options;
    const startTime = Date.now();
    const totalTokens = 0;
    const totalCost = 0;
    let stepsCompleted = 0;

    try {
      await this.logger.startRun(runId);

      if (policyConfig) {
        this.policyEngine.loadPolicyConfig(policyConfig);
      }

      // Generate plan
      const availableTools = this.toolkit.listTools().map((t) => t.id);
      const plan = await this.planner.createPlan(systemPrompt, {
        systemPrompt,
        input,
        availableTools,
      });

      const toolContext: ToolContext = {
        tenantId,
        userId,
        runId,
        connectors,
        agentsApiUrl: this.config.agentsApiUrl,
        agentsApiKey: this.config.agentsApiKey,
      };

      let lastOutput: unknown = input;

      for (const step of plan.steps) {
        const stepId = step.id || randomUUID();

        // Policy check for tool-call steps
        if (step.type === 'tool_call' && step.toolName) {
          const policyAction = this.toolToAction(step.toolName);
          const evaluation = await this.policyEngine.evaluate(policyAction, {
            agentId: options.templateId,
          });

          if (!evaluation.allowed) {
            await this.logger.startStep(runId, {
              id: stepId,
              name: step.description,
              type: step.type,
            });
            await this.logger.failStep(runId, stepId, evaluation.reason ?? 'Policy denied');
            continue;
          }
        }

        // Start step
        await this.logger.startStep(runId, {
          id: stepId,
          name: step.description,
          type: step.type,
        });

        try {
          if (step.type === 'tool_call' && step.toolName) {
            const toolInput = this.resolveToolInput(step, lastOutput);
            lastOutput = await this.toolkit.executeTool(step.toolName, toolInput, toolContext);
          }

          stepsCompleted++;
          await this.logger.completeStep(runId, stepId, lastOutput);
        } catch (stepError) {
          await this.logger.failStep(runId, stepId, String(stepError));
          throw stepError;
        }
      }

      await this.logger.completeRun(runId, 'success', {
        tokensUsed: totalTokens,
        costEstimate: totalCost,
      });

      return {
        success: true,
        output: lastOutput,
        runId,
        duration: Date.now() - startTime,
        tokensUsed: { input: 0, output: 0, total: totalTokens },
        cost: totalCost,
        stepsCompleted,
      };
    } catch (error) {
      await this.logger.completeRun(runId, 'failed', {
        tokensUsed: totalTokens,
        costEstimate: totalCost,
      });

      return {
        success: false,
        output: null,
        runId,
        duration: Date.now() - startTime,
        error: String(error),
        stepsCompleted,
      };
    }
  }

  /**
   * Maps a tool name to a policy action string.
   * e.g. "gmail-read" → "gmail.read", "gmail-label" → "gmail.write"
   */
  private toolToAction(toolName: string): string {
    const mapping: Record<string, string> = {
      'gmail-read': 'gmail.read',
      'gmail-label': 'gmail.write',
      'analyze-email': 'api.invoke',
    };
    return mapping[toolName] ?? 'unknown';
  }

  /**
   * Resolves tool input by merging the plan step's explicit input
   * with the output from the previous step (pipeline pattern).
   */
  private resolveToolInput(
    step: { toolInput?: Record<string, unknown> },
    previousOutput: unknown
  ): unknown {
    if (step.toolInput && Object.keys(step.toolInput).length > 0) {
      return step.toolInput;
    }
    return previousOutput;
  }

  // Component accessors
  getPlanner(): Planner {
    return this.planner;
  }
  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }
  getToolkit(): Toolkit {
    return this.toolkit;
  }
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }
  getWorkflowDispatcher(): WorkflowDispatcher {
    return this.workflowDispatcher;
  }
  getApprovalManager(): ApprovalGateManager {
    return this.approvalManager;
  }
  getLogger(): RunLogger {
    return this.logger;
  }
}
