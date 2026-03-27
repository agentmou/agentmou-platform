# Demo catalog

This folder holds the **full demo UX inventory**: agent, workflow, and pack templates
shown in `demo-workspace` and (in curated form) on marketing pages. It is **not** the
operational installable catalog.

## Operational source of truth

Installable assets are defined on disk for `services/api` discovery:

- `catalog/agents/<id>/manifest.yaml`
- `workflows/public/<id>/manifest.yaml`
- `catalog/packs/*.yaml`

## Demo vs operational IDs

Demo rows often use marketing IDs (for example `agent-inbox-triage`, `wf-01`) that
differ from operational manifest `id` values (`inbox-triage`,
`wf-01-auto-label-gmail`). Maps in [`operational-refs.ts`](operational-refs.ts) link
demo IDs to operational IDs.

The generated file [`operational-ids.gen.json`](operational-ids.gen.json) lists IDs
present in the operational tree. Regenerate it after adding real catalog assets:

```bash
pnpm demo-catalog:generate
```

## Layout

| Path | Role |
| --- | --- |
| `mock-data.ts` | Tenants, template arrays, installed fixtures, security/billing stubs |
| `catalog/*.ts` | Extra agent/workflow slices merged into `mock-data` |
| `operational-refs.ts` | Demo ID → operational ID (where they differ) |
| `marketing-featured.ts` | Ordered IDs for marketing hero sections (each must be operational + `availability: available`) |
| `operational-ids.gen.json` | Generated operational ID lists (committed) |

See [docs/catalog-and-demo.md](../../../../docs/catalog-and-demo.md) for the full model.
