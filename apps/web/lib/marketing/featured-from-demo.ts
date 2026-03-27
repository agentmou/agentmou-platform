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
import { normalizeCategory } from '@/lib/control-plane/category-config';
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

function assertGaOperationalAgent(agent: AgentTemplate): void {
  if (!isOperationalAgent(agent.id)) {
    throw new Error(
      `Marketing featured agent ${agent.id} must map to an operational manifest on disk`,
    );
  }
  if (agent.availability !== 'available') {
    throw new Error(
      `Marketing featured agent ${agent.id} must have catalog availability "available" (generally available); got ${agent.availability ?? 'undefined'}`,
    );
  }
}

function assertGaOperationalWorkflow(workflow: WorkflowTemplate): void {
  if (!isOperationalWorkflow(workflow.id)) {
    throw new Error(
      `Marketing featured workflow ${workflow.id} must map to an operational public workflow manifest`,
    );
  }
  if (workflow.availability !== 'available') {
    throw new Error(
      `Marketing featured workflow ${workflow.id} must have catalog availability "available" (generally available); got ${workflow.availability ?? 'undefined'}`,
    );
  }
}

function assertGaOperationalPack(pack: PackTemplate): void {
  if (!isOperationalPack(pack.id)) {
    throw new Error(
      `Marketing featured pack ${pack.id} must map to an operational pack manifest on disk`,
    );
  }
  if (pack.availability !== 'available') {
    throw new Error(
      `Marketing featured pack ${pack.id} must have catalog availability "available" (generally available); got ${pack.availability ?? 'undefined'}`,
    );
  }
}

function pickFeaturedAgents(): AgentTemplate[] {
  const map = new Map(agentTemplates.map((a) => [a.id, a]));
  return marketingFeaturedAgentIds.map((id) => {
    const agent = map.get(id);
    if (!agent) {
      throw new Error(`Marketing featured agent id not found in demo catalog: ${id}`);
    }
    assertGaOperationalAgent(agent);
    return agent;
  });
}

function pickFeaturedWorkflows(): WorkflowTemplate[] {
  const map = new Map(workflowTemplates.map((w) => [w.id, w]));
  return marketingFeaturedWorkflowIds.map((id) => {
    const workflow = map.get(id);
    if (!workflow) {
      throw new Error(`Marketing featured workflow id not found in demo catalog: ${id}`);
    }
    assertGaOperationalWorkflow(workflow);
    return workflow;
  });
}

function pickFeaturedPacks(): PackTemplate[] {
  const map = new Map(packTemplates.map((p) => [p.id, p]));
  return marketingFeaturedPackIds.map((id) => {
    const pack = map.get(id);
    if (!pack) {
      throw new Error(`Marketing featured pack id not found in demo catalog: ${id}`);
    }
    assertGaOperationalPack(pack);
    return pack;
  });
}

function countGaInventory(): {
  agents: number;
  workflows: number;
  packs: number;
} {
  return {
    agents: agentTemplates.filter(
      (a) => isOperationalAgent(a.id) && a.availability === 'available',
    ).length,
    workflows: workflowTemplates.filter(
      (w) => isOperationalWorkflow(w.id) && w.availability === 'available',
    ).length,
    packs: packTemplates.filter(
      (p) => isOperationalPack(p.id) && p.availability === 'available',
    ).length,
  };
}

export interface MarketingCatalogWithStats extends MarketingCatalogPayload {
  /** Full demo inventory counts (for honest marketing stats). */
  demoTotals: {
    agents: number;
    workflows: number;
    packs: number;
  };
  /**
   * Featured rows that are operational and generally available (matches returned
   * featured arrays after validation).
   */
  operationalFeaturedCounts: {
    agents: number;
    workflows: number;
    packs: number;
  };
  /** Operational manifest on disk + `availability: available` across the full demo inventory. */
  gaInventoryCounts: {
    agents: number;
    workflows: number;
    packs: number;
  };
}

/**
 * Builds the marketing homepage catalog from the demo inventory + featured ID lists.
 * Every featured id must be operational and marked `available` (GA), or the build throws.
 */
export function buildMarketingFeaturedCatalog(): MarketingCatalogWithStats {
  const agentRows = pickFeaturedAgents();
  const workflowRows = pickFeaturedWorkflows();
  const packRows = pickFeaturedPacks();

  const gaInventoryCounts = countGaInventory();

  return {
    agents: agentRows.map(agentToMarketing),
    workflows: workflowRows.map(workflowToMarketing),
    packs: packRows.map(packToMarketing),
    demoTotals: {
      agents: agentTemplates.length,
      workflows: workflowTemplates.length,
      packs: packTemplates.length,
    },
    operationalFeaturedCounts: {
      agents: agentRows.length,
      workflows: workflowRows.length,
      packs: packRows.length,
    },
    gaInventoryCounts,
  };
}
