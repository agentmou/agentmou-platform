# Troubleshooting Guide

Solutions to common problems you may encounter while developing on or running Agentmou.

## Docker & Infrastructure Issues

### Docker Containers Won't Start

**Symptom:** `docker-compose up` fails or containers exit immediately.

**Solution:**

1. Check logs for specific errors:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml logs postgres
   docker compose -f infra/compose/docker-compose.local.yml logs redis
   docker compose -f infra/compose/docker-compose.local.yml logs n8n
   ```

2. Ensure Docker daemon is running:
   ```bash
   docker ps
   ```

3. Restart containers:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml restart
   ```

4. Nuclear option (loses all data):
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml down -v
   docker compose -f infra/compose/docker-compose.local.yml up -d
   pnpm db:migrate
   pnpm db:seed
   ```

### Port Already in Use

**Symptom:** Error like `Address already in use: 0.0.0.0:3000`.

**Solution:**

1. Find what's using the port:
   ```bash
   lsof -i :3000      # macOS/Linux
   netstat -ano | findstr :3000  # Windows
   ```

2. Kill the process:
   ```bash
   kill -9 <PID>      # macOS/Linux
   taskkill /PID <PID> /F  # Windows
   ```

   Or change the port in `infra/compose/docker-compose.local.yml`:
   ```yaml
   services:
     agentmou-web:
       ports:
         - '3001:3000'  # Changed from 3000:3000
   ```

### Docker Compose Validation Fails

**Symptom:** `pnpm lint:infra` fails with compose validation errors.

**Solution:**

1. Validate the compose files:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml config
   docker compose -f infra/compose/docker-compose.prod.yml config
   ```

2. Fix environment variable references in `.env.example` (make sure all vars used in compose are defined)

3. Run validation again:
   ```bash
   pnpm lint:infra
   ```

### Docker Out of Disk Space

**Symptom:** Docker commands fail with "no space left on device".

**Solution:**

1. Clean up unused images, containers, and volumes:
   ```bash
   docker system prune -a --volumes
   ```

2. Or selectively:
   ```bash
   docker image prune -a          # Remove unused images
   docker volume prune            # Remove unused volumes
   docker container prune         # Remove stopped containers
   ```

## Database Issues

### Database Connection Fails

**Symptom:** `error: connect ECONNREFUSED 127.0.0.1:5432`.

**Solution:**

1. Verify PostgreSQL container is running:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml ps postgres
   ```

2. Check database credentials in `.env`:
   ```bash
   echo $DATABASE_URL
   ```

3. Test connection directly:
   ```bash
   psql postgresql://agentmou:changeme@localhost:5432/agentmou
   ```

4. If connection fails, restart PostgreSQL:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml restart postgres
   ```

### Migration Fails

**Symptom:** `pnpm db:migrate` exits with error.

**Solution:**

1. Check migration status:
   ```bash
   pnpm db:studio
   ```

   This opens Drizzle Studio to visualize the schema.

2. See which migrations have run:
   ```bash
   docker exec agentmou-postgres psql -U agentmou -d agentmou -c "SELECT * FROM __drizzle_migrations;"
   ```

3. If a migration is stuck, rollback manually (⚠️ dangerous):
   ```bash
   docker exec agentmou-postgres psql -U agentmou -d agentmou -c "DELETE FROM __drizzle_migrations WHERE name = 'migration_name';"
   ```

4. Run migration again:
   ```bash
   pnpm db:migrate
   ```

5. If all else fails, reset database (loses all data):
   ```bash
   docker exec agentmou-postgres psql -U agentmou -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   pnpm db:migrate
   pnpm db:seed
   ```

### Database Seed Fails

**Symptom:** `pnpm db:seed` errors out.

**Solution:**

1. Verify migrations have run:
   ```bash
   pnpm db:migrate
   ```

2. Check seed script for errors:
   ```bash
   # View the seed script
   cat packages/db/src/seed.ts
   ```

3. Make sure you are using the repo's canonical local database URL:
   ```bash
   export DATABASE_URL=postgresql://agentmou:changeme@127.0.0.1:5432/agentmou
   ```

4. Run the full validation helper to ensure PostgreSQL, migrations, seed, and
   the clinic + QA seed smoke lane stay aligned:
   ```bash
   pnpm validate:clinic-demo
   ```

