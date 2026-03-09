# ADR-006 — VPS Stack Alignment

**Status**: accepted
**Date**: 2026-03-09

## Context

The production VPS at `/srv/stack/` runs a Docker Compose stack with
Traefik, Postgres, Redis, n8n, a Python FastAPI agents service, and
Uptime Kuma. This stack was set up manually and its `docker-compose.yml`
was not tracked in the `agentmou-platform` repository.

Meanwhile, the repo contained a theoretical `docker-compose.prod.yml`
that did not match the VPS reality: different network names, different
volume strategy, missing services, different env var naming, and
incomplete Traefik configuration.

This created two disconnected worlds — the code in git and the running
infrastructure — making deploys error-prone and documentation unreliable.

## Decision

Align the repository with the real VPS stack:

1. **Compose is the source of truth**: `infra/compose/docker-compose.prod.yml`
   matches exactly what runs on the VPS. A `git pull + docker compose up -d`
   reproduces the production environment.

2. **Bind mounts over Docker volumes**: the VPS uses bind mounts
   (`./postgres/data`, `./redis/data`, etc.) for data persistence. The
   compose file preserves this pattern for consistency and backup
   simplicity.

3. **Traefik CLI args over config file**: Traefik is configured entirely
   via `command:` args in the compose file, not via a separate
   `traefik.yml`. This keeps all configuration in one place.

4. **Python agents coexist with Node services**: the `services/agents/`
   FastAPI service is part of the repo. Node services (api, worker, web)
   are available via Docker Compose profiles (`--profile node`) and will
   be activated when ready for production.

5. **Network naming matches VPS**: external network is `web`, internal
   network is `internal` (with `internal: true`).

## Alternatives Considered

1. **Separate repo for VPS stack**: rejected — adds sync overhead and
   the Node services need build context from the monorepo.
2. **Docker volumes instead of bind mounts**: rejected for now — bind
   mounts match the existing VPS and are simpler for backup scripts.
3. **Traefik static config file**: rejected — CLI args in compose keep
   everything in one place and match the working VPS setup.

## Consequences

- The repo can be cloned directly on the VPS and used to run the stack.
- Data directories (`postgres/data/`, `redis/data/`, etc.) are gitignored.
- Secrets live in `infra/compose/.env` which is gitignored.
- The `infra/traefik/traefik.yml` file has been removed.
- Deploy, backup, and setup scripts are aligned with the real VPS.
- Migration from the old `/srv/stack/` layout is documented in
  `docs/runbooks/vps-operations.md`.
