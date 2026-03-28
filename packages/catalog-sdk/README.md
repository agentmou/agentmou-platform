# @agentmou/catalog-sdk

Loads and validates operational agent, workflow, and pack manifest files from
the versioned `catalog/` and `workflows/` directories.

## Purpose

Provides a `CatalogSDK` class for loading and validating operational manifests
from disk. The manifest schemas come from `@agentmou/contracts`, which keeps a
clear boundary between repo-facing operational manifests and UI-facing catalog
contracts. Demo-only marketing data lives in `apps/web/lib/demo-catalog/` and is
**out of scope** for this package (see [Catalog, Demo, and Marketing](../../docs/catalog-and-demo.md)).

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
- `resolveRepoRoot` helper for services that run from `src/` or `dist/`

## Development

```bash
pnpm --filter @agentmou/catalog-sdk typecheck
pnpm --filter @agentmou/catalog-sdk lint
```

## Related Docs

- [Catalog, Demo, and Marketing](../../docs/catalog-and-demo.md)
- [Architecture Overview](../../docs/architecture/overview.md)
- [Repository Map](../../docs/repo-map.md)
- [ADR-001: Monorepo Structure](../../docs/adr/001-monorepo-structure.md)
