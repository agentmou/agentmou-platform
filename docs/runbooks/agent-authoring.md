# Agent and Workflow Authoring Guide

This runbook covers creating new agents, writing prompts, defining policies, testing locally, and promoting them to the catalog.

## Overview

Agents and workflows in Agentmou are organized in the catalog:

```
catalog/
  agents/
    email-classifier/
      manifest.yaml
      prompt.md
      policy.yaml
      README.md
  workflows/
    email-to-crm/
      manifest.yaml
      prompt.md
      README.md
```

Each agent has:
- **manifest.yaml**: Metadata, availability tier, categories, inventory layers
- **prompt.md**: The LLM system prompt (for agents) or workflow description (for workflows)
- **policy.yaml**: Capabilities, constraints, and approval requirements
- **README.md**: User-facing documentation

---

## Creating an Agent

### 1. Choose Agent Type

Agents run in the Python sidecar (`services/agents`). Use agents for:
- **Email analysis**: Extract key information, classify importance
- **Text processing**: Summarization, sentiment analysis, feature extraction
- **AI reasoning**: Tasks requiring LLM inference

For deterministic multi-step automation, use **workflows** (in n8n) instead.

### 2. Create Agent Directory

```bash
# Navigate to the catalog
cd catalog/agents

# Create a new directory (use kebab-case)
mkdir -p my-agent

cd my-agent
```

### 3. Create manifest.yaml

```yaml
# manifest.yaml
metadata:
  name: my-agent
  displayName: My Awesome Agent
  description: A brief description of what this agent does
  version: "1.0.0"
  author: Your Name
  category: analysis

availability:
  tier: preview  # planned, preview, or available
  releasedAt: 2024-03-28

inventory:
  operational: false   # Not ready for tenants yet
  demo: true          # Available in internal demo
  marketing: false    # Don't feature on marketing site yet

capabilities:
  - email_analysis
  - text_classification

constraints:
  - max_email_length: 10000
  - supported_languages:
    - en
    - es

requires_approval:
  - export_data      # Actions that require human approval

integration:
  type: rest
  method: POST
  endpoint: /api/v1/agents/my-agent
  auth: api_key
```

### 4. Create prompt.md

The prompt file is the system instruction for the LLM. Be detailed and clear.

```markdown
# My Agent Prompt

You are an AI assistant specialized in email analysis.

## Your Role
You analyze emails and extract key information: sender, subject, intent, and priority.

## Instructions

1. Read the email carefully
2. Identify the sender's intent (question, statement, request, etc.)
3. Classify the email as:
   - HIGH: Urgent, requires immediate attention
   - MEDIUM: Standard request or question
   - LOW: Informational, no action required
4. Extract up to 5 key entities (persons, organizations, topics)

## Output Format

Respond in JSON:
\`\`\`json
{
  "sender": "sender@example.com",
  "intent": "request for information",
  "priority": "HIGH",
  "summary": "Brief summary of the email",
  "key_entities": ["Entity 1", "Entity 2"],
  "action_items": ["Action 1", "Action 2"],
  "confidence": 0.95
}
\`\`\`

## Constraints

- Never make assumptions about sender identity
- If content is unclear, respond with uncertainty (confidence < 0.8)
- Do not classify personal emails as business-critical
- Respect privacy: do not extract sensitive personal information

## Examples

### Example 1: High Priority

Email: "We have a critical bug in production affecting 50% of users. Need immediate hotfix."
Classification: HIGH

### Example 2: Low Priority

Email: "Just wanted to say hello!"
Classification: LOW
```

### 5. Create policy.yaml

Define what the agent can and cannot do.

```yaml
# policy.yaml
name: my-agent-policy
version: "1.0.0"

capabilities:
  - read_emails
  - classify_content
  - extract_entities

forbidden_actions:
  - delete_emails
  - modify_emails
  - send_emails
  - access_other_tenant_data

rate_limits:
  requests_per_minute: 30
  max_tokens_per_request: 2000

data_retention:
  store_results: true
  retain_for_days: 90

audit:
  log_all_invocations: true
  log_inputs: true
  log_outputs: true

approvals:
  required_for:
    - export_to_external_service
    - store_in_database
  approval_timeout_hours: 24
```

### 6. Create README.md

User-facing documentation.

```markdown
# My Agent

An AI agent that analyzes emails and extracts key information.

## What It Does

- Reads incoming emails
- Classifies by priority (HIGH, MEDIUM, LOW)
- Extracts key entities and action items
- Returns structured data in JSON

## Use Cases

- **Inbox Triage**: Automatically categorize incoming emails
- **Ticket Extraction**: Extract support requests from customer emails
- **Priority Filtering**: Focus on high-priority messages

## Input

Raw email content (text or HTML)

## Output

JSON object with:
- `intent`: Sender's intent
- `priority`: HIGH, MEDIUM, or LOW
- `summary`: Brief summary
- `key_entities`: Extracted entities
- `action_items`: Actions mentioned
- `confidence`: 0.0 to 1.0

## Example

**Input:**
```
From: customer@example.com
Subject: Urgent: Account Access Issue

