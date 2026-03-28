# Security and Dependency Management

This runbook covers auditing dependencies, addressing vulnerabilities, and keeping the platform secure.

## Dependency Audit with pnpm

### Audit Current Dependencies

```bash
# Audit all dependencies across the monorepo
pnpm audit

# Show detailed vulnerability report
pnpm audit --json > audit-report.json

# Audit specific workspace
pnpm --filter @agentmou/contracts audit
```

### Interpret Audit Output

The output shows:
- **Vulnerability type**: Critical, High, Moderate, Low
- **Package**: Name and version range affected
- **Dependency path**: How the vulnerability reached your project
- **Fix available**: Whether a patch exists

Example:
```
┌─ high ─ Code Injection in express-template-engine ─ 3.0.0

  The package is vulnerable to a code injection attack
  More info: https://nvdb.io/...

  Affected version: 1.0.0 < version < 1.2.0
  Fix available: 1.2.0

  Dependency chain: app → express-template-engine
```

---

## Fixing Vulnerabilities

### Automatic Fix

pnpm can automatically fix many vulnerabilities:

```bash
# Fix all vulnerabilities (applies patches)
pnpm audit --fix

# Fix vulnerabilities in a specific workspace
pnpm --filter services/api audit --fix
```

### Manual Fix

If automatic fix doesn't work:

1. **Identify the vulnerable package**:
   ```bash
   pnpm audit | grep -A 5 "the-package-name"
   ```

2. **Check available versions**:
   ```bash
   pnpm view the-package-name versions
   ```

3. **Update the package**:
   ```bash
   pnpm add -D the-package-name@^2.0.0  # For dev dependency
   # or
   pnpm add the-package-name@^2.0.0     # For regular dependency
   ```

4. **Run tests** to ensure update doesn't break anything:
   ```bash
   pnpm test
   pnpm typecheck
   ```

### Dependency Overrides

For transitive dependencies (dependencies of your dependencies), use pnpm overrides in the root `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "^2.0.0",
      "another-package@<3.0.0": "3.0.0"
    }
  }
}
```

Then reinstall:
```bash
pnpm install
```

Current overrides in the project (from package.json):
```json
"pnpm": {
  "overrides": {
    "flatted": "^3.4.2",
    "brace-expansion": "^5.0.5",
    "micromatch>picomatch": "2.3.2",
    "picomatch@>=4.0.0 <4.0.4": "4.0.4",
    "@esbuild-kit/core-utils>esbuild": "0.25.12"
  }
}
```

---

## Dependency Updates with Renovate or Dependabot

### Set Up Automated Dependency Management

Choose one:

#### Option 1: GitHub Dependabot (Built-in)

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
      day: monday
      time: "03:00"
    open-pull-requests-limit: 5
    allow:
      - dependency-type: all
    reviewers:
      - your-github-username
    labels:
      - dependencies
    commit-message:
      prefix: "chore(deps):"
```

Dependabot will:
- Create PRs for new minor/patch versions
- Run tests automatically
- Update `pnpm-lock.yaml`

#### Option 2: Renovate Bot

Add `renovate.json` to the repository root:

```json
{
  "extends": ["config:base"],
  "schedule": ["before 3am on Monday"],
  "postUpdateOptions": ["pnpmDedupe"],
  "reviewers": ["your-github-username"],
  "labels": ["dependencies"],
  "commitMessagePrefix": "chore(deps):"
}
```

Install via https://github.com/apps/renovate and configure the project.

---

## Regular Dependency Review

### Weekly Review

```bash
# Check for new versions available
pnpm outdated

# View details
pnpm outdated --json
```

### Monthly Deep Dive

1. **Audit for vulnerabilities**:
   ```bash
   pnpm audit
   ```

2. **Review and test updates**:
   ```bash
   # Create a new branch for dependency updates
   git checkout -b deps/monthly-update

   # Update packages
   pnpm update

   # Run full test suite
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

3. **Commit and merge**:
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "chore(deps): monthly update"
   git push origin deps/monthly-update
   # Create PR and merge after tests pass
   ```

---

## Security Checklist for Pull Requests

Before merging any PR, check:

- [ ] **No new vulnerabilities**: `pnpm audit` shows no high/critical issues
- [ ] **Dependency changes are intentional**: Review `pnpm-lock.yaml` diff
- [ ] **All tests pass**: `pnpm test` and `pnpm typecheck`
- [ ] **No hardcoded secrets**: Review code for API keys, passwords, tokens
- [ ] **Credentials are environment-based**: All secrets use `process.env`
- [ ] **No debugging code**: Remove `console.log()`, commented code
- [ ] **No bypass of security checks**: No `// eslint-disable-security` comments
- [ ] **SQL/NoSQL injection prevention**: All queries use parameterized statements
- [ ] **CORS properly configured**: Review `CORS_ORIGIN` setting
- [ ] **Rate limiting in place**: API endpoints have rate limit protection
- [ ] **Input validation**: All external inputs are validated
- [ ] **Error messages don't leak info**: No stack traces or internal details in responses
- [ ] **Authentication enforced**: Protected endpoints require valid tokens
- [ ] **Authorization enforced**: Users can only access their own data

### Security Review Template

Add to PR description:

