# Internal Ops Operations

Use this runbook when you need to start, verify, or troubleshoot the personal
internal operating system that powers AgentMou's private org chart.

If you are bringing the system up for the first time and need the full local
validation plus two-VPS rollout path, start with
[Internal Ops Bring-Up](./internal-ops-bring-up.md) first.

## Scope

This runbook covers:

- `services/internal-ops`
- the Telegram webhook path
- the OpenClaw runtime dependency
- worker-side `internal-work-order` execution
- capability bindings into the internal AgentMou tenant

It does not replace the main deployment runbook for the product stack.

## Prerequisites

- A valid `INTERNAL_OPS_TENANT_ID`
- A Telegram bot token
- A Telegram webhook secret
- A callback signing secret
- A reachable OpenClaw runtime URL
- The main PostgreSQL and Redis services available to the repo
- `services/worker` running if you want outbound Telegram delivery or external
  execution
- A deployed `services/openclaw-runtime` reachable from `OPENCLAW_API_URL`

## Required Environment Variables

| Variable                                 | Purpose                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| `INTERNAL_OPS_TENANT_ID`                 | Internal tenant that owns the org chart and objective state |
| `INTERNAL_OPS_TELEGRAM_BOT_TOKEN`        | Telegram Bot API token                                      |
| `INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET`   | Secret passed by Telegram in the webhook header             |
| `INTERNAL_OPS_CALLBACK_SECRET`           | HMAC secret for signed approval buttons                     |
| `INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS` | Optional chat allowlist                                     |
| `INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS` | Optional user allowlist                                     |
| `OPENCLAW_API_URL`                       | Remote OpenClaw base URL                                    |
| `OPENCLAW_API_KEY`                       | Optional OpenClaw bearer token                              |
| `OPENCLAW_TIMEOUT_MS`                    | Optional OpenClaw request timeout                           |
| `DATABASE_URL`                           | PostgreSQL connection                                       |
| `REDIS_URL`                              | BullMQ connection                                           |

## Start The Services

Run the internal orchestrator:

```bash
pnpm --filter @agentmou/internal-ops dev
```

Run the worker in a separate shell if it is not already running:

```bash
pnpm --filter @agentmou/worker dev
```

Basic health check:

```bash
curl http://localhost:3002/health
```

Expected response shape:

```json
{
  "status": "ok",
  "service": "internal-ops",
  "timestamp": "..."
}
```

## Production Topology

- `services/internal-ops` now runs on the main AgentMou VPS through
  `infra/compose/docker-compose.prod.yml`.
- The public host is `https://ops.<DOMAIN>`.
- `services/worker` must share the same
  `INTERNAL_OPS_TELEGRAM_BOT_TOKEN` and `INTERNAL_OPS_CALLBACK_SECRET`.
- The OpenClaw runtime runs on a separate VPS and is documented in
  [OpenClaw Runtime Operations](./openclaw-runtime-operations.md).

## Register The Telegram Webhook

Point your Telegram bot to the internal-ops webhook and pass the secret token
that the service expects.

Canonical helper:

```bash
bash infra/scripts/register-telegram-webhook.sh
```

Equivalent raw example:

```bash
curl -X POST "https://api.telegram.org/bot${INTERNAL_OPS_TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "content-type: application/json" \
  -d '{
    "url": "https://<your-internal-ops-host>/telegram/webhook",
    "secret_token": "'"${INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET}"'"
  }'
```

If you are deploying behind a reverse proxy, make sure the public route
preserves the `x-telegram-bot-api-secret-token` header.

If you are using the tracked production compose file, the canonical public
host is `https://ops.<DOMAIN>/telegram/webhook`.

## Smoke-Test The Operator Flow

Fast local helper:

```bash
bash infra/scripts/smoke-test-internal-ops.sh
```

Manual production verification:

1. Send a message to the bot from an allowed chat and user.
2. Confirm an inbound row appears in `internal_telegram_messages`.
3. Confirm a new row appears in `internal_objectives` with `ownerAgentId = ceo`.
4. Confirm a remote OpenClaw session appears in `internal_openclaw_sessions`.
5. Confirm at least one `internal_work_orders` row is queued.
6. Confirm the worker either sends a Telegram message, creates an approval, or
   dispatches an external execution.

