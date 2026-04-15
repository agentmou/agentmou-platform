# API Routes Reference

This document summarizes the routes currently registered by `services/api`.
It is intentionally grounded in the route modules wired in `src/app.ts`.

## Base URLs

- Health: `http://localhost:3001/health`
- API base: `http://localhost:3001/api/v1`

## Registration Model

`services/api/src/app.ts` registers routes in four layers:

1. public routes with no auth middleware
2. authenticated routes resolved by `requireAuth`
3. tenant-scoped routes resolved by `requireAuth` plus tenant membership checks
4. tenant-scoped internal-platform routes guarded by
   `requireInternalPlatformAccess`

This is why some routes live directly under `/api/v1/*` while others live under
`/api/v1/tenants/:tenantId/*`.

## Public Routes

| Area | Routes |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password` |
| B2C OAuth | `GET /api/v1/auth/oauth/providers`, `GET /api/v1/auth/oauth/:provider/authorize`, `GET /api/v1/auth/oauth/:provider/callback`, `POST /api/v1/auth/oauth/exchange` |
| Catalog | `GET /api/v1/catalog/agents`, `GET /api/v1/catalog/agents/:id`, `GET /api/v1/catalog/packs`, `GET /api/v1/catalog/workflows`, `GET /api/v1/catalog/categories`, `GET /api/v1/catalog/search` |
| Connector callback | `GET /api/v1/oauth/callback` |
| Public chat | `POST /api/v1/public/chat` |
| Stripe webhook | `POST /api/v1/webhooks/stripe` |
| Twilio clinic webhooks | `POST /api/v1/webhooks/twilio/whatsapp`, `POST /api/v1/webhooks/twilio/voice` |

Notes:

- `/api/v1/auth/me` is registered inside the public auth module, but it only
  returns a user snapshot when `requireAuth` can resolve either the canonical
  `agentmou-session` cookie or the bearer-token compatibility fallback.
- `GET /api/v1/oauth/callback` is public because Google redirects back to the
  API without a browser session cookie.
- Twilio clinic webhook routes are also public because provider callbacks do
  not carry a user session; they resolve tenant/channel from the addressed phone
  number, validate the Twilio signature, persist `webhook_events`, and enqueue
  worker fan-out only after idempotency checks.

## Authenticated Route Families

### Tenant routes

These routes require an authenticated session:

- browser flows use the `agentmou-session` HttpOnly cookie
- non-browser and compatibility flows may still use `Authorization: Bearer ...`

- `GET /api/v1/tenants`
- `POST /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `PUT /api/v1/tenants/:id`
- `DELETE /api/v1/tenants/:id`
- `GET /api/v1/tenants/:id/settings`
- `PUT /api/v1/tenants/:id/settings`

### Tenant-scoped routes

These routes require the same authenticated session plus access to the tenant
in the path:

