# Testing Guide

This guide explains Agentmou's testing philosophy, structure, and best practices.

## Overview

Testing is essential for maintaining code quality and preventing regressions. Agentmou uses a **70/20/10 distribution**:

- **Unit tests (70%)** — Test individual functions, services, validators
- **Integration tests (20%)** — Test component interactions, API endpoints, database flows
- **E2E tests (10%)** — Test critical user journeys end-to-end

## Test Runners

### TypeScript/JavaScript

We use **Vitest** for all Node.js/TypeScript code:

```bash
pnpm test                       # Run all tests
pnpm test:watch                 # Watch mode
pnpm test:ui                    # UI dashboard
pnpm test -- --coverage         # Coverage report
```

**Configuration:**
- File location: `vitest.config.ts`
- Setup file: `vitest.setup.ts`
- Global test utils: `describe`, `it`, `expect`, `beforeEach`, `afterEach`
- Environment: Node.js (no jsdom)

### Python

We use **unittest** for the `services/agents` module:

```bash
pnpm test:agents                # Run Python tests
python3 -m unittest discover -s services/agents -p 'test_*.py'
```

**Requirements:**
- Python 3.12+
- Standard library `unittest`
- Mock using `unittest.mock`

## File Structure Conventions

### TypeScript

- **Unit tests** — Colocated with source or in `__tests__/` folder
  ```
  src/
  ├── utils.ts
  ├── __tests__/
  │   └── utils.test.ts
  ```

- **Integration tests** — In `__tests__/` with `.integration.ts` suffix
  ```
  src/
  ├── __tests__/
  │   ├── api.test.ts           # Unit
  │   └── api.integration.ts    # Integration
  ```

- **E2E tests** — In root `scripts/` or `tests/` folder
  ```
  scripts/
  └── test-e2e-triage.ts
  ```

### Python

- **Tests** — Prefix with `test_`
  ```
  services/agents/
  ├── main.py
  ├── test_main.py
  ├── email_analyzer.py
  ├── test_email_analyzer.py
  ```

## Naming Conventions

Test names should be **descriptive and specific**:

```typescript
// ❌ Bad
it('works', () => { ... });
it('should work correctly', () => { ... });

// ✅ Good
it('should parse valid JWT and return user claims', () => { ... });
it('should reject expired JWT with 401 error', () => { ... });
it('should encrypt plaintext with AES-256-GCM', () => { ... });
```

## AAA Pattern

Always structure tests with **Arrange-Act-Assert**:

```typescript
it('should calculate total price with tax', () => {
  // Arrange: Set up test data
  const item = { name: 'Widget', price: 100 };
  const taxRate = 0.1;

  // Act: Call the function
  const total = calculateTotal(item, taxRate);

  // Assert: Verify the result
  expect(total).toBe(110);
});
```

Benefits:
- Clear intent and flow
- Easy to identify what's being tested
- Simple to debug failures
- Reusable test data

## Testing Rules

### 1. One Assertion Concept Per Test

Each test should verify ONE thing. If you're testing multiple concepts, split into multiple tests:

```typescript
// ❌ Bad: Testing multiple concepts
it('should validate user schema', () => {
  const data = { name: 'John', email: 'john@example.com', age: 30 };
  expect(userSchema.parse(data)).toBeDefined();
  expect(data.name).toBe('John');
  expect(data.age).toBeGreaterThan(0);
});

// ✅ Good: One concept per test
it('should accept valid user data', () => {
  const data = { name: 'John', email: 'john@example.com', age: 30 };
  expect(userSchema.parse(data)).toBeDefined();
});

it('should reject user without email', () => {
  const data = { name: 'John', age: 30 };
  expect(() => userSchema.parse(data)).toThrow();
});

it('should reject negative age', () => {
  const data = { name: 'John', email: 'john@example.com', age: -5 };
  expect(() => userSchema.parse(data)).toThrow();
});
```

### 2. No Test Interdependence

Tests must run independently in any order. Don't share state:

```typescript
// ❌ Bad: Tests depend on each other
let user = {};
it('should create user', () => {
  user = { id: 1, name: 'John' };
  expect(user.id).toBe(1);
});
it('should have user from previous test', () => {
  expect(user.id).toBe(1);  // Depends on previous test
});

// ✅ Good: Tests are independent
it('should create user', () => {
  const user = { id: 1, name: 'John' };
  expect(user.id).toBe(1);
});
it('should create different user', () => {
  const user = { id: 2, name: 'Jane' };
  expect(user.id).toBe(2);
});
```

### 3. Deterministic Tests

Tests must produce consistent results every time. Avoid:
- Timestamps (use fixed dates)
- Random values (mock or seed)
- Timezone dependencies (use UTC)
- Network calls (mock them)

