# ADR-006 — VPS Stack Alignment

**Status**: accepted
**Date**: 2026-03-09

## Context

The production VPS originally ran a Docker Compose stack from `/srv/stack/`
with Traefik, Postgres, Redis, n8n, a Python FastAPI agents service, and
Uptime Kuma. By March 19, 2026, the active tracked checkout had moved to
`/srv/agentmou-platform`, but a root-owned legacy cron file still pointed at
`/srv/stack`.

Meanwhile, the repo contained a theoretical `docker-compose.prod.yml`
that did not match the VPS reality: different network names, different
volume strategy, missing services, different env var naming, and
incomplete Traefik configuration.

This created two disconnected worlds — the code in git and the running
infrastructure — making deploys error-prone and documentation unreliable.

## Decision

Align the repository with the real VPS stack:

1. **Compose is the source of truth**: `infra/compose/docker-compose.prod.yml`
   is the version-controlled definition of the intended VPS stack. A
   `git pull + docker compose up -d` is the deployment path, but the live
   state still requires operational verification.

2. **Bind mounts over Docker volumes**: the VPS uses bind mounts
   (`./postgres/data`, `./redis/data`, etc.) for data persistence. The
   compose file preserves this pattern for consistency and backup
   simplicity.

3. **Traefik CLI args over config file**: Traefik is configured entirely
   via `command:` args in the compose file, not via a separate
   `traefik.yml`. This keeps all configuration in one place.

4. **Python agents coexist with Node services**: the `services/agents/`
   FastAPI service is part of the repo. `api` and `worker` are first-class
   services in the production compose file, while `web` remains behind the
   optional `--profile web` path because production web is Vercel-first.

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
- Live production statements still need smoke tests or VPS inspection; the
  compose file alone is not proof of current runtime state.
- Data directories (`postgres/data/`, `redis/data/`, etc.) are gitignored.
- Secrets live in `infra/compose/.env` which is gitignored.
- The `infra/traefik/traefik.yml` file has been removed.
- Deploy, backup, and setup scripts are aligned with the real VPS.
- Migration from the old `/srv/stack/` layout is documented in
  `docs/runbooks/vps-operations.md`.