| Module | Example routes |
| --- | --- |
| Memberships | `GET /api/v1/tenants/:tenantId/members`, `POST /api/v1/tenants/:tenantId/members`, `PUT /api/v1/tenants/:tenantId/members/:memberId` |
| Installations | `GET /api/v1/tenants/:tenantId/installations`, `POST /api/v1/tenants/:tenantId/installations/agents`, `POST /api/v1/tenants/:tenantId/installations/workflows`, `POST /api/v1/tenants/:tenantId/installations/packs` |
| Connectors | `GET /api/v1/tenants/:tenantId/connectors`, `POST /api/v1/tenants/:tenantId/connectors`, `POST /api/v1/tenants/:tenantId/connectors/:connectorId/test`, `GET /api/v1/tenants/:tenantId/connectors/oauth/:provider/authorize` |
| Secrets | `GET /api/v1/tenants/:tenantId/secrets`, `POST /api/v1/tenants/:tenantId/secrets`, `DELETE /api/v1/tenants/:tenantId/secrets/:secretId` |
| Approvals | `GET /api/v1/tenants/:tenantId/approvals`, `GET /api/v1/tenants/:tenantId/approvals/:approvalId`, `POST /api/v1/tenants/:tenantId/approvals/:approvalId/approve`, `POST /api/v1/tenants/:tenantId/approvals/:approvalId/reject` |
| Runs | `GET /api/v1/tenants/:tenantId/runs`, `GET /api/v1/tenants/:tenantId/runs/:runId`, `GET /api/v1/tenants/:tenantId/runs/:runId/logs`, `POST /api/v1/tenants/:tenantId/runs` |
| Usage | `GET /api/v1/tenants/:tenantId/usage`, `GET /api/v1/tenants/:tenantId/usage/breakdown`, `GET /api/v1/tenants/:tenantId/usage/history`, `GET /api/v1/tenants/:tenantId/usage/limits` |
| Billing | `GET /api/v1/tenants/:tenantId/billing/overview`, `GET /api/v1/tenants/:tenantId/billing/subscription`, `PUT /api/v1/tenants/:tenantId/billing/subscription`, `GET /api/v1/tenants/:tenantId/billing/invoices` |
| Security | `GET /api/v1/tenants/:tenantId/security/overview`, `GET /api/v1/tenants/:tenantId/security/findings`, `GET /api/v1/tenants/:tenantId/security/policies`, `GET /api/v1/tenants/:tenantId/security/audit-logs` |
| Webhooks | `GET /api/v1/tenants/:tenantId/webhooks`, `POST /api/v1/tenants/:tenantId/webhooks`, `POST /api/v1/tenants/:tenantId/webhooks/:webhookId/deliveries/:deliveryId/retry` |
| n8n | `GET /api/v1/tenants/:tenantId/n8n/status`, `GET /api/v1/tenants/:tenantId/n8n/workflows`, `POST /api/v1/tenants/:tenantId/n8n/workflows/import`, `POST /api/v1/tenants/:tenantId/n8n/workflows/:workflowId/execute` |
| Clinic dashboard and settings | `GET /api/v1/tenants/:tenantId/clinic/dashboard`, `GET /api/v1/tenants/:tenantId/clinic/experience`, `GET /api/v1/tenants/:tenantId/clinic/profile`, `PUT /api/v1/tenants/:tenantId/clinic/profile`, `GET /api/v1/tenants/:tenantId/clinic/modules`, `PUT /api/v1/tenants/:tenantId/clinic/modules/:moduleKey`, `GET /api/v1/tenants/:tenantId/clinic/channels`, `PUT /api/v1/tenants/:tenantId/clinic/channels/:channelType` |
| Patients | `GET /api/v1/tenants/:tenantId/patients`, `GET /api/v1/tenants/:tenantId/patients/:patientId`, `POST /api/v1/tenants/:tenantId/patients`, `PUT /api/v1/tenants/:tenantId/patients/:patientId`, `POST /api/v1/tenants/:tenantId/patients/:patientId/reactivate`, `POST /api/v1/tenants/:tenantId/patients/:patientId/waitlist` |
| Conversations | `GET /api/v1/tenants/:tenantId/conversations`, `GET /api/v1/tenants/:tenantId/conversations/:threadId`, `GET /api/v1/tenants/:tenantId/conversations/:threadId/messages`, `POST /api/v1/tenants/:tenantId/conversations/:threadId/assign`, `POST /api/v1/tenants/:tenantId/conversations/:threadId/escalate`, `POST /api/v1/tenants/:tenantId/conversations/:threadId/resolve`, `POST /api/v1/tenants/:tenantId/conversations/:threadId/reply` |
| Calls | `GET /api/v1/tenants/:tenantId/calls`, `GET /api/v1/tenants/:tenantId/calls/:callId`, `POST /api/v1/tenants/:tenantId/calls/:callId/callback`, `POST /api/v1/tenants/:tenantId/calls/:callId/resolve` |
| Appointments | `GET /api/v1/tenants/:tenantId/appointments`, `GET /api/v1/tenants/:tenantId/appointments/:appointmentId`, `POST /api/v1/tenants/:tenantId/appointments`, `PUT /api/v1/tenants/:tenantId/appointments/:appointmentId`, `POST /api/v1/tenants/:tenantId/appointments/:appointmentId/reschedule`, `POST /api/v1/tenants/:tenantId/appointments/:appointmentId/cancel`, `POST /api/v1/tenants/:tenantId/appointments/:appointmentId/confirm` |
| Forms | `GET /api/v1/tenants/:tenantId/forms/templates`, `GET /api/v1/tenants/:tenantId/forms/submissions`, `GET /api/v1/tenants/:tenantId/forms/submissions/:submissionId`, `POST /api/v1/tenants/:tenantId/forms/submissions/:submissionId/send`, `POST /api/v1/tenants/:tenantId/forms/submissions/:submissionId/mark-complete`, `POST /api/v1/tenants/:tenantId/forms/submissions/:submissionId/waive` |
| Follow-up | `GET /api/v1/tenants/:tenantId/follow-up/reminders`, `GET /api/v1/tenants/:tenantId/follow-up/confirmations`, `POST /api/v1/tenants/:tenantId/follow-up/confirmations/:confirmationId/remind`, `POST /api/v1/tenants/:tenantId/follow-up/confirmations/:confirmationId/escalate`, `GET /api/v1/tenants/:tenantId/follow-up/gaps`, `POST /api/v1/tenants/:tenantId/follow-up/gaps/:gapId/offer`, `POST /api/v1/tenants/:tenantId/follow-up/gaps/:gapId/close` |
| Reactivation | `GET /api/v1/tenants/:tenantId/reactivation/campaigns`, `GET /api/v1/tenants/:tenantId/reactivation/campaigns/:campaignId`, `POST /api/v1/tenants/:tenantId/reactivation/campaigns`, `POST /api/v1/tenants/:tenantId/reactivation/campaigns/:campaignId/start`, `POST /api/v1/tenants/:tenantId/reactivation/campaigns/:campaignId/pause`, `POST /api/v1/tenants/:tenantId/reactivation/campaigns/:campaignId/resume`, `GET /api/v1/tenants/:tenantId/reactivation/recipients` |

