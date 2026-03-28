# Troubleshooting Guide

Common issues and solutions for [project name].

## Before You Start

1. **Gather context:** What were you doing when the error happened?
2. **Check logs:** Most issues are explained in error messages
3. **Search this guide:** Your issue is probably here
4. **Ask:** Not in the guide? Ask in #project-support

---

## Development Issues

### "Module not found" Error

**Error:** `Cannot find module 'xyz'` or similar

**Cause:** Missing or outdated dependencies

**Solution:**
```bash
# Reinstall dependencies
npm install

# Or if that doesn't work, clear cache
rm -rf node_modules package-lock.json
npm install

# Then restart dev server
npm run dev
```

---

### "Port 3000 already in use"

**Error:** `Error: listen EADDRINUSE :::3000`

**Cause:** Another process is using port 3000

**Solution:**

Option 1: Use a different port
```bash
PORT=3001 npm run dev
# Now visit http://localhost:3001
```

Option 2: Kill the process using 3000
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 [PID]

# Then start dev server
npm run dev
```

---

### TypeScript Type Errors

**Error:** `TS2322: Type 'X' is not assignable to type 'Y'`

**Cause:** Type mismatch in code

**Solution:**
```bash
# Check what the type error actually is
npm run type:check

# Fix the types according to error message
# Usually: add `string` type annotation, use correct return type, etc.

# Example:
// Before (error)
const count: number = "5";

// After (fixed)
const count: number = parseInt("5");
```

---

### Tests Failing Locally

**Error:** Some tests fail locally but pass in CI

**Cause:** Different environment, timing, or test data

**Solution:**
```bash
# 1. Update dependencies
npm install

# 2. Clear test cache
npm test -- --clearCache

# 3. Run tests in isolation
npm test -- path/to/specific.test.ts

# 4. Run with verbose output to see what's failing
npm test -- --verbose

# 5. Check if it's a timing issue
npm test -- --maxWorkers=1  # Run sequentially instead of parallel
```

---

### Hot Reload Not Working

**Error:** Changes to code don't reload automatically

**Cause:** Dev server not watching files, or watcher limit exceeded

**Solution:**
```bash
# 1. Restart dev server
# (Stop with Ctrl+C, then)
npm run dev

# 2. If still not working, increase file watcher limit
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 3. Or use polling (slower but more reliable)
npm run dev -- --poll
```

---

## Database Issues

### "Connection refused" (Database won't connect)

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Cause:** Database is not running

**Solution:**

If using Docker Compose:
```bash
# Start database
docker-compose up -d

# Verify it's running
docker-compose ps
```

If using local PostgreSQL:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start it if not running
sudo systemctl start postgresql

# Verify connection
psql -U postgres -c "SELECT 1;"
```

---

### "too many connections"

**Error:** `FATAL: sorry, too many connections for role`

**Cause:** Connection pool exhausted, too many idle connections

**Solution:**

```bash
# 1. Restart application (forces reconnect)
npm run dev  # Or restart container

# 2. Or check what's holding connections
psql $DATABASE_URL -c "SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;"

# 3. Kill idle connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '10 min';"
```

---

### Migrations Failing

**Error:** `Error: migration failed` or similar

**Cause:** Schema conflict, migration already applied, or SQL syntax error

**Solution:**

```bash
# 1. Check migration status
npm run db:migrate:status

# 2. Check which migrations failed
npm run db:migrate:status --verbose

# 3. If a migration is stuck, rollback and try again
npm run db:rollback

# 4. Then migrate again
npm run db:migrate

# 5. If still failing, check the migration file
cat src/db/migrations/[failing-migration].ts

# Fix any SQL syntax errors, then retry
npm run db:migrate
```

---

### Data Corruption or Inconsistency

**Error:** Unexpected data state, foreign key violations, etc.

**Solution:**

```bash
# 1. Check database integrity
npm run db:health:check

# 2. If backups are available, restore
npm run db:restore:from-backup

# 3. If not, manually fix:
psql $DATABASE_URL

# Check data
SELECT * FROM users WHERE id = 123;

# Fix if needed
UPDATE users SET email = 'correct@example.com' WHERE id = 123;

# Commit
\q
```

---

## API Issues

### "401 Unauthorized"

**Error:** `401 Unauthorized` when calling API

**Cause:** Missing, expired, or invalid authentication token

**Solution:**

```bash
# 1. Get a valid token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
# Returns: {"token":"eyJhbGciOi..."}

# 2. Use token in requests
curl http://localhost:3000/api/protected \
  -H "Authorization: Bearer eyJhbGciOi..."

# 3. If token expired, get a new one by logging in again
```

---

### "400 Bad Request"

**Error:** `400 Bad Request` or response with error details

**Cause:** Invalid input, missing required field, malformed JSON

**Solution:**

```bash
# 1. Check the error message
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{}'
# Returns: {"error":"email is required"}

# 2. Fix the request
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"User"}'
```

---

### "500 Internal Server Error"

**Error:** `500 Internal Server Error`

**Cause:** Something unexpected happened on the server

**Solution:**

