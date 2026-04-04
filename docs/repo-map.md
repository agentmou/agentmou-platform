# Repository Map

This map is a high-signal guide to the repo as it exists today. It favors real
entrypoints, route trees, and workspace boundaries over exhaustive file dumps.

## Root Configuration

| Path | Purpose |
| --- | --- |
| `README.md` | Root project overview and quick-start commands |
| `Makefile` | Manual content validation entrypoints |
| `package.json` | Root workspace scripts, dependency tooling, pnpm overrides |
| `pnpm-workspace.yaml` | Workspace membership |
| `turbo.json` | Turborepo task graph |
| `biome.json` | Formatting and parser checks for supported files |
| `eslint.config.js` | ESLint rules used by workspaces |
| `vitest.config.ts` / `vitest.setup.ts` | Shared test runner setup |
| `.markdownlint.json` / `.markdownlint-cli2.jsonc` | Relaxed Markdown validation |
| `.yamllint.yml` | Relaxed YAML validation |

## apps/

### apps/web

`apps/web` is the Next.js frontend for marketing, auth, and the tenant control
center.

```text
apps/web/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── docs/page.tsx
│   │   ├── pricing/page.tsx
│   │   └── security/page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── auth/callback/page.tsx
│   ├── api/
│   │   ├── chat/route.ts
│   │   └── public-catalog/route.ts
│   ├── app/
│   │   ├── page.tsx
│   │   └── [tenantId]/
│   │       ├── agenda/page.tsx
│   │       ├── approvals/page.tsx
│   │       ├── bandeja/page.tsx
│   │       ├── configuracion/page.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── fleet/page.tsx
│   │       ├── installer/new/page.tsx
│   │       ├── marketplace/
│   │       ├── observability/page.tsx
│   │       ├── pacientes/page.tsx
│   │       ├── platform/
│   │       ├── reactivacion/page.tsx
│   │       ├── rendimiento/page.tsx
│   │       ├── runs/
│   │       ├── security/page.tsx
│   │       ├── seguimiento/
│   │       └── settings/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── clinic/
│   └── control-plane/
├── lib/
│   ├── api/
│   │   ├── core.ts
│   │   ├── client.ts
│   │   ├── clinic.ts
│   │   └── hooks.ts
│   ├── auth/
│   ├── data/
│   ├── demo-catalog/
│   ├── demo/
│   │   └── clinic-read-model.ts
│   ├── honest-ui/
│   ├── tenant-experience.tsx
│   └── marketing/
├── components.json
├── next.config.mjs
├── postcss.config.mjs
├── proxy.ts
└── vitest.config.ts
```

Notes:

- There is no `tailwind.config.ts`; Tailwind v4 is wired through PostCSS and
  `globals.css`.
- `proxy.ts` is part of the auth and tenant-access story.
- `lib/api/core.ts` is the shared request/error boundary for the web clients;
  `client.ts` serves the existing control plane and `clinic.ts` serves the
  tenant-scoped clinic backend.
- `app/app/[tenantId]/layout.tsx` and `lib/tenant-experience.tsx` are the key
  boundaries for understanding shell resolution, capability flags, and
  `/platform/*` routing in clinic tenants.
- `lib/data/` now carries the shared `DataProvider` contract for both platform
  and clinic surfaces.
- `components/clinic/` is the new domain UI boundary for the vertical control
  center, while `components/control-plane/` still owns the original platform
  shell.
- `lib/search-index.ts` splits search and command palette behavior into clinic
  and platform modes.

## services/

### services/api

`services/api` is the Fastify control plane.

```text
services/api/src/
├── app.ts
├── config.ts
├── middleware/
│   ├── auth.ts
│   └── tenant-access.ts
├── modules/
│   ├── approvals/
│   ├── auth/
│   ├── billing/
│   ├── calls/
│   ├── catalog/
│   ├── clinic-channels/
│   ├── clinic-dashboard/
│   ├── clinic-modules/
│   ├── clinic-profile/
│   ├── clinic-shared/
│   ├── connectors/
│   ├── conversations/
│   ├── follow-up/
│   ├── forms/
│   ├── installations/
│   ├── memberships/
│   ├── n8n/
│   ├── patients/
│   ├── public-chat/
│   ├── reactivation/
│   ├── runs/
│   ├── secrets/
│   ├── security/
│   ├── tenants/
│   ├── usage/
│   ├── appointments/
│   └── webhooks/
└── routes/zod-validator.ts
```

