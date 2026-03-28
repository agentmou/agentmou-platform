# @agentmou/connectors

Connector abstractions and runtime loaders for external systems such as Gmail.

## Purpose

`@agentmou/connectors` gives the platform a consistent way to talk to external
providers. Right now the concrete implementation is Gmail-focused, but the
package also defines the abstraction and registry model used for future
providers.

## Responsibilities

- Define the base connector contract through `BaseConnector`.
- Implement the production Gmail connector with OAuth2 token refresh.
- Encrypt and decrypt connector secrets for storage at rest.
- Load tenant connector instances from the database on demand.
- Provide a connector registry for built-in and future providers.

## Usage

Load connected tenant connectors for agent execution:

```typescript
import { loadTenantConnectors } from '@agentmou/connectors';

const connectors = await loadTenantConnectors('tenant_123');
const gmail = connectors.get('gmail');

if (gmail) {
  const messages = await gmail.listMessages({ query: 'is:unread', maxResults: 10 });
}
```

Or construct a Gmail connector directly:

```typescript
import { GmailConnector } from '@agentmou/connectors';

const gmail = new GmailConnector({
  name: 'gmail-primary',
  credentials: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    accessToken: 'token',
    refreshToken: 'refresh',
  },
});

await gmail.connect();
```

## Key Exports

| Export | Purpose |
| --- | --- |
| `BaseConnector` and `ConnectorConfig` | Shared connector abstraction |
| `GmailConnector`, `GmailConfig`, `GmailMessage` | Gmail-specific runtime client |
| `encrypt`, `decrypt` | AES-256-GCM helpers for secret storage |
| `loadGmailConnector` | Load and connect a single Gmail account from the database |
| `loadTenantConnectors` | Load all connected tenant connectors into a provider-keyed map |
| `ConnectorLoadError` | Error type for failed DB-backed connector loading |
| `connectorRegistry` | In-memory registry of available connector classes |

## Configuration

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Gmail OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth client secret |
| `CONNECTOR_ENCRYPTION_KEY` | Key used to decrypt stored OAuth tokens |
| `DATABASE_URL` | Required indirectly through `@agentmou/db` |

## Development

```bash
pnpm --filter @agentmou/connectors typecheck
pnpm --filter @agentmou/connectors lint
```

The package contains tests under `src/__tests__`, but there is not yet a
package-local `test` script in `package.json`.

## Related Docs

- [ADR-008: Connector OAuth Token Storage](../../docs/adr/008-connector-oauth-token-storage.md)
- [Architecture Overview](../../docs/architecture/overview.md)
