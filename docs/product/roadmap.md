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

### Phase 2.5: Connectors & Real Execution

- OAuth2 flow for Gmail: authorize URL generation, callback handling,
  token exchange, AES-256-GCM encryption at rest
  ([ADR-008](../adr/008-connector-oauth-token-storage.md)).
- Real `GmailConnector` backed by `googleapis`: list/get/modify messages,
  automatic token refresh.
- Agent engine wired to real LLM calls (GPT-4o-mini planning), policy
  checks from `policy.yaml`, and step-level DB logging.
- Worker `run-agent` job delegates to `AgentEngine.execute()` instead of
  raw fetch to Python API.
- `schedule-trigger` job: BullMQ repeatable jobs fire cron-based agent
  runs (e.g. inbox-triage every 15 minutes).
- `approval-timeout` job: auto-resolves pending approvals with
  configurable actions (auto-approve, auto-reject, escalate).
- `install-pack` creates schedule entries for agents with cron triggers.
- Web cleanup: zero direct `read-model` imports outside `lib/data/`;
  empty states for new tenants (dashboard, fleet, runs, approvals).
- DB schema: 14 tables, 3 migrations (`connector_oauth_states`,
  `schedules`, OAuth fields on `connector_accounts`).
- 61+ unit tests across 7 packages/services.
- E2E test script: `scripts/test-e2e-triage.ts`.

## Next (Phase 3: Production Hardening)

### 1) Deploy Phase 2.5 to VPS

- Rebuild containers, run migrations, add new env vars.
- Smoke test full stack end-to-end on production.

### 2) Multi-Tenant Marketplace

- Public agent/workflow publishing.
- Tenant-scoped connector and secret isolation.
- RBAC with role-based permissions per tenant.

## Later (Phase 3+)

- Dynamic catalog from manifests with versioning.
- Usage metering and billing events.
- Knowledge/memory with pgvector.
- Enterprise hardening: SSO/SAML, audit export, retention controls.
- Additional connector providers (Slack, Drive, Salesforce, etc.).
- Extract shared UI into `packages/ui` when needed.

## Risks

- Google OAuth review required for production (100-user "testing" mode
  limit until verified).
- Token encryption key management: if lost, all stored tokens are
  unreadable.
- Gmail API rate limits (250 quota units/user/sec).
- Reintroducing a second web domain model (legacy drift).
- Treating n8n as control-plane source of truth.
- Scope creep into enterprise features before vertical slice is proven.