Hi, I can't log into my account. This is blocking my work. Please help ASAP.
```

**Output:**
```json
{
  "sender": "customer@example.com",
  "intent": "request for help",
  "priority": "HIGH",
  "summary": "Customer unable to log in",
  "key_entities": ["account", "login issue"],
  "action_items": ["verify account status", "reset password or investigate"],
  "confidence": 0.98
}
```

## Limitations

- Only analyzes English emails (Spanish support coming soon)
- Max 10,000 characters per email
- Response time: typically <2 seconds

## Support

For issues, contact support@agentmou.io
```

### 7. Implement the Agent (services/agents)

The agent must have a corresponding endpoint in `services/agents/main.py`:

```python
# services/agents/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class EmailAnalysisRequest(BaseModel):
    email_body: str
    sender: str = None

class EmailAnalysisResponse(BaseModel):
    intent: str
    priority: str
    summary: str
    key_entities: list[str]
    action_items: list[str]
    confidence: float

@app.post("/api/v1/agents/my-agent")
def analyze_email(request: EmailAnalysisRequest) -> EmailAnalysisResponse:
    """Analyze an email and extract key information."""
    # TODO: Implement using OpenAI API or local model
    result = {
        "intent": "request for information",
        "priority": "HIGH",
        "summary": "Customer has an account issue",
        "key_entities": ["account", "login"],
        "action_items": ["investigate account", "respond to customer"],
        "confidence": 0.95
    }
    return EmailAnalysisResponse(**result)
```

---

## Creating a Workflow

Workflows are deterministic multi-step automations in n8n.

### 1. Create Workflow Directory

```bash
cd catalog/workflows
mkdir -p email-to-crm
cd email-to-crm
```

### 2. Create manifest.yaml

```yaml
# manifest.yaml
metadata:
  name: email-to-crm
  displayName: Email to CRM Sync
  description: Automatically log emails to CRM when certain conditions are met
  version: "1.0.0"

availability:
  tier: available
  releasedAt: 2024-03-28

inventory:
  operational: true   # Tenants can install this
  demo: true
  marketing: true

trigger:
  type: email         # Trigger when an email arrives
  source: gmail       # Via Gmail connector

steps:
  - parse_email       # Extract information from email
  - create_crm_entry  # Add to CRM
  - send_notification # Notify user

integrations_required:
  - gmail
  - hubspot_crm

approval_gates:
  - requires_confirmation_before_crm_write
```

### 3. Create prompt.md

For workflows, the prompt describes the workflow logic:

```markdown
# Email to CRM Workflow

This workflow automatically syncs emails to your CRM.

## Trigger

An email arrives in Gmail labeled "sales" or "customer".

## Steps

1. **Parse Email**: Extract sender, subject, and body
2. **Check CRM**: Search for existing contact
3. **Create or Update**: Add new contact or update existing
4. **Send Confirmation**: Email the user that record was created

## Conditions

- Only process emails from external senders
- Skip internal emails (from company domain)
- Create new contact if none exists
- Update contact if found

## Error Handling

- If CRM write fails, send alert email
- If contact already exists, skip creation (only update notes)
- If sender is internal, delete from queue

## Expected Behavior

- New customer email arrives
- Workflow runs (typically <10 seconds)
- Contact appears in CRM within 1 minute
- User receives confirmation email
```

### 4. Create README.md

```markdown
# Email to CRM Workflow

Automatically log incoming emails to your CRM system.

## What It Does

1. **Monitors Gmail**: Listens for emails labeled "sales" or "customer"
2. **Parses Information**: Extracts sender, subject, and body
3. **Syncs to CRM**: Creates or updates a contact record
4. **Notifies User**: Sends confirmation that record was created

## Setup

1. Install the workflow
2. Connect your Gmail account (OAuth)
3. Connect your CRM account (HubSpot, Salesforce, etc.)
4. Label incoming emails as "sales" or "customer"
5. Workflow runs automatically

## Customization

Edit the workflow in the n8n editor to:
- Change trigger labels
- Add additional fields
- Modify sync logic
- Add more steps (Slack notification, etc.)

## Execution

- Runs automatically when trigger conditions are met
- Typically completes within 10 seconds
- Execution logs visible in control plane

## Support

For help, contact support@agentmou.io
```

---

## Testing Locally

