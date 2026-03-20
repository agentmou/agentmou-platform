# Refactor Log — Phase 2.5: Connectors & Real Execution

**Date**: 2026-03-09
**Scope**: 10 PRs closing the gaps between Phase 2 (vertical slice skeleton)
and Phase 3 (multi-tenant marketplace).

## Summary

Phase 2.5 transforms the system from a demo skeleton into a working
vertical slice where a tenant can connect Gmail via OAuth2, and the
inbox-triage agent classifies real emails on a cron schedule.

## Changes by PR

### PR 1 — feat(db): OAuth schema
- Extended `connector_accounts` with `access_token`, `refresh_token`,
  `token_expires_at`, `external_account_id`, `connected_at`.
- Added `connector_oauth_states` table for CSRF protection.
- Created AES-256-GCM `encrypt`/`decrypt` helpers in `@agentmou/connectors`.
- ADR-008: connector OAuth and token storage strategy.

### PR 2 — feat(api): Gmail OAuth2 flow
- `OAuthService` with authorize URL generation, callback processing,
  token exchange, and encrypted storage.
- Public callback route (`GET /api/v1/oauth/callback`) registered
  alongside auth and catalog routes.
- Tenant-scoped authorize route
  (`GET /tenants/:id/connectors/oauth/:provider/authorize`).

### PR 3 — feat(connectors): Real GmailConnector
- Full `googleapis`-backed implementation: connect, listMessages,
  getMessage (MIME body extraction), addLabels, removeLabels, healthCheck.
- Connector loader: `loadGmailConnector` decrypts tokens from DB,
  `loadTenantConnectors` loads all connected connectors for a tenant.

### PR 4 — feat(agent-engine): Real LLM + policies + logging
- `Planner` calls GPT-4o-mini for structured plan generation.
- `PolicyEngine` evaluates actions against `policy.yaml` configs.
- `Toolkit` with 3 real tools: `gmail-read`, `gmail-label`, `analyze-email`.
- `RunLogger` persists steps to `execution_steps` and updates
  `execution_runs` with final metrics.
- `AgentEngine.execute()` orchestrates the full pipeline.

### PR 5 — feat(worker): run-agent uses AgentEngine
- Replaced raw `fetch` to `/analyze-email` with `AgentEngine.execute()`.
- Job loads template prompt, policy config, and tenant connectors.

### PR 6 — feat(worker): schedule-trigger
- Added `schedules` table to DB schema.
- `schedule-trigger` job loads schedule, creates `execution_runs` row,
  enqueues the appropriate run job.
- Registered as 4th active worker queue.

### PR 7 — feat(worker): approval-timeout
- Real implementation: auto-approve (resume run), auto-reject (fail run),
  or escalate with audit event logging.
- Registered as 5th active worker queue.

### PR 8 — feat(web): read-model cleanup + empty states
- Eliminated all direct `read-model` imports from `app/`, `components/`.
- Migrated app-shell, search-index, command-palette, marketing page,
  settings, and security pages.
- Added `EmptyState` component with empty states for dashboard, fleet,
  runs, and approvals pages.

### PR 10 — feat(worker): E2E Gmail triage
- `install-pack` now creates BullMQ repeatable jobs for agents with
  cron triggers.
- E2E test script (`scripts/test-e2e-triage.ts`) validates the full
  register → install → connect → run flow.

## Database Changes

| Migration | Tables | Columns |
|-----------|--------|---------|
| 0001 | `connector_oauth_states` (new) | 7 columns |
| 0001 | `connector_accounts` | +5 columns (OAuth fields) |
| 0002 | `schedules` (new) | 8 columns |

## New Dependencies

| Package | Added to | Version |
|---------|----------|---------|
| `googleapis` | `@agentmou/connectors` | ^144.0.0 |
| `openai` | `@agentmou/agent-engine` | ^4.80.0 |
| `yaml` | `@agentmou/worker` | ^2.7.0 |

## New ADR

- [ADR-008: Connector OAuth and Token Storage](../adr/008-connector-oauth-token-storage.md)

## Test Coverage

61+ unit tests across 7 packages/services:
- `packages/connectors`: 24 tests (crypto + gmail)
- `packages/agent-engine`: 18 tests (policies + planner)
- `services/api`: 7 tests (oauth service)
- `services/worker`: 12 tests (run-agent + schedule-trigger + approval-timeout)

## What's Next

- PR 9: Deploy to VPS and smoke test in production.
- Phase 3: Multi-tenant marketplace, RBAC, usage metering.
