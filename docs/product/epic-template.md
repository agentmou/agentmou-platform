# Epic Template

Use this template for any new epic derived from
[`platform-context-v2.md`](../architecture/platform-context-v2.md).

```markdown
# Epic Title

**Status**: proposed | in progress | completed

## Problem Source

Reference the exact section or sections in `platform-context-v2.md` that justify
the epic.

## Objective

Describe the truth this epic restores or the concrete gap it closes.

## In Scope

- List the contracts, pages, services, or docs that belong to the epic.

## Out Of Scope

- Explicitly exclude opportunistic cleanup or adjacent feature work.

## Dependencies

- Identify upstream tracks or epics that must land first.

## Public APIs / Types

- State whether public routes, shared contracts, or response shapes change.
- If routes stay stable, say so explicitly.

## PR Sequence

### PR 1 - Title
- What changes
- What stays stable
- What is validated in this PR

### PR 2 - Title
- What changes
- What stays stable
- What is validated in this PR

## Validation

- Commands
- User flows
- Failure scenarios or edge cases

## Exit Criteria

- Concrete evidence that the epic is complete
```

## Additional Rules

- Keep epics outcome-based, not file-inventory-based.
- Reference real files only when they are needed to disambiguate behavior.
- Keep PR sequences small enough that each PR can be reviewed and reverted
  independently.
- If the epic changes shared contracts, include both producer and consumer
  validation.
