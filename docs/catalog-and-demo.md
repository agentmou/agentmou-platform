# Catalog, demo inventory, and marketing

This document is the entry point for **where assets live** and **how the UI
chooses data** for operational tenants, the public demo workspace, and
marketing.

## Layers

| Layer | Location | Consumed by |
| --- | --- | --- |
| **Operational** (installable) | `catalog/agents/`, `catalog/packs/`, `workflows/public/` | `services/api` `CatalogService`, worker installs, `apiProvider` |
| **Demo** (full UX inventory) | `apps/web/lib/demo-catalog/` | `mockProvider`, `demoProvider` (`demo-workspace`) |
| **Marketing featured** (curated cards) | `apps/web/lib/demo-catalog/marketing-featured.ts` | `/api/public-catalog`, marketing homepage |

Planned-only workflows may exist under `workflows/planned/`; the API excludes
them from default installable lists but they remain discoverable for planning.

## Operational catalog

- **Agents**: `catalog/agents/<id>/manifest.yaml`
- **Workflows**: `workflows/public/<id>/manifest.yaml`
- **Packs**: `catalog/packs/<slug>.yaml`

Authoring and promotion: [Template library](./template-library.md) and runbooks
linked from there.

`@agentmou/catalog-sdk` loads these files only — it does **not** read demo data.

## Demo catalog (`apps/web/lib/demo-catalog`)

- **`mock-data.ts`**: Tenants, template arrays, demo installs, billing/security
  stubs used by the FleetOps read model.
- **`catalog/*.ts`**: Additional agent and workflow slices merged into the main
  arrays.
- **`operational-refs.ts`**: Maps demo template IDs to operational manifest IDs
  when they differ (for example `agent-inbox-triage` → `inbox-triage`,
  `wf-01` → `wf-01-auto-label-gmail`).
- **`operational-ids.gen.json`**: Generated list of operational IDs on disk.
  Regenerate after changing real manifests:

```bash
pnpm demo-catalog:generate
```

- **`operational-index.ts`**: Helpers `isOperationalAgent`, etc., used by
  `demo-provider.ts`.
- **`marketing-featured.ts`**: Ordered IDs for homepage sections.

See also [apps/web/lib/demo-catalog/README.md](../apps/web/lib/demo-catalog/README.md).

## Demo workspace behavior

- Route layout selects `demoProvider` for `tenantId === demo-workspace`.
- Items **without** a matching operational manifest (after ref resolution) show
  **Coming soon** in the demo catalog views.
- Install actions remain simulated (read-only demo).

## Marketing

- `GET /api/public-catalog` returns featured agents, workflows, and packs built
  from the demo inventory, plus `demoTotals` and `operationalFeaturedCounts` for
  honest hero statistics.
- To change homepage cards, edit `marketing-featured.ts` (not the operational
  tree).

## Marketplace (real tenants)

- `apiProvider` serves the operational catalog from the API.
- Agent and workflow **tabs filter independently**; workflows are not hidden
  based on which agents are visible.

## Related ADR

- [011 — Operational vs demo vs marketing](./adr/011-operational-demo-marketing-catalog.md)
