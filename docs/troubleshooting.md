# Troubleshooting Guide

Start with the smallest check that can confirm whether the problem is local
setup, shared infra, or a workspace-specific regression.

## Commands That Answer Most Questions

```bash
pnpm typecheck
pnpm lint
pnpm test
docker compose -f infra/compose/docker-compose.local.yml ps
curl http://localhost:3001/health
```

## Common Problems

### `pnpm` validation fails after pulling changes

- Run `pnpm install` to refresh the workspace graph.
- Re-run `pnpm typecheck` first because type drift often explains later lint or
  test failures.
- If a single workspace fails, run the filtered command for that workspace to
  get a shorter error surface.

### Local services do not start

- Confirm `infra/compose/.env` exists and is based on
  `infra/compose/.env.example`.
- Check `docker compose -f infra/compose/docker-compose.local.yml ps`.
- If Postgres, Redis, or n8n are down, restart the local stack with:

```bash
docker compose -f infra/compose/docker-compose.local.yml up -d
```

### API calls fail from the web app

- Confirm the API health endpoint responds on `http://localhost:3001/health`.
- Confirm `NEXT_PUBLIC_API_URL` points at the API service.
- If only authenticated routes fail, verify the auth cookie exists and the API
  is using the same JWT secret as your local setup.

### Catalog or workflow data looks empty

- Confirm the files still exist under `catalog/` and `workflows/`.
- Run the catalog SDK tests if manifest changes were involved:

```bash
pnpm --filter @agentmou/catalog-sdk test
```

- Check whether the UI surface is using the real API provider or the demo
  provider for that route.

### OAuth or validation-fixture cleanup behaves unexpectedly

- Use the runbook-backed cleanup path instead of ad hoc SQL:
  [`docs/runbooks/deployment.md`](./runbooks/deployment.md#temporary-validation-fixture-cleanup)
- Confirm the disposable tenant still matches the guarded cleanup rules before
  using `--execute`.

### B2C login (Google/Microsoft) redirects or “origin not allowed”

- Ensure `AUTH_WEB_ORIGIN_ALLOWLIST` on the API includes the exact browser
  origin (scheme + host + port) for `apps/web`, for example
  `http://localhost:3000` locally. See
  [`infra/compose/.env.example`](../infra/compose/.env.example).
- Confirm B2C redirect URIs in the provider console match
  `GOOGLE_OAUTH_REDIRECT_URI` / `MICROSOFT_OAUTH_REDIRECT_URI` (API callback
  URLs), not the Next.js app URL.
- Verify `GOOGLE_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_*` are set when you expect
  those buttons; the web UI only shows providers the API advertises as enabled.

### Password reset link never arrives

- Outbound email is not fully wired for all environments; in development the API
  may log reset links when `LOG_PASSWORD_RESET_LINK=1` (see
  [`apps/web/README.md`](../apps/web/README.md) and `.env.example`).

## When To Escalate

- Production or VPS issues: use the [Runbooks Index](./runbooks/README.md) and
  start with [Deployment Runbook](./runbooks/deployment.md).
- Repo structure or source-of-truth confusion: use
  [Current State](./architecture/current-state.md) and
  [Repository Map](./repo-map.md).