### 1. Test an Agent Locally

For Python agents, test the endpoint:

```bash
# Start local services
pnpm dev

# In another terminal, test the agent
curl -X POST http://localhost:3002/api/v1/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{
    "email_body": "We have a critical issue in production. Need help ASAP.",
    "sender": "customer@example.com"
  }'

# Expected response:
# {
#   "intent": "request for help",
#   "priority": "HIGH",
#   "summary": "Customer reports critical production issue",
#   "key_entities": ["production", "issue"],
#   "action_items": ["investigate", "respond"],
#   "confidence": 0.98
# }
```

### 2. Test a Workflow Locally

For workflows in n8n:

1. **Access n8n UI**: Navigate to http://localhost:5678
2. **Create a test workflow**: Copy and modify an existing workflow
3. **Set test data**: Provide sample trigger data
4. **Execute**: Run the workflow and check output
5. **Debug**: Review execution logs for errors

### 3. Unit Tests for Agents

Create tests for agent logic:

```python
# services/agents/test_my_agent.py
import unittest
from main import analyze_email, EmailAnalysisRequest

class TestMyAgent(unittest.TestCase):
    def test_high_priority_email(self):
        request = EmailAnalysisRequest(
            email_body="Critical production issue. Need immediate help.",
            sender="ops@example.com"
        )
        result = analyze_email(request)
        self.assertEqual(result.priority, "HIGH")
        self.assertGreater(result.confidence, 0.8)

    def test_low_priority_email(self):
        request = EmailAnalysisRequest(
            email_body="Just saying hello!",
            sender="friend@example.com"
        )
        result = analyze_email(request)
        self.assertEqual(result.priority, "LOW")

if __name__ == '__main__':
    unittest.main()
```

Run tests:

```bash
pnpm test:agents
```

---

## Promoting to Operational Catalog

Once tested and approved, promote the agent to the operational catalog (available to tenants).

### 1. Update manifest.yaml

```yaml
availability:
  tier: available        # Change from preview to available
  releasedAt: 2024-03-28

inventory:
  operational: true      # Enable for tenant installations
  demo: true
  marketing: true        # Enable for marketing site
```

### 2. Verify Metadata

```bash
# Run catalog validation
pnpm demo-catalog:generate
pnpm demo-catalog:check

# Ensure tests pass
pnpm test
pnpm test:agents
pnpm typecheck
```

### 3. Submit PR

Commit and push the new agent:

```bash
git add catalog/agents/my-agent/
git commit -m "feat: add my-agent for email analysis"
git push origin feature/my-agent
```

Create a pull request with:
- What the agent does
- Example use cases
- Testing performed
- any special requirements (API keys, credentials, etc.)

### 4. Deploy to Production

Once PR is merged to main:

```bash
# On the VPS
bash infra/scripts/deploy-prod.sh
```

The agent is now available in the operational catalog.

---

## Catalog Structure Reference

### Availability Tiers

- **Planned**: Roadmap-only, no code
- **Preview**: Functional but beta, limited support
- **Available**: Production-ready, fully supported

### Inventory Layers

- **operational**: Visible to tenants for installation
- **demo**: Visible in internal demo for testing
- **marketing**: Can be featured on marketing website

### Categories

Common agent categories:
- `analysis`: Analyze content (email, text, sentiment)
- `extraction`: Extract structured data from unstructured content
- `classification`: Classify items into categories
- `transformation`: Transform or format data
- `integration`: Integrate with external services
- `notification`: Send alerts or notifications

### Integration Types

- `rest`: REST API endpoint
- `workflow`: n8n workflow (deterministic)
- `scheduled`: Time-based trigger (cron)
- `event`: Event-driven (webhook)

---

## Best Practices

1. **Clear naming**: Use descriptive kebab-case names (my-email-agent, not my_agent or MyAgent)
2. **Comprehensive prompts**: System prompts should be detailed and include examples
3. **Example outputs**: Provide sample input/output in README
4. **Error handling**: Define behavior for edge cases (invalid input, API errors)
5. **Rate limits**: Set realistic limits in policy.yaml
6. **Approval gates**: Use approval requirements for sensitive operations
7. **Documentation**: Keep README and prompts up to date
8. **Testing**: Test with real-world examples before promotion
9. **Versioning**: Increment version in manifest when making changes
10. **Deprecation**: Mark old agents as deprecated before removal

---

## Related Documentation

- [Local Development Setup](./local-development.md): Setting up your environment
- [ADR-009: Agent Surface Boundaries](../adr/009-ai-surface-boundaries.md): Agent types and trust models
- [ADR-010: Catalog Availability Tiers](../adr/010-catalog-availability-tiers.md): Catalog structure
