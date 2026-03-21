# Hybrid Agent + Workflow Skeleton

Use this skeleton when an installable agent should decide what to do first and
then hand a deterministic procedure to n8n.

This is the reference pattern for:

- agent decides
- workflow executes

## Directory Layout

- `agent/` contains the installable product-agent files
- `workflow/` contains the deterministic n8n workflow files

## Contract Between Both Halves

The agent manifest links the workflow through `runtime.linkedWorkflows`.
The workflow manifest exposes an event-style trigger.

Reference contract:

```json
{
  "event": "<domain.event.name>",
  "payload": {
    "entityId": "string",
    "decision": "string",
    "actionItems": ["string"],
    "requestedBy": "string"
  }
}
```

Keep the payload shape aligned across:

- the agent prompt output
- any dispatch code that emits the workflow event
- the workflow trigger expectations

## How Skills Should Use This Template

1. Copy the whole directory out of `templates/`.
2. Rename both IDs and keep `agent/runtime.linkedWorkflows` aligned with the
   workflow ID.
3. Replace every `<...>` placeholder in both halves.
4. Promote each half to its real runtime path only when the contract and
   validation steps are complete.

## Promotion Paths

- agent: `catalog/agents/<id>/`
- workflow: `workflows/public/<id>/`

Use both runbooks:

- [Agent Authoring and Promotion](../../docs/runbooks/agent-authoring-and-promotion.md)
- [Workflow Authoring and Promotion](../../docs/runbooks/workflow-authoring-and-promotion.md)