5. Run seed with verbose output:
   ```bash
   NODE_DEBUG=* pnpm db:seed
   ```

6. If seed data already exists, it may be idempotent (safe to rerun)

### Slow Queries or High CPU

**Symptom:** Database operations are slow or CPU is pegged.

**Solution:**

1. Check active connections:
   ```bash
   docker exec agentmou-postgres psql -U agentmou -d agentmou -c "SELECT * FROM pg_stat_activity;"
   ```

2. Kill long-running queries:
   ```bash
   docker exec agentmou-postgres psql -U agentmou -d agentmou -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';"
   ```

3. Analyze slow queries:
   ```bash
   pnpm db:studio  # Use to explore tables and relationships
   ```

4. Restart PostgreSQL:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml restart postgres
   ```

## Authentication & Authorization Issues

### Session Cookie Validation Fails

**Symptom:** API returns `401 Unauthorized`, `/app/*` bounces back to `/login`,
or the browser does not stay signed in after refresh.

**Solution:**

1. Verify JWT_SECRET is set:
   ```bash
   echo $JWT_SECRET
   ```

2. Check that the browser received `agentmou-session`:
   - DevTools -> Application/Storage -> Cookies
   - confirm the cookie is present on the app/api host pair

3. Verify the canonical host/env contract:
   ```bash
   echo $APP_PUBLIC_BASE_URL
   echo $CORS_ORIGIN
   echo $AUTH_WEB_ORIGIN_ALLOWLIST
   ```

4. Regenerate JWT secret only if bearer fallback or legacy tokens are failing,
   then restart API:
   ```bash
   # Set new secret
   export JWT_SECRET=$(openssl rand -hex 32)
   # Restart API
   pnpm dev
   # Log out and back in
   ```

### OAuth Callback Fails

**Symptom:** Google/Microsoft OAuth redirects to error page.

**Solution:**

1. Verify OAuth credentials are set in `.env`:
   ```bash
   echo $GOOGLE_OAUTH_CLIENT_ID
   echo $GOOGLE_OAUTH_CLIENT_SECRET
   echo $GOOGLE_OAUTH_REDIRECT_URI
   ```

2. Verify redirect URI matches console (Google/Microsoft):
   - Google: `http://localhost:3001/api/v1/auth/oauth/google/callback`
   - Microsoft: `http://localhost:3001/api/v1/auth/oauth/microsoft/callback`

3. Check API logs for specific error:
   ```bash
   # Look for "OAuth error" in logs
   ```

4. Test OAuth endpoint directly:
   ```bash
   curl "http://localhost:3001/api/v1/auth/oauth/google/callback?code=test&state=test"
   ```

5. If testing locally without real OAuth, remove OAuth env vars (login will use email/password)

### Login Redirect Loop

**Symptom:** Redirected back to login after entering credentials.

**Solution:**

1. Check `APP_PUBLIC_BASE_URL` matches your app domain:
   ```bash
   echo $APP_PUBLIC_BASE_URL
   ```

2. Verify user exists in database:
   ```bash
   pnpm db:studio  # Look in users table
   ```

3. Check the session cookie is being set in response:
   ```bash
   curl -i -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password"}'
   ```

4. Verify browser is accepting cookies and that `/login` is being served from
   the canonical app host, not the marketing host.

### Tenant Access Denied

**Symptom:** `403 Forbidden` when accessing a tenant's data.

**Solution:**

1. Verify user is member of tenant:
   ```bash
   pnpm db:studio  # Check memberships table
   ```

2. Verify tenant_id in URL matches:
   - URL: `/app/[tenantId]/...`
   - Session bootstrap from `/api/v1/auth/me` should include that tenant in the
     resolved membership list

3. Add user to tenant:
   ```bash
   # Use db:studio or manual SQL
   INSERT INTO memberships (user_id, tenant_id, role) VALUES (...);
   ```

## Build & Lint Issues

### TypeScript Compilation Fails

**Symptom:** `pnpm typecheck` shows errors.

**Solution:**

1. Identify the error:
   ```bash
   pnpm typecheck 2>&1 | head -20
   ```

2. Common issues:
   - Missing type import: Add `import type { ... } from '...'`
   - Type mismatch: Check function signatures and interfaces
   - Missing types: Install `@types/package`

3. Fix the error and rerun:
   ```bash
   pnpm typecheck
   ```

4. If types are cached, clear:
   ```bash
   rm -rf packages/*/dist/
   pnpm typecheck
   ```

### ESLint/Biome Errors

**Symptom:** `pnpm lint` fails.

**Solution:**

1. Auto-fix common issues:
   ```bash
   pnpm format
   ```

2. See remaining issues:
   ```bash
   pnpm lint
   ```

3. Common issues:
   - Unused imports: Remove them
   - Unused variables: Remove or use `_` prefix
   - Missing semicolons: Run format
   - Incorrect spacing: Run format

4. Disable specific rule (last resort):
   ```typescript
   // eslint-disable-next-line rule-name
   const x = problematicCode();
   ```

### Build Fails

**Symptom:** `pnpm build` exits with error.

**Solution:**

1. Clean and rebuild:
   ```bash
   pnpm clean
   pnpm install
   pnpm build
   ```

2. Check for missing dependencies:
   ```bash
   npm ls --depth=0
   ```

3. Check for circular dependencies:
   ```bash
   pnpm build 2>&1 | grep "circular"
   ```

4. Check specific workspace:
   ```bash
   pnpm --filter @agentmou/api build
   ```

## Worker & Queue Issues

### Jobs Stuck in Queue

**Symptom:** Jobs show as "waiting" but don't process.

**Solution:**

1. Verify Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check worker is running:
   ```bash
   # ps aux | grep worker
   # Or check pnpm dev output
   ```

3. See queue status:
   ```bash
   redis-cli KEYS "bull:*"
   ```

4. Restart worker:
   ```bash
   # Stop pnpm dev
   # Kill any worker processes
   # Start pnpm dev again
   ```

5. Clear stuck jobs (⚠️ data loss):
   ```bash
   redis-cli FLUSHDB
   ```

### Redis Connection Failed

**Symptom:** `error: connect ECONNREFUSED 127.0.0.1:6379`.

**Solution:**

1. Verify Redis container is running:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml ps redis
   ```

