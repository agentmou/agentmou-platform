# VPS Operations and Maintenance

This runbook covers day-to-day management of the production VPS after deployment, including backups, monitoring, certificate management, and troubleshooting.

## Server Access and Overview

### SSH Access

```bash
# Connect to the VPS
ssh deploy@<VPS_IP>

# Or with an SSH key
ssh -i /path/to/key deploy@<VPS_IP>
```

### Check Server Health

```bash
# System resources
uptime
free -h                          # Memory usage
df -h                            # Disk usage
ps aux | head -20                # Running processes
top                              # Interactive resource monitor (press q to exit)

# Docker status
docker ps -a                     # All containers
docker stats                     # Resource usage per container
```

### Environment Variables

All secrets and configuration are stored in `/srv/agentmou-platform/infra/compose/.env`. **Never** commit this file to Git.

---

## Network and Firewall Configuration

### Current Network Setup

The platform uses Traefik as the reverse proxy:
- **Traefik** listens on ports 80 (HTTP) and 443 (HTTPS)
- **Internal services** (API on :3001, n8n on :5678, etc.) are only accessible via Traefik
- **Let's Encrypt** automatically provisions and renews TLS certificates

### Subdomain Routing

Traefik routes traffic based on domain:

| Subdomain | Service |
| ----------- | ------- |
| `agentmou.io` | Frontend on Vercel or another external host (not served by this VPS) |
| `api.agentmou.io` | Control plane API (Fastify) |
| `n8n.agentmou.io` | n8n workflow editor (if exposed) |
| `hooks.agentmou.io` | n8n webhook ingress |
| `agents.agentmou.io` | Internal agents service behind BasicAuth |
| `uptime.agentmou.io` | Uptime Kuma dashboard behind BasicAuth |

### Open Required Ports

From the VPS, verify these ports are accessible from the internet:

```bash
# Check if ports 80 and 443 are listening
sudo netstat -tlnp | grep -E ':80|:443'

# Or with ss (modern alternative)
sudo ss -tlnp | grep -E ':80|:443'
```

If not accessible, configure the firewall:

```bash
# Using UFW (Uncomplicated Firewall)
sudo ufw allow 22/tcp    # SSH (critical: do this first!)
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Verify
sudo ufw status
```

### View Current Traefik Configuration

Traefik's configuration is generated from Docker Compose labels. View the active config:

```bash
# Check Traefik logs
docker logs traefik

# View Traefik dashboard (if enabled)
# curl http://localhost:8080 (not exposed by default; requires editing docker-compose.prod.yml)
```

---

## Database Backups and Recovery

### Automatic Backup Strategy

The production VPS uses a hybrid backup model:

- `04:30 UTC`: local application-aware backup via `infra/scripts/backup.sh`
- `05:00 UTC`: offsite restic snapshot via `infra/scripts/backup-offsite.sh`

The local layer remains canonical because it exports PostgreSQL, Redis, n8n
workflows, and bind-mounted files in stack-aware formats. The offsite layer
copies those generated artifacts plus `infra/compose/.env` to Backblaze B2.

### Manual Backup

Create an immediate local backup:

```bash
cd /srv/agentmou-platform

# Run the local backup script
bash infra/scripts/backup.sh
```

This writes artifacts to `/var/backups/agentmou`, for example:

- `agentmou-stack_postgres_YYYY-MM-DD_HHMMSS.sql.gz`
- `agentmou-stack_redis_YYYY-MM-DD_HHMMSS.rdb`
- `agentmou-stack_n8n-workflows_YYYY-MM-DD_HHMMSS.json`
- `agentmou-stack_files_YYYY-MM-DD_HHMMSS.tar.gz`

### Automated Backups with Cron

The local backup is scheduled through `/etc/cron.d/agentmou-backup`:

```bash
cat /etc/cron.d/agentmou-backup
```

### Monitor Backup Storage

Backups consume disk space. Monitor and clean old backups:

```bash
# List backups by size and date
du -sh /var/backups/agentmou
ls -lh /var/backups/agentmou | tail -20

# The local backup script already rotates backup artifacts older than 14 days.
# Do not add a second ad hoc deletion rule unless you also update the script.
```

### Restore from Backup

To restore the latest PostgreSQL dump from the local backup set:

```bash
cd /srv/agentmou-platform
BACKUP_FILE=$(find /var/backups/agentmou -maxdepth 1 -type f -name 'agentmou-stack_postgres_*.sql.gz' | sort | tail -1)

gunzip -c "$BACKUP_FILE" | \
  docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml \
  exec -T postgres sh -c 'psql -U "$POSTGRES_USER"'
```

