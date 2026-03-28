# API Routes Reference

Overview of Agentmou REST API endpoints organized by module. The API runs on `http://localhost:3001` locally and uses `/api/v1` as the base path.

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

All endpoints (except public routes) require JWT authentication:

```bash
Authorization: Bearer <jwt-token>
```

Tokens are obtained via `/auth/login` or OAuth flows.

## Module Organization

The API is organized into 15 functional modules. Each module handles a specific domain:

| Module | Purpose | Scope |
| ------ | ------- | ----- |
| **auth** | User authentication, login, registration, password reset, OAuth flows | Public |
| **tenants** | Tenant management, creation, settings | Tenant admin |
| **memberships** | User memberships and roles within tenants | Tenant admin |
| **catalog** | Browse available agents, workflows, packs | Public/tenant |
| **installations** | Install, manage, delete agents and workflows | Tenant admin |
| **runs** | View execution runs, steps, logs | Tenant member |
| **approvals** | Request and action approvals for runs | Tenant admin |
| **connectors** | OAuth flows for email, Slack, etc. | Tenant admin |
| **secrets** | Encrypted credential storage | Tenant admin |
| **n8n** | n8n workflow provisioning and management | Internal |
| **webhooks** | Webhook event subscriptions and delivery | Tenant admin |
| **billing** | Stripe subscription and usage billing | Tenant admin |
| **usage** | Usage metrics and analytics | Tenant member |
| **security** | Security settings and audit logs | Tenant admin |
| **public-chat** | Public knowledge base chatbot (no auth) | Public |

## Authentication Module

### Public Routes (No Auth Required)

#### Health Check
```
GET /health
```
Returns `{"ok": true}`. Use this to verify API is running.

### User Authentication Routes

#### Register
```
POST /auth/register
```
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token"
}
```

#### Login
```
POST /auth/login
```
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": { /* ... */ },
  "token": "jwt-token"
}
```

#### Password Reset Request
```
POST /auth/password-reset-request
```
Request a password reset email.

#### Password Reset
```
POST /auth/password-reset
```
Reset password using token from email.

### OAuth Routes

#### Google OAuth Callback
```
GET /auth/oauth/google/callback?code=...&state=...
```
Handle Google OAuth redirect. Automatically creates user if first login.

#### Microsoft OAuth Callback
```
GET /auth/oauth/microsoft/callback?code=...&state=...
```
Handle Microsoft OAuth redirect. Automatically creates user if first login.

## Tenants Module

**Base:** `/tenants`

### Create Tenant
```
POST /tenants
```
Create a new tenant organization.

**Auth:** User must be authenticated

**Request:**
```json
{
  "name": "Acme Corp",
  "website": "https://acme.example.com"
}
```

**Response:**
```json
{
  "id": "tenant-uuid",
  "name": "Acme Corp",
  "website": "https://acme.example.com",
  "created_at": "2026-03-28T00:00:00Z"
}
```

### List Tenants
```
GET /tenants
```
List all tenants the current user is a member of.

**Auth:** Required

### Get Tenant
```
GET /tenants/:id
```
Get a specific tenant's details.

**Auth:** User must be member of tenant

### Update Tenant
```
PATCH /tenants/:id
```
Update tenant settings (name, website, etc.).

**Auth:** Tenant admin only

### Delete Tenant
```
DELETE /tenants/:id
```
Delete entire tenant and all associated data.

**Auth:** Tenant owner only

## Memberships Module

**Base:** `/tenants/:tenantId/memberships`

### List Members
```
GET /tenants/:tenantId/memberships
```
List all members in a tenant.

**Auth:** Tenant member

