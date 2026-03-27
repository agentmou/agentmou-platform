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
- Items **without** a matching operational manifest (after ref resolution) are
  forced to `availability: planned` and show **Coming soon** in the demo catalog
  views (aligned with marketplace badges).
- Install actions remain simulated (read-only demo).

## Listing availability (planned / preview / available)

| Value | Meaning |
| --- | --- |
| `planned` | No operational manifest (or planning-only workflow). |
| `preview` | Operational manifest exists (API can list it); **not** GA yet. |
| `available` | Operational **and** product checklist / GA sign-off in YAML (`catalog.availability`). |

- API defaults omitted `catalog.availability` on operational manifests to
  `preview` (`DEFAULT_OPERATIONAL_LISTING_AVAILABILITY` in `@agentmou/contracts`).
- Mark `available` only in a PR that includes checklist evidence (tests, runbook
  updates, or explicit reviewer sign-off per team policy). Regressions should drop
  back to `preview`.

## Marketing

- `GET /api/public-catalog` returns featured agents, workflows, and packs built
  from the demo inventory, plus:
  - `demoTotals` — full demo inventory counts.
  - `operationalFeaturedCounts` — featured rows after validation (operational +
    `available`).
  - `gaInventoryCounts` — operational + `available` counts across the **entire**
    demo inventory (hero “generally available” stat).
- To change homepage cards, edit `marketing-featured.ts`. Every listed id must be
  operational and `availability: available` in demo data, or the server build
  throws when assembling the payload.

## Marketplace (real tenants)

- `apiProvider` serves the operational catalog from the API.
- Agent and workflow **tabs filter independently**; workflows are not hidden
  based on which agents are visible.

## Related ADRs

- [011 — Operational vs demo vs marketing](./adr/011-operational-demo-marketing-catalog.md)
- [012 — Catalog availability (preview vs GA)](./adr/012-catalog-availability-preview-and-ga.md)
