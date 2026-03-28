# [Module Name]

[One-line description of what this module does]

## Purpose

[2-3 sentences explaining the module's role in the larger system. What problem does it solve? When is it used?]

## Public API

Functions and classes exported from this module.

### [Function/Class Name]

```typescript
[Signature]
```

[Brief description. What does it do? When would you use it?]

**Parameters:**
- `param1` (type): [Description]
- `param2` (type, optional): [Description]

**Returns:** [Description of return value]

**Throws:** [Any errors it might throw]

**Example:**
```typescript
const result = myFunction(arg1, arg2);
console.log(result); // Output: ...
```

---

### [Another Export]

[Repeat above structure]

## Configuration

Environment variables and config files used by this module.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| MY_CONFIG_VAR | Yes | none | What this configures |
| OPTIONAL_VAR | No | 'default' | What this configures |

[Or describe config files: "This module reads `config/database.json` at startup"]

## Usage Example

[Concrete example of how this module is typically used in the broader system]

```typescript
import { MyService } from './my-service';

const service = new MyService(config);
const result = await service.doSomething();
```

## Development

### Installation

```bash
cd [module-path]
npm install
```

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --watch       # Watch mode
npm run test:coverage     # With coverage report
```

**Test location:** `__tests__/` or `test/`

**Coverage target:** [X%]

### Building

```bash
npm run build             # Compile TypeScript
npm run build:watch       # Watch mode
```

**Output:** `dist/` or `lib/`

### Linting & Code Quality

```bash
npm run lint              # Check code style
npm run lint:fix          # Auto-fix issues
npm run type:check        # TypeScript checking
```

## Key Dependencies

External packages this module depends on.

| Package | Version | Purpose |
|---------|---------|---------|
| [package-name] | ^1.0.0 | What it's used for |

[Or list as prose: "This module uses `uuid` for generating IDs and `joi` for validation"]

## Architecture

[How is this module structured internally?]

### Layers

```
Public API (index.ts, exports)
    ↓
Business Logic (service.ts)
    ↓
Utilities & Helpers (utils.ts)
```

### File Structure

```
[module]/
├── index.ts           # Public exports
├── service.ts         # Main logic
├── types.ts           # TypeScript types
├── utils.ts           # Helpers
├── __tests__/         # Tests
└── README.md          # This file
```

## Configuration

[If this module needs configuration at startup]

```typescript
const config = {
  option1: 'value',
  option2: 42,
};

const service = new MyService(config);
```

**Configuration options:**
- `option1` (string, required): [What it does]
- `option2` (number, optional, default 10): [What it does]

## Error Handling

[What errors might this module throw and how should they be handled?]

**Custom errors:**
- `InvalidInputError` — When input validation fails
- `NotFoundError` — When a resource doesn't exist
- `UnauthorizedError` — When permission is denied

**Example:**
```typescript
try {
  await service.doSomething();
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Resource not found');
  }
}
```

## Testing Strategy

[How should this module be tested?]

### Unit Tests

Test individual functions in isolation.

```typescript
describe('MyService', () => {
  it('should create a valid item', async () => {
    const service = new MyService();
    const result = await service.create({ name: 'test' });
    expect(result.id).toBeDefined();
  });
});
```

### Integration Tests

Test this module with its dependencies (database, external services).

```typescript
describe('MyService integration', () => {
  it('should save and retrieve from database', async () => {
    const db = await setupTestDatabase();
    const service = new MyService(db);
    // ... test
  });
});
```

## Performance Considerations

[Is there anything developers should know about performance?]

- This module caches results in memory; cache can grow to X MB
- Database queries use indexes on [columns]; add indexes if schema changes
- The `slowOperation()` function is O(n²); avoid with large datasets

## Known Limitations

[What are the constraints or tradeoffs?]

- Currently single-threaded; doesn't use concurrency
- Works with PostgreSQL only (not MySQL)
- Doesn't handle timezone-aware dates

## Migration from Previous Version

[If applicable, how do you upgrade?]

**From v1.0 to v2.0:**
```typescript
// Old API
const service = new MyService();
service.setup();

// New API
const service = new MyService(config);
await service.initialize();
```

See [CHANGELOG.md](CHANGELOG.md) for migration details.

## Related Modules

Other modules that interact with this one:

- `[../other-module]` — Uses this module for X
- `[../another-module]` — Provides data to this module

## See Also

- [Repository Map](../REPO_MAP.md) — Overview of all modules
- [Architecture Overview](../ARCHITECTURE.md) — How this fits in the system
- [API Reference](../API.md) — REST endpoints that use this module (if applicable)
- [Troubleshooting](../TROUBLESHOOTING.md) — Common issues

## Contributing

If you modify this module:
1. Update tests in `__tests__/`
2. Update this README if exports or behavior change
3. Update `[../CHANGELOG.md](../CHANGELOG.md)`
4. Run `npm test && npm run lint` before submitting PR

## Open Questions

[Things that are unclear or under discussion]

- Should we support multiple concurrent operations?
- What's the performance target for large datasets?
