# @agentmou/db

Database schema and client for the AgentMou platform, built on
[Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL.

## Purpose

Provides the Drizzle schema definitions and a configured database client
that all backend services (`services/api`, `services/worker`) use for
persistence.

## Schema

The schema covers the full domain model:

| Table | Purpose |
| --- | --- |
| `users` | Platform users |
| `tenants` | Workspaces / organizations |
| `memberships` | User-to-tenant membership with roles |
| `connector_accounts` | OAuth/integration connections per tenant |
| `connector_oauth_states` | Short-lived OAuth state rows for CSRF protection |
| `secret_envelopes` | Encrypted secrets per tenant |
| `agent_installations` | Agents installed by a tenant |
| `workflow_installations` | Workflows installed by a tenant |
| `schedules` | Cron-backed schedules created by installation flows |
| `execution_runs` | Agent/workflow execution records |
| `execution_steps` | Individual steps within a run |
| `approval_requests` | HITL approval requests |
| `audit_events` | Audit trail events |
| `usage_events` | Usage metering records |

## Usage

```typescript
import { db } from '@agentmou/db';
import { tenants, executionRuns } from '@agentmou/db';
```

## Configuration

Requires `DATABASE_URL` environment variable. Defaults to
`postgres://localhost:5432/agentmou`.

## Development

```bash
pnpm --filter @agentmou/db generate   # Generate migrations
pnpm --filter @agentmou/db migrate    # Run migrations
pnpm --filter @agentmou/db studio     # Open Drizzle Studio
pnpm --filter @agentmou/db typecheck
```

## Related Docs

- [Current State](../../docs/architecture/current-state.md)
- [Repository Map](../../docs/repo-map.md)
- [Deployment Runbook](../../docs/runbooks/deployment.md)
