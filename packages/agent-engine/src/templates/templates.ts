export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  variables: VariableDefinition[];
  examples?: PromptExample[];
}

export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface PromptExample {
  input: Record<string, any>;
  expectedOutput: string;
  description?: string;
}

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

  renderTemplate(templateId: string, variables: Record<string, any>): string {
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
