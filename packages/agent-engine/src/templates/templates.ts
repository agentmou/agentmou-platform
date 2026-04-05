/**
 * Template definition used to render an agent system prompt.
 */
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  variables: VariableDefinition[];
  examples?: PromptExample[];
}

/**
 * Variable declared by an agent template.
 */
export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

/**
 * Example input/output pair documenting expected template behavior.
 */
export interface PromptExample {
  input: Record<string, unknown>;
  expectedOutput: string;
  description?: string;
}

/**
 * Registry and renderer for reusable agent templates.
 */
export class TemplatesManager {
  private templates: Map<string, AgentTemplate> = new Map();

  registerTemplate(template: AgentTemplate) {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): AgentTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(): AgentTemplate[] {
    return Array.from(this.templates.values());
  }

  renderTemplate(templateId: string, variables: Record<string, unknown>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let prompt = template.systemPrompt;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    return prompt;
  }
}

/**
 * Seed templates bundled with the package for development and examples.
 */
export const defaultTemplates: AgentTemplate[] = [
  {
    id: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Template for customer support automation',
    systemPrompt: 'You are a helpful customer support agent...',
    variables: [
      { name: 'companyName', type: 'string', required: true },
      { name: 'productName', type: 'string', required: false },
    ],
  },
];
