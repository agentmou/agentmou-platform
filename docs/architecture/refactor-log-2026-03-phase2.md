# Refactor Log — Phase 2: First Runtime Vertical Slice

**Date**: 2026-03-09
**Scope**: 10 PRs across all layers (infra, API, web, agents, worker)

## Summary

Phase 2 transforms the platform from a demo-only prototype into a
working system where a real user can register, install agents, and
trigger execution runs with LLM inference and n8n workflow orchestration.

## PRs Completed

| # | Branch | Scope | What |
|---|--------|-------|------|
| 1 | `feat/activate-api-vps` | infra | Activate API + worker in VPS production stack |
| 2 | `feat/auth-tenant-creation` | auth, api | Register creates user + tenant + membership atomically |
| 3 | `feat/api-auth-middleware` | api | JWT middleware + tenant access guard |
| 4 | `feat/web-auth-pages` | web | Real login/register, auth store, route protection |
| 5 | `feat/web-data-provider` | web | DataProvider abstraction (mock vs API) |
| 6 | `feat/web-migrate-catalog` | web | Marketplace pages from mock to API |
| 7 | `feat/web-migrate-tenant` | web | All 9 tenant pages from mock to API |
| 8 | `feat/agents-analyze-email` | agents | `/analyze-email` with GPT-4o-mini |
| 9 | `feat/n8n-workflow-provisioning` | api, n8n-client | Real n8n workflow creation on install |
| 10 | `feat/e2e-support-starter` | worker, api, queue | End-to-end run-agent + run-workflow |

## Key Architectural Decisions

- **ADR-007**: One n8n workflow per tenant-installation (simple for MVP,
  will need cleanup automation at scale).
- **DataProvider pattern**: React context with two implementations
  (`mockProvider`, `apiProvider`) selected by route group, not env flag.
- **Cookie-based JWT**: Token stored in `agentmou-token` cookie readable
  by both Next.js middleware (server) and client-side API calls.

## Files Added

| Path | Purpose |
|------|---------|
| `apps/web/lib/auth/` | Auth store, API, cookies (3 files) |
| `apps/web/lib/data/` | DataProvider interface, mock/api providers, hook (5 files) |
| `apps/web/app/(auth)/` | Login + register pages + layout (3 files) |
| `apps/web/middleware.ts` | Route protection |
| `docs/adr/007-n8n-workflow-provisioning.md` | ADR for n8n strategy |

## Breaking Changes

None — all changes are additive. Marketing pages continue to work with
mock data. No existing API contracts were modified.

## What's Left for Phase 3

- OAuth connector flows (Gmail, Slack)
- RBAC hardening and multi-tenant isolation
- Usage metering and billing events
- Knowledge/memory with pgvector
- Enterprise features (SSO, audit export)