```typescript
// ❌ Bad: Non-deterministic
it('should create user with timestamp', () => {
  const user = createUser({ name: 'John', createdAt: new Date() });
  expect(user.createdAt).toBeDefined();  // Different each run
});

// ✅ Good: Deterministic
it('should create user with provided timestamp', () => {
  const fixedDate = new Date('2026-03-28T00:00:00Z');
  const user = createUser({ name: 'John', createdAt: fixedDate });
  expect(user.createdAt).toEqual(fixedDate);
});
```

### 4. Cleanup After Tests

Always clean up resources (database records, mocks, file handles):

```typescript
describe('User Service', () => {
  let db: Database;

  beforeEach(async () => {
    // Setup
    db = await connectDB();
  });

  afterEach(async () => {
    // Cleanup
    await db.disconnect();
  });

  it('should create user', async () => {
    const user = await db.users.create({ name: 'John' });
    expect(user.id).toBeDefined();
    // Database is cleaned after this test
  });
});
```

## Mocking Guidelines

### Mock at Boundaries

Mock external dependencies but test internal logic:

```typescript
// External dependencies
- Database queries
- HTTP requests
- File I/O
- System time
- Random number generation

// Internal logic to test
- Business logic
- Validation
- Error handling
- Transformations
```

### HTTP Mocking with MSW (Mock Service Worker)

