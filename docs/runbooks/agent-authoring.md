# Agent and Workflow Authoring

Use this runbook when creating or promoting a new product agent, workflow, or
hybrid asset.

## Choose the Right Asset Type

| Asset type | Start here | Promote to |
| --- | --- | --- |
| Product agent | `templates/product-agent-simple/` | `catalog/agents/<id>/` |
| Public workflow | `templates/n8n-workflow-simple/` | `workflows/public/<id>/` |
| Agent + workflow pair | `templates/agent-workflow-hybrid/` | `catalog/agents/<id>/` and `workflows/public/<id>/` |
| Pack | Existing operational assets | `catalog/packs/<id>.yaml` |

Important distinction:

- `templates/` are starter skeletons only
- `catalog/` and `workflows/public/` are operational runtime inputs
- `workflows/planned/` is for planned inventory, not installable runtime

## Operational File Shapes

### Product agent

```text
catalog/agents/<id>/
├── manifest.yaml
├── prompt.md
├── policy.yaml
└── README.md
```

### Public workflow

```text
workflows/public/<id>/
├── manifest.yaml
├── workflow.json
├── fixtures/        # optional but encouraged
└── README.md
```

### Hybrid asset

```text
catalog/agents/<agent-id>/
workflows/public/<workflow-id>/
```

The agent manifest links to the workflow through runtime metadata and both
halves must agree on the event payload shape.

## Authoring Flow

1. Copy the closest skeleton out of `templates/`.
2. Rename IDs, display names, tags, and placeholder values.
3. Author the operational files:
   - `manifest.yaml` for metadata and install/runtime configuration
   - `prompt.md` for agent behavior
   - `policy.yaml` for permissions and approval behavior
   - `workflow.json` for public n8n workflows
4. Add or update the asset `README.md` so humans can understand the runtime
   dependencies and expected inputs.
5. Move the finished files into `catalog/` or `workflows/public/`.

## Validation Checklist

After promoting an operational asset:

```bash
make validate-content
pnpm demo-catalog:generate
pnpm demo-catalog:check
```

Also run the checks that match the implementation you changed:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

If you changed the Python sidecar behavior that an agent depends on, also run:

```bash
pnpm test:agents
pnpm typecheck:agents
```

## Packs

Packs are defined as YAML files in `catalog/packs/*.yaml`. Use them when you
need to install a curated set of already-defined agents and workflows together.

Before adding a new pack:

- make sure each referenced operational asset already exists
- make sure the pack only references installable assets, not template skeletons
- regenerate the operational ID snapshot if the pack affects demo inventory

## Demo and Marketing Follow-Up

Operational promotion does not automatically update the richer demo inventory.
If the asset should appear in marketing or `demo-workspace`, review:

- `apps/web/lib/demo-catalog/`
- `apps/web/lib/demo-catalog/marketing-featured.ts`
- `apps/web/lib/demo-catalog/operational-refs.ts`

See [Catalog, Demo, and Marketing](../catalog-and-demo.md) for the full model.

## Related Docs

- [Catalog, Demo, and Marketing](../catalog-and-demo.md)
- [Catalog System](../architecture/catalog-system.md)
- [Repository Map](../repo-map.md)
