# @agentmou/api

Fastify-based control-plane API for tenants, catalog access, installations,
connectors, approvals, public chat, run orchestration, and the clinic backend
surface.

## Purpose

`services/api` is the main backend entry point for the platform. It exposes the
HTTP API used by `apps/web`, persists tenant state through Drizzle ORM, and
bridges synchronous control-plane requests to asynchronous worker execution via
BullMQ.

## Responsibilities

- Expose public authentication and catalog endpoints.
- Expose a public chat endpoint for the marketing experience.
- Protect authenticated and tenant-scoped routes with JWT and membership checks.
- Validate selected request bodies with Zod-based validators.
- Persist tenants, memberships, connectors, secrets, installations, runs, and
  approvals through `@agentmou/db`.
- Expose clinic tenant-scoped route families for dashboard, profile, modules,
  channels, patients, inbox, calls, appointments, forms, follow-up, and
  reactivation.
- Expose public inbound Twilio webhook endpoints for clinic WhatsApp and voice,
  persist them idempotently in `webhook_events`, and fan them out to worker
  jobs.
- Resolve clinic experience, permissions, navigation, and module visibility
  from tenant plan, `tenant_modules`, `clinic_channels`, `clinic_profiles`,
  and tenant settings.
- Resolve server-side feature flags from plan/module baseline, operational
  prerequisites, and Reflag overrides with local fail-open fallback.
- Enforce clinic role checks, tenant-module gating, channel activation checks,
  and structured `409 clinic_feature_unavailable` responses for inactive
  features.
- Gate internal platform API surfaces behind the resolved `internal_platform`
  entitlement plus `tenant.settings.internalPlatformVisible`.
- Build clinic read models for the web control-center clients instead of
  exposing raw table rows.
- Queue long-running work such as pack installation and run execution.
- Handle Gmail OAuth initiation and callback flows.
- Proxy selected n8n workflow management operations through `@agentmou/n8n-client`.
- Install workflow templates only when a real definition exists in
  `workflows/public/<templateId>/workflow.json`.

## How It Fits Into The System

`@agentmou/api` is the control-plane backend between the UI and the data plane:
- `apps/web` calls this service for auth, tenant data, workflow management, and
  the typed clinic backend fetchers in `lib/api/clinic.ts`.
- `services/worker` consumes jobs that this API enqueues.
- `@agentmou/contracts` provides shared types and schemas.
- `@agentmou/db` provides the PostgreSQL schema and client.
- `@agentmou/queue` provides queue names and typed BullMQ payloads.
- `@agentmou/connectors` validates and normalizes inbound Twilio webhook
  payloads before they are persisted.

## Local Usage

Run the API in watch mode:

```bash
pnpm --filter @agentmou/api dev
```

Build and run the compiled service:

```bash
pnpm --filter @agentmou/api build
pnpm --filter @agentmou/api start
```

Health endpoint:

```bash
curl http://localhost:3001/health
```

## Route Overview

### Public Routes

| Prefix | Purpose |
| --- | --- |
| `/health` | Liveness check |
| `/api/v1/auth` | Register, login, me, B2C OAuth (Google/Microsoft), one-time code exchange, forgot/reset password |
| `/api/v1/catalog` | Agent, pack, workflow, category, and search access |
| `/api/v1/public/chat` | Public chat route backed by shared contracts |
| `/api/v1/oauth/callback` | Public Google OAuth callback |
| `/api/v1/webhooks/twilio/*` | Public clinic inbound WhatsApp and voice webhooks |

### Authenticated Routes

