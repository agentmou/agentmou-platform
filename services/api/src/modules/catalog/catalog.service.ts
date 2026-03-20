import {
  CatalogSDK,
  resolveRepoRoot,
} from '@agentmou/catalog-sdk';
import {
  CATEGORIES,
  type AgentTemplate,
  type Category,
  type OperationalAgentManifest,
  type OperationalPackManifest,
  type OperationalWorkflowManifest,
  type PackTemplate,
  type WorkflowTemplate,
} from '@agentmou/contracts';
import * as fs from 'fs/promises';
import * as path from 'path';

import {
  mapAgentManifest,
  mapPackManifest,
  mapWorkflowManifest,
} from './catalog.mapper.js';

const REPO_ROOT = resolveRepoRoot(import.meta.dirname, [
  'catalog/agents',
  'workflows/public',
]);
const CATALOG_DIR = path.join(REPO_ROOT, 'catalog');
const WORKFLOWS_DIR = path.join(REPO_ROOT, 'workflows');

export class CatalogService {
  private sdk = new CatalogSDK();
  private agents: OperationalAgentManifest[] = [];
  private packs: OperationalPackManifest[] = [];
  private workflows: OperationalWorkflowManifest[] = [];
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.loadAll();
    this.loaded = true;
  }

  private async loadAll(): Promise<void> {
    const [agents, packs, workflows] = await Promise.all([
      this.discoverAgents(),
      this.discoverPacks(),
      this.discoverWorkflows(),
    ]);
    this.agents = agents;
    this.packs = packs;
    this.workflows = workflows;
  }

  private async discoverAgents(): Promise<OperationalAgentManifest[]> {
    const agentsDir = path.join(CATALOG_DIR, 'agents');
    const entries = await readDirSafe(agentsDir);
    const manifests: OperationalAgentManifest[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(agentsDir, entry.name, 'manifest.yaml');
      if (!(await fileExists(manifestPath))) continue;
      try {
        manifests.push(await this.sdk.loadAgentManifest(manifestPath));
      } catch {
        // skip malformed manifests — log in production via observability
      }
    }
    return manifests;
  }

  private async discoverPacks(): Promise<OperationalPackManifest[]> {
    const packsDir = path.join(CATALOG_DIR, 'packs');
    const entries = await readDirSafe(packsDir);
    const manifests: OperationalPackManifest[] = [];

    for (const entry of entries) {
      if (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml')) continue;
      try {
        manifests.push(await this.sdk.loadPackManifest(path.join(packsDir, entry.name)));
      } catch {
        // skip malformed manifests
      }
    }
    return manifests;
  }

  private async discoverWorkflows(): Promise<OperationalWorkflowManifest[]> {
    const manifests: OperationalWorkflowManifest[] = [];

    for (const subdir of ['public', 'planned']) {
      const dir = path.join(WORKFLOWS_DIR, subdir);
      const entries = await readDirSafe(dir);

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const manifestPath = path.join(dir, entry.name, 'manifest.yaml');
        if (!(await fileExists(manifestPath))) continue;
        try {
          manifests.push(await this.sdk.loadWorkflowManifest(manifestPath));
        } catch {
          // skip malformed manifests
        }
      }
    }
    return manifests;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async listOperationalAgents(filters?: {
    category?: string;
    tags?: string[];
  }): Promise<OperationalAgentManifest[]> {
    await this.ensureLoaded();
    let result = this.agents;

    if (filters?.category) {
      result = result.filter((agent) => agent.category === filters.category);
    }
    if (filters?.tags?.length) {
      result = result.filter((agent) =>
        filters.tags!.some((tag) => agent.tags?.includes(tag)),
      );
    }
    return result;
  }

  async listAgents(filters?: {
    category?: string;
    tags?: string[];
  }): Promise<AgentTemplate[]> {
    const agents = await this.listOperationalAgents(filters);
    return agents.map(mapAgentManifest);
  }

  async getOperationalAgent(id: string): Promise<OperationalAgentManifest | undefined> {
    await this.ensureLoaded();
    return this.agents.find((a) => a.id === id);
  }

  async getAgent(id: string): Promise<AgentTemplate | undefined> {
    const agent = await this.getOperationalAgent(id);
    return agent ? mapAgentManifest(agent) : undefined;
  }

  async listOperationalPacks(filters?: {
    category?: string;
  }): Promise<OperationalPackManifest[]> {
    await this.ensureLoaded();
    let result = this.packs;

    if (filters?.category) {
      result = result.filter((pack) => pack.category === filters.category);
    }
    return result;
  }

  async listPacks(filters?: {
    category?: string;
  }): Promise<PackTemplate[]> {
    const packs = await this.listOperationalPacks(filters);
    return packs.map(mapPackManifest);
  }

  async getOperationalPack(id: string): Promise<OperationalPackManifest | undefined> {
    await this.ensureLoaded();
    return this.packs.find((p) => p.id === id);
  }

  async getPack(id: string): Promise<PackTemplate | undefined> {
    const pack = await this.getOperationalPack(id);
    return pack ? mapPackManifest(pack) : undefined;
  }

  async listOperationalWorkflows(filters?: {
    status?: string;
    category?: string;
  }): Promise<OperationalWorkflowManifest[]> {
    await this.ensureLoaded();
    let result = this.workflows;

    if (filters?.status) {
      result = result.filter((workflow) => workflow.status === filters.status);
    } else {
      result = result.filter((workflow) => workflow.status !== 'planned');
    }
    if (filters?.category) {
      result = result.filter((workflow) => workflow.category === filters.category);
    }
    return result;
  }

  async listWorkflows(filters?: {
    status?: string;
    category?: string;
  }): Promise<WorkflowTemplate[]> {
    const workflows = await this.listOperationalWorkflows(filters);
    return workflows.map(mapWorkflowManifest);
  }

  async getOperationalWorkflow(id: string): Promise<OperationalWorkflowManifest | undefined> {
    await this.ensureLoaded();
    return this.workflows.find((w) => w.id === id);
  }

  async getWorkflow(id: string): Promise<WorkflowTemplate | undefined> {
    const workflow = await this.getOperationalWorkflow(id);
    return workflow ? mapWorkflowManifest(workflow) : undefined;
  }

  async listCategories(): Promise<{ id: Category; name: string }[]> {
    return CATEGORIES.map((id) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
    }));
  }

  async searchCatalog(
    query: string,
    filters?: { type?: 'agent' | 'pack' | 'workflow' },
  ): Promise<{
    agents: AgentTemplate[];
    packs: PackTemplate[];
    workflows: WorkflowTemplate[];
  }> {
    await this.ensureLoaded();
    const q = query.toLowerCase();

    const matchText = (texts: (string | undefined)[]): boolean =>
      texts.some((t) => t?.toLowerCase().includes(q));

    const matchingAgents =
      !filters?.type || filters.type === 'agent'
        ? this.agents.filter((a) =>
            matchText([a.name, a.description, a.id, ...(a.tags ?? [])]),
          ).map(mapAgentManifest)
        : [];

    const matchingPacks =
      !filters?.type || filters.type === 'pack'
        ? this.packs
            .filter((p) => matchText([p.name, p.description, p.id]))
            .map(mapPackManifest)
        : [];

    const matchingWorkflows =
      !filters?.type || filters.type === 'workflow'
        ? this.workflows.filter((w) =>
            matchText([w.name, w.description, w.id]),
          ).map(mapWorkflowManifest)
        : [];

    return {
      agents: matchingAgents,
      packs: matchingPacks,
      workflows: matchingWorkflows,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readDirSafe(dir: string) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
