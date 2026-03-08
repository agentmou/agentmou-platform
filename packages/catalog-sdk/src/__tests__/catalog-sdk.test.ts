import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { CatalogSDK, AgentManifestSchema, PackManifestSchema, WorkflowManifestSchema } from '../index';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');

describe('CatalogSDK', () => {
  const sdk = new CatalogSDK();

  describe('loadAgentManifest', () => {
    it('loads inbox-triage agent manifest', async () => {
      const manifest = await sdk.loadAgentManifest(
        path.join(REPO_ROOT, 'catalog/agents/inbox-triage/manifest.yaml'),
      );
      expect(manifest.id).toBe('inbox-triage');
      expect(manifest.name).toBe('Inbox Triage');
      expect(manifest.version).toBe('0.1.0');
    });

    it('throws on missing file', async () => {
      await expect(
        sdk.loadAgentManifest(path.join(REPO_ROOT, 'catalog/agents/nonexistent/manifest.yaml')),
      ).rejects.toThrow();
    });
  });

  describe('loadPackManifest', () => {
    it('loads support-starter pack manifest', async () => {
      const manifest = await sdk.loadPackManifest(
        path.join(REPO_ROOT, 'catalog/packs/support-starter.yaml'),
      );
      expect(manifest.id).toBe('support-starter');
      expect(manifest.agents).toContain('inbox-triage');
    });
  });

  describe('loadWorkflowManifest', () => {
    it('loads wf-01 workflow manifest', async () => {
      const manifest = await sdk.loadWorkflowManifest(
        path.join(REPO_ROOT, 'workflows/public/wf-01-auto-label-gmail/manifest.yaml'),
      );
      expect(manifest.id).toBe('wf-01-auto-label-gmail');
      expect(manifest.type).toBe('n8n');
    });
  });
});

describe('Manifest Schemas', () => {
  describe('AgentManifestSchema', () => {
    it('validates a minimal agent manifest', () => {
      const result = AgentManifestSchema.parse({
        id: 'test-agent',
        name: 'Test Agent',
        version: '1.0.0',
        description: 'A test agent',
      });
      expect(result.id).toBe('test-agent');
    });

    it('rejects missing required fields', () => {
      expect(() => AgentManifestSchema.parse({ id: 'x' })).toThrow();
    });
  });

  describe('PackManifestSchema', () => {
    it('validates a pack with agents', () => {
      const result = PackManifestSchema.parse({
        id: 'test-pack',
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test pack',
        agents: ['agent-1', 'agent-2'],
      });
      expect(result.agents).toHaveLength(2);
    });
  });

  describe('WorkflowManifestSchema', () => {
    it('validates a workflow manifest', () => {
      const result = WorkflowManifestSchema.parse({
        id: 'test-wf',
        name: 'Test Workflow',
        version: '1.0.0',
        description: 'A test workflow',
        type: 'n8n',
        status: 'public',
      });
      expect(result.type).toBe('n8n');
    });
  });
});