```bash
# 1. Check the server logs
npm run logs:dev | grep ERROR
# or
tail -f your-logfile.log

# 2. Read the error message carefully
# It usually tells you what went wrong

# 3. Fix the issue
# Common causes:
# - Database query failed
# - Null reference error
# - Configuration missing
# - External API call failed

# 4. Test the fix
npm run test

# 5. Restart dev server
npm run dev
```

---

### Slow API Responses

**Error:** API calls taking 5+ seconds

**Cause:** Database query is slow, blocking operation, or high load

**Solution:**

```bash
# 1. Identify which endpoint is slow
curl -w "@curl-format.txt" http://localhost:3000/api/users

# 2. Check database query times
npm run db:slow-queries

# 3. Add database index if query is O(n)
psql $DATABASE_URL -c "CREATE INDEX idx_users_email ON users(email);"

# 4. Optimize application code
# Look for N+1 queries, loops, etc.

# 5. Verify it's faster
npm run test:performance
```

---

## Frontend Issues (if applicable)

### "Blank white page"

**Error:** Browser shows blank/white page

**Cause:** JavaScript error, missing CSS, or network issue

**Solution:**

```bash
# 1. Check browser console (F12 → Console tab)
# Look for red errors

# 2. Check network tab
# Are API requests failing? Getting 401/500?

# 3. Clear cache
# Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
# Select "All time", clear

# 4. Restart dev server
npm run dev

# 5. Check if CSS is loading
# In network tab, look for .css files

# 6. If CSS still missing, restart with full rebuild
npm run dev -- --force
```

---

### "API requests failing"

**Error:** Frontend can't reach backend API

**Cause:** Backend not running, wrong API URL, CORS issue

**Solution:**

```bash
# 1. Make sure backend is running
npm run dev  # In API terminal

# 2. Check API URL in frontend config
cat .env | grep REACT_APP_API_URL

# 3. Make sure it's correct
# Local: http://localhost:3000
# Staging: https://staging.example.com
# Prod: https://example.com

# 4. Check CORS headers
curl -i http://localhost:3000/api/users

# 5. If CORS is missing, check backend config
cat src/api/middleware/cors.ts
```

---

### Styling Issues

**Error:** CSS not loading, styles look wrong

**Solution:**

```bash
# 1. Hard refresh browser
Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

# 2. Clear browser cache
Settings → Privacy → Clear browsing data

# 3. Restart dev server
npm run dev

# 4. Check if CSS file exists
ls -la public/styles.css

# 5. Rebuild CSS/assets
npm run build:css
npm run dev
```

---

## Deployment Issues

### "Deployment stuck" or "won't deploy"

**Error:** Deployment hangs or fails

**Solution:**

```bash
# 1. Check CI/CD pipeline status
# GitHub Actions: Actions tab
# CircleCI: Pipelines page

# 2. Check build logs
# Usually shows exactly what failed

# 3. Common issues:
# - Tests failing (run: npm test)
# - Build failing (run: npm run build)
# - Environment variables missing
# - Docker image build failing

# 4. If tests failing
npm test -- --verbose

# 5. If build failing
npm run build

# 6. Fix issues locally, push again
git add .
git commit -m "fix: resolve build issue"
git push origin feature-branch
```

---

### "Deployment succeeded but application is down"

**Error:** Deployment finished, but app doesn't work

**Solution:**

```bash
# 1. Check health endpoint
curl https://example.com/health

# 2. Check recent logs
npm run logs:prod --since 5m

# 3. Check if it's a startup issue
kubectl logs deployment/project-name -c app

# 4. Rollback to previous version
npm run rollback:prod

# 5. Verify rollback worked
curl https://example.com/health

# 6. Debug the failed deployment
# Look at the code that was deployed
git log --oneline -5

# Fix the issue, re-deploy
```

---

## Performance Issues

### Application is slow

**Solution:**

```bash
# 1. Check resource usage
npm run metrics:cpu
npm run metrics:memory
npm run metrics:disk

# 2. Identify slow endpoints
npm run performance:profile

# 3. Check database
npm run db:slow-queries

# 4. Look for memory leaks
node --inspect src/index.js
# Then use Chrome DevTools to profile

# 5. Add caching if not already there
# See if results can be cached

# 6. Optimize database queries
# Add indexes, reduce N+1 queries
```

---

## Getting Help

If your issue isn't in this guide:

1. **Search online:** "Error message" + "project-name"
2. **Check GitHub Issues:** [https://github.com/org/project-name/issues](link)
3. **Ask in Slack:** #project-support with:
   - What you were trying to do
   - The error message (with screenshots if helpful)
   - What you've already tried
4. **Ask on-call:** If production is down

---

## Useful Commands

```bash
# Logs
npm run logs:dev        # Development logs
npm run logs:prod       # Production logs
npm run logs:prod --since 1h  # Last hour

# Monitoring
npm run metrics:cpu
npm run metrics:memory
npm run performance:profile

# Database
npm run db:health:check
npm run db:slow-queries
npm run db:connections:status

# Testing
npm test                # Run all tests
npm test -- --watch     # Watch mode
npm run test:coverage   # Coverage report

# Restart/Reload
npm run dev             # Restart dev server
npm run rollback:prod   # Rollback production
```

---

**Last updated:** [DATE]

**Questions?** Ask in #project-support or see [Runbook](RUNBOOK.md)
