# Product Roadmap (Execution-Oriented)

This roadmap reflects the current repository state and the architecture
direction in `whole-initial-context.md`.

## Completed

### Phase 0: Monorepo Bootstrap

- Monorepo structure validated against target plan.
- `apps/web` refactored: legacy dual-model removed, read-model pattern
  established.
- `packages/contracts` elevated to comprehensive shared type system.
- `packages/db` schema expanded to 12 plan-aligned tables.
- `packages/catalog-sdk` fixed to match actual manifest files.
- ESLint baseline installed and passing.

### Phase 1: Real Control Plane

- `services/api`: 8 priority modules rewritten with real Drizzle ORM
  persistence (tenants, memberships, catalog, installations, connectors,
  secrets, runs, approvals).
- `services/api`: catalog module serves data from manifest files via
  `@agentmou/catalog-sdk`.
- `services/worker`: BullMQ workers initialized, install-pack job
  implemented end-to-end.
- `packages/queue`: shared package for queue names and typed payloads.
- `packages/auth`: real JWT + PBKDF2 password hashing, register/login
  endpoints backed by database.
- `apps/web`: typed API client with 20+ endpoint methods and
  `useApiData` data-fetching hook.
- `packages/db`: Drizzle migrations generated, seed script created.
- Testing: Vitest configured, 25 tests across 3 packages.
- Infrastructure: n8n pinned, env vars added, ADR-003/004/005 written.
- Validation: typecheck 13/13, build 3/3, lint 12/12, test 6/6.

### Phase 2: First Runtime Vertical Slice

- VPS production stack activated: API + worker running behind Traefik.
- Auth: register creates user + tenant + membership in transaction;
  JWT middleware + tenant access guard on all tenant routes.
- Web: real login/register pages, DataProvider abstraction (mock for
  demo, API for authenticated routes), all 13 tenant pages migrated
  from mock to API.
- Agents: `POST /analyze-email` endpoint classifying emails via
  GPT-4o-mini with structured output.
- n8n: `@agentmou/n8n-client` wired to real n8n instance; workflow
  installations create actual n8n workflows
  ([ADR-007](../adr/007-n8n-workflow-provisioning.md)).
- Worker: `run-agent` and `run-workflow` jobs implemented end-to-end
  (Python agents API call, n8n execution, DB recording).
- API: `POST /tenants/:id/runs` triggers manual execution.

## Next (Phase 3: Production Hardening)

### 1) Real Connector OAuth Flows

- Implement OAuth2 flow for Gmail connector.
- Store tokens in secret envelopes with basic encryption.
- Test connection functionality.

## Later (Phase 3+)

- RBAC and multi-tenant isolation hardening.
- Dynamic catalog from manifests with versioning.
- Usage metering and billing events.
- Knowledge/memory with pgvector.
- Enterprise hardening: SSO/SAML, audit export, retention controls.
- Extract shared UI into `packages/ui` when needed.

## Risks

- Reintroducing a second web domain model (legacy drift).
- Treating n8n as control-plane source of truth.
- Expanding catalog breadth before runtime depth.
- Scope creep into enterprise features before vertical slice is proven.
