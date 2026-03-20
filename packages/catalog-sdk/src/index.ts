/**
 * Catalog SDK — loads and validates agent, workflow, and pack manifests
 * from the versioned catalog/workflows directories.
 */

import { z } from 'zod';
import * as yaml from 'yaml';

// ---------------------------------------------------------------------------
// Agent Manifest (catalog/agents/<slug>/manifest.yaml)
// ---------------------------------------------------------------------------

const AgentTriggerSchema = z.object({
  type: z.string(),
  cron: z.string().optional(),
  event: z.string().optional(),
});

/** Manifest schema for `catalog/agents/<slug>/manifest.yaml`. */
export const AgentManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  category: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.record(z.unknown())).optional(),
  triggers: z.array(AgentTriggerSchema).optional(),
  metadata: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
});

/** TypeScript shape for an agent manifest. */
export type AgentManifest = z.infer<typeof AgentManifestSchema>;

// ---------------------------------------------------------------------------
// Pack Manifest (catalog/packs/<slug>.yaml)
// ---------------------------------------------------------------------------

/** Manifest schema for `catalog/packs/<slug>.yaml`. */
export const PackManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  category: z.string().optional(),
  agents: z.array(z.string()),
  workflows: z.array(z.string()).optional(),
  connectors: z.array(z.string()).optional(),
  recommended_settings: z.record(z.unknown()).optional(),
});

/** TypeScript shape for a pack manifest. */
export type PackManifest = z.infer<typeof PackManifestSchema>;

// ---------------------------------------------------------------------------
// Workflow Manifest (workflows/public/<slug>/manifest.yaml)
// ---------------------------------------------------------------------------

const WorkflowStepSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  type: z.string(),
  node: z.string().optional(),
  agent: z.string().optional(),
  action: z.string().optional(),
  condition: z.string().optional(),
});

const WorkflowTriggerConfigSchema = z.object({
  type: z.string(),
  event: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

/** Manifest schema for `workflows/public/<slug>/manifest.yaml`. */
export const WorkflowManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  type: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  trigger: WorkflowTriggerConfigSchema.optional(),
  steps: z.array(WorkflowStepSchema).optional(),
  metadata: z
    .object({
      author: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      executionCount: z.number().optional(),
      avgExecutionTime: z.string().optional(),
    })
    .optional(),
});

/** TypeScript shape for a workflow manifest. */
export type WorkflowManifest = z.infer<typeof WorkflowManifestSchema>;

// ---------------------------------------------------------------------------
// CatalogSDK
// ---------------------------------------------------------------------------

/** Loader that reads catalog manifests from disk and validates them with Zod. */
export class CatalogSDK {
  async loadAgentManifest(path: string): Promise<AgentManifest> {
    const content = await this.readFile(path);
    const parsed = yaml.parse(content);
    return AgentManifestSchema.parse(parsed);
  }

  async loadPackManifest(path: string): Promise<PackManifest> {
    const content = await this.readFile(path);
    const parsed = yaml.parse(content);
    return PackManifestSchema.parse(parsed);
  }

  async loadWorkflowManifest(path: string): Promise<WorkflowManifest> {
    const content = await this.readFile(path);
    const parsed = yaml.parse(content);
    return WorkflowManifestSchema.parse(parsed);
  }

  private async readFile(filePath: string): Promise<string> {
    const fs = await import('fs/promises');
    return fs.readFile(filePath, 'utf-8');
  }
}

export * from './repo-root';
