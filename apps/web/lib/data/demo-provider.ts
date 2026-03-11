import type { AgentTemplate, WorkflowTemplate } from '@agentmou/contracts';
import type { DataProvider } from './provider';
import { mockProvider } from './mock-provider';

function markComingSoon<T extends { availability?: 'available' | 'planned'; statusNote?: string }>(
  item: T,
): T {
  if (item.availability === 'planned') {
    return { ...item, statusNote: 'Coming soon' };
  }
  return item;
}

function markComingSoonList<T extends { availability?: 'available' | 'planned'; statusNote?: string }>(
  items: T[],
): T[] {
  return items.map((item) => markComingSoon(item));
}

export const demoProvider: DataProvider = {
  ...mockProvider,
  listCatalogAgentTemplates: async () => {
    const agents = await mockProvider.listCatalogAgentTemplates();
    return markComingSoonList(agents);
  },
  listMarketplaceAgentTemplates: async () => {
    const agents = await mockProvider.listMarketplaceAgentTemplates();
    return markComingSoonList(agents);
  },
  getAgentTemplate: async (agentId: string): Promise<AgentTemplate | null> => {
    const agent = await mockProvider.getAgentTemplate(agentId);
    return agent ? markComingSoon(agent) : null;
  },
  listCatalogWorkflowTemplates: async () => {
    const workflows = await mockProvider.listCatalogWorkflowTemplates();
    return markComingSoonList(workflows);
  },
  listMarketplaceWorkflowTemplates: async () => {
    const workflows = await mockProvider.listMarketplaceWorkflowTemplates();
    return markComingSoonList(workflows);
  },
  getWorkflowTemplate: async (
    workflowId: string,
  ): Promise<WorkflowTemplate | null> => {
    const workflow = await mockProvider.getWorkflowTemplate(workflowId);
    return workflow ? markComingSoon(workflow) : null;
  },
  installAgent: async () => ({
    ok: true,
    mode: 'demo-readonly',
    message: 'Demo workspace is read-only. This installation is simulated.',
  }),
  installPack: async () => ({
    ok: true,
    mode: 'demo-readonly',
    message: 'Demo workspace is read-only. This installation is simulated.',
  }),
};
