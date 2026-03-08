// Agent Engine - Core runtime for executing AI agents

import { Planner } from './planner';
import { PolicyEngine } from './policies';
import { Toolkit, builtinTools } from './tools';
import { MemoryManager } from './memory';
import { WorkflowDispatcher } from './workflow-dispatch';
import { ApprovalGateManager } from './approval-gates';
import { RunLogger } from './run-logger';
import { TemplatesManager } from './templates';

export { Planner, type ExecutionPlan, type PlanStep } from './planner';
export { PolicyEngine, type Policy, type PolicyRule, type Constraint } from './policies';
export { Toolkit, type Tool, type ToolContext, builtinTools } from './tools';
export { MemoryManager, type Memory, type ConversationTurn } from './memory';
export { WorkflowDispatcher, type WorkflowDefinition, type WorkflowNode } from './workflow-dispatch';
export { ApprovalGateManager, type ApprovalGate, type ApprovalRequest } from './approval-gates';
export { RunLogger, type LogEntry, type RunMetrics, type RunStep } from './run-logger';
export { TemplatesManager, type AgentTemplate } from './templates';

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  tools?: string[];
  memories?: string[];
  policies?: string[];
  approvalGates?: string[];
}

export interface AgentExecutionResult {
  success: boolean;
  output: any;
  runId: string;
  duration: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  error?: string;
}

export class AgentEngine {
  private planner: Planner;
  private policyEngine: PolicyEngine;
  private toolkit: Toolkit;
  private memoryManager: MemoryManager;
  private workflowDispatcher: WorkflowDispatcher;
  private approvalManager: ApprovalGateManager;
  private logger: RunLogger;
  private templatesManager: TemplatesManager;

  constructor() {
    this.planner = new Planner();
    this.policyEngine = new PolicyEngine();
    this.toolkit = new Toolkit();
    this.memoryManager = new MemoryManager();
    this.workflowDispatcher = new WorkflowDispatcher();
    this.approvalManager = new ApprovalGateManager();
    this.logger = new RunLogger();
    this.templatesManager = new TemplatesManager();

    // Register built-in tools
    Object.values(builtinTools).forEach(tool => this.toolkit.registerTool(tool));
  }

  async execute(agentConfig: AgentConfig, input?: any): Promise<AgentExecutionResult> {
    const runId = `run_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      await this.logger.startRun(runId, { agentId: agentConfig.id });

      // Create execution plan
      const plan = await this.planner.createPlan(agentConfig.name, { input, config: agentConfig });

      // Check policies
      const policyCheck = await this.policyEngine.evaluate('execute', { agentId: agentConfig.id });
      if (!policyCheck.allowed) {
        throw new Error(`Policy violation: ${policyCheck.reason}`);
      }

      // Execute with tools and memory
      const result = await this.executeWithTools(agentConfig, input, runId);

      await this.logger.completeRun(runId, 'completed');

      return {
        success: true,
        output: result,
        runId,
        duration: Date.now() - startTime,
        tokensUsed: { input: 100, output: 200, total: 300 },
      };
    } catch (error) {
      await this.logger.completeRun(runId, 'failed');
      return {
        success: false,
        output: null,
        runId,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  private async executeWithTools(
    config: AgentConfig,
    input: any,
    runId: string
  ): Promise<any> {
    // Execute agent with configured tools
    return { result: 'success' };
  }

  // Getters for components
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
