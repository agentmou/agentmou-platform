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
| `mockProvider` | Full demo catalog plus clinic fixtures | Marketing, tests, and local mock surfaces |
| `demoProvider` | Demo catalog plus operational and clinic overlays | Forces non-operational assets to `planned` with a status note and renders a read-only dental clinic tenant |
| `apiProvider` | `services/api` | Real tenant catalog and installations |

The `demo-workspace` intentionally stays read-only even when a matching
operational asset exists. That read-only policy now applies to both the
catalog/marketplace surfaces and the clinic control-center experience rendered
for the demo tenant. The clinic demo remains visible and realistic, but the
internal mode stays hidden and `/platform/*` is blocked by default.

The current clinic demo is intentionally journey-based, not generic placeholder
data. It covers:

- a new patient booking journey through WhatsApp, form completion, and booking
- an existing patient reschedule with WhatsApp plus callback
- pending and confirmed confirmations
- a recent cancellation that opens a gap and triggers outreach to a waitlist
  patient
- a running reactivation campaign with multiple recipient outcomes

Frontend selectors for this story live in
`apps/web/lib/demo/clinic-demo-fixtures.ts`, while the relational seed mirror
lives in `packages/db/src/clinic-demo-fixture.ts`.

For complete local verification, use:

```bash
pnpm validate:clinic-demo
```

The seeded local QA login is `admin@agentmou.dev` / `Demo1234!`. That user gets
three database-backed tenants:

- `Demo Workspace` as the internal admin workspace
- `Dental Demo Clinic` as the seeded clinic tenant
- `Fisio Pilot Workspace` as the minimal fisio fixture

The public `demo-workspace` remains a separate read-only clinic demo and keeps
internal/admin surfaces hidden by design.

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

The clinic-first homepage, pricing, security, and contact-sales surfaces use:

- `apps/web/lib/marketing/clinic-site.ts`
- `apps/web/lib/marketing/site-config.ts`
- `apps/web/components/marketing/*`

The secondary technical `/docs/engine` story uses:

- `apps/web/lib/demo-catalog/marketing-featured.ts`
- `apps/web/lib/marketing/featured-from-demo.ts`
- `apps/web/app/api/public-catalog/route.ts`

This keeps the public clinic narrative independent from the horizontal catalog
while still checking that the technical supporting blocks correspond to
operational assets where required. `/docs` and `/platform` now redirect back to
the marketing home so the technical narrative does not compete with the buyer
funnel, while `/docs/engine` remains accessible as a noindex secondary page.

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
