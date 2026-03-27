# Internal Ops Hetzner Rollout

Use this runbook when you want the fastest production path for the personal
Agentmou operating system with Hetzner as the OpenClaw VPS provider.

This is the provider-specific fast path for the generic
[Internal Ops Bring-Up](./internal-ops-bring-up.md) runbook.

## Goal

Bring up the base loop:

```text
Telegram -> internal-ops -> openclaw-runtime -> worker -> Telegram
```

with:

- `ops.agentmou.io` on the existing main Agentmou VPS
- `openclaw.agentmou.io` on a new dedicated Hetzner VPS

Do not bind tenant-installed Agentmou capabilities until this base loop is
stable.

## Prerequisites

- Access to the `agentmou.io` DNS zone
- Access to the existing main Agentmou VPS
- A valid `OPENAI_API_KEY`
- A Telegram bot token
- A real internal tenant UUID for `INTERNAL_OPS_TENANT_ID`
- A strong shared `OPENCLAW_API_KEY` that you will use on both VPSes

## Phase 1: Local Preflight

Run these steps on your local machine before provisioning the new VPS.

### Required local env

- `OPENAI_API_KEY`
- `OPENCLAW_API_KEY`
- `OPENCLAW_API_URL=http://localhost:3003`
- `INTERNAL_OPS_TENANT_ID`
- `INTERNAL_OPS_TELEGRAM_BOT_TOKEN`
- `INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET`
- `INTERNAL_OPS_CALLBACK_SECRET`
- `DATABASE_URL`
- `REDIS_URL`

### Commands

```bash
pnpm --filter @agentmou/openclaw-runtime dev
```

```bash
pnpm --filter @agentmou/internal-ops dev
```

```bash
pnpm --filter @agentmou/worker dev
```

```bash
bash infra/scripts/smoke-test-internal-ops.sh
```

Do not continue if the local smoke test fails.

## Phase 2: Create The Hetzner VPS

Create one new Ubuntu VPS in Hetzner Cloud with these minimum characteristics:

- Ubuntu 24.04 LTS
- at least 2 vCPU
- at least 4 GB RAM
- at least 40 GB SSD
- public IPv4

Provider-side network policy:

- allow `22/tcp`
- allow `80/tcp`
- allow `443/tcp`

Then create:

- `A openclaw.agentmou.io -> <new-vps-ip>`

## Phase 3: Bootstrap The OpenClaw VPS

SSH in as `root` on the new host and run the tracked host bootstrap script.

```bash
scp infra/scripts/bootstrap-openclaw-ubuntu-host.sh root@<openclaw-vps-ip>:/root/
ssh root@<openclaw-vps-ip>
bash /root/bootstrap-openclaw-ubuntu-host.sh
```

What the script does:

- installs `git`, `curl`, `ufw`, and Docker
- enables Docker
- creates the `deploy` user if missing
- adds `deploy` to `docker` and `sudo`
- prepares `/srv/agentmou-platform`
- enables a host firewall for `22`, `80`, and `443`

If you want the script to install your SSH key for the `deploy` user:

```bash
DEPLOY_SSH_PUBLIC_KEY="$(cat ~/.ssh/<your-key>.pub)" bash /root/bootstrap-openclaw-ubuntu-host.sh
```

## Phase 4: Deploy OpenClaw On The New VPS

Log in as `deploy`:

```bash
ssh deploy@<openclaw-vps-ip>
cd /srv
git clone <repo-url> agentmou-platform
cd agentmou-platform
cp infra/compose/.env.openclaw.example infra/compose/.env.openclaw
nano infra/compose/.env.openclaw
```

Set:

- `DOMAIN=agentmou.io`
- `LE_EMAIL=<your-email>`
- `OPENCLAW_API_KEY=<shared-token>`
- `OPENAI_API_KEY=<your-openai-key>`
- `OPENCLAW_MODEL=gpt-4o-mini`
- `OPENCLAW_STATE_DIR=/data/state`

Then deploy:

```bash
bash infra/scripts/deploy-openclaw.sh
```

Then verify:

```bash
bash infra/scripts/verify-openclaw-runtime.sh
```

Acceptance criteria for this phase:

- `https://openclaw.agentmou.io/health` returns `200`
- authenticated register call returns success

## Phase 5: Update The Main Agentmou VPS

On the existing Agentmou VPS:

```bash
ssh deploy@<main-agentmou-vps-ip>
cd /srv/agentmou-platform
git pull origin main
nano infra/compose/.env
```

Set or verify:

- `INTERNAL_OPS_TENANT_ID=<internal-tenant-uuid>`
- `INTERNAL_OPS_TELEGRAM_BOT_TOKEN=<telegram-bot-token>`
- `INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET=<strong-secret>`
- `INTERNAL_OPS_CALLBACK_SECRET=<strong-secret>`
- `OPENCLAW_API_URL=https://openclaw.agentmou.io`
- `OPENCLAW_API_KEY=<same-shared-token-as-openclaw-vps>`
- `INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS=<your-chat-id>`
- `INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS=<your-user-id>`

Deploy:

```bash
bash infra/scripts/deploy-prod.sh
```

Verify:

```bash
bash infra/scripts/verify-internal-ops-remote.sh
```

Acceptance criteria for this phase:

- `https://ops.agentmou.io/health` returns `200`
- Telegram webhook info points to `https://ops.agentmou.io/telegram/webhook`

## Phase 6: Connect Telegram And Validate The Loop

If you have not yet registered the webhook from the main VPS checkout:

```bash
bash infra/scripts/register-telegram-webhook.sh
```

Then send a real message to the bot:

```text
Prepare a weekly executive summary of open priorities for Agentmou.
```

Required checks:

- `internal-ops` accepts the webhook
- a session and objective are created
- a remote OpenClaw session is created
- one or more work orders are queued
- the worker sends a Telegram acknowledgement or status reply

Then run one approval-requiring task and confirm:

- the inline button callback returns to the system
- the blocked objective resumes

## Phase 7: Activate Optional Tenant Execution

Only after the base loop is healthy:

- add 1 workflow binding in `internal_capability_bindings`
- validate it
- add 1 agent-installation binding
- validate it

Do not bulk-enable all capabilities at once.

## Failure Checklist

If the rollout fails, check these in order:

1. `bash infra/scripts/verify-openclaw-runtime.sh`
2. `bash infra/scripts/verify-internal-ops-remote.sh`
3. `OPENCLAW_API_KEY` matches on both VPSes
4. `OPENCLAW_API_URL` points to `https://openclaw.agentmou.io`
5. Telegram webhook info shows the expected URL
6. allowlists contain your chat and user id
7. the worker is running with the same internal-ops Telegram secrets

## Related Docs

- [Internal Ops Bring-Up](./internal-ops-bring-up.md)
- [OpenClaw Runtime Operations](./openclaw-runtime-operations.md)
- [VPS Operations](./vps-operations.md)
