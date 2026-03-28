# Testing Strategy & Guidelines

How we test [project name] — what to test, how to write tests, and coverage targets.

## Overview

We use a layered testing approach:

| Layer | Tool | Files | Purpose | Coverage Target |
|-------|------|-------|---------|-----------------|
| **Unit** | Jest | `__tests__/unit/` | Test individual functions in isolation | 85%+ |
| **Integration** | Jest | `__tests__/integration/` | Test modules working together | 75%+ |
| **End-to-End** | Playwright / Cypress | `e2e/` | Test full user workflows | 50%+ |

**Overall target:** 80%+ coverage on `src/`

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file change)
npm test -- --watch

# Run tests matching a pattern
npm test -- auth        # Runs tests in files containing "auth"

# Run with coverage report
npm run test:coverage

# Run a specific test file
npm test -- src/services/__tests__/user.test.ts
```

## Unit Tests

Test individual functions in isolation, with mocked dependencies.

**Where:** `src/[module]/__tests__/[module].unit.test.ts`

**Example:**
```typescript
// src/services/users/__tests__/users.unit.test.ts
import { UserService } from '../users';

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid email', () => {
      const user = UserService.createUser({
        email: 'alice@example.com',
        name: 'Alice',
      });

      expect(user.email).toBe('alice@example.com');
      expect(user.id).toBeDefined();
    });

    it('should throw error for invalid email', () => {
      expect(() => {
        UserService.createUser({
          email: 'invalid-email',
          name: 'Bob',
        });
      }).toThrow('Invalid email');
    });

    it('should hash password before storing', () => {
      const hashSpy = jest.spyOn(crypto, 'hash');
      const user = UserService.createUser({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'secret123',
      });

      expect(hashSpy).toHaveBeenCalledWith('secret123');
      hashSpy.mockRestore();
    });
  });
});
```

**Principles:**
- Test one thing per test
- Use clear test names describing the behavior
- Mock external dependencies (database, APIs, file system)
- Verify both success and error cases
- Use `jest.spyOn()` to verify function calls, not internal implementation

## Integration Tests

Test modules working together with real (test) dependencies.

**Where:** `src/[module]/__tests__/[module].integration.test.ts`

**Example:**
```typescript
// src/services/users/__tests__/users.integration.test.ts
import { UserService } from '../users';
import { setupTestDatabase, teardownTestDatabase } from '../../db/test-setup';

describe('UserService integration', () => {
  let db;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create and retrieve a user from database', async () => {
    const user = await UserService.createUser(db, {
      email: 'alice@example.com',
      name: 'Alice',
    });

    const retrieved = await UserService.getUser(db, user.id);
    expect(retrieved.email).toBe('alice@example.com');
  });

  it('should prevent duplicate emails', async () => {
    await UserService.createUser(db, {
      email: 'bob@example.com',
      name: 'Bob',
    });

    await expect(
      UserService.createUser(db, {
        email: 'bob@example.com',  // Duplicate
        name: 'Bob Junior',
      })
    ).rejects.toThrow('Email already exists');
  });
});
```

**Principles:**
- Use real test database (or in-memory db)
- Test realistic scenarios
- Verify database interactions
- Test error conditions
- Clean up data between tests

## API Tests

Test HTTP endpoints end-to-end without mocking the API layer.

**Where:** `test/api/[feature].test.ts`

**Example:**
```typescript
// test/api/users.test.ts
import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase } from '../../src/db/test-setup';

describe('POST /api/users', () => {
  let db;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create a user with valid input', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'alice@example.com',
        name: 'Alice',
        password: 'secret123',
      });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe('alice@example.com');
    expect(response.body.password).toBeUndefined(); // Never expose password
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'Bob',
        password: 'secret123',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('email is required');
  });

  it('should return 401 without authentication token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });
});
```

**Principles:**
- Test actual HTTP status codes
- Verify request/response format
- Test authentication and authorization
- Don't expose sensitive data in responses
- Test error responses (4xx, 5xx)

## Test Data & Fixtures

Use factories or fixtures for consistent test data.

**Factory pattern (preferred):**
```typescript
// src/db/test-setup.ts
export function createTestUser(overrides = {}) {
  return {
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-secret',
    ...overrides,
  };
}

