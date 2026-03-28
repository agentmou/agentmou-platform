# ADR-009: Clear Separation Between Developer Agents, Product Agents, and Deterministic Workflows

**Status**: accepted
**Date**: 2024-01-15

## Context

The platform uses AI agents in multiple contexts:
1. **Developer agents**: Assist contributors in development (code review, refactoring, testing)
2. **Product agents**: Run on behalf of tenants (email analysis, data extraction, automation)
3. **Deterministic workflows**: Multi-step automations in n8n (no LLM at each step)

These three use cases have different trust models, security requirements, and operational constraints:

- Developer agents can access the entire codebase and Git history (internal tools)
- Product agents can access only tenant data and connected services (customer credentials)
- Workflows are deterministic, no LLM reasoning (guaranteed reproducibility)

Blurring these boundaries creates security risks:
- A product agent accidentally accessing the codebase
- A developer agent running in production and consuming tenant data
- An LLM-based product agent hallucinating destructive actions

Clear separation enforces these boundaries at the architectural level.

## Decision

Three distinct agent surfaces, each with clear capabilities and trust boundaries:

### 1. Developer Agents
- **Purpose**: Assist contributors in development (code review, testing, refactoring)
- **Access**: Full codebase, Git history, development environment
- **LLM**: Unrestricted (GPT-4, Claude, etc.)
- **Execution**: Developer laptop or CI/CD pipeline during development
- **Trust model**: High (humans review agent suggestions before merging)
- **Examples**:
  - Analyze a PR diff and suggest improvements
  - Generate unit test coverage for new functions
  - Refactor code to match style guide

### 2. Product Agents
- **Purpose**: Run on behalf of tenants in production (email analysis, data extraction)
- **Access**: Tenant data, connected services (via OAuth credentials)
- **LLM**: Specialized for task (email analysis, feature extraction; not creative writing)
- **Execution**: `services/agents` Python sidecar, triggered by `services/worker`
- **Trust model**: Medium (tenant data may contain sensitive information; outputs are logged)
- **Examples**:
  - Analyze an email and extract key information
  - Summarize a document
  - Classify a support ticket

Product agents are implemented in Python (`services/agents`):
```python
# services/agents/main.py
@app.post("/api/v1/agents/email-analysis")
def analyze_email(request: EmailAnalysisRequest):
    # Use OpenAI API or local model for email analysis
    result = model.extract_entities(request.email_body)
    return result
```

### 3. Deterministic Workflows
- **Purpose**: Multi-step automations without LLM reasoning
- **Access**: Connected services (via OAuth credentials in n8n)
- **Logic**: Conditional branching, loops, data transformations (no LLM)
- **Execution**: n8n workflow instances, one per tenant
- **Trust model**: High (behavior is deterministic and auditable)
- **Examples**:
  - Receive email → extract data → create CRM entry → send Slack notification
  - Fetch data from source → transform → upload to destination
  - On approval → update status → notify user

Communication boundaries:
```
apps/web
  ↓ (user requests)
services/api
  ↓ (trigger agent)
services/worker
  ├→ (JSON request) services/agents (Python)
  │    (JSON response)
  │
  └→ (n8n API call) n8n
       (JSON state)
```

## Alternatives Considered

1. **Single agent type**: All use cases handled by a unified LLM agent
   - Pros: Simpler architecture, fewer systems
   - Cons: Harder to enforce security boundaries, easier for agents to misuse credentials

2. **LLM-driven workflows**: Every n8n step uses an LLM for reasoning
   - Pros: More flexibility, agents can adapt to edge cases
   - Cons: Non-deterministic (can produce different results for same input), expensive, harder to debug

3. **No product agents**: All analysis via workflows and rule engines
   - Pros: Pure determinism, predictable costs
   - Cons: Limited capability for complex analysis tasks, slower iteration on AI features

## Consequences

- **Three distinct execution surfaces**: More services to deploy and monitor, but clear responsibility separation.
- **Different security models**: Developer agents run trusted but isolated; product agents run untrusted but constrained.
- **Clear audit trail**: Each agent type leaves different logs. Debugging is straightforward.
- **Product agents in Python**: The agents sidecar is isolated from the main TypeScript codebase. AI library choices do not affect the main platform.
- **Workflows are deterministic**: Tenant workflows are reproducible, testable, and auditable. No hallucination risk.
- **Agent promotion**: Creating new agents involves deciding which surface: developer tool, product agent, or workflow.
- **Cost control**: Developer agents are used during development (small cost). Product agents and workflows run at tenant request (pay-per-use, controlled).

This separation enables safe, scalable use of AI throughout the platform without creating security or reliability issues.
