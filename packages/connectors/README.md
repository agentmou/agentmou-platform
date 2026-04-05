# @agentmou/connectors

Connector abstractions and runtime loaders for external systems such as Gmail,
Twilio clinic channels, and deterministic mock adapters.

## Purpose

`@agentmou/connectors` gives the platform a consistent way to talk to external
providers. It still owns the Gmail connector runtime, and now also ships a
parallel clinic-channel adapter layer for WhatsApp and voice without forcing
those providers through the `BaseConnector` abstraction.

## Responsibilities

- Define the base connector contract through `BaseConnector`.
- Implement the production Gmail connector with OAuth2 token refresh.
- Implement clinic channel adapters for Twilio WhatsApp and Twilio voice.
- Provide mock WhatsApp and voice adapters for demo, test, and no-credential
  environments.
- Validate Twilio webhook signatures and normalize inbound provider payloads
  into shared clinic webhook events.
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

Resolve a clinic channel adapter for outbound delivery or inbound webhook
parsing:

```typescript
import { resolveClinicChannelAdapter } from '@agentmou/connectors';

const adapter = resolveClinicChannelAdapter(channel, {
  allowMockFallback: process.env.NODE_ENV !== 'production',
});

const result = await adapter.sendMessage?.({
  to: '+34600000000',
  body: 'Tu cita sigue confirmada para mañana a las 10:00.',
  statusCallbackUrl: 'https://api.agentmou.io/api/v1/webhooks/twilio/whatsapp',
});
```

## Key Exports

| Export | Purpose |
| --- | --- |
| `BaseConnector` and `ConnectorConfig` | Shared connector abstraction |
| `GmailConnector`, `GmailConfig`, `GmailMessage` | Gmail-specific runtime client |
| `resolveClinicChannelAdapter` | Resolve a Twilio or mock clinic-channel adapter from `clinic_channels` metadata |
| `validateTwilioWebhookSignature` | Helper for verifying inbound Twilio signatures |
| `normalizePhoneAddress` | Shared phone normalization for clinic channel routing |
| `ClinicChannelAdapter` and related request types | Typed adapter contract for WhatsApp/voice send and webhook parsing |
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
| `TWILIO_ACCOUNT_SID` | Default Twilio account SID for clinic channels |
| `TWILIO_AUTH_TOKEN` | Twilio auth token used for API calls and webhook validation |
| `TWILIO_WHATSAPP_FROM` | Optional default WhatsApp sender |
| `TWILIO_WHATSAPP_MESSAGING_SERVICE_SID` | Optional default Messaging Service SID |
| `TWILIO_VOICE_FROM` | Optional default voice caller ID |
| `DATABASE_URL` | Required indirectly through `@agentmou/db` |

## Development

```bash
pnpm --filter @agentmou/connectors typecheck
pnpm --filter @agentmou/connectors lint
pnpm --filter @agentmou/connectors test
```

## Related Docs

- [ADR-008: Connector OAuth Token Storage](../../docs/adr/008-connector-oauth-token-storage.md)
- [Architecture Overview](../../docs/architecture/overview.md)
