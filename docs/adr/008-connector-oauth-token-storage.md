# ADR-008 — Connector OAuth and Token Storage Strategy

**Status**: accepted
**Date**: 2026-03-09

## Context

Phase 2.5 requires real OAuth2 integrations starting with Gmail. Agents need
to read/write data on behalf of tenants, which means we must store OAuth
access tokens and refresh tokens securely and handle the full OAuth2
authorization code flow.

Key questions:

1. Where to store OAuth tokens?
2. How to protect tokens at rest?
3. How to handle the OAuth state parameter for CSRF protection?
4. How to manage token refresh transparently?

## Decision

### Token storage

OAuth tokens (access + refresh) are stored as **encrypted text columns** on
the existing `connector_accounts` table rather than in a separate vault
service. This keeps the stack simple (no HashiCorp Vault, no AWS KMS) while
still protecting tokens at rest.

New columns on `connector_accounts`:

- `access_token` — AES-256-GCM encrypted, base64-encoded
- `refresh_token` — AES-256-GCM encrypted, base64-encoded
- `token_expires_at` — timestamp for proactive refresh
- `external_account_id` — provider-side identifier (e.g. Gmail email)
- `connected_at` — when the OAuth flow completed

### Encryption

- Algorithm: AES-256-GCM (authenticated encryption)
- Key: 32-byte random key stored in the `CONNECTOR_ENCRYPTION_KEY` env var
  (64-char hex string), never committed to git
- Format: base64(IV + ciphertext + authTag)
- Key rotation: decrypt with old key, re-encrypt with new key (future PR)

### OAuth state / CSRF

A new `connector_oauth_states` table stores ephemeral state tokens:

- Generated before redirecting the user to the provider
- Validated on callback to prevent CSRF attacks
- Rows expire after 10 minutes and are cleaned up periodically

### Token refresh

The connector implementation (e.g. `GmailConnector`) checks
`token_expires_at` before each API call. If expired or within a 5-minute
buffer, it uses the refresh token to obtain a new access token, encrypts it,
and updates the row.

## Alternatives Considered

### External secret manager (Vault, AWS Secrets Manager)

- Pro: industry-standard key management, automatic rotation
- Con: adds significant infrastructure complexity; we're on a single VPS
  with no cloud provider integrations yet
- Rejected: overkill for current scale; can migrate later

### Store tokens in `secret_envelopes` only

- Pro: already has encrypted value storage
- Con: `secret_envelopes` is designed for static API keys, not for tokens
  that need frequent refresh; querying by connector account would require
  joins and the schema doesn't model expiry
- Rejected: `connector_accounts` columns are more ergonomic for the
  token-refresh flow

### JWT-encrypted tokens (JWE)

- Pro: no server-side key management for the encryption itself
- Con: still needs a key; adds complexity with JWE libraries; less
  straightforward than AES-GCM
- Rejected: AES-256-GCM is simpler and well-understood

## Consequences

- `CONNECTOR_ENCRYPTION_KEY` becomes a critical secret — if lost, all stored
  tokens are unreadable. Document key backup in the ops runbook.
- Key rotation requires a migration script (decrypt all, re-encrypt).
- All code that reads tokens must go through `decrypt()` — never expose
  plaintext tokens in logs or API responses.
- The `connector_oauth_states` table will accumulate expired rows; add a
  periodic cleanup job or DB-level TTL index.
