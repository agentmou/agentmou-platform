# API Routes Reference

This document summarizes the routes currently registered by `services/api`.
It is intentionally grounded in the route modules wired in `src/app.ts`.

## Base URLs

- Health: `http://localhost:3001/health`
- API base: `http://localhost:3001/api/v1`

## Registration Model

`services/api/src/app.ts` registers routes in three layers:

1. public routes with no auth middleware
2. authenticated routes guarded by JWT
3. tenant-scoped routes guarded by JWT plus tenant membership checks

This is why some routes live directly under `/api/v1/*` while others live under
`/api/v1/tenants/:tenantId/*`.

## Public Routes

| Area | Routes |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password` |
| B2C OAuth | `GET /api/v1/auth/oauth/providers`, `GET /api/v1/auth/oauth/:provider/authorize`, `GET /api/v1/auth/oauth/:provider/callback`, `POST /api/v1/auth/oauth/exchange` |
| Catalog | `GET /api/v1/catalog/agents`, `GET /api/v1/catalog/agents/:id`, `GET /api/v1/catalog/packs`, `GET /api/v1/catalog/workflows`, `GET /api/v1/catalog/categories`, `GET /api/v1/catalog/search` |
| Connector callback | `GET /api/v1/oauth/callback` |
| Public chat | `POST /api/v1/public/chat` |
| Stripe webhook | `POST /api/v1/webhooks/stripe` |

Notes:

- `/api/v1/auth/me` expects an auth header in practice, even though it is
  registered inside the public auth module.
- `GET /api/v1/oauth/callback` is public because Google redirects back to the
  API without a JWT.

## Authenticated Route Families

### Tenant routes

These routes require a valid JWT:

- `GET /api/v1/tenants`
- `POST /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `PUT /api/v1/tenants/:id`
- `DELETE /api/v1/tenants/:id`
- `GET /api/v1/tenants/:id/settings`
- `PUT /api/v1/tenants/:id/settings`

### Tenant-scoped routes

These routes require a valid JWT plus access to the tenant in the path:

| Module | Example routes |
| --- | --- |
| Memberships | `GET /api/v1/tenants/:tenantId/members`, `POST /api/v1/tenants/:tenantId/members`, `PUT /api/v1/tenants/:tenantId/members/:memberId` |
| Installations | `GET /api/v1/tenants/:tenantId/installations`, `POST /api/v1/tenants/:tenantId/installations/agents`, `POST /api/v1/tenants/:tenantId/installations/workflows`, `POST /api/v1/tenants/:tenantId/installations/packs` |
| Connectors | `GET /api/v1/tenants/:tenantId/connectors`, `POST /api/v1/tenants/:tenantId/connectors`, `POST /api/v1/tenants/:tenantId/connectors/:connectorId/test`, `GET /api/v1/tenants/:tenantId/connectors/oauth/:provider/authorize` |
| Secrets | `GET /api/v1/tenants/:tenantId/secrets`, `POST /api/v1/tenants/:tenantId/secrets`, `DELETE /api/v1/tenants/:tenantId/secrets/:secretId` |
| Approvals | `GET /api/v1/tenants/:tenantId/approvals`, `GET /api/v1/tenants/:tenantId/approvals/:approvalId`, `POST /api/v1/tenants/:tenantId/approvals/:approvalId/approve`, `POST /api/v1/tenants/:tenantId/approvals/:approvalId/reject` |
| Runs | `GET /api/v1/tenants/:tenantId/runs`, `GET /api/v1/tenants/:tenantId/runs/:runId`, `GET /api/v1/tenants/:tenantId/runs/:runId/logs`, `POST /api/v1/tenants/:tenantId/runs` |
| Usage | `GET /api/v1/tenants/:tenantId/usage`, `GET /api/v1/tenants/:tenantId/usage/breakdown`, `GET /api/v1/tenants/:tenantId/usage/history`, `GET /api/v1/tenants/:tenantId/usage/limits` |
| Billing | `GET /api/v1/tenants/:tenantId/billing/overview`, `GET /api/v1/tenants/:tenantId/billing/subscription`, `PUT /api/v1/tenants/:tenantId/billing/subscription`, `GET /api/v1/tenants/:tenantId/billing/invoices` |
| Security | `GET /api/v1/tenants/:tenantId/security/overview`, `GET /api/v1/tenants/:tenantId/security/findings`, `GET /api/v1/tenants/:tenantId/security/policies`, `GET /api/v1/tenants/:tenantId/security/audit-logs` |
| Webhooks | `GET /api/v1/tenants/:tenantId/webhooks`, `POST /api/v1/tenants/:tenantId/webhooks`, `POST /api/v1/tenants/:tenantId/webhooks/:webhookId/deliveries/:deliveryId/retry` |
| n8n | `GET /api/v1/tenants/:tenantId/n8n/status`, `GET /api/v1/tenants/:tenantId/n8n/workflows`, `POST /api/v1/tenants/:tenantId/n8n/workflows/import`, `POST /api/v1/tenants/:tenantId/n8n/workflows/:workflowId/execute` |

## Module Map

| Module directory | Purpose |
| --- | --- |
| `modules/auth` | Email/password auth, B2C OAuth, password reset |
| `modules/catalog` | Manifest-backed catalog browsing and search |
| `modules/tenants` | Tenant CRUD and settings |
| `modules/memberships` | Tenant membership management |
| `modules/installations` | Agent, workflow, and pack installation |
| `modules/connectors` | Connector records and Gmail OAuth initiation |
| `modules/secrets` | Tenant-scoped secret storage |
| `modules/runs` | Run creation, retrieval, and logs |
| `modules/approvals` | Human approval retrieval and decisions |
| `modules/usage` | Usage summaries, history, export, limits |
| `modules/billing` | Subscription, invoices, payment methods |
| `modules/security` | Security overview, findings, policies, audit logs |
| `modules/webhooks` | Tenant outbound webhooks plus Stripe ingest |
| `modules/n8n` | Workflow engine status and n8n management helpers |
| `modules/public-chat` | Public chat endpoint used by the marketing experience |

## Working With Routes

If you need to change or document a route:

1. Start in `services/api/src/app.ts` to confirm middleware scope.
2. Open the relevant `services/api/src/modules/*/*.routes.ts` file.
3. Check `packages/contracts` if the route returns typed payloads.
4. Update [apps/web Architecture](./architecture/apps-web.md) if the UI depends
   on the route family.

## Related Docs

- [Architecture Overview](./architecture/overview.md)
- [apps/web Architecture](./architecture/apps-web.md)
- [Repository Map](./repo-map.md)
