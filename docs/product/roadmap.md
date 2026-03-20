# Product Roadmap (Execution-Oriented)

This roadmap reflects the current repository state and the architecture
direction in
[`platform-context-v2.md`](../architecture/platform-context-v2.md).

Near-term execution planning now lives in:

- [`action-plan.md`](./action-plan.md) for program tracks and dependency order
- [`epic-template.md`](./epic-template.md) for new epic creation
- the initial epic portfolio linked from `action-plan.md`

## Completed

The completed phase summaries below are historical milestone notes. They are
not the canonical live-state verification source. Use
[`platform-context-v2.md`](../architecture/platform-context-v2.md) for the
current, code-verified repository truth. When a historical phase note mentions
production activation, treat it as implementation history unless the
[operational verification snapshot](../architecture/platform-context-v2.md#operational-verification-snapshot-on-march-19-2026)
revalidates the live state explicitly.

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

- Phase 2 introduced the VPS compose and deploy path intended to run API +
  worker behind Traefik; use the March 19, 2026 operational snapshot in
  [`platform-context-v2.md`](../architecture/platform-context-v2.md#operational-verification-snapshot-on-march-19-2026)
  for the current live verification result.
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
- March 19, 2026 production verification: the live VPS stack was redeployed
  from `main`, the hardened smoke test passed `3/3`, and the public catalog
  now returns the live `inbox-triage` manifest. Later the same day, the
  residual-risk cleanup replaced the legacy root cron, rotated the approved
  VPS-local secrets, revalidated the protected public routes, and completed a
  live Gmail OAuth callback. Later the same night, `deploy-phase25.sh` passed
  again from `codex/fix-production-residual-risks`, `DELETE /connectors/gmail`
  was revalidated live on a disposable tenant, and the guarded
  `scripts/cleanup-validation-tenant.ts` path replaced the ad hoc SQL cleanup
  for temporary validation fixtures. On March 20, 2026, the same branch
  live-verified the rotated `GOOGLE_CLIENT_SECRET` and `N8N_API_KEY`, plus
  the real queued n8n provisioning path, after deploying follow-up worker
  fixes. The remaining production-truth live follow-up is now the OpenAI quota
  state behind `OPENAI_API_KEY`, plus cleanup hardening for external n8n
  workflows created by disposable validation fixtures.

## Next (Phase 3: Production Hardening)

The next phase is no longer feature-first. It is baseline-first.

### Track 0: Baseline Confidence

- Fix the current `pnpm test` breakage.
- Align core payloads with `@agentmou/contracts`.
- Add runtime validation in the web API client.

### Track 1: Honest Product Surfaces

- Label or limit tenant surfaces that are still stub-backed,
  empty-default backed, or synthetic.
- Prefer honest `Preview`, `Read-only`, or `Not yet available` states over
  misleading production-like screens.

### Track 2: VPS Operations Cleanup

- Restore usable quota or billing for the rotated `OPENAI_API_KEY`, then
  re-run the direct `agents` deep-health check.
- Extend temporary-fixture and uninstall cleanup so n8n workflows are deleted
  along with their local installation rows.

### Track 3: Catalog Convergence

- Keep the demo catalog for marketing and `demo-workspace`.
- Ensure real tenant behavior depends only on manifest-backed assets and API
  data.

### Track 4: Controlled Expansion

Start only after Tracks 0-3 are credibly closed.

Recommended order:

1. Multi-tenant marketplace and RBAC
2. Usage metering and billing
3. Memory / RAG
4. Additional connectors
5. Enterprise hardening

## Later (Phase 3+)

- Dynamic catalog growth from manifests with clearer installability semantics
- Real usage metering and billing events
- Knowledge and memory with pgvector
- Additional connector providers (Slack, Drive, Salesforce, etc.)
- Enterprise hardening: SSO/SAML, audit export, retention controls
- Shared UI extraction only when cross-app reuse justifies it

## Risks

- Google OAuth review required for production (100-user "testing" mode
  limit until verified).
- Token encryption key management: if lost, all stored tokens are
  unreadable.
- Gmail API rate limits (250 quota units/user/sec).
- Reintroducing a second web domain model (legacy drift).
- Treating n8n as control-plane source of truth.
- Scope creep into expansion work before the baseline repair tracks are closed.