For integration tests involving HTTP:

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.post('https://api.example.com/emails', () => {
    return HttpResponse.json({ id: '123', status: 'sent' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('should send email via API', async () => {
  const response = await sendEmail({ to: 'user@example.com' });
  expect(response.status).toBe('sent');
});
```

### Database Mocking

For unit tests that don't need real DB:

```typescript
import { vi } from 'vitest';

it('should handle database error gracefully', async () => {
  const mockDB = { query: vi.fn().mockRejectedValue(new Error('DB error')) };
  const result = await getUserById(1, mockDB);
  expect(result).toBeNull();
});
```

### Factories for Test Data

Use factories to create consistent test data:

```typescript
// Factory function
function createTestUser(overrides = {}) {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2026-03-28'),
    ...overrides,
  };
}

// Usage
it('should fetch user by ID', () => {
  const user = createTestUser({ id: '123', name: 'John' });
  expect(user.email).toBe('test@example.com');
});
```

## Test Categories

### Unit Tests

Test a single function or class in isolation.

```typescript
// packages/contracts/src/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { userSchema } from '../schemas';

describe('userSchema', () => {
  it('should validate email format', () => {
    const result = userSchema.safeParse({
      email: 'invalid-email',
      name: 'John',
    });
    expect(result.success).toBe(false);
  });

  it('should require name field', () => {
    const result = userSchema.safeParse({ email: 'john@example.com' });
    expect(result.success).toBe(false);
  });
});
```

**Example unit test locations:**
- `packages/contracts/src/__tests__/schemas.test.ts`
- `packages/auth/src/__tests__/auth.test.ts`
- `packages/connectors/src/__tests__/crypto.test.ts`

### Integration Tests

Test interactions between components or with external services.

```typescript
// services/api/src/modules/tenants/__tests__/tenants.service.integration.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenantService } from '../tenants.service';
import { testDB } from '../../../test-utils';

describe('TenantService (Integration)', () => {
  beforeAll(async () => {
    await testDB.connect();
  });

  afterAll(async () => {
    await testDB.disconnect();
  });

  it('should create and fetch tenant', async () => {
    const service = createTenantService(testDB);
    const tenant = await service.create({ name: 'Test Org' });
    const fetched = await service.getById(tenant.id);
    expect(fetched.name).toBe('Test Org');
  });
});
```

**Example integration test locations:**
- `services/api/src/modules/*/(__tests__|tests)/*.integration.ts`
- `packages/db/src/__tests__/schema.integration.ts`

### E2E Tests

Test complete user flows across the API and async workers.

```typescript
// scripts/test-e2e-triage.ts
const register = await fetch(`${API_URL}/api/v1/auth/register`, { method: 'POST', ... });
const install = await fetch(`${API_URL}/api/v1/tenants/${tenantId}/installations/packs`, {
  method: 'POST',
  ...
});
const installations = await pollForInstallations();
const agentInstallationId = installations.installations?.agents?.[0]?.id;
const run = await fetch(`${API_URL}/api/v1/tenants/${tenantId}/runs`, {
  method: 'POST',
  body: JSON.stringify({ agentInstallationId }),
});
```

**Example E2E / smoke script:**
- `scripts/test-e2e-triage.ts` — API-driven validation of the Gmail inbox triage slice
- `scripts/test-e2e-clinic-demo.ts` — fixture, seed, and in-process API smoke
  for the public clinic demo plus the seeded internal/clinic/fisio QA matrix

Run the clinic validation lane with:

```bash
pnpm validate:clinic-demo
```

This command runs migrations, seed, package checks for `db`/`api`/`web`, the
clinic + QA seed smoke script, and `make validate-content`. If `DATABASE_URL`
is not set, the helper starts the local Compose PostgreSQL service first.

## Coverage Expectations

Aim for these coverage minimums:

| Type | Coverage |
| ---- | -------- |
| Statements | 70%+ |
| Branches | 65%+ |
| Functions | 70%+ |
| Lines | 70%+ |

Check coverage:

```bash
pnpm test -- --coverage
```

**Don't optimize for coverage percentage alone.** Prioritize testing:
1. Happy paths
2. Error cases
3. Edge cases
4. Critical business logic

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Specific File

```bash
pnpm test packages/contracts
pnpm test -- utils.test.ts
```

### Watch Mode

Auto-rerun tests when files change:

```bash
pnpm test -- --watch
```

### UI Dashboard

Visual test runner:

```bash
pnpm test -- --ui
```

### Filter Tests

Run tests matching a pattern:

```bash
pnpm test -- --grep "should validate"
```

### Python Tests

```bash
pnpm test:agents
python3 -m unittest discover -s services/agents -p 'test_*.py' -v
```

## Common Testing Scenarios

### Testing Zod Validation

```typescript
it('should reject invalid email', () => {
  const result = emailSchema.safeParse('not-an-email');
  expect(result.success).toBe(false);
  expect(result.error?.issues[0].code).toBe('invalid_string');
});
```

### Testing Async Functions

```typescript
it('should fetch user asynchronously', async () => {
  const user = await getUserById('123');
  expect(user.name).toBe('John');
});
```

### Testing Error Handling

```typescript
it('should throw on invalid input', () => {
  expect(() => parseJSON('invalid')).toThrow(SyntaxError);
});

it('should reject promise on error', async () => {
  await expect(failingAsyncFunction()).rejects.toThrow('Expected error');
});
```

### Testing with Vitest Utilities

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log messages', () => {
    const logSpy = vi.spyOn(console, 'log');
    logger.info('test');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test'));
  });
});
```

## Before Merging a Pull Request

- [ ] All tests pass: `pnpm test`
- [ ] No test skips (`.skip`, `.todo`, `.only`)
- [ ] New code has tests (aim for >70% coverage)
- [ ] Tests are deterministic (run multiple times, same result)
- [ ] No hardcoded timeouts or flaky waits
- [ ] Mocks are cleaned up properly
- [ ] Test names are descriptive
- [ ] No console.logs or debugger statements
- [ ] Tests follow AAA pattern
- [ ] Database tests use transactions or cleanup

## Debugging Tests

### Run Single Test

```bash
pnpm test -- --reporter=verbose utils.test.ts
```

### Log Test Output

Add `console.log()` to see values (remove before committing):

```typescript
it('should calculate correctly', () => {
  const result = calculate(5, 3);
  console.log('Result:', result);  // temporary
  expect(result).toBe(8);
});
```

### Interactive Debugging

Run in watch mode with UI:

```bash
pnpm test -- --ui --watch
```

Then click on failed test to see details.

### Debug with Node Inspector

```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

Then open Chrome DevTools or VS Code debugger.

## Python Testing Example

```python
import unittest
from unittest.mock import patch, MagicMock
from email_analyzer import analyze_email

class TestEmailAnalyzer(unittest.TestCase):
    def test_should_classify_spam_email(self):
        # Arrange
        email = {
            "subject": "You have won!",
            "body": "Click here to claim prize"
        }

        # Act
        result = analyze_email(email)

        # Assert
        self.assertEqual(result['category'], 'spam')

    @patch('email_analyzer.openai_client')
    def test_should_handle_api_error(self, mock_client):
        # Mock OpenAI API error
        mock_client.side_effect = Exception('API Error')

        with self.assertRaises(Exception):
            analyze_email({'subject': 'Test'})

if __name__ == '__main__':
    unittest.main()
```

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library Best Practices](https://testing-library.com)
- [Python unittest Documentation](https://docs.python.org/3/library/unittest.html)
- [MSW (Mock Service Worker)](https://mswjs.io)

## Related Documents

- [Onboarding Guide](./onboarding.md) — Setup and first tasks
- [Architecture Overview](./architecture/overview.md) — System design
- [Troubleshooting](./troubleshooting.md) — Common issues and solutions
