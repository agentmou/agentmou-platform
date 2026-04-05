# @agentmou/db

Database schema and client for the Agentmou platform, built on
[Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL.

## Purpose

Provides the Drizzle schema definitions and a configured database client
that backend services (`services/api` and `services/worker`) use for
persistence.

## Schema

The schema covers both the original platform model and the clinic-domain
foundation used by the new vertical experience.

### Platform control plane

- Identity and auth: `users`, `user_identities`, `user_oauth_states`,
  `oauth_login_codes`, `password_reset_tokens`, `tenant_sso_connections`
- Tenancy and integrations: `tenants`, `memberships`, `connector_accounts`,
  `connector_oauth_states`, `secret_envelopes`
- Runtime and governance: `agent_installations`, `workflow_installations`,
  `execution_runs`, `execution_steps`, `approval_requests`, `audit_events`,
  `schedules`, `webhook_events`
- Billing and observability: `usage_events`, `billing_accounts`,
  `billing_subscriptions`, `billing_invoices`, `billable_usage_ledger`
- Retrieval support: `public_knowledge_documents`, `public_knowledge_chunks`

### Clinic domain foundation

- Clinic configuration: `clinic_profiles`, `tenant_modules`, `clinic_channels`
- Patients and inbox: `patients`, `patient_identities`, `conversation_threads`,
  `conversation_messages`, `call_sessions`
- Forms and scheduling: `intake_form_templates`, `intake_form_submissions`,
  `clinic_services`, `practitioners`, `clinic_locations`, `appointments`,
  `appointment_events`
- Follow-up and recovery: `reminder_jobs`, `confirmation_requests`,
  `waitlist_requests`, `gap_opportunities`, `gap_outreach_attempts`,
  `reactivation_campaigns`, `reactivation_recipients`

## Usage

```typescript
import { db } from '@agentmou/db';
import { tenants, executionRuns } from '@agentmou/db';
```

## Configuration

Outside tests, the package expects a valid `DATABASE_URL`. The canonical local
value used by the repo, Docker Compose, and CI is:

```bash
postgresql://agentmou:changeme@127.0.0.1:5432/agentmou
```

## Development

```bash
pnpm --filter @agentmou/db generate   # Generate migrations
pnpm --filter @agentmou/db migrate    # Run migrations
pnpm --filter @agentmou/db studio     # Open Drizzle Studio
pnpm --filter @agentmou/db seed       # Seed demo data
pnpm --filter @agentmou/db typecheck
pnpm validate:clinic-demo             # Full clinic seed + smoke lane
```

Tracked SQL migrations live in `packages/db/drizzle/` alongside Drizzle
snapshot metadata in `packages/db/drizzle/meta/`.

## Seed Data

`pnpm db:seed` is idempotent and currently provisions:

- one admin user: `admin@agentmou.dev`
- seed password for local QA: `Demo1234!`
- one generic platform tenant: `Demo Workspace`
- one clinic demo tenant: `Dental Demo Clinic`
- clinic demo data covering modules, channels, patients, inbox threads, calls,
  forms, appointments, confirmations, gaps, and a running reactivation campaign

The seeded clinic tenant now mirrors the closing dental journeys used by the
frontend demo fixtures:

- 11 patients
- 7 WhatsApp threads plus 3 voice threads
- 3 call sessions
- 3 intake submissions in `completed`, `opened`, and `sent`
- 6 appointments across `scheduled`, `rescheduled`, `confirmed`, and
  `cancelled`
- 1 open cancellation gap with outreach already sent to a compatible candidate
- 1 running reactivation campaign with `booked`, `contacted`, and `failed`
  recipients

The canonical seed blueprint lives in
`packages/db/src/clinic-demo-fixture.ts`; `packages/db/src/seed.ts` only maps
that blueprint into relational rows. `pnpm test:clinic-demo-smoke` validates
the same journeys across frontend fixtures, seeded rows, and clinic API routes
when `DATABASE_URL` is available.

## Drizzle Kit and transitive dependencies

`drizzle-kit` is a **dev-only** CLI (generate, migrate, studio). It currently
pulls the deprecated npm packages `@esbuild-kit/esm-loader` and
`@esbuild-kit/core-utils`. That does **not** ship in API/worker/web production
bundles; it only affects installs and environments where you run the kit.

**What we do today:** the monorepo root [`package.json`](../../package.json)
defines a `pnpm.overrides` entry for `@esbuild-kit/core-utils>esbuild` so the
transitive `esbuild` version is pinned for advisory coverage. See
[Security dependencies](../../docs/runbooks/security-dependencies.md) for
audit and override review.

**Removing the deprecated packages entirely** requires an upstream
`drizzle-kit` release that drops `@esbuild-kit/*`. Until then:

1. When touching dependencies, check the latest `drizzle-kit` on npm and read
   [Drizzle ORM releases](https://github.com/drizzle-team/drizzle-orm/releases).
2. Bump `drizzle-kit` in this package when a new version ships, run
   `pnpm install`, `pnpm audit`, and re-check whether overrides are still
   needed.
3. Track upstream work (subscribe or add a thumbs-up) on Drizzle issues such as
   [#5304](https://github.com/drizzle-team/drizzle-orm/issues/5304) and
   [#5481](https://github.com/drizzle-team/drizzle-orm/issues/5481).

To see why the loader is present after an install:

```bash
pnpm --filter @agentmou/db why @esbuild-kit/esm-loader
```

## Related Docs

- [Architecture Overview](../../docs/architecture/overview.md)
- [Repository Map](../../docs/repo-map.md)
- [Deployment Runbook](../../docs/runbooks/deployment.md)
