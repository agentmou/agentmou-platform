# Honest UI Audit — March 2026

**Validated on**: March 18, 2026

This audit captures the current truth for tenant-facing surfaces that still
look more complete than their backing behavior.

Use this file together with:

- [`platform-context-v2.md`](./platform-context-v2.md)
- [`../product/epics/epic-c-honest-ui.md`](../product/epics/epic-c-honest-ui.md)
- [`../../apps/web/lib/honest-ui/audit.ts`](../../apps/web/lib/honest-ui/audit.ts)

The code remains the source of truth. This document mirrors the audit map in
`apps/web` so product copy and UI treatment can stay aligned.

## Surface Map

| Surface | Section | Classification | Current truth | Honest treatment |
| --- | --- | --- | --- | --- |
| Dashboard | Metrics | `empty-default-backed` | Authenticated tenants render zeroed KPI and chart data from `apiProvider` defaults when no real metrics endpoint exists. | `Preview` |
| Observability | Analytics | `empty-default-backed` | Analytics cards and charts rely on synthetic defaults, while recent runs stay backed by real tenant runs. | `Preview` |
| Security | Tenant surface | `mixed-real-read-only-stubbed-actions` | Membership data is real, but secrets, audit, and management actions are empty-default backed or client-only. | `Read-only` |
| Settings | General | `read-only` | Workspace identity is real, but edits do not persist yet. | `Read-only` |
| Settings | Billing | `stub-backed` | Billing summary, invoices, and payment method content are placeholder or stub-backed. | `Not yet available` |
| Settings | n8n connection | `not-exposed-platform-managed` | The provider has an n8n connection shape, but tenant UI does not expose a real management surface. | `Not yet available` |
| Installer | Tenant activation flow | `client-simulated` | Connect and install steps can show success without performing real tenant-side work. | `Preview` |
| Command palette | Quick actions | `client-simulated` | Retry, approve-next, and smoke-test actions imply execution but only navigate or toast. | `Preview` |
| Chat | Assistant | `mock` | The tenant and marketing assistant are driven by the mock chat engine. | `Demo` |

## Follow-On Dependencies

These dependencies should remain explicit instead of being hidden behind
optimistic UI:

1. Add a real tenant dashboard metrics endpoint instead of relying on
   `apiProvider` empty defaults.
2. Wire security UI actions to real backend behavior for secrets, audit,
   policies, and team management.
3. Wire billing and usage surfaces to real billing data instead of stub
   modules.
4. Decide whether tenants ever need a first-class n8n surface, or whether it
   stays platform-managed and internal by design.

## Guardrails

- Keep `demo-workspace` clearly demo-oriented and read-only.
- Keep marketing explicitly demo-oriented instead of pretending to be a live
  tenant control plane.
- Do not restore optimistic copy or CTA behavior unless the backing flow is
  verified in code and validation.