2. Test Redis connection:
   ```bash
   redis-cli ping
   ```

3. Check Redis is listening:
   ```bash
   netstat -an | grep 6379
   ```

4. Restart Redis:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml restart redis
   ```

### Worker Crashes

**Symptom:** Worker process exits unexpectedly.

**Solution:**

1. Check worker logs:
   ```bash
   # From pnpm dev output
   # Or run specifically
   pnpm --filter @agentmou/worker dev
   ```

2. Common causes:
   - Out of memory: Check system RAM
   - Database connection pool exhausted: Reduce worker concurrency
   - Unhandled exception: Fix in job processor

3. Check job processor error handling:
   ```typescript
   // services/worker/src/jobs/[job-name]/processor.ts
   try {
     // ...
   } catch (error) {
     logger.error({ error }, 'Job failed');
     throw error;  // Required for BullMQ retry
   }
   ```

## n8n Issues

### n8n Won't Start

**Symptom:** n8n container exits or hangs.

**Solution:**

1. Check logs:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml logs n8n
   ```

2. Common causes:
   - Database not initialized: Wait for PostgreSQL to be ready
   - Encryption key not set: Check `N8N_ENCRYPTION_KEY` in `.env`
   - Port conflict: Use different port if 5678 taken

3. Restart n8n:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml restart n8n
   ```

4. Wait for health check:
   ```bash
   curl -s http://localhost:5678/api/v1/health | jq .
   ```

### Workflow Execution Fails

**Symptom:** n8n workflow errors or doesn't call agents.

**Solution:**

1. Check n8n logs:
   ```bash
   docker compose -f infra/compose/docker-compose.local.yml logs n8n | grep -i error
   ```

2. Verify API URL in n8n config:
   - n8n console > Settings > Webhooks
   - Should point to `http://api:3001` (internal) or `http://localhost:3001` (for local testing)

3. Test webhook by triggering workflow manually in n8n UI

4. Check worker is processing jobs:
   ```bash
   # From pnpm dev output or redis-cli
   ```

### n8n API Key Invalid

**Symptom:** Error calling n8n API from services/api.

**Solution:**

1. Verify n8n API key in `.env`:
   ```bash
   echo $N8N_API_KEY
   ```

2. Generate new key in n8n UI:
   - Admin panel > Credentials
   - Create API key for service

3. Verify API URL is correct:
   ```bash
   echo $N8N_API_URL
   # Should be http://n8n:5678/api/v1 (internal)
   ```

