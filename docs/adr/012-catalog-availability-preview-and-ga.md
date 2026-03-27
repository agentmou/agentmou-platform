# 012 — Catalog availability: planned, preview, and generally available

**Status**: accepted  
**Date**: 2026-03-26

## Context

The marketplace labeled many demo rows as “Available” while `demoProvider` only
added a “Coming soon” `statusNote` for non-operational items, so badges could
read as GA even when no operational manifest existed. Marketing hero stats also
needed a clear split between **demo inventory size** and **repo-backed,
checklist-cleared** assets.

## Decision

1. Extend `@agentmou/contracts` `Availability` to three values:
   - `planned` — not operational (or planning-only workflows).
   - `preview` — operational manifest on disk (API-eligible) but **not** signed
     off as generally available.
   - `available` — operational **and** explicitly marked GA in manifest
     `catalog.availability`.

2. **API mapping** (`services/api` `catalog.mapper`): default operational assets
   to `preview` when `catalog.availability` is omitted, using
   `DEFAULT_OPERATIONAL_LISTING_AVAILABILITY`.

3. **Packs** include optional `catalog.availability` and template-level
   `availability` / `statusNote` for UI parity with agents and workflows.

4. **Demo workspace**: `demoProvider` forces `planned` (and “Coming soon”) for
   templates that do not resolve to operational IDs in `operational-ids.gen.json`.

5. **Marketing**: `marketing-featured.ts` lists only IDs that are operational
   **and** `availability: available` in demo data; `buildMarketingFeaturedCatalog`
   throws otherwise. `/api/public-catalog` exposes `gaInventoryCounts` for hero
   stats (operational + GA across the full demo inventory).

## Alternatives Considered

- **Parallel boolean `productionReady`** — Rejected: every filter and badge would
  combine two fields; a single enum keeps the mental model linear.

- **Keep two values and overload `available`** — Rejected: could not express
  “in API catalog but not GA” without lying in the UI.

## Consequences

- Operational YAML must set `catalog.availability: available` only after product
  checklist sign-off; default omission means `preview` in API responses.
- Marketing editors must keep `marketing-featured.ts` aligned with GA rows or
  CI/build fails when `buildMarketingFeaturedCatalog` runs.
- Downstream UIs should use `resolveCatalogAvailability` when a template omits
  the field (defaults to `preview`).

## Related

- [011 — Operational vs demo vs marketing](./011-operational-demo-marketing-catalog.md)
- [Catalog, demo, and marketing](../catalog-and-demo.md)
