# Operations Runbook

Quick-reference guide for running, monitoring, and troubleshooting [project name] in production.

**Last updated:** [DATE]

**On-call:** [Person/Team] via [Slack/PagerDuty]

## Table of Contents

- [Quick Status](#quick-status)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Escalation](#escalation)
- [Incident Response](#incident-response)

---

## Quick Status

Check system health in < 1 minute:

```bash
# Health check endpoint
curl https://example.com/health

# Should return:
# {"status":"ok","timestamp":"2024-01-15T10:30:00Z","version":"1.2.3"}
```

**Expected results:**
- Status: `ok`
- Response time: < 100ms
- HTTP 200

**If anything is wrong:** Go to [Troubleshooting](#troubleshooting).

### Critical Metrics

Check these dashboards:

| Metric | Expected | Link |
| -------- | ---------- | ------ |
| Error rate | < 1% | [Datadog Error Rate](https://monitoring.example.com) |
| API latency (p95) | < 200ms | [Datadog Latency](https://monitoring.example.com) |
| Database connections | < 80% | [Database Console](https://db.example.com) |
| Disk usage | < 80% | [Cloud Console](https://console.example.com) |

---

## Common Tasks

### Restart the Application

```bash
# Via Kubernetes
kubectl rollout restart deployment/project-name

# Via Docker Swarm
docker service update --force project-name

# Via systemd (if running on VMs)
sudo systemctl restart project-name
```

**Expected:** Service restarts in 30 seconds, health check passes.

### View Recent Logs

```bash
# Last 100 lines
kubectl logs -f deployment/project-name --tail=100

# Last 5 minutes
kubectl logs deployment/project-name --since=5m

# Specific container (if multi-container pod)
kubectl logs deployment/project-name -c app-container

# Via cloud provider (Datadog, CloudWatch, etc.)
# Use UI: https://monitoring.example.com/logs
```

### Check Database Connection

```bash
# Connect to database
psql $DATABASE_URL

# Run health check query
SELECT 1;

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Scale Application Up/Down

```bash
# Scale to 3 instances
kubectl scale deployment/project-name --replicas=3

# Check status
kubectl get deployment/project-name

# Watch rollout
kubectl rollout status deployment/project-name
```

### Deploy a Hotfix

```bash
# 1. Fix the bug in a branch
git checkout -b hotfix/urgent-fix
# ... make changes ...

# 2. Push and open PR
git push origin hotfix/urgent-fix
# Open PR on GitHub (skip full review if critical)

# 3. Merge to main
# (If approved by team lead)

# 4. Deployment triggers automatically
# Monitor: npm run logs:prod --since 5m

# 5. Verify
curl https://example.com/health
```

### Rollback to Previous Version

```bash
# Immediate rollback (if something is critically wrong)
npm run rollback:prod

# Or rollback to specific version
npm run rollback:prod --to v1.2.0

# Verify
curl https://example.com/health
npm run logs:prod --since 5m | grep ERROR
```

### Enable Maintenance Mode

```bash
# Put system in maintenance mode (shows message to users)
npm run maintenance:enable "Upgrading database, back in 30 minutes"

# Users see message on frontend, /health returns 503

# When done, disable
npm run maintenance:disable

# Verify health
curl https://example.com/health
```

---

## Troubleshooting

### Health Check Failing

**Symptom:** `curl https://example.com/health` returns non-200 or timeout

**Diagnosis:**
```bash
# 1. Check if application is running
kubectl get pods -l app=project-name

# 2. Check logs for startup errors
kubectl logs deployment/project-name | tail -20

# 3. Check recent deployments
kubectl rollout history deployment/project-name

# 4. Check pod resources
kubectl describe pod [pod-name]
```

**Fix:**
```bash
# If pod is CrashLooping:
kubectl logs [pod-name]  # Read error message

# Restart pod (forces new container)
kubectl delete pod [pod-name]

# Or rollback if recently deployed
npm run rollback:prod

# Verify
curl https://example.com/health
```

### High Error Rate

**Symptom:** Datadog shows error rate > 5% or users report failures

**Diagnosis:**
```bash
# 1. Check recent logs for errors
kubectl logs deployment/project-name --since 5m | grep ERROR

# 2. Check what changed recently
kubectl rollout history deployment/project-name | head -5

# 3. Check resource constraints
kubectl top pod [pod-name]  # CPU/memory usage
kubectl top nodes  # Node resources

# 4. Check database
psql $DATABASE_URL
SELECT count(*) FROM pg_stat_activity;  # Connection count
```

**Possible causes & fixes:**

| Cause | Check | Fix |
| ------- | ------- | ----- |
| Recent bad deployment | Commit history | `npm run rollback:prod` |
| Database down | Connection test | Restart DB / switch failover |
| Memory exhausted | `kubectl top` | Restart pods / increase memory |
| Disk full | `df -h` | Free space or expand storage |
| External API down | Logs for API errors | Graceful degradation / retry logic |

**Quick fix if unsure:**
```bash
npm run rollback:prod
```

### API Latency Slow

**Symptom:** Datadog p95 latency > 500ms (or baseline * 2)

**Diagnosis:**
```bash
# 1. Identify slow endpoints
kubectl logs deployment/project-name --since 10m | grep "latency.*ms" | sort -k5 -n | tail -10

# 2. Check database query times
psql $DATABASE_URL
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# 3. Check system resources
kubectl top pod [pod-name]
kubectl top nodes

# 4. Check cache hit rate (if using cache)
npm run cache:stats
```

**Possible causes & fixes:**

| Cause | Fix |
| ------- | ----- |
| Database slow | Optimize queries, add indexes, restart connection pool |
| High memory usage | Restart pods (memory leak) |
| High CPU usage | Scale up (add more instances) |
| Cache miss | Warm up cache / adjust TTL |

**Quick fix:**
```bash
# Scale up to handle load
kubectl scale deployment/project-name --replicas=5

# Monitor latency
watch -n 5 'curl -s https://example.com/health | jq'
```

### Database Connection Issues

**Symptom:** Logs show "connection refused" or "too many connections"

**Diagnosis:**
```bash
# 1. Check database is running
psql $DATABASE_URL -c "SELECT 1;"

# 2. Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check max connections
psql $DATABASE_URL -c "SHOW max_connections;"

# 4. Check stuck connections
psql $DATABASE_URL -c "SELECT pid, usename, query FROM pg_stat_activity WHERE state != 'idle';"
```

**Fix:**

```bash
# If at connection limit
# 1. Restart application (forces new connections)
kubectl rollout restart deployment/project-name

# 2. Kill stuck queries (if necessary, be careful!)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '30 min';"

# 3. Increase max_connections (for persistent fix)
# Requires database admin access
```

### Out of Disk Space

**Symptom:** Deployment fails or application crashes with "No space left on device"

**Diagnosis:**
```bash
# Check disk usage
df -h

# Check what's taking space
du -sh /var/lib/docker/*
du -sh /var/log/*
```

**Fix:**

```bash
# 1. Clean up Docker
docker system prune -a  # Removes unused images
docker volume prune     # Removes unused volumes

# 2. Rotate logs
journalctl --vacuum=100M  # Keep last 100MB of logs

# 3. If still full, expand storage
# (Requires cloud provider / ops team)
```

### Memory Leak (Pod uses increasing memory)

**Symptom:** Memory usage grows over days, eventually pod is OOMKilled

**Diagnosis:**
```bash
# Monitor memory over time
watch -n 5 'kubectl top pod [pod-name]'

# Check for error messages indicating memory pressure
kubectl describe pod [pod-name] | grep -i memory

# Dump heap for analysis (if Node.js)
kubectl exec [pod-name] -- node -e "require('fs').writeFileSync('/tmp/heap.heapsnapshot', require('v8').writeHeapSnapshot())"
```

**Temporary fix:**
```bash
# Restart pod (clears memory)
kubectl delete pod [pod-name]

# This forces new pod to start
```

**Permanent fix:**
```bash
# Once you identify the leak, fix in code
# Then deploy fix: npm run deploy:prod

# Monitor to verify memory stabilizes
watch -n 60 'kubectl top pod [pod-name]'
```

---

## Incident Response

### When to Declare an Incident

- Production is unavailable (health check failing)
- Error rate > 10%
- Major feature not working
- Data corruption or loss
- Security breach

### Incident Response Process

**Phase 1: Assessment (5 minutes)**
```bash
# 1. Confirm the problem
curl https://example.com/health

# 2. Check scope
# - How many users affected?
# - Which features down?
# - How long has it been down?

# 3. Check metrics
# - Error rate
# - Database health
# - Disk space
# - Recent changes (deployments, config)
```

**Phase 2: Mitigation (10 minutes)**
```bash
# 1. Stop the bleeding
npm run rollback:prod    # If recent deployment
npm run maintenance:enable "Investigating incident"  # Graceful degradation

# 2. Scale up if overloaded
kubectl scale deployment/project-name --replicas=10

# 3. Check & fix database if needed
psql $DATABASE_URL -c "SELECT 1;"

# 4. Verify mitigation
curl https://example.com/health
```

**Phase 3: Communication (Ongoing)**
- Post to #incidents Slack channel
- Update status page: "Investigating increased error rate"
- Notify stakeholders: Sales, Support, Customers (if appropriate)

**Phase 4: Root Cause (After stabilization)**
```bash
# 1. Gather data
kubectl logs deployment/project-name --since 1h > /tmp/logs.txt

# 2. Review recent changes
git log --oneline --since="30 minutes ago"

# 3. Check metrics graph around incident time
# (Use monitoring dashboard)

# 4. Talk to team: What changed? What was deployed?
```

**Phase 5: Resolution**
- Fix the root cause (code, config, or infrastructure)
- Deploy fix: `npm run deploy:prod`
- Verify: Health check, error rate, manual testing
- Post all-clear update

**Phase 6: Post-Mortem (Within 24 hours)**
- Document timeline: What happened, when, impact
- Root cause: Why did it happen?
- Action items: How do we prevent this?
- Update runbook/docs if needed

---

## Escalation

**On-call engineer not responding?**

1. Try Slack: @on-call, then @team-lead
2. If critical: Page via PagerDuty (escalation policy)
3. Call phone: [Phone number in on-call schedule]

**Escalation chain:**
```
On-call Engineer
    ↓ (no response in 5 min)
Team Lead
    ↓ (no response in 5 min)
Engineering Manager
    ↓ (no response in 5 min)
CTO / Head of Engineering
```

**On-call schedule:** [Link to calendar or on-call tool]

---

## Emergency Contacts

| Role | Name | Slack | Phone |
| ------ | ------ | ------- | ------- |
| Team Lead | [Name] | @[slack] | [Phone] |
| Manager | [Name] | @[slack] | [Phone] |
| Database Admin | [Name] | @[slack] | [Phone] |
| DevOps Lead | [Name] | @[slack] | [Phone] |

---

## Useful Commands

```bash
# Pods & Deployments
kubectl get pods
kubectl describe pod [pod-name]
kubectl logs [pod-name]
kubectl exec -it [pod-name] -- /bin/sh

# Scaling
kubectl scale deployment/project-name --replicas=3
kubectl rollout status deployment/project-name

# Deployment history
kubectl rollout history deployment/project-name
kubectl rollout undo deployment/project-name

# Resources
kubectl top nodes
kubectl top pod [pod-name]

# Database
psql $DATABASE_URL -c "SELECT 1;"
npm run db:health:check

# Monitoring
npm run logs:prod --since 1h
npm run metrics:dashboard
```

---

## Related Resources

- [Deployment Guide](DEPLOYMENT.md) — Full deployment process
- [Troubleshooting Guide](TROUBLESHOOTING.md) — Detailed troubleshooting
- [Architecture Overview](ARCHITECTURE.md) — System design
- [Repository Map](REPO_MAP.md) — Code organization
- [Monitoring Dashboard](https://monitoring.example.com) — Real-time metrics
- [Status Page](https://status.example.com) — Public status
- [On-Call Schedule](https://on-call.example.com) — Who's on duty

---

**Last updated:** [DATE]

**Maintained by:** [DevOps/SRE team]

**Questions?** Post in #project-ops or #project-incidents
