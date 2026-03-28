# ADR-008: AES-256-GCM Encryption at Rest for OAuth Tokens in PostgreSQL

**Status**: accepted
**Date**: 2024-01-15

## Context

Tenants connect third-party services (Gmail, Slack, GitHub, CRM) via OAuth. The platform must store OAuth tokens securely:
- **In transit**: HTTPS (provided by Traefik TLS termination)
- **At rest**: Encrypted in PostgreSQL
- **In memory**: Decrypted only when needed, then cleared

Encryption at rest protects against:
- Database backups leaking to unauthorized parties
- Accidental exposure of database dumps
- Compromised VPS disk access

Options include:
1. **External vault** (HashiCorp Vault, AWS Secrets Manager)
2. **Cloud KMS** (AWS KMS, Google Cloud KMS)
3. **Application-level encryption** with keys in environment variables
4. **Plaintext** (unacceptable)

External vaults add operational complexity (separate service to deploy and monitor). For a single VPS, application-level encryption with a key in the environment is simpler and sufficient.

## Decision

**AES-256-GCM encryption at rest** for OAuth tokens stored in PostgreSQL.

Implementation:
- Use Node.js built-in `crypto` module for AES-256-GCM encryption
- Encryption key: `CONNECTOR_ENCRYPTION_KEY` environment variable (64 hex characters = 32 bytes)
- Tokens are encrypted before INSERT, decrypted on SELECT
- Each encrypted value includes a random IV (initialization vector) and authentication tag

Code pattern:
```typescript
import crypto from 'crypto';

const key = Buffer.from(process.env.CONNECTOR_ENCRYPTION_KEY!, 'hex');

// Encrypt
const iv = crypto.randomBytes(12); // 96-bit IV for GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(token, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();
const stored = `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;

// Decrypt
const [ivHex, encryptedHex, authTagHex] = stored.split(':');
const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
decrypted += decipher.final('utf8');
```

Tokens are encrypted in `packages/connectors` and the encryption layer is transparent to services that consume tokens.

Key rotation:
- Generate a new `CONNECTOR_ENCRYPTION_KEY`
- Decrypt all tokens with the old key
- Encrypt with the new key
- Update `.env` on the VPS
- Restart services

## Alternatives Considered

1. **HashiCorp Vault**:
   - Pros: Enterprise-grade, key rotation built-in, audit logging
   - Cons: Requires separate service, operational overhead, overkill for small deployment

2. **AWS Secrets Manager / Google Cloud Secret Manager**:
   - Pros: Managed, highly available, auditing
   - Cons: Vendor lock-in, requires AWS/GCP account and integration, not suitable for VPS deployment

3. **TDE (Transparent Data Encryption) at database level**:
   - Pros: All data encrypted at storage layer
   - Cons: Requires PostgreSQL compiled with OpenSSL, limited to full-disk encryption, less fine-grained

4. **Plaintext**:
   - Pros: Simplest to implement
   - Cons: Unacceptable security risk, violates compliance, not trustworthy

## Consequences

- **Encryption key is in `.env`**: The key must be protected as carefully as database credentials (both grant database access).
- **Key exposure is critical**: If `.env` is leaked, all tokens can be decrypted. Treat it with highest care.
- **No external key management**: Unlike external vaults, there is no "master" system to compromise separately. Risk is consolidated to the VPS.
- **Decryption on every use**: Tokens are decrypted from PostgreSQL in-memory only when needed (e.g., when making OAuth API calls). Performance impact is negligible.
- **Key rotation requires downtime**: Rotating the key requires decrypting and re-encrypting all tokens (this takes seconds but requires database access).
- **Backup protection**: Database backups contain encrypted tokens; they cannot be decrypted without the key.
- **Tokens are never logged**: Decrypted tokens are handled in memory and never printed to logs.

This approach is suitable for a single-VPS deployment with a security-conscious operations team. As the platform scales or regulatory requirements increase, migration to a vault system is possible without architectural changes.
