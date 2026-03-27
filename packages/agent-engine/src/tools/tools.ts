import type { GmailConnector } from '@agentmou/connectors';

/**
 * Executable tool definition used by the planner and runtime.
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  execute: (input: unknown, context?: ToolContext) => Promise<unknown>;
}

/**
 * Execution context passed to tools at runtime.
 */
export interface ToolContext {
  tenantId: string;
  userId?: string;
  runId: string;
  connectors?: Map<string, GmailConnector>;
  secrets?: Record<string, string>;
  agentsApiUrl?: string;
  agentsApiKey?: string;
}

/**
 * JSON-schema-style tool description exposed to model planners.
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Registry and execution facade for the tools available to an agent.
 */
export class Toolkit {
  private tools: Map<string, Tool> = new Map();

  registerTool(tool: Tool) {
    this.tools.set(tool.id, tool);
  }

  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  async executeTool(toolId: string, input: unknown, context?: ToolContext): Promise<unknown> {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    return tool.execute(input, context);
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.listTools().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
}

// ---------------------------------------------------------------------------
// Built-in tools for inbox triage vertical slice
// ---------------------------------------------------------------------------

/**
 * Reads recent emails from Gmail via the tenant's connected GmailConnector.
 */
export const gmailReadTool: Tool = {
  id: 'gmail-read',
  name: 'gmail-read',
  description: 'List and fetch recent emails from the connected Gmail account',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Gmail search query (e.g. "is:unread label:inbox")' },
      maxResults: { type: 'number', description: 'Max emails to fetch (default 20)' },
    },
  },
  execute: async (input: unknown, context?: ToolContext) => {
    const { query, maxResults } = input as { query?: string; maxResults?: number };
    const gmail = context?.connectors?.get('gmail');
    if (!gmail) throw new Error('Gmail connector not available');

    const stubs = await gmail.listMessages({ query, maxResults: maxResults ?? 20 });

    const messages = await Promise.all(stubs.map((stub) => gmail.getMessage(stub.id)));

    return { emails: messages };
  },
};

/**
 * Applies labels to Gmail messages via the tenant's connected GmailConnector.
 */
export const gmailLabelTool: Tool = {
  id: 'gmail-label',
  name: 'gmail-label',
  description: 'Apply labels to Gmail messages based on classification results',
  inputSchema: {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
            addLabels: { type: 'array', items: { type: 'string' } },
            removeLabels: { type: 'array', items: { type: 'string' } },
          },
          required: ['messageId'],
        },
      },
    },
    required: ['actions'],
  },
  execute: async (input: unknown, context?: ToolContext) => {
    const { actions } = input as {
      actions: Array<{
        messageId: string;
        addLabels?: string[];
        removeLabels?: string[];
      }>;
    };
    const gmail = context?.connectors?.get('gmail');
    if (!gmail) throw new Error('Gmail connector not available');

    const results = [];
    for (const action of actions) {
      if (action.addLabels?.length) {
        await gmail.addLabels(action.messageId, action.addLabels);
      }
      if (action.removeLabels?.length) {
        await gmail.removeLabels(action.messageId, action.removeLabels);
      }
      results.push({ messageId: action.messageId, success: true });
    }

    return { results };
  },
};

/**
 * Calls the Python agents API to analyze email content with GPT.
 */
export const analyzeEmailTool: Tool = {
  id: 'analyze-email',
  name: 'analyze-email',
  description: 'Analyze email content to determine priority, category, and required action',
  inputSchema: {
    type: 'object',
    properties: {
      emails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            from: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
          },
        },
      },
    },
    required: ['emails'],
  },
  execute: async (input: unknown, context?: ToolContext) => {
    const { emails } = input as {
      emails: Array<{ id: string; from: string; subject: string; body: string }>;
    };

    const apiUrl = context?.agentsApiUrl ?? process.env.AGENTS_API_URL;
    const apiKey = context?.agentsApiKey ?? process.env.AGENTS_API_KEY;

    if (!apiUrl) throw new Error('AGENTS_API_URL not configured');

    const results = [];
    for (const email of emails) {
      const response = await fetch(`${apiUrl}/analyze-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          sender: email.from,
          subject: email.subject,
          content: email.body,
        }),
      });

      if (!response.ok) {
        results.push({ emailId: email.id, error: `API error: ${response.status}` });
        continue;
      }

      const analysis = (await response.json()) as Record<string, unknown>;
      results.push({ emailId: email.id, ...analysis });
    }

    return { analyses: results };
  },
};

/** All built-in tools keyed by ID. */
export const builtinTools: Record<string, Tool> = {
  'gmail-read': gmailReadTool,
  'gmail-label': gmailLabelTool,
  'analyze-email': analyzeEmailTool,
};
