# Deployment Architecture & Process

How [project name] is deployed, managed, and monitored in production.

## Deployment Overview

**Environments:**
- **Development** — Local machine, updated on every change
- **Staging** — Pre-production, deployed on PR merge
- **Production** — Live service, deployed manually or via release process

**Deployment method:** [Docker containers / Kubernetes / Lambda / VMs / Other]

## Prerequisites

Before you can deploy, ensure you have:

- [ ] Access to deployment credentials ([AWS / GCP / Azure / Other])
- [ ] [CI/CD tool] access (GitHub Actions, CircleCI, etc.)
- [ ] Production database credentials (keep secure!)
- [ ] Deployment SSH key or API token

**Never commit credentials to git.** Use [CI/CD secrets, 1Password, vault, etc.]

## Local Development Deployment

### Starting the Dev Environment

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or manually
npm install
npm run db:migrate
npm run dev
```

**Verify:** http://localhost:3000 should respond with 200 OK.

## Staging Deployment

Staging is automatically deployed when code is merged to `main` (or your main branch).

### Manual Staging Deployment

```bash
npm run deploy:staging
```

**Or via CI/CD:**
- Go to [GitHub Actions](https://github.com/org/project-name/actions)
- Click "Deploy to Staging" workflow
- Click "Run workflow"

### Testing in Staging

1. Visit https://staging.example.com
2. Test critical flows (login, payment if applicable, etc.)
3. Check logs: `npm run logs:staging` or cloud provider dashboard
4. Roll back if issues: `npm run rollback:staging`

## Production Deployment

**WARNING:** Production deployments affect real users. Be careful!

### Prerequisites for Prod Deployment

- [ ] All tests passing on main
- [ ] Code reviewed and approved
- [ ] Tested in staging
- [ ] Database migrations prepared (if applicable)
- [ ] Rollback plan documented (below)
- [ ] Team notified (especially if deploying during business hours)

### Deploying to Production

**Option 1: Automated release process**
```bash
# Bump version (follows semver)
npm run release       # Prompts for version (major.minor.patch)

# This will:
# - Update package.json and CHANGELOG.md
# - Create git tag
# - Push to GitHub
# - Trigger CI/CD deployment to production
```

**Option 2: Manual deployment**
```bash
npm run deploy:prod
```

**Option 3: Via CI/CD UI**
- Go to [GitHub Releases](https://github.com/org/project-name/releases)
- Click "Create a new release"
- Set tag (e.g., `v1.2.3`), fill description
- Publish release
- CI/CD automatically deploys to production

### Monitoring Deployment Progress

```bash
# Watch logs in real-time
npm run logs:prod

# Or via cloud provider:
# AWS: CloudWatch Logs
# GCP: Cloud Logging
# Azure: Log Analytics
```

**Health checks:**
```bash
curl https://example.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Post-Deployment Verification

After deployment completes:

1. **Check health:** `curl https://example.com/health`
2. **Monitor metrics:**
   - Error rate (should be < 1%)
   - API latency (should match staging baseline)
   - Database connections (should be normal)
3. **Manual testing:** Log in, perform basic workflow, check UI
4. **Check logs:** Grep for ERROR and WARN

```bash
# Example: check for errors in last 10 minutes
npm run logs:prod --since 10m | grep -i error
```

## Rollback

If something goes wrong in production, rollback immediately.

### Automatic Rollback

Most deployments have automatic rollback on health check failure:

```bash
# Check deployment status
npm run deployment:status:prod
```

### Manual Rollback

```bash
# Rollback to previous version
npm run rollback:prod

# Or to specific version
npm run rollback:prod --to v1.2.0

# Verify rollback
curl https://example.com/health
```

**Note:** Rollback should take < 5 minutes. If longer, escalate to on-call.

## Database Migrations

If your deployment includes database schema changes:

### Before Deployment

1. Write migration in `src/db/migrations/`
2. Test locally:
   ```bash
   npm run db:migrate
   npm run db:test   # Verify everything works
   npm run db:rollback
   npm run db:migrate  # Test rolling forward again
   ```
3. Push to GitHub, code review

### During Deployment

Migrations run automatically as part of deployment:

```bash
# In CI/CD pipeline
npm run db:migrate:prod
```

### If Migration Fails

Rollback immediately:
```bash
npm run db:rollback:prod
npm run rollback:prod  # Rollback application too
```

**Then:** Debug the migration locally, fix, and redeploy.

## Infrastructure

### Container Image

Deployment uses Docker. Image is built and pushed on every commit:

```bash
# Locally (for testing)
docker build -t project:latest .
docker run -p 3000:3000 project:latest
```

See `Dockerfile` for image configuration.

### Configuration

Production configuration is managed via:
- **Environment variables** (set in CI/CD or cloud platform)
- **Config files** (committed to repo, never include secrets)
- **Secrets vault** (AWS Secrets Manager, GCP Secret Manager, etc.)

**Never hardcode secrets!** Use environment variables:

```typescript
// Good
const dbUrl = process.env.DATABASE_URL;

// Bad
const dbUrl = 'postgres://user:password@host/db';
```

### Kubernetes / Container Orchestration (if applicable)

```bash
# Deploy to Kubernetes
kubectl apply -f infra/kubernetes/

# Check status
kubectl get pods
kubectl logs deployment/project-name

# Scale up/down
kubectl scale deployment project-name --replicas=3
```

See `infra/kubernetes/` for manifests.

## Monitoring & Alerts

### Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 1% | Page on-call |
| API latency (p95) | > 500ms | Investigate |
| Disk usage | > 80% | Increase capacity |
| Database connections | > 80% of pool | Increase pool size |
| Memory usage | > 85% | Restart / increase allocation |

### Dashboards

Access monitoring dashboards:
- **[Datadog / New Relic / other]:** https://monitoring-platform.example.com
- **Logs:** [CloudWatch / ELK / other]
- **Uptime:** [Status page if available]

### Alerting

Alerts are sent to:
- **Slack:** #project-alerts channel
- **PagerDuty:** If critical (for on-call)
- **Email:** For low-priority issues

**On-call duty:**
- See [On-Call Runbook](../RUNBOOK.md#on-call)
- Escalation chain: [Team lead] → [Manager] → [CTO]

## Scaling

### Horizontal Scaling (More Instances)

```bash
# If using Kubernetes
kubectl scale deployment project-name --replicas=5

# If using AWS EC2 / ECS
# Increase desired task count in console or CLI
```

**When to scale:** When CPU usage > 70% or API latency > 200ms

### Vertical Scaling (More Resources per Instance)

Increase CPU/memory allocation:
- Kubernetes: Update resource requests in manifest
- Lambda: Increase memory allocation
- EC2: Upgrade instance type (requires re-deploy)

### Database Scaling

- **Read-heavy:** Add read replicas
- **Write-heavy:** Optimize queries, consider sharding
- **Storage-heavy:** Archive old data, upgrade instance class

## Troubleshooting Common Issues

### High Error Rate After Deployment

```bash
# 1. Check recent logs
npm run logs:prod --since 5m | grep ERROR

# 2. Check metrics
# CPU, memory, database connections in monitoring dashboard

# 3. Check database health
npm run db:health:check

# 4. Rollback if unsure
npm run rollback:prod
```

### Slow API Responses

```bash
# 1. Check which endpoints are slow
npm run logs:prod | grep "latency.*>500"

# 2. Check database query times
npm run db:slow-queries

# 3. Check cache hit rate (if applicable)
npm run cache:stats

# 4. Scale up if resource constrained
kubectl scale deployment project-name --replicas=5
```

### Database Connection Issues

```bash
# Check connection pool
npm run db:connections:status

# Check for stuck queries
npm run db:stuck-queries

# Restart application (forces new connections)
kubectl rollout restart deployment project-name
```

### Memory Leaks

```bash
# Monitor memory over time
npm run monitoring:memory:over-time

# Check for open handles
npm run health:check:handles

# Restart application (temporary fix while debugging)
kubectl rollout restart deployment project-name

# Then investigate in staging with heap snapshots
```

## Disaster Recovery

### Backup & Recovery

**Backups:**
- Database: Daily snapshots, WAL archiving
- Code: GitHub (all history)
- Artifacts: [S3 / GCS / other]

**Recovery RTO:** < 1 hour
**Recovery RPO:** < 30 minutes (latest backup)

### Restore from Backup

```bash
# Restore database from snapshot
npm run db:restore:from-backup --snapshot latest

# Or specific timestamp
npm run db:restore:from-backup --timestamp 2024-01-15T10:30:00Z

# Verify restore
npm run db:health:check
```

### Incident Response

If production is down:

1. **Alert on-call:** Trigger PagerDuty / Slack urgent alert
2. **Assess:** Error rate, affected users, services down
3. **Mitigate:**
   - Rollback if recent deployment caused it
   - Failover to backup region (if available)
   - Scale down load if overloaded
4. **Communicate:** Update status page, notify stakeholders
5. **Root cause:** Post-incident analysis, implement fixes

See [Incident Response Plan](RUNBOOK.md#incident-response) for details.

## Maintenance & Downtime

### Scheduled Maintenance

If you need maintenance (database upgrade, certificate renewal, etc.):

```bash
# 1. Announce maintenance window (12-24 hours notice)
#    Post to status page and Slack

# 2. Go into maintenance mode (optional service message)
npm run maintenance:enable "Upgrading database, expect slowness"

# 3. Perform maintenance

# 4. Test thoroughly
curl https://example.com/health
# Manual testing

# 5. Exit maintenance mode
npm run maintenance:disable
```

**Preferred maintenance windows:** Weekends or low-traffic times

### Zero-Downtime Deployments

Most deployments are zero-downtime:
- Old instances keep accepting traffic while new ones start
- Load balancer routes only to healthy instances
- Migrations run before traffic switches

If you need guaranteed downtime, schedule maintenance window above.

## Post-Deployment Checklist

After every production deployment:

- [ ] Health check passes
- [ ] Error rate < 1%
- [ ] API latency normal
- [ ] Database responsive
- [ ] Logs checked for errors
- [ ] Critical features tested manually
- [ ] Analytics/metrics normal
- [ ] User doesn't report issues (first 15 minutes)
- [ ] Slack notification sent

## Related Documentation

- [Runbook](RUNBOOK.md) — How to operate the system
- [Architecture Overview](ARCHITECTURE.md) — System design
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
- [Environment Variables](ENV_VARIABLES.md) — Configuration reference

## Quick Reference

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Check deployment status
npm run deployment:status

# Rollback production
npm run rollback:prod

# View logs
npm run logs:prod --since 1h

# Check health
curl https://example.com/health
```

---

**Questions?** Ask on-call or in #project-devops

**Last updated:** [DATE]

**Maintained by:** [DevOps team / SRE team]
