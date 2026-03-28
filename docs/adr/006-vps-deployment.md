# ADR-006: Docker Compose on VPS for Production Deployment

**Status**: accepted
**Date**: 2024-01-15

## Context

The platform must run in production with:
- High availability and reliability
- Predictable, low operational overhead
- Cost efficiency
- Ability to manage secrets and environment configuration

Options range from managed platforms (Vercel, Fly.io, Render) to full Kubernetes clusters to bare VPS.

Managed platforms are convenient but:
- Limit customization (e.g., can't run n8n alongside the API)
- Add vendor lock-in and per-service pricing
- Complicate backup and disaster recovery

Kubernetes offers power but introduces complexity (networking, resource requests, operators, monitoring) unsuitable for a small team managing a single application.

A VPS with Docker Compose strikes a balance:
- Simple, familiar tooling
- Deterministic, reproducible deployment
- Full control over infrastructure
- Straightforward backup and recovery
- Predictable costs
- Easy local testing (dev and prod use the same Compose config)

## Decision

**Docker Compose on a single VPS** for production deployment.

Setup:
- VPS with Docker Engine and Docker Compose installed (e.g., Hetzner, DigitalOcean, Linode)
- `infra/compose/docker-compose.prod.yml` is the source of truth for production services
- Services: PostgreSQL, Redis, n8n, API, worker, agents sidecar, Traefik reverse proxy
- Traefik for TLS termination (Let's Encrypt) and routing to subdomains

Deployment procedure:
```bash
# Pull latest code
git pull origin main

# Build images
docker compose -f infra/compose/docker-compose.prod.yml build

# Run migrations
docker compose -f infra/compose/docker-compose.prod.yml exec api pnpm db:migrate

# Restart stack
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

All environment variables (secrets, keys, domain) are stored in `.env` on the VPS, never in Git.

## Alternatives Considered

1. **Kubernetes** (EKS, GKE, K3s):
   - Pros: Auto-scaling, high availability, industry standard for large deployments
   - Cons: Steep learning curve, significant operational overhead, overkill for single-instance apps

2. **Managed container platforms** (Heroku, Fly.io, Render):
   - Pros: Zero ops, built-in scaling, automated CI/CD
   - Cons: Limited customization, vendor lock-in, expensive at scale, can't run n8n alongside app

3. **Bare VPS with systemd units**:
   - Pros: Maximum control, minimal abstractions
   - Cons: Manual dependency management, harder to version control deployments, no rollback mechanism

4. **AWS Lambda + RDS + ElastiCache**:
   - Pros: Pay-per-use, auto-scaling
   - Cons: Vendor lock-in, cold starts, difficult to manage n8n, complexity of coordinating services

## Consequences

- **Single point of failure**: All services run on one VPS. Hardware failure takes down the entire platform.
  - Mitigation: Regular backups, clear runbook for recovery, monitor and alert on health checks
- **Manual scaling**: Resources are fixed to the VPS size. Scaling requires upgrading the VPS (downtime required).
  - Suitable while traffic is predictable and growth is gradual
- **Traefik for reverse proxy**: TLS termination, routing, and Let's Encrypt renewal are handled by Traefik in the Compose stack.
- **Environment-agnostic**: Local development and production use nearly identical Compose configs (only difference is image source and env vars).
- **Deployment is simple**: No CI/CD runner needed; deployment is a script that pulls, builds, migrates, and restarts.
- **Backup and recovery**: PostgreSQL is backed up regularly; Redis data is ephemeral. Recovery is straightforward: restore PostgreSQL backup and restart the stack.

This approach is suitable for launch and early scale. When the platform reaches millions of requests or needs geographic distribution, migration to Kubernetes is possible without architectural changes.