4. Test API connection:
   ```bash
   curl -X GET http://localhost:5678/api/v1/workflows \
     -H "X-N8N-API-KEY: $N8N_API_KEY"
   ```

## Python Agents Service Issues

### Agents Service Won't Start

**Symptom:** `python3 -m pytest` fails or service not responding.

**Solution:**

1. Verify Python 3.12 is installed:
   ```bash
   python3 --version
   ```

2. Check for syntax errors:
   ```bash
   python3 -m py_compile services/agents/main.py
   ```

3. Run tests:
   ```bash
   pnpm test:agents
   ```

4. Start service manually:
   ```bash
   cd services/agents
   python3 main.py
   ```

5. Test health endpoint:
   ```bash
   curl http://localhost:8000/health
   ```

### OpenAI API Key Invalid

**Symptom:** Agents service returns 500 or "API key error".

**Solution:**

1. Verify key is set:
   ```bash
   echo $OPENAI_API_KEY
   ```

2. Test OpenAI connectivity:
   ```bash
   curl -X POST http://localhost:8000/health/deep \
     -H "X-API-Key: $AGENTS_API_KEY"
   ```

3. Check key is valid (shouldn't start with `sk-proj-` without full token)

4. Verify key has API access enabled in OpenAI dashboard

### Email Analysis Returns Wrong Classification

**Symptom:** Agents service classifies emails incorrectly.

**Solution:**

1. Check model being used:
   ```bash
   # services/agents/main.py
   model="gpt-4o-mini"  # Verify this is correct
   ```

2. Test directly:
   ```bash
   curl -X POST http://localhost:8000/analyze-email \
     -H "X-API-Key: $AGENTS_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "subject": "Test",
       "body": "This is a test email",
       "from": "test@example.com"
     }'
   ```

3. Adjust prompt or model temperature if needed

## Performance Issues

### Slow Response Times

**Symptom:** API calls take >1 second.

**Solution:**

1. Profile with timing:
   ```bash
   time curl http://localhost:3001/api/v1/health
   ```

2. Check database query performance:
   ```bash
   pnpm db:studio  # See query execution time
   ```

3. Look for N+1 queries (unnecessary loop queries):
   ```typescript
   // ❌ Bad: N queries for N items
   for (const item of items) {
     const related = await db.query(`SELECT ... WHERE id = ${item.id}`);
   }

   // ✅ Good: Single query with JOIN
   const related = await db.query(`SELECT ... WHERE id IN (...)`, itemIds);
   ```

4. Monitor system resources:
   ```bash
   top  # CPU and memory usage
   ```

### High Memory Usage

**Symptom:** Node process uses > 500MB.

**Solution:**

1. Check for memory leaks:
   ```bash
   # Enable heapsnapshot
   node --heapsnapshot services/api/src/index.ts
   ```

2. Reduce worker concurrency:
   ```typescript
   // services/worker/src/index.ts
   worker.concurrency = 2;  // Was too high
   ```

3. Clear old logs:
   ```bash
   docker exec agentmou-postgres psql -U agentmou -d agentmou -c "DELETE FROM audit_events WHERE created_at < NOW() - INTERVAL '30 days';"
   ```

4. Restart services:
   ```bash
   docker compose restart
   ```

## Getting Help

If the above doesn't solve your problem:

1. **Check related docs:**
   - [Onboarding Guide](./onboarding.md)
   - [Architecture Overview](./architecture/overview.md)
   - [Environment Variables](./environment-variables.md)

2. **Search GitHub issues** for similar problems

3. **Create a new GitHub issue** with:
   - Steps to reproduce
   - Error message and logs
   - Environment (OS, Node version, etc.)
   - What you've already tried

4. **Ask in team Slack** with error details

5. **Check logs thoroughly:**
   ```bash
   # Docker logs
   docker compose logs -f

   # Application logs (if logging configured)
   # Check for error patterns and stack traces
   ```

## Escalation Checklist

Before escalating to team lead:

- [ ] Reproduced issue consistently
- [ ] Checked all logs and error messages
- [ ] Searched documentation and GitHub issues
- [ ] Tried basic troubleshooting (restart, clean, reinstall)
- [ ] Documented exact reproduction steps
- [ ] Noted environment details (OS, versions)
- [ ] Provided error messages and logs

Then file a GitHub issue with the above information.
