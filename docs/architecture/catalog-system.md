# Catalog System

The catalog system is the product-facing model for what Agentmou can surface,
install, and market. It sits on top of repo-tracked operational manifests and a
separate demo catalog used by the web app.

## What This Document Covers

This page is the conceptual view:

- what the catalog is for
- why availability tiers exist
- how operational, demo, and marketing layers relate

For the path-level source of truth, use
[Catalog, Demo, and Marketing](../catalog-and-demo.md).

## Layers

### Operational layer

Operational assets are the installable definitions tracked in:

- `catalog/agents/`
- `catalog/packs/*.yaml`
- `workflows/public/`

These files are loaded by `@agentmou/catalog-sdk` and served through
`services/api`.

### Demo layer

The web app ships a richer demo inventory under `apps/web/lib/demo-catalog/`.
That layer is allowed to contain planned or preview items that do not yet exist
as operational assets.

### Marketing layer

Marketing pages use curated featured IDs and derived payloads rather than
reading directly from operational manifests at request time.

## Availability Tiers

Availability communicates how honest the platform should be about the readiness
of an asset.

| Tier | Meaning |
| --- | --- |
| `planned` | Visible as future inventory, not ready for real installation |
| `preview` | Real but intentionally limited or early |
| `available` | Operational and ready for general use |

These labels matter in both the API responses and the UI copy. A future-looking
item should be labeled as such, not documented as fully operational.

## Why The Separation Exists

The repo needs both:

- operational manifests that workers and installers can trust
- richer demo and marketing inventory for storytelling and preview surfaces

Keeping them separate prevents two bad outcomes:

1. demo-only inventory accidentally becoming runtime source of truth
2. operational docs pretending every future concept is already installable

## Authoring Entry Points

- Use `templates/` to start new assets.
- Promote finished assets into `catalog/` or `workflows/public/`.
- Update demo inventory only when the asset should appear in marketing or
  `demo-workspace`.

## Related Docs

- [Catalog, Demo, and Marketing](../catalog-and-demo.md)
- [Agent Authoring](../runbooks/agent-authoring.md)
- [apps/web Architecture](./apps-web.md)
