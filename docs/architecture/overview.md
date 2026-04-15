# Agentmou Platform Architecture Overview

Agentmou is a multi-tenant control plane for installable agents and workflows.
The repo combines a web frontend, a Fastify API, asynchronous workers, a
Python sidecar for specialized analysis, and the repo-tracked catalog that
describes what can be installed.

## Topology

```text
apps/web
  public marketing + auth + tenant control plane
          |
          v
services/api
  auth, catalog, installs, connectors, runs, approvals, billing, security
          |
          v
Redis / BullMQ queues
  install-pack, run-agent, run-workflow, schedule-trigger, approval-timeout
          |
          v
services/worker
  background execution and orchestration
      |                     |
      v                     v
packages/agent-engine    @agentmou/n8n-client
      |                     |
      v                     v
services/agents         n8n

PostgreSQL stores tenant state, installations, executions, approvals,
connectors, billing, and audit data throughout the flow.
```

## Major Runtime Surfaces

### apps/web

`apps/web` owns four concerns:

- public marketing pages and docs entrypoints
- authentication and password reset flows
- tenant-scoped control-plane pages under `app/app/[tenantId]`
- two Next.js API routes used by the frontend itself: `chat` and
  `public-catalog`

The web app uses a provider abstraction so the same UI can render:

- real tenant data from `services/api`
- the read-only `demo-workspace`
- marketing/demo inventory backed by local demo data

It now also resolves the tenant experience itself:

- `clinic` tenants render the dedicated clinic shell at the tenant root
- `fisio` tenants reuse the shared care shell with a reduced capability set
- `internal` tenants keep the original platform shell plus the Admin console
- top-level internal routes are canonical, while `/app/[tenantId]/platform/*`
  remains as a compatibility alias
- the resolved `TenantExperience` payload drives permissions, navigation,
  settings sections, feature flags, admin visibility, internal access, and
  optional `featureDecisions` traces for entitlement/readiness/rollout

### services/api

`services/api` is the control-plane source of truth. It registers public,
authenticated, and tenant-scoped route modules that split into:

- public routes for auth, catalog, public chat, connector callback, and Stripe
  webhooks
- authenticated routes resolved by the canonical `agentmou-session` cookie,
  with bearer fallback still accepted for non-browser compatibility
- tenant-scoped routes that build on the same auth layer plus membership
  checks

It persists state through `@agentmou/db`, loads operational manifests through
`@agentmou/catalog-sdk`, and enqueues long-running work via `@agentmou/queue`.
It now also centralizes tenant experience resolution across vertical,
plan/module baseline, clinic profile/channel configuration, admin eligibility,
and product rollout with Reflag fail-open fallback so the web shell and tenant
APIs consume one coherent access model. Legacy booleans such as
`verticalClinicUi` and `internalPlatformVisible` remain read-only migration
inputs, not the primary source of truth.

### services/worker

`services/worker` processes the queue-backed asynchronous lifecycle:

- `install-pack`
- `run-agent`
- `run-workflow`
- `schedule-trigger`
- `approval-timeout`

The worker is the bridge between control-plane requests and actual execution.

### packages/agent-engine

`@agentmou/agent-engine` is the shared runtime used when an installed product
agent executes. It coordinates prompts, policies, tool execution, approval
gates, and run logging. The worker loads it rather than the web or API layers
trying to execute agents inline.

### services/agents

`services/agents` is a small Python FastAPI sidecar. Today it exposes the
specialized `/analyze-email` capability used by the rest of the platform rather
than serving as a general orchestration runtime.

## Catalog Boundary

There are two different catalog surfaces in the repo:

- operational manifests in `catalog/` and `workflows/public/`
- demo and marketing inventory in `apps/web/lib/demo-catalog/`

This separation is intentional. Operational files are installable runtime
inputs. Demo files are UI-facing inventory that may include planned or preview
items.

See [Catalog, Demo, and Marketing](../catalog-and-demo.md) for the precise
boundary.

## Storage and Shared Packages

### PostgreSQL and `@agentmou/db`

`packages/db` owns the Drizzle schema, migrations, seed script, and database
connection helpers. The current repo-tracked migration history lives in
`packages/db/drizzle/`.

In addition to the original platform tables for tenancy, connectors,
installations, runs, approvals, billing, and audit, the schema now includes a
clinic-domain foundation for:

- clinic configuration and module visibility
- patients and patient identities
- conversations, messages, and call sessions
- intake forms and scheduling catalogs
- appointments, reminders, and confirmations
- waitlist, gap recovery, and reactivation campaigns

The repo now includes the clinic-domain schema, shared contracts, tenant-scoped
API route families, backend services/read models, typed web API clients, the
clinic tenant shell, the shared settings framework, the Admin surface, and the
widened `DataProvider` used by the web app. The resolved `TenantExperience`
layer is now the canonical source for permissions, flags, navigation, settings
sections, internal access, admin visibility, and decision trace. Internal
access is not a separate staff-user model; it is derived outside rollout from
normalized tenant role, tenant type, and the resolved
`internalPlatformVisible` / `adminConsoleEnabled` outputs.

### Redis and `@agentmou/queue`

`packages/queue` centralizes queue names, payload types, and shared BullMQ
connection helpers used by both the API and worker.

### Shared contracts

`packages/contracts` provides shared Zod schemas and inferred TypeScript types
for catalog data, tenants, installations, runs, approvals, billing, security,
public chat, and the new clinic domain. The clinic module now exposes entity
schemas, dashboard/read models, list/detail envelopes, mutation wrappers,
filters, action payloads, and the structured
`clinic_feature_unavailable` error surface used by the backend and typed web
clients.

## Key Flows

### 1. Tenant auth and navigation

1. The browser hits `apps/web`.
2. Auth routes call `services/api` under `/api/v1/auth`.
3. The API issues or validates the opaque `agentmou-session` cookie, with
   bearer auth kept only as a non-browser compatibility fallback.
4. `proxy.ts` in the web app enforces canonical marketing/app hosts, protects
   tenant routes, and preserves access to the `demo-workspace`.

### 2. Catalog browsing and installation

1. Marketing surfaces use demo inventory and `public-catalog`.
2. Real tenants fetch operational catalog data from `services/api`.
3. Installation requests create database records and, for packs, enqueue
   `install-pack`.
4. The worker resolves manifests from disk and completes the install flow.

### 3. Agent or workflow execution

1. A tenant triggers a run through `services/api`.
2. The API records the run and enqueues `run-agent` or `run-workflow`.
3. The worker executes the job, calling either `@agentmou/agent-engine` or
   n8n through `@agentmou/n8n-client`.
4. Run logs, approval requests, and outcomes are persisted to PostgreSQL.

### 4. Human approval handling

1. Execution creates approval records when policy requires review.
2. The tenant UI reads approvals from `services/api`.
3. Approval or rejection is written back through the API.
4. `approval-timeout` exists to handle expiration and cleanup asynchronously.

## Documentation Strategy

The architecture docs should describe what is implemented today and mark future
work explicitly as `planned`, `preview`, or `future`. Repo-facing details live
in:

- [apps/web Architecture](./apps-web.md)
- [API Routes](../api-routes.md)
- [Repository Map](../repo-map.md)
- [Catalog, Demo, and Marketing](../catalog-and-demo.md)

## Related Docs

- [apps/web Architecture](./apps-web.md)
- [Catalog System](./catalog-system.md)
- [Catalog, Demo, and Marketing](../catalog-and-demo.md)
- [Repository Map](../repo-map.md)
- [Data Model](./data-model.md)