Useful SQL checks:

```sql
select id, status, current_objective_id, openclaw_session_id
from internal_conversation_sessions
order by created_at desc
limit 5;
```

```sql
select id, title, status, owner_agent_id, openclaw_session_id
from internal_objectives
order by created_at desc
limit 5;
```

```sql
select id, work_type, status, execution_target, capability_key
from internal_work_orders
order by created_at desc
limit 20;
```

## Bind Optional AgentMou Capabilities

Only native capabilities are bootstrapped automatically. If you want the
internal org chart to use an installed AgentMou asset, create a binding in
`internal_capability_bindings`.

Example: bind an engineering capability to an existing agent installation.

```sql
insert into internal_capability_bindings (
  tenant_id,
  capability_key,
  title,
  description,
  target_type,
  agent_installation_id,
  enabled
)
values (
  '<internal-tenant-uuid>',
  'agentmou.engineering.agent',
  'Engineering Agent Installation',
  'Use the internal engineering agent installation for CTO-led work.',
  'agent_installation',
  '<agent-installation-uuid>',
  true
)
on conflict do nothing;
```

Example: inspect bindings.

```sql
select capability_key, target_type, agent_installation_id, workflow_installation_id, enabled
from internal_capability_bindings
where tenant_id = '<internal-tenant-uuid>';
```

## Approval Flow Checks

When a work order requires approval:

1. The worker writes an `approval_requests` row with `source = telegram`.
2. The linked work order moves to `waiting_approval`.
3. Telegram receives an inline keyboard with signed callbacks.
4. Clicking a button generates a callback query back into
   `POST /telegram/webhook`.
5. The service validates the signature and resumes, rejects, postpones, or
   reformulates the blocked objective.

If approval buttons do not work:

- verify `INTERNAL_OPS_CALLBACK_SECRET` matches between `services/internal-ops`
  and `services/worker`
- verify outbound Telegram delivery is succeeding
- verify the callback query is reaching `/telegram/webhook`

## Common Failure Modes

### `Invalid Telegram webhook secret`

Cause:

- Telegram is not sending the expected secret token
- the reverse proxy removed the secret header

Check:

- `INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET`
- the public webhook registration payload

### `Chat ... is not authorized for internal ops`

Cause:

- the chat or user is not present in the configured allowlist

Check:

- `INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS`
- `INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS`

### `OPENCLAW_API_URL must be configured for internal ops`

Cause:

- the orchestrator cannot reach a remote OpenClaw runtime because the base URL
  is missing

Check:

- `OPENCLAW_API_URL`
- `OPENCLAW_API_KEY`
- remote service health and firewall rules

### `INTERNAL_OPS_TELEGRAM_BOT_TOKEN is required for Telegram notifications`

Cause:

- the worker is running without the bot token, so outbound operator messages
  cannot be delivered

Check:

- worker environment variables
- whether the same `.env` is loaded by both services

### Objective degrades to a brief instead of external execution

Cause:

- OpenClaw planned a capability with execution target
  `agent_installation` or `workflow_installation`, but no enabled binding was
  found in `internal_capability_bindings`

Check:

- the requested `capabilityKey` on the work order
- the binding rows for the internal tenant

## Observability Paths

Useful tables for debugging:

- `internal_protocol_events` for business envelopes, coherence artifacts, and
  trace references
- `internal_decisions` for outcome history
- `internal_artifacts` for summaries, handoffs, Telegram deliveries, and
  execution summaries
- `internal_telegram_messages` for operator ingress and egress
- `execution_runs` for any dispatched agent or workflow execution

## Related Docs

- [OpenClaw Runtime Operations](./openclaw-runtime-operations.md)
- [Deployment Guide](../deployment.md)

- [Internal Ops Architecture](../architecture/internal-ops-personal-os.md)
- [Internal Ops Service README](../../services/internal-ops/README.md)
- [Deployment Guide](../deployment.md)
