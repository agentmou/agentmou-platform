# 011 — Operational catalog vs demo catalog vs marketing featured

**Status**: accepted  
**Date**: 2026-03-26

## Context

The control-plane UI mixed three concerns: installable manifests on disk, a large
demo inventory for `demo-workspace`, and marketing homepage cards. Marketing
loaded the operational API catalog while the demo workspace used a separate
mock dataset, which inflated perceived catalog size. The marketplace also hid
workflows unless an agent listed them, even though workflows are first-class
installable assets.

## Decision

1. **Operational source of truth** remains `catalog/agents/`, `catalog/packs/`,
   and `workflows/public/` (plus `workflows/planned/` for planning-only assets),
   discovered by `services/api` via `@agentmou/catalog-sdk`.

2. **Full demo inventory** lives in `apps/web/lib/demo-catalog/` and powers
   `mockProvider`, `demo-workspace` via `demoProvider`, and honest sizing for
   marketing stats. Demo template IDs may differ from operational manifest IDs;
   `operational-refs.ts` maps demo IDs to operational IDs where needed.

3. **“Coming soon” in the demo workspace** is driven by whether a demo item
   resolves to an ID present in the generated `operational-ids.gen.json`, not
   only by `availability: planned` on mock rows.

4. **Marketing homepage cards** use a **curated subset** defined in
   `marketing-featured.ts`, built from the same demo inventory via
   `lib/marketing/featured-from-demo.ts` and exposed through `/api/public-catalog`.

5. **Marketplace** lists agents and workflows **independently**; workflow rows
   are no longer filtered by the visible agent list.

## Alternatives Considered

- **Single catalog only (no demo expansion)** — Rejected: product marketing and
  safe exploration still need a rich demo workspace without faking operational
  installs.

- **Keep API-first marketing catalog** — Rejected: operational inventory is
  intentionally small early on; the homepage would under-represent the demo
  experience.

## Consequences

- After adding operational agents, workflows, or packs, run
  `pnpm demo-catalog:generate` and commit `operational-ids.gen.json`.
- When demo IDs diverge from manifest IDs, update `operational-refs.ts` and keep
  Vitest ref integrity tests green.
- `lib/marketing/public-catalog.ts` remains available for optional API-driven
  tooling but is no longer the homepage card source.
