# @agentmou/queue

Shared BullMQ queue definitions and Redis connection helpers.

## Purpose

`@agentmou/queue` is the contract between publishers and consumers of background
work. It keeps queue names and payload shapes in one place so `services/api` and
`services/worker` agree on the same jobs.

## Usage

```typescript
import { getQueue, QUEUE_NAMES, type RunAgentPayload } from '@agentmou/queue';

const queue = getQueue(QUEUE_NAMES.RUN_AGENT);

await queue.add('run-agent', {
  tenantId: 'tenant_123',
  agentInstallationId: 'install_123',
  runId: 'run_123',
  triggeredBy: 'api',
} satisfies RunAgentPayload);
```

## Key Exports

| Export                     | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `QUEUE_NAMES`              | Canonical queue identifiers                          |
| `InstallPackPayload`       | Payload for pack installation jobs                   |
| `RunAgentPayload`          | Payload for agent execution jobs                     |
| `RunWorkflowPayload`       | Payload for workflow execution jobs                  |
| `ScheduleTriggerPayload`   | Payload for cron trigger fan-out jobs                |
| `InternalWorkOrderPayload` | Payload for the private internal-ops execution queue |
| `getConnectionOptions()`   | Parse a shared BullMQ Redis config from `REDIS_URL`  |
| `getQueue(name)`           | Lazily create and cache a BullMQ queue instance      |

## Queue Inventory

The package currently defines the active queue contracts used by the platform
runtime:

- `install-pack`
- `run-agent`
- `run-workflow`
- `schedule-trigger`
- `approval-timeout`
- `internal-work-order`

Placeholder queue names that were not part of the live worker runtime were
removed so the shared package only advertises real surfaces.

## Configuration

| Variable    | Purpose                                                       |
| ----------- | ------------------------------------------------------------- |
| `REDIS_URL` | Redis connection string; defaults to `redis://localhost:6379` |

## Development

```bash
pnpm --filter @agentmou/queue typecheck
pnpm --filter @agentmou/queue lint
```

## Related Docs

- [Current State](../../docs/architecture/current-state.md)
- [Internal Ops Architecture](../../docs/architecture/internal-ops-personal-os.md)
- [VPS Operations Runbook](../../docs/runbooks/vps-operations.md)