| Area | Examples |
| --- | --- |
| Tenants | `/api/v1/tenants`, `/api/v1/tenants/:id/settings` |
| Memberships | `/api/v1/tenants/:tenantId/members` |
| Installations | `/api/v1/tenants/:tenantId/installations/*` |
| Connectors | `/api/v1/tenants/:tenantId/connectors/*` |
| Secrets | `/api/v1/tenants/:tenantId/secrets/*` |
| Approvals | `/api/v1/tenants/:tenantId/approvals/*` |
| Runs | `/api/v1/tenants/:tenantId/runs/*` |
| Usage | `/api/v1/tenants/:tenantId/usage/*` |
| Billing | `/api/v1/tenants/:tenantId/billing/*` |
| Security | `/api/v1/tenants/:tenantId/security/*` |
| Webhooks | `/api/v1/tenants/:tenantId/webhooks/*` |
| n8n | `/api/v1/tenants/:tenantId/n8n/*` |
| Clinic dashboard + settings | `/api/v1/tenants/:tenantId/clinic/dashboard`, `/api/v1/tenants/:tenantId/clinic/experience`, `/api/v1/tenants/:tenantId/clinic/profile`, `/api/v1/tenants/:tenantId/clinic/modules/:moduleKey`, `/api/v1/tenants/:tenantId/clinic/channels/:channelType` |
| Patients | `/api/v1/tenants/:tenantId/patients`, `/api/v1/tenants/:tenantId/patients/:patientId/reactivate`, `/api/v1/tenants/:tenantId/patients/:patientId/waitlist` |
| Conversations | `/api/v1/tenants/:tenantId/conversations`, `/api/v1/tenants/:tenantId/conversations/:threadId/messages`, `/api/v1/tenants/:tenantId/conversations/:threadId/reply` |
| Calls | `/api/v1/tenants/:tenantId/calls`, `/api/v1/tenants/:tenantId/calls/:callId/callback`, `/api/v1/tenants/:tenantId/calls/:callId/resolve` |
| Appointments | `/api/v1/tenants/:tenantId/appointments`, `/api/v1/tenants/:tenantId/appointments/:appointmentId/reschedule`, `/api/v1/tenants/:tenantId/appointments/:appointmentId/cancel`, `/api/v1/tenants/:tenantId/appointments/:appointmentId/confirm` |
| Forms | `/api/v1/tenants/:tenantId/forms/templates`, `/api/v1/tenants/:tenantId/forms/submissions/:submissionId/send`, `/api/v1/tenants/:tenantId/forms/submissions/:submissionId/mark-complete`, `/api/v1/tenants/:tenantId/forms/submissions/:submissionId/waive` |
| Follow-up | `/api/v1/tenants/:tenantId/follow-up/reminders`, `/api/v1/tenants/:tenantId/follow-up/confirmations/:confirmationId/remind`, `/api/v1/tenants/:tenantId/follow-up/confirmations/:confirmationId/escalate`, `/api/v1/tenants/:tenantId/follow-up/gaps/:gapId/offer`, `/api/v1/tenants/:tenantId/follow-up/gaps/:gapId/close` |
| Reactivation | `/api/v1/tenants/:tenantId/reactivation/campaigns`, `/api/v1/tenants/:tenantId/reactivation/campaigns/:campaignId/start`, `/api/v1/tenants/:tenantId/reactivation/campaigns/:campaignId/pause`, `/api/v1/tenants/:tenantId/reactivation/campaigns/:campaignId/resume`, `/api/v1/tenants/:tenantId/reactivation/recipients` |

Stub modules for usage, billing, security, and webhooks are registered so the
route shape exists even where the implementation is still thin.

For clinic tenants, installations, approvals, runs, and usage now sit behind
the dedicated `requireInternalPlatformAccess` guard. Shared tenant and clinic
configuration APIs remain available to the clinic UI outside that internal-only
layer.

## Important Modules

- `src/app.ts` wires middleware, route registration, CORS, and validation.
- `src/modules/auth` owns register/login/me, B2C OAuth (authorize/callback,
  exchange, identity linking), forgot/reset password, and related rate limits.
- `src/modules/catalog` serves manifest-backed catalog data.
  It maps operational manifests to shared UI catalog contracts before sending
  API responses.
- `src/modules/installations` creates installations and queues pack installs.
  `GET /installations` returns grouped `{ agents, workflows }` lists.
- `src/modules/connectors` manages connector records and Gmail OAuth flows.
- `src/modules/runs` creates run records and triggers agent or workflow jobs.
- `src/modules/approvals` manages human-in-the-loop requests and decisions.
- `src/modules/n8n` adapts workflow import/export/execute operations to `@agentmou/n8n-client`.
- `src/modules/public-chat` exposes the public chat route and its backing
  service.
- `src/modules/clinic-experience` resolves the canonical clinic experience
  payload used by the web shell for mode, permissions, flags, navigation, and
  enriched module entitlements.
- `src/modules/feature-flags` centralizes server-side feature resolution,
  Reflag evaluation, and local override fallback for tenant experience and
  route gating.
- `src/modules/clinic-*` plus `patients`, `conversations`, `calls`,
  `appointments`, `forms`, `follow-up`, and `reactivation` implement the
  tenant-scoped clinic backend families.
- `src/modules/clinic-shared` centralizes clinic access control, Zod query
  coercion, plan/module entitlement resolution, structured route errors,
  mappers, test fixtures, read-model joins, and worker-facing automation
  orchestration.
- `src/modules/clinic-webhooks` handles Twilio signature validation, channel
  resolution, idempotent persistence into `webhook_events`, and queue fan-out.
- `src/middleware/internal-platform-access.ts` protects the platform-only API
  families that back `/app/[tenantId]/platform/*`.
- `src/lib/tenant-roles.ts` normalizes legacy membership values such as
  `member -> operator` before outward-facing payloads and entitlement checks.

## Configuration

