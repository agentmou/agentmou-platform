/**
 * Serializable workflow definition understood by the dispatcher.
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  triggers: Trigger[];
  variables?: WorkflowVariable[];
}

/**
 * Individual node inside a workflow graph.
 */
export interface WorkflowNode {
  id: string;
  type: 'action' | 'condition' | 'loop' | 'delay' | 'webhook';
  config: Record<string, any>;
  next?: string | string[];
}

/**
 * Trigger declaration that determines how a workflow starts.
 */
export interface Trigger {
  type: 'schedule' | 'webhook' | 'event' | 'manual';
  config: Record<string, any>;
}

/**
 * Declared variable available during workflow execution.
 */
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
}

/**
 * Mutable execution state carried while a workflow runs.
 */
export interface ExecutionContext {
  workflowId: string;
  runId: string;
  variables: Record<string, any>;
  inputData?: any;
  previousOutputs: Record<string, any>;
}

/**
 * Lightweight dispatcher that walks workflow nodes in execution order.
 */
export class WorkflowDispatcher {
  async executeWorkflow(definition: WorkflowDefinition, inputData?: any): Promise<WorkflowResult> {
    const context: ExecutionContext = {
      workflowId: definition.id,
      runId: `run_${Date.now()}`,
      variables: this.initializeVariables(definition.variables || []),
      inputData,
      previousOutputs: {},
    };

    const startTime = Date.now();
    let currentNode: WorkflowNode | undefined = definition.nodes[0];
    const executedNodes: string[] = [];

    while (currentNode) {
      const output = await this.executeNode(currentNode, context);
      context.previousOutputs[currentNode.id] = output;
      executedNodes.push(currentNode.id);

      currentNode = this.getNextNode(definition, currentNode, output);
    }

    return {
      success: true,
      runId: context.runId,
      outputs: context.previousOutputs,
      executedNodes,
      duration: Date.now() - startTime,
    };
  }

  private initializeVariables(variables: WorkflowVariable[]): Record<string, any> {
    const initialized: Record<string, any> = {};
    for (const variable of variables) {
      initialized[variable.name] = variable.defaultValue;
    }
    return initialized;
  }

  private async executeNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Execute node based on type
    switch (node.type) {
      case 'action':
        return this.executeAction(node, context);
      case 'condition':
        return this.evaluateCondition(node, context);
      case 'webhook':
        return this.triggerWebhook(node, context);
      default:
        return {};
    }
  }

  private async executeAction(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Execute action node
    return { result: 'success' };
  }

  private evaluateCondition(node: WorkflowNode, context: ExecutionContext): Promise<{ branch: string }> {
    // Evaluate condition and return branch
    return Promise.resolve({ branch: 'true' });
  }

  private async triggerWebhook(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Trigger webhook
    return { triggered: true };
  }

  private getNextNode(definition: WorkflowDefinition, current: WorkflowNode, output: any): WorkflowNode | undefined {
    if (!current.next) return undefined;

    const nextIds = Array.isArray(current.next) ? current.next : [current.next];
    return definition.nodes.find(n => nextIds.includes(n.id));
  }
}

/**
 * Result returned after a workflow definition finishes executing.
 */
export interface WorkflowResult {
  success: boolean;
  runId: string;
  outputs: Record<string, any>;
  executedNodes: string[];
  duration: number;
  error?: string;
}
