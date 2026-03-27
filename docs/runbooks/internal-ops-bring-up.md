# Internal Ops Bring-Up

Use this runbook when you are bringing up the personal internal operating
system for the first time and need a single path from local validation to the
two-VPS production topology.

If your dedicated OpenClaw runtime VPS will live on Hetzner, follow the
provider-specific fast path in
[Internal Ops Hetzner Rollout](./internal-ops-hetzner-rollout.md).

## Mental Model

This repo now contains both sides of the system:

- `services/internal-ops` is the control plane that receives Telegram updates,
  governs objectives, validates turns through `hc-coherence`, and publishes
  work orders.
- `services/openclaw-runtime` is the remote reasoning service that decides the
  next turn for the internal org chart.
- `services/worker` executes the deterministic side effects: Telegram
  deliveries, approvals, internal artifacts, and optional handoff into
  tenant-installed agents or workflows.

You do not install a separate third-party OpenClaw product outside the repo in
this architecture. The OpenClaw deployment is the service already living in
`services/openclaw-runtime`.

Current capability boundary:

- The system can receive Telegram messages, plan, validate, persist state,
  request approval, and dispatch bound Agentmou assets.
- The system does not have direct shell, Git, or repository mutation
  capability. If you want that later, it must be added as an explicit new
  capability path.

## Target Topology

- Main Agentmou VPS:
  - `services/api`
  - `services/worker`
  - `services/internal-ops`
  - PostgreSQL
  - Redis
  - n8n
- OpenClaw VPS:
  - `services/openclaw-runtime`

Recommended hosts:

- `ops.<DOMAIN>` for `services/internal-ops`
- `openclaw.<DOMAIN>` for `services/openclaw-runtime`

## Phase 1: Validate Locally First

Run this phase before you touch either VPS.

### 1. Prepare local environment

Make sure your local shell or local env file provides:

- `OPENAI_API_KEY`
- `OPENCLAW_API_KEY`
- `OPENCLAW_API_URL=http://localhost:3003`
- `INTERNAL_OPS_TENANT_ID`
- `INTERNAL_OPS_TELEGRAM_BOT_TOKEN`
- `INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET`
- `INTERNAL_OPS_CALLBACK_SECRET`
- `DATABASE_URL`
- `REDIS_URL`

If you use the tracked compose env file, populate
[`infra/compose/.env`](../../infra/compose/.env.example) locally first.

### 2. Start the three local services

Shell 1:

```bash
pnpm --filter @agentmou/openclaw-runtime dev
```

Shell 2:

```bash
pnpm --filter @agentmou/internal-ops dev
```

Shell 3:

```bash
pnpm --filter @agentmou/worker dev
```

### 3. Run the local smoke test

Use the tracked helper:

```bash
bash infra/scripts/smoke-test-internal-ops.sh
```

What it verifies:

- `GET /health` on `openclaw-runtime`
- `GET /health` on `internal-ops`
- a synthetic Telegram-style webhook POST into `internal-ops`
- a valid JSON response from the orchestrator after it talks to OpenClaw

If this fails locally, stop here and fix the loop before touching VPS
infrastructure.

## Phase 2: Bring Up The OpenClaw VPS

This is the dedicated reasoning-runtime host.

### 1. Create the VPS and DNS

- Create one small VPS dedicated to OpenClaw.
- Point `openclaw.<DOMAIN>` to that VPS.

### 2. Clone the same monorepo

```bash
ssh deploy@<openclaw-vps-ip>
cd /srv
git clone <repo-url> agentmou-platform
cd agentmou-platform
```

### 3. Populate the runtime env file

```bash
cp infra/compose/.env.openclaw.example infra/compose/.env.openclaw
nano infra/compose/.env.openclaw
```

Set at least:

- `DOMAIN`
- `LE_EMAIL`
- `OPENCLAW_API_KEY`
- `OPENAI_API_KEY`
- optional `OPENCLAW_MODEL`

Important:

- `OPENCLAW_API_KEY` must exactly match the value later used by
  `services/internal-ops` on the main VPS.
- This VPS does not need the main Agentmou PostgreSQL, Redis, or n8n stack.
- Runtime state is stored under `OPENCLAW_STATE_DIR`.

### 4. Deploy the runtime

```bash
bash infra/scripts/deploy-openclaw.sh
```

