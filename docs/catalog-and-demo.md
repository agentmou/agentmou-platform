# Catalog, Demo, and Marketing

This document explains the boundary between the operational catalog tracked in
the repo and the richer demo inventory used by the web app.

## Source of Truth Layers

### 1. Operational assets

These are the installable definitions the backend can load from disk.

```text
catalog/
├── agents/<agent-id>/
│   ├── manifest.yaml
│   ├── prompt.md
│   ├── policy.yaml
│   └── README.md
├── packs/<pack-id>.yaml
└── categories.yaml

workflows/
├── public/<workflow-id>/
│   ├── manifest.yaml
│   ├── workflow.json
│   ├── fixtures/
│   └── README.md
└── planned/<workflow-id>/manifest.yaml
```

Operational assets are loaded by `@agentmou/catalog-sdk` and exposed through
`services/api`.

Important rules:

- `catalog/agents/` holds installable product agents.
- `catalog/packs/*.yaml` holds bundled install definitions.
- `workflows/public/` holds installable n8n workflows.
- `workflows/planned/` is documentation and planning material, not installable
  runtime inventory.

### 2. Demo catalog

`apps/web/lib/demo-catalog/` is a richer, UI-oriented inventory used by the
marketing site and the `demo-workspace` tenant.

Key files:

- `mock-data.ts` combines the full demo inventory.
- `catalog/*.ts` store curated slices for agents, workflows, and integrations.
- `marketing-featured.ts` defines the ordered IDs shown on marketing surfaces.
- `operational-refs.ts` maps demo IDs to operational IDs where they differ.
- `operational-ids.gen.json` is the generated snapshot of operational IDs found
  on disk.

The demo catalog is allowed to contain future or planned items that do not yet
exist as operational manifests.

### 3. Runtime provider overlays

The web app uses provider mode to decide how much of the catalog is “real”.

| Provider | Inventory source | Behavior |
| --- | --- | --- |
| `mockProvider` | Full demo catalog | Marketing and local mock surfaces |
| `demoProvider` | Demo catalog plus operational overlay | Forces non-operational assets to `planned` with a status note |
| `apiProvider` | `services/api` | Real tenant catalog and installations |

The `demo-workspace` intentionally stays read-only even when a matching
operational asset exists.

## Generated Snapshot Workflow

`apps/web/lib/demo-catalog/operational-ids.gen.json` is generated from the
operational tree and checked into Git.

Commands:

```bash
pnpm demo-catalog:generate
pnpm demo-catalog:check
```

Use them whenever you add, remove, or rename:

- `catalog/agents/*`
- `catalog/packs/*.yaml`
- `workflows/public/*`

## Marketing Catalog Surfaces

Marketing pages do not read directly from `catalog/` at runtime.

Instead they use:

- `apps/web/lib/demo-catalog/marketing-featured.ts`
- `apps/web/lib/marketing/featured-from-demo.ts`
- `apps/web/app/api/public-catalog/route.ts`

This keeps homepage and docs-card content curated while still checking that
featured items correspond to operational assets where required.

## Authoring Rules

When creating or updating assets:

1. Start from `templates/` for new agents or workflows.
2. Promote the final operational files into `catalog/` or `workflows/public/`.
3. Keep demo-only copy and marketing copy in `apps/web/lib/demo-catalog/`.
4. Regenerate `operational-ids.gen.json` after operational changes.
5. Prefer labeling future inventory as `planned` instead of pretending it is
   already installable.

## Where To Document What

| Need | Canonical doc |
| --- | --- |
| Installable manifest locations and demo boundary | This document |
| High-level marketplace concepts and availability tiers | [Catalog System](./architecture/catalog-system.md) |
| Web app provider behavior | [apps/web Architecture](./architecture/apps-web.md) |
| Step-by-step asset creation | [Agent Authoring](./runbooks/agent-authoring.md) |

## Related Docs

- [Catalog System](./architecture/catalog-system.md)
- [apps/web Architecture](./architecture/apps-web.md)
- [Repository Map](./repo-map.md)
- [Agent Authoring](./runbooks/agent-authoring.md)
