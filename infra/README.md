# Infrastructure Overview

The `infra/` directory contains the operational assets that support local
development, the main Agentmou production VPS, and the separate OpenClaw
runtime VPS used by internal ops.

## Directory Map

- `compose/`
  - Local and production Docker Compose files plus `.env.example`.
- `scripts/`
  - Canonical setup, deploy, smoke-test, backup, and cleanup scripts.
- `backups/`
  - Placeholder directory for tracked metadata only. Production backups are
    written outside the repo checkout.
- `traefik/`
  - Persistent certificate storage used by the production Traefik container.

## Which File To Change

- Compose service definitions or environment defaults:
  [`infra/compose/README.md`](./compose/README.md)
- Deploy, smoke-test, backup, or cleanup behavior:
  [`infra/scripts/README.md`](./scripts/README.md)
- Backup storage expectations:
  [`infra/backups/README.md`](./backups/README.md)
- Traefik persistence details:
  [`infra/traefik/README.md`](./traefik/README.md)

## Related Docs

- [Deployment Guide](../docs/deployment.md)
- [Runbooks Index](../docs/runbooks/README.md)
- [Current State](../docs/architecture/current-state.md)
