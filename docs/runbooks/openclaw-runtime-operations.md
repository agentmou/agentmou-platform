# OpenClaw Runtime Operations

Use this runbook when you need to deploy, verify, or troubleshoot the
dedicated OpenClaw runtime VPS that serves `services/internal-ops`.

This architecture does not require installing a separate OpenClaw product
outside the repo. The deployable runtime is the service already living in
`services/openclaw-runtime`.

## Scope

This runbook covers:

- `services/openclaw-runtime`
- `infra/compose/docker-compose.openclaw.yml`
- `infra/compose/.env.openclaw`
- `infra/scripts/deploy-openclaw.sh`

It assumes the main AgentMou stack stays on its current VPS and only the
reasoning runtime is split out.

## Prerequisites

- A dedicated VPS with Docker and Docker Compose
- DNS for `openclaw.<DOMAIN>` pointing to that VPS
- A populated `infra/compose/.env.openclaw`
- A real `OPENCLAW_API_KEY`
- A real `OPENAI_API_KEY`

## Required Environment Variables

| Variable             | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `DOMAIN`             | Base domain used to expose `openclaw.<DOMAIN>`     |
| `LE_EMAIL`           | Let's Encrypt email                                |
| `OPENCLAW_API_KEY`   | Bearer token expected from `services/internal-ops` |
| `OPENAI_API_KEY`     | Enables model-backed turn planning                 |
| `OPENCLAW_MODEL`     | Optional model override; defaults to `gpt-4o-mini` |
| `OPENCLAW_STATE_DIR` | Runtime state directory inside the container       |

## First-Time Setup

Fast path for a fresh Ubuntu VPS:

```bash
bash infra/scripts/bootstrap-openclaw-ubuntu-host.sh
```

Then continue with the repo checkout and deploy:

```bash
ssh deploy@<openclaw-vps-ip>
cd /srv
git clone <repo-url> agentmou-platform
cd agentmou-platform
cp infra/compose/.env.openclaw.example infra/compose/.env.openclaw
nano infra/compose/.env.openclaw
bash infra/scripts/deploy-openclaw.sh
```

The deploy script creates the required state and Traefik certificate
directories automatically.

## Subsequent Deploys

```bash
ssh deploy@<openclaw-vps-ip>
cd /srv/agentmou-platform
bash infra/scripts/deploy-openclaw.sh
```

## Health Verification

Local edge health through Traefik:

```bash
curl -sk --resolve openclaw.DOMAIN:443:127.0.0.1 https://openclaw.DOMAIN/health
```

Contract smoke checks:

```bash
bash infra/scripts/verify-openclaw-runtime.sh
```

Equivalent manual calls:

```bash
curl -sk https://openclaw.DOMAIN/health
```

```bash
curl -sk -X POST https://openclaw.DOMAIN/v1/internal-ops/agent-profiles/register \
  -H "authorization: Bearer ${OPENCLAW_API_KEY}" \
  -H "content-type: application/json" \
  -d '{"tenantId":"00000000-0000-0000-0000-000000000000","profiles":[]}'
```

## Common Failure Modes

### Container restarts with `Unknown file extension ".ts"` (`@agentmou/contracts`)

Cause:

- The image entrypoint used plain `node` while the deployed bundle still
  resolves `@agentmou/contracts` to TypeScript sources via the workspace symlink.

Fix:

- Use an image built from `main` where the OpenClaw Dockerfile runs
  `npx tsx dist/index.js` (same pattern as api, worker, and internal-ops).
- Rebuild and redeploy: `bash infra/scripts/deploy-openclaw.sh`.

### `Unauthorized OpenClaw request`

Cause:

- `OPENCLAW_API_KEY` does not match between the runtime VPS and the AgentMou
  VPS

Check:

- `.env.openclaw`
- the AgentMou VPS `infra/compose/.env`

### Trace or session state disappears after restart

Cause:

- the state directory is not persisted

Check:

- `../../openclaw/state` on the OpenClaw VPS
- `OPENCLAW_STATE_DIR`

### Runtime falls back to heuristic planning unexpectedly

Cause:

- `OPENAI_API_KEY` is missing
- the model request failed or returned invalid JSON

Check:

- `OPENAI_API_KEY`
- `OPENCLAW_MODEL`
- `docker compose ... logs openclaw-runtime`

## Related Docs

- [Deployment Guide](../deployment.md)
- [Internal Ops Hetzner Rollout](./internal-ops-hetzner-rollout.md)
- [Internal Ops Operations](./internal-ops-operations.md)
- [Internal Ops Personal Operating System](../architecture/internal-ops-personal-os.md)
