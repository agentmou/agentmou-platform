# Production Deployment Guide

This runbook covers deploying Agentmou to production on a VPS, verifying health, and rolling back if necessary.

## Prerequisites

### VPS Requirements

- **OS**: Ubuntu 22.04 LTS or newer (or compatible Linux distribution)
- **CPU**: Minimum 4 vCPU (8+ recommended for comfort)
- **Memory**: Minimum 8 GB RAM (16 GB recommended)
- **Storage**: Minimum 50 GB (100+ GB recommended for backups and logs)
- **Network**: Static IP address, ports 80 and 443 open (for Let's Encrypt and HTTPS)

### Pre-Deployment Checklist

Before deploying:

1. **VPS is provisioned** with public IP and root SSH access
2. **Domain name** is registered and DNS points to VPS IP
3. **Environment secrets** (.env file) are prepared with real values:
   - Database password (generated: `openssl rand -hex 24`)
   - JWT secret (generated: `openssl rand -hex 32`)
   - n8n encryption key (generated: `openssl rand -hex 24`)
   - Connector encryption key (generated: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - OAuth credentials (Google, Microsoft) from respective consoles
   - Frontend-facing auth URLs point at the real web origin hosted outside the
     VPS (`WEB_APP_BASE_URL`, `CORS_ORIGIN`, `AUTH_WEB_ORIGIN_ALLOWLIST`)
   - API keys (n8n, OpenAI)
4. **GitHub credentials** (SSH key or personal access token) for pulling the repository
5. **Backup strategy** reviewed and tested (see [VPS Operations](./vps-operations.md))

---

## Initial VPS Setup (One-Time)

Run these steps once on a fresh VPS.

### 1. SSH into the VPS

```bash
ssh root@<VPS_IP>
# or
ssh -i /path/to/key root@<VPS_IP>
```

### 2. Update System Packages

```bash
apt update
apt upgrade -y
```

### 3. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Verify Docker
docker --version

# Docker Compose is bundled with recent Docker; verify
docker compose version
```

### 4. Create a Deploy User (Recommended)

```bash
# Create a non-root user for deployments
useradd -m -s /bin/bash deploy
usermod -aG docker deploy

# Set up SSH key for deploy user
su - deploy
mkdir -p ~/.ssh
# Copy your public SSH key to ~/.ssh/authorized_keys
# (or use: ssh-copy-id -i /path/to/key.pub deploy@<VPS_IP>)
```

### 5. Clone the Repository

```bash
cd /home/deploy
git clone https://github.com/agentmou/agentmou-platform.git agentmou
cd agentmou
```

### 6. Prepare Environment Variables

```bash
# Copy the example environment file
cp infra/compose/.env.example infra/compose/.env

# Edit with real values
nano infra/compose/.env
```

Fill in all required secrets (see Pre-Deployment Checklist above).

### 7. Configure Docker Daemon (Optional but Recommended)

```bash
# Increase log retention to avoid disk filling up
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
systemctl restart docker
```

### 8. Create Systemd Service (Optional but Recommended)

Create a systemd service to manage the Docker Compose stack:

```bash
sudo tee /etc/systemd/system/agentmou.service > /dev/null <<EOF
[Unit]
Description=Agentmou Stack
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/srv/agentmou-platform
ExecStart=/usr/bin/docker compose -f infra/compose/docker-compose.prod.yml up
ExecStop=/usr/bin/docker compose -f infra/compose/docker-compose.prod.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable agentmou
```

---

## Deployment Procedure

### Standard Deploy

Use the canonical deploy script to pull, build, migrate, and restart:

```bash
# SSH into the VPS
ssh deploy@<VPS_IP>

cd agentmou

# Run the deployment script
bash infra/scripts/deploy-prod.sh
```

The script:
1. Pulls the latest code from `origin/main`
2. Validates required environment variables, including the public frontend
   origin used by auth and password reset flows
3. Rebuilds Docker images (api, worker, agents, migrate)
4. Waits for PostgreSQL to become healthy
5. Runs database migrations
6. Restarts the stack
7. Verifies API edge health and runs the public smoke test

**Expected output**:
```
==> Pulling latest code...
==> Validating environment variables...
==> Building Docker images...
==> Running database migrations...
OK: Migrations applied
==> Restarting stack...
==> Verifying health...
OK: https://api.agentmou.io/health -> 200
OK: Public smoke test passed
==> Deployment successful
```

### Build-Only Deployment (No Restart)

If you want to build images without restarting services:

```bash
bash infra/scripts/deploy-prod.sh --build-only
```

This is useful for pre-warming Docker image builds before a maintenance window.

### Manual Step-by-Step Deployment

If you prefer manual control:

```bash
# Pull latest code
git pull origin main

# Render the backend-only production stack with your real env file
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml config >/dev/null

# Build backend images and the migration job
docker compose --env-file infra/compose/.env --profile ops -f infra/compose/docker-compose.prod.yml build api worker agents migrate

# Start PostgreSQL first
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml up -d postgres

# Run migrations using the dedicated one-off job
docker compose --env-file infra/compose/.env --profile ops -f infra/compose/docker-compose.prod.yml run --rm migrate

# Restart the stack
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml up -d
```

---

## Health Verification

After deployment, verify the platform is healthy by checking these endpoints:

### API Health

```bash
# Local edge check through Traefik (from the VPS)
curl -sk --resolve api.agentmou.io:443:127.0.0.1 https://api.agentmou.io/health

# Public check (from anywhere)
curl https://api.agentmou.io/health
```

Expected response: `200 OK`

### n8n Status

```bash
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml ps n8n
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml logs --tail 50 n8n
```

### All Services Status

```bash
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml ps
```

All containers should show `Up` status.

### Logs

```bash
# View all logs
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml logs -f

# View specific service logs
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml logs -f api
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml logs -f worker
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml logs -f postgres
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml logs -f n8n

# Clear old logs (optional)
docker system prune --volumes -f
```

### Smoke Test

Run the automated smoke test:

```bash
bash infra/scripts/smoke-test.sh
```

This tests:
- API health through the public domain
- Public catalog response shape
- Auth validation on an invalid login payload

---

## Secret Rotation

### Rotating JWT Secret

⚠️ **Caution**: Rotating JWT invalidates all active sessions.

1. Generate a new secret:
   ```bash
   openssl rand -hex 32
   ```

2. Update `.env`:
   ```bash
   nano infra/compose/.env
   # Change JWT_SECRET to the new value
   ```

3. Restart services:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml restart api worker
   ```

4. Notify users that sessions have expired (they will see login page)

### Rotating Connector Encryption Key

⚠️ **Caution**: Requires decrypting and re-encrypting all OAuth tokens.

1. Generate a new key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. In the API, add a rotation endpoint or script (this is a code change):
   ```typescript
   // This would be implemented in a one-off script
   const oldKey = Buffer.from(process.env.OLD_CONNECTOR_ENCRYPTION_KEY!, 'hex');
   const newKey = Buffer.from(process.env.CONNECTOR_ENCRYPTION_KEY!, 'hex');

   for (const token of allEncryptedTokens) {
     const decrypted = decrypt(token, oldKey);
     const reencrypted = encrypt(decrypted, newKey);
     await db.update(token).set({ encryptedValue: reencrypted });
   }
   ```

3. Update `.env` with the new key

4. Deploy and run the rotation script

5. Restart services:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml restart api
   ```

---

## Rollback Procedure

If a deployment causes issues, rollback to the previous version:

### Rollback Strategy

Agentmou uses a Git history-based rollback:

```bash
# Check recent deployments
git log --oneline -10

# Identify the last good commit
git log --graph --oneline --all

# Rollback to a previous commit
git reset --hard <COMMIT_HASH>

# Rebuild and deploy
bash infra/scripts/deploy-prod.sh
```

### Database Rollback

⚠️ **Caution**: Database migrations are typically not reversible.

If a migration causes issues:

1. **Don't rollback the database**. Instead, apply a new migration that fixes the schema.
2. Or restore from a backup (see [VPS Operations](./vps-operations.md)).

### Full Recovery from Backup

If all else fails, restore from a PostgreSQL backup:

```bash
# Stop the stack
docker compose -f infra/compose/docker-compose.prod.yml down

# Restore backup (see VPS Operations runbook for the full procedure)
BACKUP_FILE=/var/backups/agentmou/agentmou-stack_postgres_YYYY-MM-DD_HHMMSS.sql.gz
gunzip -c "$BACKUP_FILE" | \
  docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.prod.yml \
  exec -T postgres sh -c 'psql -U "$POSTGRES_USER"'

# Restart the stack
docker compose -f infra/compose/docker-compose.prod.yml up -d
```

---

## Deployment Best Practices

1. **Deploy during low-traffic hours** to minimize impact if issues arise
2. **Always test a deployment on a staging environment first** before production
3. **Announce maintenance window** if deployment will cause downtime
4. **Monitor logs after deployment** for the first 10 minutes
5. **Have a runbook** (like this one) reviewed and accessible during deployment
6. **Keep .env file backed up** and never commit it to Git
7. **Review changes** before deployment (read commit messages, understand what's changing)
8. **Run smoke tests** after every deployment
9. **Verify web auth from the Vercel frontend** after backend deploys that
   touch auth, CORS, or OAuth settings
10. **Keep Git history clean** for easy rollback

---

## Troubleshooting Deployment

### "Port already in use"

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or restart Docker
systemctl restart docker
```

### "Database migration failed"

```bash
# Check migration status
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -d agentmou -c "\d"

# View recent migrations
docker compose -f infra/compose/docker-compose.prod.yml exec postgres psql -U agentmou -d agentmou -c "SELECT * FROM \"_drizzle_migrations\" ORDER BY installed_on DESC LIMIT 5;"

# Manually run migration (if needed)
docker compose -f infra/compose/docker-compose.prod.yml exec api pnpm db:migrate
```

### "Docker image build failed"

```bash
# Check Docker logs
docker compose -f infra/compose/docker-compose.prod.yml logs api

# Force rebuild from scratch
docker compose -f infra/compose/docker-compose.prod.yml build --no-cache api

# Clean up dangling images
docker image prune -f
```

### "Services not becoming healthy"

```bash
# Wait for services
sleep 30

# Check health directly
docker compose -f infra/compose/docker-compose.prod.yml ps

# View logs for errors
docker compose -f infra/compose/docker-compose.prod.yml logs --tail 50 api

# Restart individual services
docker compose -f infra/compose/docker-compose.prod.yml restart api
```

---

## Related Documentation

- [VPS Operations](./vps-operations.md): Manage the VPS after deployment
- [Main README](../../README.md): Project overview
- [ADR-006: VPS Deployment](../adr/006-vps-deployment.md): Architecture decision for VPS deployment
