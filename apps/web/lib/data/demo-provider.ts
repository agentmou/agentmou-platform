import type { AgentTemplate, PackTemplate, WorkflowTemplate } from '@agentmou/contracts';
import type { DataProvider } from './provider';
import {
  isOperationalAgent,
  isOperationalPack,
  isOperationalWorkflow,
} from '@/lib/demo-catalog/operational-index';
import { mockProvider } from './mock-provider';

/**
 * Demo workspace overlay: items that are not backed by an operational manifest
 * on disk are labeled "Coming soon" and forced to `planned` availability so UI
 * badges stay aligned with the repo catalog bar.
 */
function markDemoAgent(agent: AgentTemplate): AgentTemplate {
  if (isOperationalAgent(agent.id)) {
    return { ...agent, statusNote: undefined };
  }
  return { ...agent, availability: 'planned', statusNote: 'Coming soon' };
}

function markDemoWorkflow(workflow: WorkflowTemplate): WorkflowTemplate {
  if (isOperationalWorkflow(workflow.id)) {
    return { ...workflow, statusNote: undefined };
  }
  return { ...workflow, availability: 'planned', statusNote: 'Coming soon' };
}

function markDemoPack(pack: PackTemplate): PackTemplate {
  if (isOperationalPack(pack.id)) {
    return { ...pack };
  }
  return {
    ...pack,
    availability: 'planned',
    statusNote: 'Coming soon',
  };
}

function markDemoAgentList(agents: AgentTemplate[]): AgentTemplate[] {
  return agents.map((a) => markDemoAgent(a));
}

function markDemoWorkflowList(workflows: WorkflowTemplate[]): WorkflowTemplate[] {
  return workflows.map((w) => markDemoWorkflow(w));
}

function markDemoPackList(packs: PackTemplate[]): PackTemplate[] {
  return packs.map((p) => markDemoPack(p));
}

export const demoProvider: DataProvider = {
  ...mockProvider,
  providerMode: 'demo',
  listCatalogAgentTemplates: async () => {
    const agents = await mockProvider.listCatalogAgentTemplates();
    return markDemoAgentList(agents);
  },
  listMarketplaceAgentTemplates: async () => {
    const agents = await mockProvider.listMarketplaceAgentTemplates();
    return markDemoAgentList(agents);
  },
  getAgentTemplate: async (agentId: string): Promise<AgentTemplate | null> => {
    const agent = await mockProvider.getAgentTemplate(agentId);
    return agent ? markDemoAgent(agent) : null;
  },
  listCatalogWorkflowTemplates: async () => {
    const workflows = await mockProvider.listCatalogWorkflowTemplates();
    return markDemoWorkflowList(workflows);
  },
  listMarketplaceWorkflowTemplates: async () => {
    const workflows = await mockProvider.listMarketplaceWorkflowTemplates();
    return markDemoWorkflowList(workflows);
  },
  getWorkflowTemplate: async (workflowId: string): Promise<WorkflowTemplate | null> => {
    const workflow = await mockProvider.getWorkflowTemplate(workflowId);
    return workflow ? markDemoWorkflow(workflow) : null;
  },
  listPackTemplates: async () => {
    const packs = await mockProvider.listPackTemplates();
    return markDemoPackList(packs);
  },
  getPackTemplate: async (packIdOrSlug: string): Promise<PackTemplate | null> => {
    const pack = await mockProvider.getPackTemplate(packIdOrSlug);
    return pack ? markDemoPack(pack) : null;
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
