# @agentmou/worker

BullMQ worker service for asynchronous pack installation, execution, scheduling,
and approval timeout handling.

## Purpose

`services/worker` is the data-plane executor for background work. It listens to
shared queues, loads the data and assets needed for each job, and performs the
slow or stateful work that should not happen during an API request.

## Responsibilities

- Install packs by creating installation rows, provisioning workflow templates
  in n8n, and creating cron-backed schedules.
- Run installed agents through `@agentmou/agent-engine`.
- Run installed workflows through `@agentmou/n8n-client`.
- Translate repeatable cron triggers into execution runs.
- Resolve approval timeout actions and resume or fail runs accordingly.

## How It Fits Into The System

`services/api` publishes jobs, `services/worker` consumes them, and the rest of
the platform provides the required runtime pieces:

- `@agentmou/queue` defines queue names and payloads.
- `@agentmou/db` stores installations, schedules, runs, approvals, and steps.
- `@agentmou/catalog-sdk` and the `catalog/` directory provide manifests.
- `@agentmou/agent-engine` performs agent planning, policy checks, tools, and
  run logging.
- `@agentmou/connectors` decrypts and loads tenant connector instances.
- `@agentmou/n8n-client` triggers workflow execution in n8n.

## Local Usage

Run the worker in watch mode:

```bash
pnpm --filter @agentmou/worker dev
```

Build and run the compiled service:

```bash
pnpm --filter @agentmou/worker build
pnpm --filter @agentmou/worker start
```

## Active Queues

`src/index.ts` currently starts workers for these queues:

| Queue | Processor | What it does |
| --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `install-pack` | `processInstallPack` | Installs available agents/workflows from a pack manifest, provisions workflows in n8n, and creates schedules |
| `run-agent` | `processRunAgent` | Loads prompt/policy/connectors and runs `AgentEngine.execute()` |
| `run-workflow` | `processRunWorkflow` | Executes an installed n8n workflow and persists run status |
| `schedule-trigger` | `processScheduleTrigger` | Converts a cron trigger into a concrete execution run and follow-up job |
| `approval-timeout` | `processApprovalTimeout` | Applies auto-approve, auto-reject, or escalation logic after timeout |

The worker deliberately no longer carries placeholder job families that are not
started by `src/index.ts`. Shared runtime helpers now live under
`src/jobs/runtime-support/` instead of a generic `shared/` folder so the active
job surface is easier to navigate.

## Configuration

Important environment variables:

| Variable | Purpose |
| --------------------------------- | ----------------------------------------------------------------- |
| `REDIS_URL` | BullMQ connection string |
| `DATABASE_URL` | PostgreSQL connection via `@agentmou/db` |
| `OPENAI_API_KEY` | Enables LLM-backed planning in `@agentmou/agent-engine` |
| `AGENTS_API_URL` | Base URL for the Python agents service |
| `AGENTS_API_KEY` | Optional auth key for the Python agents service |
| `N8N_API_URL` | n8n API base URL |
| `N8N_API_KEY` | n8n API key |
| `GOOGLE_CLIENT_ID` | Needed when loading Gmail connectors |
| `GOOGLE_CLIENT_SECRET` | Needed when loading Gmail connectors |
| `CONNECTOR_ENCRYPTION_KEY` | Decrypts stored connector tokens |

## Development

```bash
pnpm --filter @agentmou/worker typecheck
pnpm --filter @agentmou/worker lint
pnpm --filter @agentmou/worker test
pnpm --filter @agentmou/worker build
```

Run `pnpm dev` from the repo root when you want the worker to run alongside the
API and web app.

## Related Docs

- [Architecture Overview](../../docs/architecture/overview.md)
- [Repository Map](../../docs/repo-map.md)
- [VPS Operations Runbook](../../docs/runbooks/vps-operations.md)
