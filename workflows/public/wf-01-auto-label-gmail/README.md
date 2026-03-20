# Auto Label Gmail Messages

Automatically categorize and label incoming Gmail messages using AI.

## Overview

This repository stores one canonical workflow template in Git. Each tenant installation provisions its own runtime copy in the shared n8n instance and records the resulting `n8nWorkflowId` in `workflow_installations`.

## Runtime Model

- `workflows/public/wf-01-auto-label-gmail/workflow.json` is the sanitized template tracked in Git.
- Installing the template creates a tenant-scoped runtime copy in n8n. We do not store one JSON per tenant in the repository.
- Runtime executions and lifecycle state live in n8n, BullMQ, Postgres, and logs, not in Git.

## Credential Strategy

This workflow is a documented `n8n_native_exception`.

- The default product rule is `platform_managed` credentials through AgentMou connectors and services.
- This specific workflow still uses n8n-native Gmail nodes at runtime because Gmail trigger/action nodes require native n8n credentials today.
- The exception applies only to runtime binding. The repository still stores a sanitized template with no tenant secrets.

## Authoring Rules

When editing this workflow:

1. Prototype in n8n or through MCP if that is faster.
2. Export the workflow JSON.
3. Remove create-invalid or environment-specific fields before committing.
4. Update `manifest.yaml` and this README in the same change.

## Testing

Install the workflow into a disposable tenant, confirm it provisions a distinct `n8nWorkflowId`, run it once, and verify cleanup through uninstall or the guarded validation-fixture cleanup path.

## Related Components

- Companion agent template: `catalog/agents/inbox-triage/`
- Provisioning path: `services/api` and `services/worker`
- Runtime engine: shared n8n instance behind `@agentmou/n8n-client`