// In tests
it('should create admin user', () => {
  const admin = createTestUser({ role: 'admin' });
  expect(admin.role).toBe('admin');
});
```

**Seed database (for integration tests):**
```typescript
beforeAll(async () => {
  const db = await setupTestDatabase();
  // Seed test data
  await db.User.create(createTestUser());
  await db.Task.create({ title: 'Test task', userId: 1 });
});
```

## Coverage Requirements

| Module Type | Minimum Coverage | Why |
|-------------|-----------------|-----|
| Services (business logic) | 85%+ | Core functionality, complex logic |
| API handlers | 80%+ | Request handling, error cases |
| Database models | 70%+ | Schema definitions, basic methods |
| Utils/Helpers | 90%+ | Used everywhere, should be reliable |
| Complex algorithms | 95%+ | Hard to debug, needs thorough testing |

**Check coverage:**
```bash
npm run test:coverage
```

Look for:
- Red lines (not covered) in key modules
- Overall coverage > 80%
- Branches covered (not just lines)

## What NOT to Test

- **Third-party libraries** — Assume they work; only test integration with them
- **Database library internals** — Test your queries, not the ORM implementation
- **External APIs** — Mock them; don't call real APIs in tests
- **Trivial getters/setters** — Unless they have logic
- **Auto-generated code** — Usually not needed

## What TO Test

- **Business logic** — All branches and edge cases
- **Error handling** — What happens when things go wrong?
- **Data validation** — Reject invalid input
- **Authorization** — Who's allowed to do what?
- **Integration points** — How modules work together
- **Edge cases** — Empty lists, null values, max values

## Testing Best Practices

### Naming Convention

Test names should describe behavior, not implementation:

```typescript
// Good
it('should prevent creating user with duplicate email')
it('should return 401 for expired token')
it('should handle concurrent requests without race condition')

// Bad
it('test user creation')
it('test token')
it('test race condition')
```

### Arrange-Act-Assert Pattern

```typescript
it('should update user name', () => {
  // Arrange: Set up test data
  const user = { id: 1, name: 'Alice' };

  // Act: Execute the code
  const updated = UserService.updateName(user, 'Bob');

  // Assert: Verify the result
  expect(updated.name).toBe('Bob');
  expect(updated.id).toBe(1); // Verify unchanged fields
});
```

### Isolation

Each test should be independent:

```typescript
// Good: Each test runs in isolation
describe('Authentication', () => {
  beforeEach(async () => {
    // Fresh state for each test
    await clearTestDatabase();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ }); // Not affected by test 1
});

// Bad: Tests depend on each other
describe('Authentication', () => {
  it('login', () => {
    // Sets up state
  });

  it('logout', () => {
    // Depends on login() having run first
  });
});
```

### Avoid Testing Implementation Details

```typescript
// Bad: Tests implementation (calling internal function)
it('should call validateEmail internally', () => {
  const spy = jest.spyOn(validation, 'validateEmail');
  UserService.createUser(...);
  expect(spy).toHaveBeenCalled();
});

// Good: Tests behavior
it('should reject invalid email', () => {
  expect(() => {
    UserService.createUser({ email: 'invalid' });
  }).toThrow('Invalid email');
});
```

## Mocking & Spying

### Mocking External Dependencies

```typescript
// Mock an external API
jest.mock('../external-api', () => ({
  fetchWeather: jest.fn().mockResolvedValue({ temp: 72 }),
}));

import { fetchWeather } from '../external-api';

it('should fetch weather data', async () => {
  const weather = await fetchWeather('NYC');
  expect(weather.temp).toBe(72);
});
```

### Spying on Functions

```typescript
it('should call callback when done', () => {
  const callback = jest.fn();

  myFunction(callback);

  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith('expected-arg');
});
```

### Mocking Database

```typescript
// Mock Sequelize model
jest.mock('../db/models/User', () => ({
  create: jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
  findById: jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
}));
```

## Common Issues & Debugging

### Test Timeout

```typescript
// Increase timeout for slow tests
it('should process large dataset', async () => {
  // ... test
}, 10000); // 10 second timeout (default is 5s)
```

### Flaky Tests (Intermittently Fail)

Usually caused by:
- Race conditions
- Timing assumptions
- Shared state between tests
- External service dependencies

**Fix:**
- Use proper async/await
- Clean up between tests with `afterEach()`
- Don't rely on timing
- Mock external services

### Debugging Tests

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open chrome://inspect
```

Or add `debugger` statement and use `--inspect-brk`.

## CI/CD Integration

Tests run automatically on:
- Every PR (blocking merge if they fail)
- Merge to main (gate for production deployment)
- Scheduled nightly (slower E2E tests)

**See:** `.github/workflows/test.yml` for CI configuration

## Test Review Checklist

When reviewing a PR with test changes:

- [ ] Tests describe behavior, not implementation
- [ ] Good test coverage (aim for >80%)
- [ ] Tests are deterministic (always pass or fail, never flaky)
- [ ] No hardcoded test data (use factories)
- [ ] Tests are isolated (don't depend on each other)
- [ ] Error cases are tested
- [ ] Mocks are appropriate (not over-mocked)
- [ ] Test names are clear

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/) — For React/component testing
- [Supertest](https://github.com/visionmedia/supertest) — HTTP assertion library
- [Effective JavaScript Testing](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Questions?** Ask in #project-name or see the [CONTRIBUTING.md](../CONTRIBUTING.md) guide.

**Last updated:** [DATE]
