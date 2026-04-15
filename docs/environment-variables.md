# Environment Variables Reference

Complete reference of all environment variables used by Agentmou Platform. Copy `.env.example` and fill in your values.

## Location

Environment variables are defined in:
```
infra/compose/.env
```

Copy from the example:
```bash
cp infra/compose/.env.example infra/compose/.env
```

## Variables by Category

### Domain & HTTPS

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `DOMAIN` | `agentmou.io` | Yes | Public domain name for your Agentmou instance |
| `LE_EMAIL` | `admin@agentmou.io` | For SSL | Email for Let's Encrypt certificate renewal |

### PostgreSQL

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `POSTGRES_DB` | `agentmou` | Yes | Database name |
| `POSTGRES_USER` | `agentmou` | Yes | Database user |
| `POSTGRES_PASSWORD` | `changeme` | Yes | Database password (avoid /, @, :, #) |
| `DB_PORT` | `5432` | For docker-compose | Database port (host) |
| `DATABASE_URL` | `postgresql://agentmou:changeme@postgres:5432/agentmou` | Yes (derived) | Full connection string (auto-constructed) |

**Note:** Generate password with `openssl rand -hex 24` for security.

### Redis

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `REDIS_PORT` | `6379` | For docker-compose | Redis port (host) |
| `REDIS_URL` | `redis://localhost:6379` | Yes (derived) | Full Redis connection string |

### n8n Workflow Engine

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `TZ` | `Europe/Madrid` | Yes | Timezone for n8n scheduler (IANA format) |
| `N8N_EDITOR_BASE_URL` | `https://n8n.agentmou.io` | Yes | Public URL for n8n editor |
| `WEBHOOK_URL` | `https://hooks.agentmou.io` | Yes | Public webhook URL for n8n triggers |
| `N8N_PROXY_HOPS` | `1` | Yes | Proxy hops for X-Forwarded-For header |
| `N8N_ENCRYPTION_KEY` | `changeme-generate-a-random-string` | Yes | 16+ character encryption key for n8n credentials |
| `N8N_API_URL` | `http://n8n:5678/api/v1` | Yes | Internal n8n API URL (for services/api) |
| `N8N_API_KEY` | `changeme` | Yes | API key for n8n API authentication |

**Generate N8N_ENCRYPTION_KEY:** `openssl rand -hex 16`

### AI / LLM Services

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `OPENAI_API_KEY` | `sk-...` | For agents | OpenAI API key for email analysis and agent planning |
| `AGENTS_API_KEY` | `changeme` | Yes | X-API-Key for services/agents authentication |

**Note:** Email analysis uses GPT-4o-mini model by default.

### Control Plane API & Worker

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `JWT_SECRET` | `changeme-32-hex-chars` | Yes | Secret for signing/verifying JWTs (min 32 chars) |
| `CORS_ORIGIN` | `https://app.agentmou.io` | For production | CORS allowed browser origin for the tenant app |
| `MARKETING_PUBLIC_BASE_URL` | `https://agentmou.io` | Yes | Canonical marketing origin for metadata and public cross-surface links |
| `APP_PUBLIC_BASE_URL` | `https://app.agentmou.io` | Yes | Canonical app/auth origin for reset links and tenant deep links |
| `API_PUBLIC_BASE_URL` | `https://api.agentmou.io` | Yes | Canonical public API origin for callbacks and public API links |

**Generate JWT_SECRET:** `openssl rand -hex 32`

### Authentication (B2C OAuth)

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `AUTH_WEB_ORIGIN_ALLOWLIST` | `http://localhost:3000` | Yes | Comma-separated list of app origins allowed for ?return_url on /auth/callback (open redirect guard). In production it must include the `APP_PUBLIC_BASE_URL` origin |
| `GOOGLE_OAUTH_CLIENT_ID` | (from Google Console) | Optional | OAuth client ID for Google login |
| `GOOGLE_OAUTH_CLIENT_SECRET` | (from Google Console) | Optional | OAuth client secret for Google login |
| `GOOGLE_OAUTH_REDIRECT_URI` | `http://localhost:3001/api/v1/auth/oauth/google/callback` | Optional | Redirect URI registered in Google Console |
| `MICROSOFT_OAUTH_CLIENT_ID` | (from Microsoft Console) | Optional | OAuth client ID for Microsoft login |
| `MICROSOFT_OAUTH_CLIENT_SECRET` | (from Microsoft Console) | Optional | OAuth client secret for Microsoft login |
| `MICROSOFT_OAUTH_REDIRECT_URI` | `http://localhost:3001/api/v1/auth/oauth/microsoft/callback` | Optional | Redirect URI registered in Microsoft Console |
| `LOG_PASSWORD_RESET_LINK` | `1` | Optional | Set to 1 to log password reset links (dev only, remove in prod) |

**Note:** OAuth is optional for local development. Leave blank to use email/password only.

### Gmail Connector (Google OAuth)

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `GOOGLE_CLIENT_ID` | (from Google Console) | For Gmail connector | OAuth client ID for Gmail API |
| `GOOGLE_CLIENT_SECRET` | (from Google Console) | For Gmail connector | OAuth client secret for Gmail API |
| `GOOGLE_REDIRECT_URI` | `https://api.agentmou.io/api/v1/oauth/callback` | For Gmail connector | Redirect URI for Gmail OAuth flow |

**Note:** Different from B2C OAuth. Needed only if tenants will use Gmail connector.

### Twilio Clinic Channels

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `TWILIO_ACCOUNT_SID` | `AC...` | For real Twilio delivery | Shared Twilio account SID used by clinic WhatsApp and voice adapters |
| `TWILIO_AUTH_TOKEN` | `twilio-secret` | For real Twilio delivery | Shared Twilio auth token used for outbound calls/messages and inbound webhook signature validation |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` | Optional | Default WhatsApp sender when a channel config does not override `from` |
| `TWILIO_WHATSAPP_MESSAGING_SERVICE_SID` | `MG...` | Optional | Default Twilio Messaging Service SID for WhatsApp outbound delivery |
| `TWILIO_VOICE_FROM` | `+34910000000` | Optional | Default caller ID for outbound voice callbacks when a channel config does not override it |

**Note:** In demo/test or when these variables are absent, the clinic channel adapters fall back to the `mock_*` providers when allowed by environment.

### Web Marketing Capture

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `CONTACT_SALES_WEBHOOK_URL` | `https://hooks.example.com/contact-sales` | Optional | Webhook target for `POST /api/contact-sales`; if omitted outside production, the route accepts the lead and logs a controlled fallback |
| `CONTACT_SALES_WEBHOOK_TOKEN` | `sales-webhook-secret` | Optional | Bearer token sent by the web app when relaying contact-sales leads to the configured webhook |

### Encryption

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `CONNECTOR_ENCRYPTION_KEY` | `changeme-64-hex-chars` | Yes | 256-bit key for AES-256-GCM encryption of connector credentials at rest |

**Generate CONNECTOR_ENCRYPTION_KEY:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Traefik (Reverse Proxy, Production Only)

| Variable | Example | Required | Purpose |
| -------- | ------- | -------- | ------- |
| `BASIC_AUTH_USERS` | `admin:$$apr1$$CHANGEME` | For prod | HTTP Basic Auth for Traefik dashboard |

**Generate:** `htpasswd -nB admin` (escape $ as $$ for Docker)

## Environment by Deployment

### Local Development

Minimum required:
```env
DOMAIN=localhost
POSTGRES_DB=agentmou
POSTGRES_USER=agentmou
POSTGRES_PASSWORD=changeme
JWT_SECRET=changeme-local
CONNECTOR_ENCRYPTION_KEY=changeme-local-32-bytes
N8N_ENCRYPTION_KEY=changeme-local
N8N_API_KEY=changeme-local
AGENTS_API_KEY=changeme-local
OPENAI_API_KEY=sk-changeme (for agent tests)
TZ=UTC
N8N_EDITOR_BASE_URL=http://localhost:5678
WEBHOOK_URL=http://localhost:5678
N8N_API_URL=http://n8n:5678/api/v1
N8N_PROXY_HOPS=1
MARKETING_PUBLIC_BASE_URL=http://localhost:3000
APP_PUBLIC_BASE_URL=http://localhost:3000
API_PUBLIC_BASE_URL=http://localhost:3001
AUTH_WEB_ORIGIN_ALLOWLIST=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
LE_EMAIL=admin@localhost
BASIC_AUTH_USERS=admin:changeme
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_WHATSAPP_MESSAGING_SERVICE_SID=
TWILIO_VOICE_FROM=
CONTACT_SALES_WEBHOOK_URL=
CONTACT_SALES_WEBHOOK_TOKEN=
```

### Staging/Production

Additional requirements:
```env
# Must use real domain
DOMAIN=agentmou.io
LE_EMAIL=your-email@company.com

# Must use strong secrets
JWT_SECRET=$(openssl rand -hex 32)
CONNECTOR_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)

# Production URLs
N8N_EDITOR_BASE_URL=https://n8n.agentmou.io
WEBHOOK_URL=https://hooks.agentmou.io
MARKETING_PUBLIC_BASE_URL=https://agentmou.io
APP_PUBLIC_BASE_URL=https://app.agentmou.io
API_PUBLIC_BASE_URL=https://api.agentmou.io
CORS_ORIGIN=https://app.agentmou.io
AUTH_WEB_ORIGIN_ALLOWLIST=https://app.agentmou.io

# OAuth (if using)
GOOGLE_OAUTH_CLIENT_ID=(your-client-id)
GOOGLE_OAUTH_CLIENT_SECRET=(your-secret)
GOOGLE_OAUTH_REDIRECT_URI=https://api.agentmou.io/api/v1/auth/oauth/google/callback
MICROSOFT_OAUTH_CLIENT_ID=(your-client-id)
MICROSOFT_OAUTH_CLIENT_SECRET=(your-secret)
MICROSOFT_OAUTH_REDIRECT_URI=https://api.agentmou.io/api/v1/auth/oauth/microsoft/callback

# Gmail Connector (if using)
GOOGLE_CLIENT_ID=(your-client-id)
GOOGLE_CLIENT_SECRET=(your-secret)
GOOGLE_REDIRECT_URI=https://api.agentmou.io/api/v1/oauth/callback

# Web marketing lead capture
CONTACT_SALES_WEBHOOK_URL=https://hooks.example.com/contact-sales
CONTACT_SALES_WEBHOOK_TOKEN=(shared-secret)

# Twilio clinic channels (if using real delivery)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=(your-auth-token)
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WHATSAPP_MESSAGING_SERVICE_SID=MG...
TWILIO_VOICE_FROM=+34910000000

# Traefik Basic Auth
BASIC_AUTH_USERS=$(htpasswd -nB admin | sed 's/$/$$/')
```

Production contract:

- `MARKETING_PUBLIC_BASE_URL` is the public marketing host (`agentmou.io`)
- `APP_PUBLIC_BASE_URL` is the canonical auth and tenant-app host (`app.agentmou.io`)
- `API_PUBLIC_BASE_URL` is the public API host (`api.agentmou.io`)
- `CORS_ORIGIN` must match the app origin
- `AUTH_WEB_ORIGIN_ALLOWLIST` must include the app origin
- OAuth callback URLs registered with providers must hang off `API_PUBLIC_BASE_URL`
- When using the optional Docker `web` profile on the VPS, it serves the app
  host variant only; marketing still stays on the external marketing host

## Security Best Practices

1. **Never commit `.env` to Git** — It contains secrets
2. **Generate strong secrets** — Use `openssl rand` for all `*_KEY` variables
3. **Rotate secrets regularly** — Especially in production
4. **Use HashiCorp Vault** — For managing secrets in production
5. **Limit access** — Restrict who can view/edit `.env`
6. **Audit access** — Log who reads sensitive variables
7. **Never log secrets** — Remove `LOG_PASSWORD_RESET_LINK` in production

## Validation

Validate your `.env` against the Docker Compose files:

```bash
pnpm lint:infra
```

This checks:
- All referenced variables are defined
- Compose files are syntactically valid
- Required environment variables are present

## Troubleshooting

### Variable Not Found

If Docker Compose shows "variable not set":

1. Verify `.env` exists: `ls infra/compose/.env`
2. Check variable is defined: `grep VARNAME infra/compose/.env`
3. Reload compose: `docker compose -f infra/compose/docker-compose.local.yml config | grep VARNAME`

### Port Conflicts

If ports are already in use, change them:

```env
DB_PORT=5433           # Changed from 5432
REDIS_PORT=6380        # Changed from 6379
```

Then update Docker Compose or use port mapping.

### Database Connection Fails

If `DATABASE_URL` is auto-constructed, verify:

1. All `POSTGRES_*` variables are set
2. Special characters are not in password (/, @, :, #)
3. Port matches `DB_PORT`

Manually set `DATABASE_URL` if needed:
```env
DATABASE_URL=postgresql://agentmou:mypass@localhost:5432/agentmou
```

### Services Can't Communicate

If internal services can't connect (e.g., API can't reach n8n):

- `N8N_API_URL` should use **internal DNS**: `http://n8n:5678` (not localhost)
- `DATABASE_URL` should use **host name**: `postgres` (inside compose), `localhost` (outside)
- Check Docker network: `docker network ls`

## Related Documentation

- [Onboarding Guide](./onboarding.md) — Local setup steps
- [Deployment Guide](./runbooks/deployment.md) — Production configuration
- [Troubleshooting Guide](./troubleshooting.md) — Environment issues