Redis, n8n workflow exports, and bind-mounted file archives are restored from
their sibling artifacts in `/var/backups/agentmou` as needed.

### Offsite Backup Installation and Scheduling

```bash
cd /srv/agentmou-platform
sudo bash infra/scripts/install-offsite-backup.sh
```

This installs:

- `restic`
- `/etc/agentmou/restic.env`
- `/etc/agentmou/restic-password`
- `agentmou-backup-offsite.service`
- `agentmou-backup-offsite.timer`

After filling in the real credentials, run:

```bash
cd /srv/agentmou-platform
sudo bash infra/scripts/backup-offsite.sh --mode=manual
sudo bash infra/scripts/restore-offsite-smoke.sh
sudo systemctl enable --now agentmou-backup-offsite.timer
```

The timer is expected to run daily at `05:00 UTC`, after the local cron job at
`04:30 UTC`.

### Test Backup Restoration

Run the offsite restore smoke test periodically:

```bash
cd /srv/agentmou-platform
sudo bash infra/scripts/restore-offsite-smoke.sh
```

It restores the latest offsite snapshot into `/var/tmp/...` and verifies:

- a PostgreSQL dump exists and passes `gzip -t`
- a Redis `.rdb` exists
- an n8n workflow export exists
- a `files_*.tar.gz` archive exists and passes `tar -tzf`
- `infra/compose/.env` exists in the restored tree

---

## Certificate Management (Let's Encrypt)

### Current TLS Setup

Traefik automatically provisions TLS certificates from Let's Encrypt:
- **Certificates** are stored in Traefik's state file
- **Auto-renewal**: Traefik renews certificates 30 days before expiry
- **No manual action needed** in normal operation

### Check Certificate Status

```bash
# View Traefik logs for cert messages
docker compose -f infra/compose/docker-compose.prod.yml logs traefik | grep -i certificate

# Check certificate details via openssl
echo | openssl s_client -servername api.agentmou.io -connect api.agentmou.io:443 2>/dev/null | \
  openssl x509 -noout -dates -subject
```

Expected output:
```
notBefore=Jan 15 12:00:00 2024 GMT
notAfter=Apr 15 12:00:00 2024 GMT
subject=CN = api.agentmou.io
```

### Renew Certificates Manually

If certificates need to be renewed immediately:

```bash
# Restart Traefik (it will attempt renewal)
docker compose -f infra/compose/docker-compose.prod.yml restart traefik

# Monitor renewal attempt
docker compose -f infra/compose/docker-compose.prod.yml logs traefik --follow
```

### Troubleshoot Certificate Issues

If certificates fail to renew:

1. **Verify Let's Encrypt can reach the server**:
   ```bash
   curl http://api.agentmou.io/.well-known/acme-challenge/test
   ```
   Should not be blocked by firewall or WAF.

2. **Check domain DNS is correct**:
   ```bash
   dig api.agentmou.io
   nslookup api.agentmou.io
   ```

3. **Check Traefik logs**:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml logs traefik | tail -50
   ```

4. **Verify `.env` has correct email**:
   ```bash
   grep LE_EMAIL infra/compose/.env
   ```

---

## Monitoring and Logs

### View Service Logs

```bash
# All services
docker compose -f infra/compose/docker-compose.prod.yml logs -f

# Specific service
docker compose -f infra/compose/docker-compose.prod.yml logs -f api
docker compose -f infra/compose/docker-compose.prod.yml logs -f worker
docker compose -f infra/compose/docker-compose.prod.yml logs -f postgres

# Last N lines
docker compose -f infra/compose/docker-compose.prod.yml logs --tail 100 api

# Timestamps
docker compose -f infra/compose/docker-compose.prod.yml logs --timestamps api
```

### Search Logs for Errors

```bash
# Errors in API
docker compose -f infra/compose/docker-compose.prod.yml logs api | grep -i error

# Errors in all services
docker compose -f infra/compose/docker-compose.prod.yml logs | grep -i error

# Specific pattern
docker compose -f infra/compose/docker-compose.prod.yml logs | grep "OAuth\|token\|auth"
```

### Set Up Persistent Logging

Docker logs are ephemeral by default. Configure persistent logs during the
initial Docker/VPS setup in the deployment workflow.

To export logs to an external service (optional):

```bash
# Send logs to a centralized logging service (e.g., LogRocket, Datadog)
# This requires Docker log driver configuration in /etc/docker/daemon.json
```

### Health Check Monitoring

Monitor the health endpoints regularly:

```bash
# Set up a simple health monitor (run on the VPS or externally)
while true; do
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.agentmou.io/health)
  echo "$(date): API=$API_STATUS"
  sleep 300  # Check every 5 minutes
