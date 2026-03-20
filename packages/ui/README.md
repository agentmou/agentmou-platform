# @agentmou/ui

Small shared React UI package for reusable primitives.

## Purpose

`@agentmou/ui` is a placeholder workspace for design-system components that may
be shared across applications. At the moment it exports only a few minimal
primitives and is much smaller than the richer component set that currently
lives inside `apps/web`.

## Current Scope

The package currently exposes:
- `Button`
- `Card`
- `CardHeader`
- `CardContent`

This makes it suitable for lightweight shared UI usage, but it is not yet the
primary component source for the web app.

## Usage

```tsx
import { Button, Card, CardHeader, CardContent } from '@agentmou/ui';

export function ExampleCard() {
  return (
    <Card>
      <CardHeader>Shared UI</CardHeader>
      <CardContent>
        <Button variant="primary">Run action</Button>
      </CardContent>
    </Card>
  );
}
```

## Key Exports

- `Button`
- `Card`
- `CardHeader`
- `CardContent`

## Configuration

This package has no runtime environment variables.

## Development

```bash
pnpm --filter @agentmou/ui typecheck
pnpm --filter @agentmou/ui lint
```

## Related Docs

- [Web App Architecture](../../docs/architecture/apps-web.md)
- [Repository Map](../../docs/repo-map.md)
