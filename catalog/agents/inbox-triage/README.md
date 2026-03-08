# Inbox Triage Agent

Automatically categorize and prioritize incoming emails using AI.

## Features

- **Smart Categorization**: Automatically labels emails by priority and type
- **Action Suggestions**: Recommends actions (reply, delegate, archive, flag)
- **Response Drafts**: Generates draft responses for high-priority emails
- **Spam Detection**: Identifies and filters spam with high confidence

## Configuration

See `manifest.yaml` for agent configuration and `policy.yaml` for permissions.

## Usage

The agent runs automatically every 15 minutes and can also be triggered via webhook when new emails arrive.

## Development

To test locally:

```bash
pnpm --filter @agentmou/catalog-sdk test:agent inbox-triage
```

## Metrics

- Accuracy: ~92%
- Average processing time: 1.2s per email
- False positive rate: <3%
