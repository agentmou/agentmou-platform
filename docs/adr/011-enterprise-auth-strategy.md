# ADR-011: B2C Authentication First, Enterprise SSO Deferred to External Integration

**Status**: accepted
**Date**: 2024-01-15

## Context

Authentication requirements differ by customer segment:
- **B2C** (individuals, small teams): Email/password, social login (Google, Microsoft)
- **Enterprise**: SAML/OIDC single sign-on, directory integration (Active Directory, Okta)

Building both simultaneously delays launch. However, the system must be architected to support SSO later without redesign.

Options:
1. **B2C first, SSO via third-party** (Auth0, Clerk, Okta): Fast to launch, external ops burden
2. **Custom SAML/OIDC implementation**: Secure but complex, requires security audit
3. **SAML/OIDC via managed service**: Balance of control and simplicity

## Decision

**B2C authentication first** using email/password and OAuth with Google/Microsoft.

### Phase 1: B2C (Now)
- Email/password sign-up and login
- Google OAuth for social login
- Microsoft OAuth for Office 365 users
- JWT-based session management
- No SAML/OIDC

Credentials stored securely:
```typescript
// services/api
const user = await db.user.create({
  email: 'user@example.com',
  passwordHash: await bcrypt.hash(password, 12),
});

// Login
const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
```

Database schema supports SSO:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  oauth_provider VARCHAR,
  oauth_subject VARCHAR
);

CREATE TABLE tenant_sso_connections (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  sso_provider VARCHAR,
  sso_endpoint VARCHAR,
  sso_metadata_url VARCHAR,
  created_at TIMESTAMP
);
```

### Phase 2: Enterprise SSO (Future)
When enterprise customers require SSO:
1. Use a managed SAML/OIDC provider (Okta, Auth0, or AWS Cognito)
2. Customers configure their identity provider
3. Platform acts as SAML Service Provider (SP)
4. Users authenticate via customer's directory (AD, Okta, etc.)

`tenant_sso_connections` table is pre-built but unused in Phase 1.

## Alternatives Considered

1. **Auth0 / Clerk from day one**:
   - Pros: Full featured (B2C + SSO), excellent UX, managed
   - Cons: Monthly per-user costs, external dependency, less control

2. **Custom SAML implementation**:
   - Pros: Full control, no external cost
   - Cons: Complex, security-critical, requires audit, slower to launch

3. **Passwordless-only** (magic links, passkeys):
   - Pros: Excellent UX, no password database
   - Cons: Early-stage tech, email dependency, harder for enterprise (SAML still needed)

4. **No SSO support** (B2C only forever):
   - Pros: Simplest
   - Cons: Blocks enterprise sales, revisiting later is expensive

## Consequences

- **B2C focus**: Marketing and growth can focus on individual and small-team adoption.
- **OAuth integration**: Google and Microsoft OAuth are configured in `.env`. Setup requires OAuth credentials from those providers.
- **JWT sessions**: Stateless, scalable, but sessions cannot be revoked immediately (token expiry is maximum revocation latency).
- **SSO deferred**: Enterprise contracts can promise SSO as a future feature. Customers use B2C auth initially.
- **Schema is SSO-ready**: `tenant_sso_connections` table is already in the schema; code can be added in Phase 2 without migration.
- **Email verification**: Consider adding email verification in Phase 1 to prevent typos and improve recovery.

When enterprise customers arrive, integrating a SAML provider (via Auth0, Okta, or AWS Cognito as intermediary) is straightforward because the database and API already support multiple authentication methods.

This approach enables fast launch while preserving a clear upgrade path to enterprise.
