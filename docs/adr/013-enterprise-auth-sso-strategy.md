# 013 — Enterprise auth (SAML / OIDC) strategy

**Status**: accepted  
**Date**: 2026-03-27

## Context

Agentmou needs both B2C sign-in (Google, Microsoft) and B2B enterprise SSO (SAML, OIDC per tenant). The control plane already uses email/password and JWT sessions in `services/api`.

## Decision

1. **B2C** is implemented first-party in `services/api` using standard OAuth2 authorization-code flows, `user_identities` for IdP subjects, and one-time login codes exchanged by `apps/web` (no long-lived tokens in URLs).

2. **Enterprise (B2B)** should integrate via a **specialized provider** (WorkOS, Auth0 Organizations, or Clerk) rather than embedding a full SAML stack in Fastify. Rationale: XML metadata, certificate rotation, NameID formats, and SCIM are high-risk to maintain in-house.

3. The **`tenant_sso_connections`** table (see `packages/db`) holds per-tenant configuration (`connection_type`, `provider_key`, `idp_metadata_url`, `verified_domains`, `enabled`) as a schema placeholder until a provider is chosen. UI surfaces an disabled “Enterprise SSO” entry with documentation pointers.

## Alternatives considered

- **Native `@node-saml` / `passport-saml` in Fastify**: maximum control but large security and operations burden.
- **Only B2C OAuth**: insufficient for regulated customers requiring IdP-managed identities.

## Consequences

- Product and infra must pick one enterprise vendor and map its webhooks/callbacks into the same JWT + cookie session model as password and B2C OAuth.
- Domains in `verified_domains` should drive email-domain routing to the correct SSO connection before showing the IdP login.
