export interface Tool {
  id: string;
  name: string;
  description: string;
  inputSchema: any;
  outputSchema?: any;
  execute: (input: any, context?: ToolContext) => Promise<any>;
}

export interface ToolContext {
  tenantId: string;
  userId: string;
  runId: string;
  connectors?: Record<string, any>;
  secrets?: Record<string, string>;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

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

  async executeTool(toolId: string, input: any, context?: ToolContext): Promise<any> {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    // Validate input against schema
    this.validateInput(tool, input);

    // Execute tool
    return tool.execute(input, context);
  }

  private validateInput(tool: Tool, input: any) {
    // Validate input against tool's inputSchema
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.listTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
}

// Built-in tools
export const builtinTools = {
  http_request: {
    id: 'http_request',
    name: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    inputSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        url: { type: 'string' },
        headers: { type: 'object' },
        body: { type: 'object' },
      },
      required: ['method', 'url'],
    },
    execute: async (input: any) => {
      // Execute HTTP request
      return { status: 200, data: {} };
    },
  },
  database_query: {
    id: 'database_query',
    name: 'Database Query',
    description: 'Execute database queries',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        parameters: { type: 'array' },
      },
      required: ['query'],
    },
    execute: async (input: any) => {
      // Execute database query
      return { rows: [] };
    },
  },
  send_email: {
    id: 'send_email',
    name: 'Send Email',
    description: 'Send emails via configured connectors',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
    execute: async (input: any, context?: ToolContext) => {
      // Send email
      return { sent: true };
    },
  },
};
