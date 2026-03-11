# @agentmou/n8n-client

Thin TypeScript adapter for the n8n REST API.

## Purpose

`@agentmou/n8n-client` isolates raw HTTP calls to n8n behind a small typed
client. It is used by the API and worker services when they need to list,
import, activate, deactivate, export, or execute workflows in n8n.

## Usage

```typescript
import { N8nClient } from '@agentmou/n8n-client';

const client = new N8nClient(process.env.N8N_API_URL!, process.env.N8N_API_KEY!);
const workflows = await client.listWorkflows();
const execution = await client.executeWorkflow('workflow-id', { ticketId: '123' });
```

## Key Exports

- `N8nClient`
- `N8nWorkflow`
- `N8nExecutionResult`
- `N8nWorkflowExecution`
- `N8nWorkflowTrigger`

## Supported Operations

The current client provides helpers for:
- Listing workflows
- Fetching a single workflow
- Creating a workflow from raw JSON
- Activating and deactivating workflows
- Deleting workflows
- Executing workflows

## Configuration

`N8nClient` receives `baseUrl` and `apiKey` explicitly in its constructor.
In this repository, those values usually come from:

| Variable | Purpose |
| --- | --- |
| `N8N_API_URL` | Base URL for the n8n REST API |
| `N8N_API_KEY` | API key sent as `X-N8N-API-KEY` |

## Development

```bash
pnpm --filter @agentmou/n8n-client typecheck
pnpm --filter @agentmou/n8n-client lint
```

## Related Docs

- [ADR-007: n8n Workflow Provisioning](../../docs/adr/007-n8n-workflow-provisioning.md)
- [ADR-003: n8n Role](../../docs/adr/003-n8n-role.md)
