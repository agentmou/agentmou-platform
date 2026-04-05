# @agentmou/worker

BullMQ worker service for asynchronous pack installation, execution, clinic
automation, webhook fan-out, scheduling, and approval timeout handling.

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
- Process clinic webhook events persisted by `services/api`.
- Dispatch clinic outbound WhatsApp and voice activity through Twilio or mock
  channel adapters.
- Execute clinic one-shot automations for reminders, intake forms, gap
  outreach, reactivation, and callbacks.

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
- Clinic automation uses `webhook_events`, `conversation_*`, `call_sessions`,
  `reminder_jobs`, `gap_*`, and `reactivation_*` rows from `@agentmou/db`.
- `@agentmou/connectors` resolves Twilio and mock clinic-channel adapters for
  worker-side outbound and inbound processing.

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
| `clinic-channel-event` | `processClinicChannelEventJob` | Reads persisted inbound webhook events, deduplicates them at the domain layer, and translates them into threads, messages, calls, and audit events |
| `clinic-send-message` | `processClinicSendMessage` | Delivers outbound clinic messages and updates delivery state, threads, reminders, outreach attempts, and recipients |
| `clinic-reminder` | `processClinicReminderJob` | Sends one-shot appointment reminders and confirmation nudges through the active clinic channel |
| `clinic-form-follow-up` | `processClinicFormFollowUpJob` | Dispatches intake-form follow-up nudges after a submission is created or left pending |
| `clinic-gap-outreach` | `processClinicGapOutreachJob` | Sends gap-fill offers and updates gap outreach attempt state |
| `clinic-reactivation-campaign` | `processClinicReactivationCampaignJob` | Materializes or dispatches reactivation recipients for one-shot and recurring campaign sends |
| `clinic-voice-callback` | `processClinicVoiceCallbackJob` | Triggers scheduled voice callbacks and synchronizes the resulting call/thread state |

The worker deliberately no longer carries placeholder job families that are not
started by `src/index.ts`. Shared runtime helpers now live under
`src/jobs/clinic-runtime/` and `src/jobs/runtime-support/` so the active job
surface is easier to navigate.

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
| `WEB_APP_BASE_URL` | Fallback base URL for outbound clinic callback links |
| `API_PUBLIC_BASE_URL` | Preferred public API base URL for Twilio status callbacks |
| `TWILIO_ACCOUNT_SID` | Twilio account SID used by clinic channel adapters |
| `TWILIO_AUTH_TOKEN` | Twilio auth token used for outbound calls/messages |
| `TWILIO_WHATSAPP_FROM` | Optional default WhatsApp sender |
| `TWILIO_WHATSAPP_MESSAGING_SERVICE_SID` | Optional default Messaging Service SID |
| `TWILIO_VOICE_FROM` | Optional default voice caller ID |

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
