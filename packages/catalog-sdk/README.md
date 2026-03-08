# @agentmou/catalog-sdk

Loads and validates agent, workflow, and pack manifest files from the
versioned `catalog/` and `workflows/` directories.

## Purpose

Provides Zod schemas that match the actual YAML manifest structure used
in the repository, plus a `CatalogSDK` class for loading and validating
manifests from disk.

## Usage

```typescript
import { CatalogSDK } from '@agentmou/catalog-sdk';

const sdk = new CatalogSDK();
const agent = await sdk.loadAgentManifest('catalog/agents/inbox-triage/manifest.yaml');
const pack = await sdk.loadPackManifest('catalog/packs/support-starter.yaml');
const workflow = await sdk.loadWorkflowManifest('workflows/public/wf-01-auto-label-gmail/manifest.yaml');
```

## Key Exports

- `AgentManifestSchema` / `AgentManifest`
- `PackManifestSchema` / `PackManifest`
- `WorkflowManifestSchema` / `WorkflowManifest`
- `CatalogSDK` class

## Development

```bash
pnpm --filter @agentmou/catalog-sdk typecheck
pnpm --filter @agentmou/catalog-sdk lint
```