### Invite Member
```
POST /tenants/:tenantId/memberships/invite
```
Invite a user to join the tenant.

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "admin"
}
```

### Update Member Role
```
PATCH /tenants/:tenantId/memberships/:userId
```
Change a member's role (member, admin, owner).

**Auth:** Tenant admin

### Remove Member
```
DELETE /tenants/:tenantId/memberships/:userId
```
Remove a user from the tenant.

**Auth:** Tenant admin

## Catalog Module

**Base:** `/catalog`

### List Agents
```
GET /catalog/agents
```
List all available agents.

**Query Parameters:**
- `category` — Filter by category (productivity, support, sales, etc.)
- `search` — Search by name or description

**Response:**
```json
{
  "agents": [
    {
      "id": "inbox-triage",
      "name": "Inbox Triage",
      "description": "Automatically triage emails...",
      "category": "productivity",
      "version": "1.0.0"
    }
  ]
}
```

### Get Agent Details
```
GET /catalog/agents/:id
```
Get full details including input/output schema, required connectors.

### List Packs
```
GET /catalog/packs
```
List all available packs.

### Get Pack Details
```
GET /catalog/packs/:id
```
Get pack details including included agents/workflows.

## Installations Module

**Base:** `/tenants/:tenantId/installations`

### Create Installation
```
POST /tenants/:tenantId/installations
```
Install an agent or workflow for the tenant.

**Request:**
```json
{
  "type": "agent",
  "catalog_id": "inbox-triage",
  "variables": {
    "email_folder": "INBOX"
  }
}
```

**Response:**
```json
{
  "id": "installation-uuid",
  "catalog_id": "inbox-triage",
  "type": "agent",
  "status": "active",
  "created_at": "2026-03-28T00:00:00Z"
}
```

### List Installations
```
GET /tenants/:tenantId/installations
```
List all installed agents/workflows for the tenant.

### Get Installation
```
GET /tenants/:tenantId/installations/:id
```
Get details of a specific installation.

### Update Installation
```
PATCH /tenants/:tenantId/installations/:id
```
Update installation variables or status.

### Delete Installation
```
DELETE /tenants/:tenantId/installations/:id
```
Uninstall an agent or workflow.

## Runs Module

**Base:** `/tenants/:tenantId/runs`

### List Runs
```
GET /tenants/:tenantId/runs
```
List execution runs for the tenant.

**Query Parameters:**
- `installation_id` — Filter by installation
- `status` — Filter by status (pending, running, completed, failed)
- `limit` — Number of results (default 20)
- `offset` — Pagination offset

**Response:**
```json
{
  "runs": [
    {
      "id": "run-uuid",
      "installation_id": "installation-uuid",
      "input": { /* ... */ },
      "output": { /* ... */ },
      "status": "completed",
      "started_at": "2026-03-28T00:00:00Z",
      "completed_at": "2026-03-28T00:00:30Z"
    }
  ],
  "total": 100
}
```

### Create Run (Execute Agent)
```
POST /tenants/:tenantId/runs
```
Execute an installed agent.

**Request:**
```json
{
  "installation_id": "installation-uuid",
  "input": {
    "email_subject": "Test email",
    "email_body": "Content here"
  }
}
```

### Get Run
```
GET /tenants/:tenantId/runs/:id
```
Get full run details including all steps.

**Response:**
```json
{
  "id": "run-uuid",
  "installation_id": "installation-uuid",
  "status": "completed",
  "steps": [
    {
      "id": "step-uuid",
      "type": "tool_call",
      "tool": "read_email",
      "status": "completed",
      "started_at": "2026-03-28T00:00:00Z",
      "completed_at": "2026-03-28T00:00:05Z",
      "result": { /* ... */ }
    }
  ]
}
```

### Cancel Run
```
POST /tenants/:tenantId/runs/:id/cancel
```
Cancel a pending or running execution.

## Approvals Module

**Base:** `/tenants/:tenantId/approvals`

### List Approvals
```
GET /tenants/:tenantId/approvals
```
List all approval requests for the tenant.

**Query Parameters:**
- `status` — Filter by status (pending, approved, rejected)
- `run_id` — Filter by run

### Get Approval
```
GET /tenants/:tenantId/approvals/:id
```
Get approval request details.

**Response:**
```json
{
  "id": "approval-uuid",
  "run_id": "run-uuid",
  "step_id": "step-uuid",
  "status": "pending",
  "description": "Send email to customer@example.com",
  "created_at": "2026-03-28T00:00:00Z",
  "expires_at": "2026-03-28T01:00:00Z"
}
```

### Approve
```
POST /tenants/:tenantId/approvals/:id/approve
```
Approve an action.

**Request:**
```json
{
  "comment": "Looks good, proceed"
}
```

### Reject
```
POST /tenants/:tenantId/approvals/:id/reject
```
Reject an action.

**Request:**
```json
{
  "reason": "Not the right recipient"
}
```

## Connectors Module

**Base:** `/tenants/:tenantId/connectors`

### List Connectors
```
GET /tenants/:tenantId/connectors
```
List available connectors and user's connected accounts.

**Response:**
```json
{
  "available": ["gmail", "slack", "salesforce"],
  "connected": [
    {
      "id": "account-uuid",
      "connector": "gmail",
      "email": "user@gmail.com",
      "created_at": "2026-03-28T00:00:00Z"
    }
  ]
}
```

### Get OAuth URL
```
GET /tenants/:tenantId/connectors/:connector/oauth-url
```
Get authorization URL for OAuth flow.

**Query Parameters:**
- `state` — Unique state for CSRF protection

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/..."
}
```

### Handle OAuth Callback
```
GET /tenants/:tenantId/connectors/:connector/callback
```
Internal endpoint. Handles OAuth provider redirects.

### List Accounts
```
GET /tenants/:tenantId/connectors/:connector/accounts
```
List all connected accounts for a specific connector.

