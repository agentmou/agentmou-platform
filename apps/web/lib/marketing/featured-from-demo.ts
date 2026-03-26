import 'server-only';

import type { AgentTemplate, PackTemplate, WorkflowTemplate } from '@agentmou/contracts';
import {
  agentTemplates,
  packTemplates,
  workflowTemplates,
} from '@/lib/demo-catalog/mock-data';
import {
  marketingFeaturedAgentIds,
  marketingFeaturedPackIds,
  marketingFeaturedWorkflowIds,
} from '@/lib/demo-catalog/marketing-featured';
import {
  isOperationalAgent,
  isOperationalPack,
  isOperationalWorkflow,
} from '@/lib/demo-catalog/operational-index';
import { normalizeCategory } from '@/lib/fleetops/category-config';
import type {
  MarketingAgent,
  MarketingCatalogPayload,
  MarketingPack,
  MarketingWorkflow,
} from '@/lib/marketing/public-catalog';

function agentToMarketing(agent: AgentTemplate): MarketingAgent {
  const k0 = agent.kpis[0];
  const k1 = agent.kpis[1];
  return {
    id: agent.id,
    name: agent.name,
    category: normalizeCategory(agent.catalogGroup || agent.domain),
    description: agent.description,
    timeSaved: k0 ? `${k0.name}` : 'Faster outcomes',
    accuracy: k1 ? `${k1.name}` : 'Measured impact',
  };
}

function workflowToMarketing(workflow: WorkflowTemplate): MarketingWorkflow {
  return {
    id: workflow.id,
    name: workflow.name,
    trigger: workflow.trigger,
    action: workflow.useCase || workflow.summary.slice(0, 96),
  };
}

function packToMarketing(pack: PackTemplate): MarketingPack {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    agents: pack.includedAgents.length,
    workflows: pack.includedWorkflows.length,
    outcome: pack.kpis[0] ?? pack.vertical,
  };
}

function byIdOrThrow<T extends { id: string }>(
  items: T[],
  ids: readonly string[],
  label: string,
): T[] {
  const map = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => {
    const found = map.get(id);
    if (!found) {
      throw new Error(`Marketing featured ${label} id not found in demo catalog: ${id}`);
    }
    return found;
  });
}

export interface MarketingCatalogWithStats extends MarketingCatalogPayload {
  /** Full demo inventory counts (for honest marketing stats). */
  demoTotals: {
    agents: number;
    workflows: number;
    packs: number;
  };
  /** Count of featured items backed by operational manifests (subset check). */
  operationalFeaturedCounts: {
    agents: number;
    workflows: number;
    packs: number;
  };
}

/**
 * Builds the marketing homepage catalog from the demo inventory + featured ID lists.
 */
export function buildMarketingFeaturedCatalog(): MarketingCatalogWithStats {
  const agents = byIdOrThrow(
    agentTemplates,
    marketingFeaturedAgentIds,
    'agent',
  ).map(agentToMarketing);

  const workflows = byIdOrThrow(
    workflowTemplates,
    marketingFeaturedWorkflowIds,
    'workflow',
  ).map(workflowToMarketing);

  const packs = byIdOrThrow(packTemplates, marketingFeaturedPackIds, 'pack').map(
    packToMarketing,
  );

  const operationalFeaturedCounts = {
    agents: marketingFeaturedAgentIds.filter((id) => isOperationalAgent(id)).length,
    workflows: marketingFeaturedWorkflowIds.filter((id) =>
      isOperationalWorkflow(id),
    ).length,
    packs: marketingFeaturedPackIds.filter((id) => isOperationalPack(id)).length,
  };

  return {
    agents,
    workflows,
    packs,
    demoTotals: {
      agents: agentTemplates.length,
      workflows: workflowTemplates.length,
      packs: packTemplates.length,
    },
    operationalFeaturedCounts,
  };
}
