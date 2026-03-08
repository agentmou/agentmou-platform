# Auto Label Gmail Messages

Automatically categorize and label incoming Gmail messages using AI.

## Overview

This workflow monitors your Gmail inbox and automatically applies labels to incoming messages based on their content and intent.

## Features

- Automatic email categorization (support, sales, general, spam)
- Priority-based labeling (high, medium, low)
- Optional CRM activity logging for sales-related emails
- Configurable label mapping

## Setup

1. Configure Gmail credentials in n8n
2. Map labels in the workflow settings
3. Activate the workflow

## Configuration

Edit `manifest.yaml` to customize:
- Trigger frequency
- Agent configuration
- Label mappings

## Testing

Run the workflow manually in n8n to test with sample emails.

See `fixtures/` for test data.

## Dependencies

- Gmail connector
- Inbox Triage agent
- Optional: Salesforce connector

## Troubleshooting

Check the execution history in n8n for any errors or failed runs.