### Disconnect Account
```
DELETE /tenants/:tenantId/connectors/:connector/accounts/:id
```
Disconnect and delete a connector account.

## Secrets Module

**Base:** `/tenants/:tenantId/secrets`

### Store Secret
```
POST /tenants/:tenantId/secrets
```
Encrypt and store a credential.

**Request:**
```json
{
  "name": "slack-token",
  "value": "xoxb-..."
}
```

**Response:**
```json
{
  "id": "secret-uuid",
  "name": "slack-token",
  "created_at": "2026-03-28T00:00:00Z"
}
```

### List Secrets
```
GET /tenants/:tenantId/secrets
```
List secret names (values are never returned).

### Delete Secret
```
DELETE /tenants/:tenantId/secrets/:id
```
Delete an encrypted secret.

## Usage Module

**Base:** `/tenants/:tenantId/usage`

### Get Usage
```
GET /tenants/:tenantId/usage
```
Get usage metrics for the current billing period.

**Response:**
```json
{
  "period": {
    "start": "2026-03-01",
    "end": "2026-03-31"
  },
  "metrics": {
    "runs_executed": 150,
    "api_calls": 5000,
    "connector_operations": 300
  }
}
```

## Security Module

**Base:** `/tenants/:tenantId/security`

### List Audit Events
```
GET /tenants/:tenantId/security/audit
```
List all audit events (logins, installations, deletions, etc.).

**Query Parameters:**
- `action` — Filter by action type
- `user_id` — Filter by user
- `limit` — Number of results

### Get Audit Event
```
GET /tenants/:tenantId/security/audit/:id
```
Get details of a specific audit event.

## Billing Module

**Base:** `/tenants/:tenantId/billing`

### Get Subscription
```
GET /tenants/:tenantId/billing/subscription
```
Get current Stripe subscription status.

### Create Subscription
```
POST /tenants/:tenantId/billing/subscription
```
Start a new Stripe subscription.

**Request:**
```json
{
  "price_id": "price_...",
  "return_url": "https://agentmou.io/app/tenant-id/settings/billing"
}
```

### Update Subscription
```
PATCH /tenants/:tenantId/billing/subscription
```
Update subscription plan or payment method.

### Cancel Subscription
```
DELETE /tenants/:tenantId/billing/subscription
```
Cancel subscription.

## Webhooks Module

**Base:** `/tenants/:tenantId/webhooks`

### Create Webhook
```
POST /tenants/:tenantId/webhooks
```
Subscribe to events.

**Request:**
```json
{
  "event": "run.completed",
  "url": "https://example.com/webhook",
  "active": true
}
```

### List Webhooks
```
GET /tenants/:tenantId/webhooks
```
List all webhook subscriptions.

### Update Webhook
```
PATCH /tenants/:tenantId/webhooks/:id
```
Update webhook URL or event filter.

### Delete Webhook
```
DELETE /tenants/:tenantId/webhooks/:id
```
Unsubscribe from event.

### List Events
```
GET /tenants/:tenantId/webhooks/events
```
Get delivery history of webhook events.

## n8n Module

**Base:** `/n8n` (Internal)**

**Note:** These are internal endpoints used by services/worker. Not typically called directly.

### Provision Workflow
```
POST /n8n/workflows/provision
```
Create a new n8n workflow for a tenant.

### Delete Workflow
```
DELETE /n8n/workflows/:id
```
Delete an n8n workflow.

### Execute Workflow
```
POST /n8n/workflows/:id/execute
```
Trigger a workflow execution.

## Public Chat Module

**Base:** `/public-chat` (No Auth Required)**

### Chat
```
POST /public-chat/chat
```
Query the public knowledge base chatbot.

**Request:**
```json
{
  "message": "How do I triage emails?",
  "session_id": "session-uuid"
}
```

**Response:**
```json
{
  "reply": "You can use the Inbox Triage agent...",
  "sources": ["doc-id-1", "doc-id-2"]
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      {
        "path": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## Common HTTP Status Codes

| Code | Meaning | Example |
| ---- | ------- | ------- |
| 200 | Success | Fetch completed |
| 201 | Created | Resource created |
| 204 | No Content | Delete successful |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | User not member of tenant |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 500 | Server Error | Unexpected error |

## Testing Endpoints

Use cURL or Postman. Examples:

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# List agents
curl http://localhost:3001/api/v1/catalog/agents

# Create run (requires auth)
curl -X POST http://localhost:3001/api/v1/tenants/tenant-id/runs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"installation_id":"...","input":{}}'
```

## Rate Limiting

Currently unlimited. Will be added in future versions.

## Related Documentation

- [Onboarding Guide](./onboarding.md) — Getting started
- [Architecture Overview](./architecture/overview.md) — System design
- [Glossary](./glossary.md) — Domain terminology
- [Troubleshooting](./troubleshooting.md) — Common issues
