/**
 * Catalog SDK — loads and validates agent, workflow, and pack manifests
 * from the versioned catalog/workflows directories.
 */

import {
  OperationalAgentManifestSchema,
  OperationalPackManifestSchema,
  OperationalWorkflowManifestSchema,
  type OperationalAgentManifest,
  type OperationalPackManifest,
  type OperationalWorkflowManifest,
} from '@agentmou/contracts';
import * as yaml from 'yaml';

/** Alias retained for backward compatibility in workspace imports. */
export const AgentManifestSchema = OperationalAgentManifestSchema;

/** TypeScript alias retained for backward compatibility in workspace imports. */
export type AgentManifest = OperationalAgentManifest;

/** Alias retained for backward compatibility in workspace imports. */
export const PackManifestSchema = OperationalPackManifestSchema;

/** TypeScript alias retained for backward compatibility in workspace imports. */
export type PackManifest = OperationalPackManifest;

/** Alias retained for backward compatibility in workspace imports. */
export const WorkflowManifestSchema = OperationalWorkflowManifestSchema;

/** TypeScript alias retained for backward compatibility in workspace imports. */
export type WorkflowManifest = OperationalWorkflowManifest;

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