done
```

Or set up external monitoring with tools like:
- **Uptime.com**: HTTP endpoint monitoring
- **Datadog**: Infrastructure and application monitoring
- **New Relic**: Full-stack observability

---

## Secret Rotation

### Connector Encryption Key Rotation

The `CONNECTOR_ENCRYPTION_KEY` encrypts OAuth tokens at rest. Rotate it periodically:

1. **Generate a new key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update `.env`** (this requires decrypting and re-encrypting all tokens):
   ```bash
   nano infra/compose/.env
   # Update CONNECTOR_ENCRYPTION_KEY to the new value
   ```

3. **Deploy with rotation script** (implement in code, then run):
   - This is a code-level operation; a database migration that decrypts and re-encrypts all tokens is required.
   - See [ADR-008](../adr/008-connector-oauth-token-storage.md) for details.

4. **Restart services**:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml restart api
   ```

### n8n Encryption Key Rotation

n8n has its own encryption key. Rotate it:

1. **Generate a new key**:
   ```bash
   openssl rand -base64 24
   ```

2. **Update `.env`**:
   ```bash
   nano infra/compose/.env
   # Update N8N_ENCRYPTION_KEY to the new value
   ```

3. **Important**: n8n does not automatically re-encrypt data when the key changes. You may need to:
   - Export workflows and credentials before key rotation
   - Delete the n8n container and volume to reset state
   - Re-import workflows and credentials

4. **Restart n8n**:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml restart n8n
   ```

---

## Scaling and Resource Management

### Monitor Resource Usage

```bash
# Real-time resource usage
docker stats

# Historical usage (if logging is configured)
docker compose -f infra/compose/docker-compose.prod.yml logs --tail 1000 | grep "memory\|cpu"
```

### Scale Up (Increase VPS Size)

When the VPS is approaching capacity:

1. **Upgrade the VPS** (double memory, CPU, or both)
2. **Restart services** to use new resources:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml restart
   ```
3. **Verify** services are healthy:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml ps
   ```

### Database Optimization

If queries are slow:

```bash
# Analyze query performance
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -d agentmou -c "\l+"

# Check table sizes
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -d agentmou -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname != 'pg_catalog' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Vacuum and analyze (maintenance)
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -d agentmou -c "VACUUM ANALYZE;"
```

---

## Troubleshooting Common Issues

### Services crashing immediately

```bash
# Check logs
docker compose -f infra/compose/docker-compose.prod.yml logs api

# Restart with more details
docker compose -f infra/compose/docker-compose.prod.yml up api
# (press Ctrl+C to stop)
```

### Out of disk space

```bash
# Check usage
df -h

# Clean up Docker images and containers
docker system prune -a --volumes -f

# Review the current local backup footprint
du -sh /var/backups/agentmou
ls -lh /var/backups/agentmou | tail -20
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker compose -f infra/compose/docker-compose.prod.yml ps postgres

# Check logs
docker compose -f infra/compose/docker-compose.prod.yml logs postgres

# Test connection
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -c "SELECT 1;"
```

### Worker not processing jobs

```bash
# Check worker logs
docker compose -f infra/compose/docker-compose.prod.yml logs worker

# Check Redis
docker compose -f infra/compose/docker-compose.prod.yml exec redis redis-cli

# View queued jobs
LRANGE bull:jobs:0 0 -1

# Clear stuck jobs
FLUSHALL
```

### n8n webhooks not triggering

```bash
# Check n8n logs
docker compose -f infra/compose/docker-compose.prod.yml logs n8n

# Verify webhook URL is correct
grep WEBHOOK_URL infra/compose/.env

# Test webhook endpoint
curl https://hooks.agentmou.io/webhook/test
```

---

## Maintenance Windows

### Scheduled Maintenance

Announce maintenance windows when doing:
- Database backups and maintenance
- Dependency updates
- Secrets rotation
- System updates (kernel, Docker, etc.)

### Performing Maintenance

```bash
# Example: Update Docker and system packages
sudo apt update
sudo apt upgrade -y

# Restart Docker
sudo systemctl restart docker

# Restart the stack
docker compose -f infra/compose/docker-compose.prod.yml restart
```

---

## Related Documentation

- [Deployment Guide](./deployment.md): Deploying to production
- [Local Development](./local-development.md): Development environment setup
- [ADR-006: VPS Deployment](../adr/006-vps-deployment.md): Architecture decision for VPS
- [ADR-008: Connector Encryption](../adr/008-connector-oauth-token-storage.md): Token encryption details