### 5. Verify the runtime

```bash
curl -sk https://openclaw.<DOMAIN>/health
```

Expected result: HTTP `200`.

Then verify one authenticated contract call:

```bash
curl -sk -X POST "https://openclaw.<DOMAIN>/v1/internal-ops/agent-profiles/register" \
  -H "authorization: Bearer ${OPENCLAW_API_KEY}" \
  -H "content-type: application/json" \
  -d '{"tenantId":"00000000-0000-0000-0000-000000000000","profiles":[]}'
```

Expected result: a successful JSON response with `ok: true`.

## Phase 3: Update The Main Agentmou VPS

This is the existing product stack host.

### 1. Pull the latest repo state

```bash
ssh deploy@<agentmou-vps-ip>
cd /srv/agentmou-platform
git pull origin main
```

### 2. Update the production env file

Edit `infra/compose/.env` and ensure these values are real:

- `INTERNAL_OPS_TENANT_ID`
- `INTERNAL_OPS_TELEGRAM_BOT_TOKEN`
- `INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET`
- `INTERNAL_OPS_CALLBACK_SECRET`
- `OPENCLAW_API_URL=https://openclaw.<DOMAIN>`
- `OPENCLAW_API_KEY=<same token as the OpenClaw VPS>`
- optional `INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS`
- optional `INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS`

The worker uses the same Telegram bot token and callback secret for outbound
operator messages and inline approval buttons.

### 3. Deploy the main stack

```bash
bash infra/scripts/deploy-prod.sh
```

### 4. Verify internal-ops health

```bash
curl -sk https://ops.<DOMAIN>/health
```

Expected result: HTTP `200`.

## Phase 4: Connect Telegram

Reuse or create the Telegram bot that will be your operator interface.

### 1. Register the webhook

Use the tracked helper:

```bash
bash infra/scripts/register-telegram-webhook.sh
```

By default, the script targets:

- `https://ops.<DOMAIN>/telegram/webhook`

and uses:

- `INTERNAL_OPS_TELEGRAM_BOT_TOKEN`
- `INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET`

### 2. Confirm the operator surface is restricted

If you want a single-operator setup, configure one or both of:

- `INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS`
- `INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS`

### 3. Send a real message

Send a simple Telegram message to the bot, such as:

```text
Prepare a weekly executive summary of open priorities for Agentmou.
```

Confirm the following:

- a conversation session is created
- an objective is created with `owner_agent_id = 'ceo'`
- a remote OpenClaw session is created
- one or more work orders are queued
- the worker sends an operator acknowledgement or status reply

## Phase 5: Enable Optional Agentmou Execution

Do not start here. First prove the base native loop:

- Telegram
- `services/internal-ops`
- `services/openclaw-runtime`
- `hc-coherence`
- `services/worker`
- Telegram

Only after that should you add rows to `internal_capability_bindings` so the
internal org chart can use your own Agentmou tenant as execution substrate.

Typical examples:

- `agentmou.engineering.agent`
- `agentmou.marketing.workflow`
- `agentmou.sales.workflow`
- `agentmou.finance.workflow`

Until a capability is explicitly bound, the system degrades to native
artifacts, summaries, and approvals instead of pretending to run external
execution.

See the binding examples in
[Internal Ops Operations](./internal-ops-operations.md#bind-optional-agentmou-capabilities).

## Recommended Rollout Order

1. Validate the local loop.
2. Bring up the OpenClaw VPS.
3. Update and deploy the main Agentmou VPS.
4. Register the Telegram webhook.
5. Send a real operator message.
6. Add capability bindings only after the native loop is stable.

## Fast Failure Checklist

If the system is not working, check these first:

- `https://openclaw.<DOMAIN>/health`
- `https://ops.<DOMAIN>/health`
- `OPENCLAW_API_KEY` matches on both VPSes
- `OPENCLAW_API_URL` points to the OpenClaw VPS
- Telegram webhook registration uses the correct secret token
- `services/worker` is running with the same internal-ops Telegram secrets
- allowlists are not blocking your chat or user id

## Related Docs

- [Deployment Guide](../deployment.md)
- [Internal Ops Operations](./internal-ops-operations.md)
- [OpenClaw Runtime Operations](./openclaw-runtime-operations.md)
- [VPS Operations](./vps-operations.md)
