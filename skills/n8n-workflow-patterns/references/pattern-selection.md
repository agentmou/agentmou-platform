# Pattern Selection

Use this reference to decide whether the workflow should stay purely in n8n or
become a hybrid asset.

## Use Pure n8n When

- the steps are deterministic
- the branching logic is limited and explicit
- the workflow mainly coordinates APIs, schedules, webhooks, or service actions

## Use A Hybrid Pattern When

- the first step is ambiguous or judgment-heavy
- a product agent should decide what to do
- the remaining execution can still be deterministic

## Avoid Forcing n8n To Be The Product Runtime

In AgentMou:

- `n8n` is the deterministic workflow runtime
- `@agentmou/agent-engine` is the main runtime for installable product agents

That means the right answer is often:

```text
agent decides -> n8n executes
```

not:

```text
n8n AI node does everything
```