Important environment variables discovered from the service and its immediate
dependencies:

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3001` |
| `HOST` | Bind host; defaults to `0.0.0.0` |
| `LOG_LEVEL` | Fastify logger level |
| `CORS_ORIGIN` | Allowed browser origin for the tenant app; should match the app origin |
| `JWT_SECRET` | Signing secret used by `@agentmou/auth` |
| `DATABASE_URL` | PostgreSQL connection string via `@agentmou/db` |
| `REDIS_URL` | Redis connection for BullMQ queues via `@agentmou/queue` |
| `GOOGLE_CLIENT_ID` | Gmail OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Public OAuth callback URL |
| `AUTH_WEB_ORIGIN_ALLOWLIST` | Comma-separated browser origins allowed for OAuth `return_url` validation |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | B2C Google login (separate from Gmail connector client when you split them) |
| `GOOGLE_OAUTH_REDIRECT_URI` | API callback URL for B2C Google login |
| `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET` | B2C Microsoft login |
| `MICROSOFT_OAUTH_REDIRECT_URI` | API callback URL for B2C Microsoft login |
| `LOG_PASSWORD_RESET_LINK` | When `1`, log reset links (intended for non-production debugging) |
| `MARKETING_PUBLIC_BASE_URL` | Canonical marketing origin for public links emitted by the API |
| `APP_PUBLIC_BASE_URL` | Canonical app/auth origin for reset links and tenant deep links |
| `CONNECTOR_ENCRYPTION_KEY` | AES-256-GCM key for stored connector tokens |
| `N8N_API_URL` | n8n API base URL for workflow provisioning |
| `N8N_API_KEY` | n8n API key |
| `API_PUBLIC_BASE_URL` | Preferred public API base used in clinic callback URLs |
| `TWILIO_ACCOUNT_SID` | Default Twilio account SID for clinic channels |
| `TWILIO_AUTH_TOKEN` | Twilio auth token for webhook validation and outbound clinic delivery |
| `TWILIO_WHATSAPP_FROM` | Optional default WhatsApp sender |
| `TWILIO_WHATSAPP_MESSAGING_SERVICE_SID` | Optional default Messaging Service SID |
| `TWILIO_VOICE_FROM` | Optional default voice caller ID |
| `REFLAG_SDK_KEY` | Server-side SDK key for runtime feature evaluation in `services/api` |
| `REFLAG_ENVIRONMENT` | Reflag environment name; defaults to `NODE_ENV`/`development` |
| `REFLAG_BASE_URL` | Optional Reflag API base override |
| `REFLAG_LOCAL_OVERRIDES_JSON` | Optional local/dev/test JSON overrides applied before remote evaluation |

See [`infra/compose/.env.example`](../../infra/compose/.env.example) for the
current local and VPS-oriented example values.

## Feature Flag Matrix

`services/api` resolves feature visibility in this order:

1. Plan + `tenant_modules` baseline
2. Operational prerequisites
3. Reflag override
4. Role-derived permissions
5. UI visibility in the web shell

Initial matrix:

| Resolved feature | Baseline module | Stable flag key | Operational prerequisite |
| --- | --- | --- | --- |
| `voiceInboundEnabled` | `voice` | `clinic.voice.enabled` | Active voice inbound channel |
| `voiceOutboundEnabled` | `voice` | `clinic.voice.outbound.enabled` | Voice inbound available plus active voice outbound channel |
| `intakeFormsEnabled` | `core_reception` | `clinic.forms.enabled` | New-patient form policy/config enabled |
| `appointmentConfirmationsEnabled` | `core_reception` | `clinic.confirmations.enabled` | Confirmation policy enabled |
| `smartGapFillEnabled` | `growth` | `clinic.gaps.enabled` | Gap-recovery policy enabled |
| `reactivationEnabled` | `growth` | `clinic.reactivation.enabled` | Reactivation policy enabled |
| `advancedClinicModeEnabled` | `advanced_mode` | `clinic.advanced_settings.enabled` | Advanced mode module enabled |
| `internalPlatformVisible` | `internal_platform` | `internal.platform.visible` | Tenant vertical is `internal` |
| `adminConsoleEnabled` | N/A | `admin.console.enabled` | Tenant is a platform-admin tenant |

If Reflag credentials are missing or evaluation fails, the API falls back to
the baseline DB/package state and logs a warning in non-test environments.

## Development

```bash
pnpm --filter @agentmou/api typecheck
pnpm --filter @agentmou/api lint
pnpm --filter @agentmou/api test
pnpm --filter @agentmou/api build
```

## Related Docs

- [API Routes](../../docs/api-routes.md)
- [Architecture Overview](../../docs/architecture/overview.md)
- [Repository Map](../../docs/repo-map.md)
- [ADR-007: n8n Workflow Provisioning](../../docs/adr/007-n8n-workflow-provisioning.md)
- [ADR-008: Connector OAuth Token Storage](../../docs/adr/008-connector-oauth-token-storage.md)
- [ADR-011: Enterprise Auth Strategy](../../docs/adr/011-enterprise-auth-strategy.md)
