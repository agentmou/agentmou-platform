# Repo Analysis Guide

Use this guide when the user asks to understand a codebase before writing new
documentation.

## Discovery order

1. Read the root orientation files.
   - `README*`
   - `docs/`
   - workspace or build manifests
   - top-level config files
2. Inspect the top-level directory layout.
3. Identify the runtime stack from manifests, lockfiles, and CI files.
4. Find entrypoints, services, apps, workers, jobs, CLIs, and automation.
5. Find persistence, messaging, auth, integrations, and deployment surfaces.
6. Compare the code layout to existing docs and note mismatches.

## High-signal root artifacts

| Artifact | Why it matters |
| --- | --- |
| `README.md` | Best first clue for purpose and local usage |
| `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml` | Reveal language, package names, scripts, and dependencies |
| Lockfiles | Confirm the ecosystem actually in use |
| `docker-compose.yml`, `compose.yaml`, `Dockerfile*` | Show local runtime topology |
| `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile` | Show CI/CD and release expectations |
| `infra/`, `terraform/`, `helm/`, `k8s/` | Show deployment and infrastructure boundaries |
| `scripts/`, `bin/`, `Makefile`, `Taskfile.yml` | Show developer workflows and operational helpers |
| `tests/`, `__tests__/`, `spec/`, `cypress/`, `playwright/` | Show test strategy and coverage style |

## What to identify explicitly

- Product or service purpose, only when the evidence supports it
- Repo shape: single app, monorepo, library, service collection, infra repo
- Major modules and their likely responsibilities
- Entrypoints:
  - web or API servers
  - CLI commands
  - workers and background jobs
  - schedulers, cron, event consumers
- Data boundaries:
  - database access
  - queues and event buses
  - caches and object storage
- Cross-cutting concerns:
  - auth and identity
  - configuration and secrets
  - observability
  - deployment and release controls

## Path signals by concern

| Concern | Common signals |
| --- | --- |
| Auth | `auth`, `identity`, `session`, `oauth`, `jwt`, `acl` |
| Data layer | `db`, `database`, `migrations`, `models`, `repositories`, `prisma`, `sql`, `orm` |
| API | `api`, `routes`, `controllers`, `handlers`, `openapi`, `graphql`, `rpc` |
| Frontend | `web`, `app`, `client`, `ui`, `components`, `pages`, `views` |
| Workers | `worker`, `queue`, `consumer`, `jobs`, `tasks`, `cron`, `scheduler` |
| Infra | `infra`, `terraform`, `helm`, `k8s`, `deploy`, `docker` |
| Tests | `test`, `tests`, `spec`, `e2e`, `integration`, `fixtures` |

## Evidence discipline

- Prefer direct evidence over naming guesses.
- Use the strongest available proof:
  1. Executable definitions and runtime config
  2. Manifests and dependency metadata
  3. Tests
  4. Existing docs
  5. Naming heuristics
- If the strongest proof is missing, say the conclusion is provisional.
