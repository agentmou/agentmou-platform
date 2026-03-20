# @agentmou/auth

Authentication utilities for JWT issuance and password hashing.

## Purpose

`@agentmou/auth` provides the small but critical primitives used by the API's
authentication flow:
- Sign and verify JWTs.
- Hash and verify passwords without native dependencies.

It keeps credential logic out of the API route layer so the same behavior can be
tested and reused consistently.

## Usage

```typescript
import {
  createToken,
  verifyToken,
  hashPassword,
  verifyPassword,
} from '@agentmou/auth';

const passwordHash = hashPassword('correct horse battery staple');
const ok = verifyPassword('correct horse battery staple', passwordHash);
const token = await createToken({ userId: 'user_123', email: 'user@example.com' });
const payload = await verifyToken(token);
```

## Key Exports

- `createToken(payload)`
- `verifyToken(token)`
- `TokenPayload`
- `hashPassword(password)`
- `verifyPassword(password, storedHash)`

## Configuration

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | HMAC signing secret for JWT creation and verification; falls back to `dev-secret` in local development |

## Development

```bash
pnpm --filter @agentmou/auth typecheck
pnpm --filter @agentmou/auth lint
pnpm --filter @agentmou/auth test
```

## Related Docs

- [Current State](../../docs/architecture/current-state.md)