### Clinic route rules

- All clinic routes live under `/api/v1/tenants/:tenantId/*` and are registered
  inside the existing auth + tenant-membership scope.
- `GET /api/v1/tenants/:tenantId/experience` is the canonical payload for
  shell mode, permissions, flags, allowed navigation, settings sections, and
  enriched module entitlements. `GET /clinic/experience` remains as the clinic
  compatibility layer.
- Role handling normalizes legacy `member` to `operator` for outward-facing
  payloads and clinic access checks.
- Read routes allow `owner`, `admin`, `operator`, and `viewer`.
- Operational mutations allow `owner`, `admin`, and `operator`.
- Profile, module, channel, and campaign management stays on `owner` and
  `admin`.
- Module gating resolves a plan baseline first and then applies `tenant_modules`
  overrides, operational prerequisites, and server-side feature-flag
  evaluation; channel gating uses `clinic_channels`.
- Inactive modules or channels return `409` with the machine-readable
  `clinic_feature_unavailable` payload so clients can distinguish
  `not_in_plan`, `hidden_internal_only`, `disabled_by_tenant`,
  `requires_configuration`, `channel_inactive`, `channel_missing`, and
  `disabled_by_feature_flag` from empty result sets.
- Conversation replies, reminders, form nudges, gap outreach, reactivation
  dispatches, and voice callbacks enqueue dedicated BullMQ clinic jobs instead
  of attempting provider delivery inline during the request.
- One-shot clinic automations use delayed BullMQ queues; recurring reactivation
  cadences continue to flow through persisted `schedules` and the
  `schedule-trigger` worker.
- List endpoints use clinic contracts for filters and clamp `limit` to `100`,
  with query coercion for boolean and numeric values.

### Internal-platform route rules

- `installations`, `approvals`, `runs`, and `usage` now sit behind the extra
  `requireInternalPlatformAccess` tenant-scoped guard.
- Internal access is derived from normalized role (`owner|admin`), the
  resolved `internal_platform` module entitlement, and
  `tenant.settings.internalPlatformVisible`.
- Shared tenant and clinic configuration routes stay outside that internal-only
  layer because the clinic shell still needs them.

## Module Map

| Module directory | Purpose |
| --- | --- |
| `modules/auth` | Email/password auth, B2C OAuth, password reset |
| `modules/catalog` | Manifest-backed catalog browsing and search |
| `modules/tenants` | Tenant CRUD and settings |
| `modules/memberships` | Tenant membership management |
| `modules/installations` | Agent, workflow, and pack installation |
| `modules/connectors` | Connector records and Gmail OAuth initiation |
| `modules/secrets` | Tenant-scoped secret storage |
| `modules/runs` | Run creation, retrieval, and logs |
| `modules/approvals` | Human approval retrieval and decisions |
| `modules/usage` | Usage summaries, history, export, limits |
| `modules/billing` | Subscription, invoices, payment methods |
| `modules/security` | Security overview, findings, policies, audit logs |
| `modules/webhooks` | Tenant outbound webhooks plus Stripe ingest |
| `modules/n8n` | Workflow engine status and n8n management helpers |
| `modules/public-chat` | Public chat endpoint used by the marketing experience |
| `modules/clinic-dashboard` | Vertical dashboard KPI and queue read model |
| `modules/clinic-experience` | Resolved clinic mode, flags, permissions, navigation, and entitlements |
| `modules/clinic-profile` | Clinic profile read/update endpoints |
| `modules/clinic-modules` | Tenant clinic entitlements and module configuration |
| `modules/clinic-channels` | Clinic channel read/update endpoints |
| `modules/patients` | Patients, detail views, reactivation, and waitlist creation |
| `modules/conversations` | Unified inbox threads, messages, and thread actions |
| `modules/calls` | Call queue, callback scheduling, and call resolution |
| `modules/appointments` | Appointment list/detail plus create/update/reschedule/cancel/confirm |
| `modules/forms` | Intake form templates, submissions, and submission actions |
| `modules/follow-up` | Reminder queues, confirmations, and gap operations |
| `modules/reactivation` | Campaigns, lifecycle actions, and recipients |
| `modules/clinic-shared` | Clinic access checks, entitlement resolution, route errors, query schemas, mappers, fixtures, read-model joins, and automation scheduling helpers |
| `modules/clinic-webhooks` | Twilio WhatsApp/voice webhook ingest, signature validation, idempotency, and queue fan-out |

## Working With Routes

If you need to change or document a route:

1. Start in `services/api/src/app.ts` to confirm middleware scope.
2. Open the relevant `services/api/src/modules/*/*.routes.ts` file.
3. Check `packages/contracts` if the route returns typed payloads.
4. Update [apps/web Architecture](./architecture/apps-web.md) if the UI depends
   on the route family.

## Related Docs

- [Architecture Overview](./architecture/overview.md)
- [apps/web Architecture](./architecture/apps-web.md)
- [Repository Map](./repo-map.md)
