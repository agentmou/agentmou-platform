# Configuration Strategy

## Progressive Flow

1. Pick the node.
2. Pick the resource and operation.
3. Fill only the required fields.
4. Validate.
5. Add optional fields only after the minimal version is valid.

## When Dependencies Usually Appear

- method changes from `GET` to `POST`
- body sending gets enabled
- authentication mode switches
- resource/operation pair changes

## Best Default

Prefer the standard node-detail view first.

Only request a full schema or deeper property search when:

- the operation-specific field set is still unclear
- validation points to a field you cannot see yet
- a nested option is blocking completion
