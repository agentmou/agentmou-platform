# Infrastructure Overview

The `infra/` directory contains the operational assets that support local
development and the main Agentmou VPS-backed production deployment.

## Directory Map

- `compose/`
  - Local and production Docker Compose files plus `.env.example`.
- `scripts/`
  - Canonical setup, deploy, smoke-test, backup, and cleanup scripts.
- `backups/`
  - Backup metadata, env templates, and systemd units. Production backup
    artifacts are written outside the repo checkout.
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

- [Deployment Guide](../docs/runbooks/deployment.md)
- [Runbooks Index](../docs/runbooks/README.md)
- [Architecture Overview](../docs/architecture/overview.md)
