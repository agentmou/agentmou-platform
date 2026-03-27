# Compose Files

This directory contains the Docker Compose definitions for local development,
the main Agentmou production stack, and the dedicated OpenClaw runtime VPS.

## Files

- `.env.example`
  - Baseline environment template used to create `infra/compose/.env`.
- `.env.openclaw.example`
  - Environment template for the dedicated OpenClaw runtime VPS.
- `docker-compose.local.yml`
  - Local infrastructure stack for development workflows.
- `docker-compose.prod.yml`
  - Production stack definition for the main Agentmou VPS.
- `docker-compose.openclaw.yml`
  - Separate production stack definition for the OpenClaw runtime VPS.

## Usage

Create the local environment file:

```bash
cp infra/compose/.env.example infra/compose/.env
```

Start the local stack:

```bash
docker compose -f infra/compose/docker-compose.local.yml up -d
```

Production deploys should follow the procedures in
[`docs/runbooks/deployment.md`](../../docs/runbooks/deployment.md) instead of
invoking the production compose file ad hoc.

## Notes

- `infra/compose/.env` contains real secrets and must not be committed.
- `infra/compose/.env.openclaw` contains real OpenClaw VPS secrets and must
  not be committed.
- Production backups write outside the repo checkout even though the compose
  files define data mounts relative to the repository.
