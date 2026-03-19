import { CatalogSDK, AgentManifest, PackManifest, WorkflowManifest, resolveRepoRoot } from '@agentmou/catalog-sdk';
import { CATEGORIES, Category } from '@agentmou/contracts';
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = resolveRepoRoot(import.meta.dirname, [
  'catalog/agents',
  'workflows/public',
]);
const CATALOG_DIR = path.join(REPO_ROOT, 'catalog');
const WORKFLOWS_DIR = path.join(REPO_ROOT, 'workflows');

export class CatalogService {
  private sdk = new CatalogSDK();
  private agents: AgentManifest[] = [];
  private packs: PackManifest[] = [];
  private workflows: WorkflowManifest[] = [];
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

  private async discoverAgents(): Promise<AgentManifest[]> {
    const agentsDir = path.join(CATALOG_DIR, 'agents');
    const entries = await readDirSafe(agentsDir);
    const manifests: AgentManifest[] = [];

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

  private async discoverPacks(): Promise<PackManifest[]> {
    const packsDir = path.join(CATALOG_DIR, 'packs');
    const entries = await readDirSafe(packsDir);
    const manifests: PackManifest[] = [];

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

  private async discoverWorkflows(): Promise<WorkflowManifest[]> {
    const manifests: WorkflowManifest[] = [];

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

  async listAgents(filters?: {
    category?: string;
    tags?: string[];
  }): Promise<AgentManifest[]> {
    await this.ensureLoaded();
    let result = this.agents;

    if (filters?.category) {
      result = result.filter((a) => a.category === filters.category);
    }
    if (filters?.tags?.length) {
      result = result.filter((a) =>
        filters.tags!.some((t) => a.tags?.includes(t)),
      );
    }
    return result;
  }

  async getAgent(id: string): Promise<AgentManifest | undefined> {
    await this.ensureLoaded();
    return this.agents.find((a) => a.id === id);
  }

  async listPacks(filters?: {
    category?: string;
  }): Promise<PackManifest[]> {
    await this.ensureLoaded();
    let result = this.packs;

    if (filters?.category) {
      result = result.filter((p) => p.category === filters.category);
    }
    return result;
  }

  async getPack(id: string): Promise<PackManifest | undefined> {
    await this.ensureLoaded();
    return this.packs.find((p) => p.id === id);
  }

  async listWorkflows(filters?: {
    status?: string;
    category?: string;
  }): Promise<WorkflowManifest[]> {
    await this.ensureLoaded();
    let result = this.workflows;

    if (filters?.status) {
      result = result.filter((w) => w.status === filters.status);
    } else {
      // Default catalog view should only expose installable workflows.
      result = result.filter((w) => w.status !== 'planned');
    }
    if (filters?.category) {
      result = result.filter((w) => w.category === filters.category);
    }
    return result;
  }

  async getWorkflow(id: string): Promise<WorkflowManifest | undefined> {
    await this.ensureLoaded();
    return this.workflows.find((w) => w.id === id);
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
    agents: AgentManifest[];
    packs: PackManifest[];
    workflows: WorkflowManifest[];
  }> {
    await this.ensureLoaded();
    const q = query.toLowerCase();

    const matchText = (texts: (string | undefined)[]): boolean =>
      texts.some((t) => t?.toLowerCase().includes(q));

    const matchingAgents =
      !filters?.type || filters.type === 'agent'
        ? this.agents.filter((a) =>
            matchText([a.name, a.description, a.id, ...(a.tags ?? [])]),
          )
        : [];

    const matchingPacks =
      !filters?.type || filters.type === 'pack'
        ? this.packs.filter((p) => matchText([p.name, p.description, p.id]))
        : [];

    const matchingWorkflows =
      !filters?.type || filters.type === 'workflow'
        ? this.workflows.filter((w) =>
            matchText([w.name, w.description, w.id]),
          )
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