`app.ts` is the best starting point for understanding how modules are wired,
which routes are public, which routes are tenant-scoped, and how the clinic
families are layered on top of the original control plane. `modules/clinic-shared`
is the key support package for role checks, module/channel gating, route
errors, mappers, fixtures, and read-model joins.

### services/worker

`services/worker` is the BullMQ execution service.

```text
services/worker/src/
├── index.ts
└── jobs/
    ├── approval-timeout/
    ├── install-pack/
    ├── run-agent/
    ├── run-workflow/
    ├── runtime-support/
    └── schedule-trigger/
```

`index.ts` registers one worker per queue and is the clearest overview of the
current async execution model.

### services/agents

`services/agents` is the Python FastAPI sidecar:

```text
services/agents/
├── main.py
├── test_main.py
├── requirements.txt
└── Dockerfile
```

## packages/

| Workspace | Purpose |
| --- | --- |
| `packages/agent-engine` | Shared runtime for executing installable product agents |
| `packages/auth` | JWT helpers and auth support code |
| `packages/catalog-sdk` | Loads and validates operational manifests from disk |
| `packages/connectors` | Connector providers and OAuth support |
| `packages/contracts` | Shared Zod schemas and TypeScript types for the control plane plus clinic-domain contracts |
| `packages/db` | Drizzle schema, tracked migrations, seed, and DB helpers for both platform and clinic-domain data |
| `packages/n8n-client` | Thin client for n8n HTTP operations |
| `packages/observability` | Shared logging helpers |
| `packages/queue` | Queue names, payloads, and BullMQ connection helpers |

### packages/db

The database package is organized around a small source tree and a tracked
migration history:

```text
packages/db/
├── src/
│   ├── client.ts
│   ├── config.ts
│   ├── index.ts
│   ├── schema.ts
│   └── seed.ts
└── drizzle/
    ├── 0000_*.sql ... 0007_*.sql
    └── meta/
```

## Catalog and Templates

```text
catalog/
├── agents/
│   └── inbox-triage/
├── packs/
│   ├── sales-accelerator.yaml
│   └── support-starter.yaml
└── categories.yaml

workflows/
├── planned/
│   └── wf-plan-rag-kb-answer/manifest.yaml
└── public/
    └── wf-01-auto-label-gmail/
        ├── manifest.yaml
        ├── workflow.json
        ├── fixtures/
        └── README.md

templates/
├── product-agent-simple/
├── n8n-workflow-simple/
└── agent-workflow-hybrid/
```

Key boundary:

- `catalog/` and `workflows/public/` are operational runtime inputs
- `templates/` are starter skeletons, not installable assets
- `apps/web/lib/demo-catalog/` is demo inventory, not the operational catalog

## Infrastructure and Scripts

```text
infra/
├── backups/
├── compose/
├── scripts/
└── traefik/

scripts/
├── cleanup-validation-tenant.ts
├── generate-operational-catalog-ids.ts
└── test-e2e-triage.ts
```

- `infra/compose/` owns the local and production Docker Compose files.
- `infra/scripts/` contains the tracked operational scripts for setup, deploy,
  smoke tests, backups, and cleanup.
- root `scripts/` contains repo utilities that are not part of the VPS runbook.

## Documentation Entry Points

| Need | Start here |
| --- | --- |
| Platform overview | `docs/architecture/overview.md` |
| Web frontend shape | `docs/architecture/apps-web.md` |
| Catalog vs demo boundary | `docs/catalog-and-demo.md` |
| Operational runbooks | `docs/runbooks/README.md` |
| Local setup | `docs/onboarding.md` |

## Related Docs

- [Architecture Overview](./architecture/overview.md)
- [apps/web Architecture](./architecture/apps-web.md)
- [Catalog, Demo, and Marketing](./catalog-and-demo.md)
- [API Routes](./api-routes.md)