```markdown
## Security Checklist
- [ ] No new vulnerabilities (pnpm audit passed)
- [ ] No hardcoded secrets
- [ ] Input validation on external data
- [ ] Authentication/authorization enforced
- [ ] Sensitive operations logged
- [ ] No debugging code
```

---

## Secrets Management

### How Secrets Are Stored

- **Development**: Plain text in `infra/compose/.env` (never committed)
- **Production**: Plain text in `infra/compose/.env` on the VPS (secured with file permissions)
- **OAuth tokens**: Encrypted in PostgreSQL with AES-256-GCM (see ADR-008)

### Prevent Accidental Commits

Create a pre-commit hook to prevent committing `.env` files:

```bash
# Create .git/hooks/pre-commit
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/bash

# Prevent committing sensitive files
SENSITIVE_FILES=".env infra/compose/.env"

for file in $SENSITIVE_FILES; do
  if git diff --cached --name-only | grep -q "^$file$"; then
    echo "ERROR: Attempting to commit $file (contains secrets)"
    exit 1
  fi
done

exit 0
EOF

# Make it executable
chmod +x .git/hooks/pre-commit
```

### Rotate Secrets

#### Rotating OAuth Credentials

1. **Generate new credentials** in Google Cloud Console or Microsoft Azure
2. **Update .env**:
   ```bash
   nano infra/compose/.env
   # Update GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, etc.
   ```

3. **Restart services**:
   ```bash
   docker compose -f infra/compose/docker-compose.prod.yml restart api
   ```

#### Rotating JWT Secret

⚠️ This invalidates all active sessions.

1. **Generate new secret**:
   ```bash
   openssl rand -hex 32
   ```

2. **Update .env** and restart:
   ```bash
   nano infra/compose/.env
   docker compose -f infra/compose/docker-compose.prod.yml restart api worker
   ```

3. **Notify users** their sessions have expired

### Audit Secret Access

Log all secret access in production (optional but recommended):

```typescript
// services/api
import { logger } from '@agentmou/observability';

function getSecret(key: string) {
  const value = process.env[key];
  if (!value) {
    logger.warn(`Secret access failed: ${key} not found`);
    throw new Error(`Missing secret: ${key}`);
  }
  logger.debug(`Secret accessed: ${key}`);
  return value;
}
```

---

## Dependency Monitoring in CI/CD

### GitHub Actions Workflow

Add to `.github/workflows/security.yml`:

```yaml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm audit --fail-on high

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm typecheck
```

This ensures:
- All PRs are audited for vulnerabilities
- No high/critical vulnerabilities can be merged
- Code passes lint and type checks before merge

---

## Handling Critical Vulnerabilities

### Response Steps

1. **Assess impact**: Does the vulnerability affect production?
2. **Create hotfix branch**:
   ```bash
   git checkout -b hotfix/cve-XXXX
   ```

3. **Apply fix**:
   ```bash
   pnpm add fixed-package@^X.Y.Z
   pnpm audit  # Verify fix
   ```

4. **Test thoroughly**:
   ```bash
   pnpm test
   pnpm typecheck
   ```

5. **Deploy immediately**:
   ```bash
   # Merge to main (skip PR if critical)
   git merge --squash hotfix/cve-XXXX
   git push origin main

   # Deploy
   bash infra/scripts/deploy-prod.sh
   ```

6. **Post-mortem**: Document how the vulnerability entered and how to prevent similar issues

---

## Known Vulnerabilities Tracking

Create a spreadsheet or document to track:
- CVE or advisory ID
- Affected package
- Severity (Critical, High, Medium, Low)
- Status (New, In Progress, Fixed, Waived)
- Fix applied or reason for waiver
- Date discovered
- Date fixed

Example:

| CVE | Package | Severity | Status | Fix | Date |
|-----|---------|----------|--------|-----|------|
| CVE-2024-1234 | lodash | High | Fixed | v4.17.21 | 2024-01-15 |
| CVE-2024-5678 | express | Critical | Fixed | v4.18.2 | 2024-02-01 |

---

## External Security Tools

Consider integrating:

1. **npm audit**: Built-in (using `pnpm audit`)
2. **Snyk**: Advanced vulnerability detection and license scanning
3. **Aqua Trivy**: Container image scanning
4. **OWASP Dependency-Check**: Comprehensive dependency analysis
5. **Sonarqube**: Code quality and security analysis

---

## Dependency Best Practices

1. **Minimize dependencies**: Only add packages that are truly needed
2. **Prefer established packages**: Use packages with large communities and regular updates
3. **Review transitive dependencies**: Check what your dependencies depend on
4. **Lock versions**: Use `pnpm-lock.yaml` (never commit pinned versions to package.json without reason)
5. **Keep up to date**: Review and update dependencies monthly
6. **Automate checks**: Use Dependabot or Renovate for automatic PRs
7. **Monitor for vulnerabilities**: Run `pnpm audit` as part of CI/CD
8. **Deprecation tracking**: Monitor deprecated packages and plan migrations
9. **License compliance**: Ensure all dependencies have compatible licenses
10. **Dependency documentation**: Document why each major dependency is needed

---

## Related Documentation

- [Local Development Setup](./local-development.md): Setting up dependencies locally
- [Deployment Guide](./deployment.md): Deploying with updated dependencies
- [ADR-008: Connector Encryption](../adr/008-connector-oauth-token-storage.md): Secrets management
