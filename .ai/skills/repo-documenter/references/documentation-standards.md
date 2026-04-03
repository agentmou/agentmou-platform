# Documentation Standards & Guidelines

This document defines the quality bar for all repository documentation. Use these standards to write clear, maintainable, and useful documentation.

---

## Required Documentation Artifacts

Every repository should have these core documentation pieces. If your repo doesn't need one, explicitly document why (e.g., "This is a library, not a service, so no deployment runbook").

| Artifact | Purpose | Location | Who Reads | Urgency |
| ---------- | --------- | ---------- | ----------- | --------- |
| **Root README** | Repo purpose, tech stack, quick start | `/README.md` | Everyone | Critical |
| **Architecture Overview** | System design, layers, data flow, external integrations | `/docs/ARCHITECTURE.md` | Developers, Architects | Critical |
| **Module/Package READMEs** | Purpose, exports, configuration, development | Each module's `README.md` | Developers working in that module | High |
| **Public API Documentation** | REST endpoints, request/response, examples, authentication | TSDoc/JSDoc + `/docs/API.md` or generated docs | API consumers | High |
| **Onboarding Guide** | How to set up dev environment, run tests, deploy locally | `/docs/ONBOARDING.md` or `/GETTING_STARTED.md` | New team members | Critical |
| **Deployment Runbook** | How to deploy to staging/prod, rollback, troubleshoot | `/docs/DEPLOYMENT.md` or `/docs/ops/runbook.md` | DevOps/SRE/On-call | Critical |
| **Architecture Decision Records** | Major design decisions, tradeoffs, context | `/docs/adr/YYYYMMDD-slug.md` | Decision stakeholders, future reviewers | High |
| **Testing Strategy** | Test framework, coverage expectations, testing patterns | `/docs/TESTING.md` | QA, developers | Medium |
| **Environment Variables** | All configurable vars, defaults, required, purpose | `/docs/ENV_VARIABLES.md` or `.env.example` | Operators, developers | High |
| **Contributing Guidelines** | Code style, PR process, commit messages | `/CONTRIBUTING.md` | Contributors | Medium |
| **Troubleshooting Guide** | Common errors, debugging steps, support contacts | `/docs/TROUBLESHOOTING.md` | On-call, support | Medium |
| **Glossary** | Acronyms, domain terms, abbreviations | `/docs/GLOSSARY.md` (if needed) | Everyone | Low |

---

## Code-Level Documentation Rules

Documentation in code (comments, TSDoc, JSDoc) follows different rules than prose documentation.

### When Comments Are Required

Use comments for:
- **WHY decisions**, not WHAT the code does
  ```javascript
  // Good: Explains the why
  // Retry with exponential backoff because AWS SQS can be slow to process
  // messages during high load. Linear retry didn't meet SLA.
  const backoffMs = Math.pow(2, attempt) * 100;

  // Bad: Restates code
  // Multiply attempt by 2 and multiply by 100
  const backoffMs = Math.pow(2, attempt) * 100;
  ```

- **Non-obvious logic or hacks**
  ```javascript
  // Edge case: If startDate equals endDate, we need to add 1ms to make the range valid
  // for the query builder. See issue #1234.
  const actualEnd = startDate === endDate ? new Date(endDate.getTime() + 1) : endDate;
  ```

- **Warnings about performance or side effects**
  ```python
  # WARNING: This query is O(n²) and locks the table for 30+ seconds.
  # Only run during maintenance window. See ADR-20240315-batch-processing
  def recalculate_all_stats():
  ```

- **External references (issues, docs, specs)**
  ```typescript
  // See RFC-3339 for timestamp format https://tools.ietf.org/html/rfc3339
  // Also documented in docs/API.md under "Timestamp Format"
  const isoTimestamp = new Date().toISOString();
  ```

### When Comments Are NOT Required

Don't comment obvious code:
```javascript
// Bad: Redundant comment
const name = user.name; // Get the name from user

// Good: No comment needed
const name = user.name;
```

### TSDoc/JSDoc for Public Exports

All public APIs must have TSDoc or JSDoc. Private/internal code is optional (though helpful).

**TypeScript/JavaScript:**
```typescript
/**
 * Calculates the total price including tax.
 *
 * @param basePrice - The price before tax, in dollars
 * @param taxRate - The tax rate as a decimal (0.08 for 8%)
 * @returns The total price including tax
 * @throws {Error} If basePrice or taxRate is negative
 *
 * @example
 * const total = calculateTotal(100, 0.08); // Returns 108
 */
export function calculateTotal(basePrice: number, taxRate: number): number {
  if (basePrice < 0 || taxRate < 0) {
    throw new Error("Price and tax rate must be non-negative");
  }
  return basePrice * (1 + taxRate);
}
```

**Python (Google Style):**
```python
def calculate_total(base_price: float, tax_rate: float) -> float:
    """
    Calculate the total price including tax.

    Args:
        base_price: The price before tax, in dollars.
        tax_rate: The tax rate as a decimal (0.08 for 8%).

    Returns:
        The total price including tax.

    Raises:
        ValueError: If base_price or tax_rate is negative.

    Example:
        >>> calculate_total(100, 0.08)
        108.0
    """
    if base_price < 0 or tax_rate < 0:
        raise ValueError("Price and tax rate must be non-negative")
    return base_price * (1 + tax_rate)
```

### Keeping Docs in Sync with Code

- **Update comments in the same PR as code changes.** Dead comments are worse than no comments.
- **If you find a stale comment, remove or fix it immediately.** Don't leave it as evidence of decay.
- **Link to source:** If a doc references code, quote the file path: "See `src/handlers/auth.ts` for the login flow."

---

## Architecture Decision Record (ADR) Format

Use this template for documenting significant architectural decisions.

```markdown
# ADR-YYYYMMDD: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-20240320]

## Context
[What problem were we trying to solve? What constraints did we have?
Who needed to be involved? What were the alternatives?]

## Decision
[What did we decide to do? Why this option?
What tradeoffs are we making?]

## Consequences
[What are the implications of this decision?
Benefits? Risks? What will be harder/easier going forward?]

## Alternatives Considered
- [Option A - Why rejected]
- [Option B - Why rejected]

## References
[Links to issues, RFCs, external docs, related ADRs]
```

**Example:**
```markdown
# ADR-20240315: Migrate from REST to GraphQL for Public API

## Status
Accepted

## Context
Our REST API has grown to 40+ endpoints with deeply nested resource fetching.
Clients often need to make 5-10 requests to hydrate a single page.
This causes frontend performance issues and confuses API consumers.

## Decision
We will migrate to a GraphQL API over the next 2 quarters.
The REST API will be deprecated but supported for 6 months.
All new features will use GraphQL first.

## Consequences
- Better frontend performance (fewer requests, exact field fetching)
- Steeper learning curve for clients unfamiliar with GraphQL
- Will require caching strategy (N+1 prevention)
- Database query optimization becomes critical
- Tooling overhead (GraphQL server, schema generation)

## Alternatives Considered
- REST with JSON:API spec - Would reduce endpoints but still verbose
- gRPC - Better performance but worse for browser clients
- Stay with REST - Would continue performance issues

## References
- Issue #4521: API performance complaints
- https://github.com/graphql/graphql-spec
- ADR-20230401: Client architecture (depends on this decision)
```

---

## Package/Module README Requirements

Every top-level module or package should have a README.md at its root. This keeps documentation close to code.

```markdown
# [Module Name]

[One-line description of what this module does]

## Purpose
[2-3 sentences explaining the module's role in the larger system]

## Public API

[List exported functions, classes, constants]

### [Function/Class Name]
```
[Signature with types]
```
[Brief description and usage]

```javascript
// Example
const result = myFunction(arg1, arg2);
```

## Configuration

[Any environment variables, config files, or runtime settings]

- `MY_CONFIG_VAR` (required): Description
- `MY_OPTIONAL_VAR` (optional, default: value): Description

## Development

[How to work on this module]

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Build
npm run build
```

## Testing

[Testing strategy for this module]

- Unit tests in `__tests__/` (Jest)
- Integration tests in `__tests__/integration/`
- Coverage threshold: 80%

## Key Dependencies

[Important internal or external dependencies]

- `dependency-name`: What it's used for

## See Also

[Links to related modules, architecture docs, or external resources]

- `../sibling-module/` - Related functionality
- `docs/ARCHITECTURE.md` - How this fits in the system
- `docs/adr/20240315-design-decision.md` - Why we built it this way
```

---

## Root README Requirements

The root README is the first thing people see. It should answer key questions in 5 minutes.

```markdown
# [Project Name]

[One-line description]

[Brief paragraph explaining what this repo is and why it exists]

## Quick Start

[How to get it running locally in 5 minutes]

```bash
git clone ...
cd project
npm install
npm run dev
```

Visit http://localhost:3000

## Architecture

[One paragraph overview + link to detailed architecture doc]

This is a Node.js + React + PostgreSQL application.
See [Architecture Overview](docs/ARCHITECTURE.md) for details.

## Key Features

- Feature A
- Feature B
- Feature C

## Tech Stack

- Language: Node.js 18+
- Framework: Express + React
- Database: PostgreSQL
- Testing: Jest

## Documentation

- [Getting Started](docs/ONBOARDING.md) - Set up dev environment
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Deployment](docs/DEPLOYMENT.md) - How to deploy
- [API Reference](docs/API.md) - REST endpoints
- [Contributing](CONTRIBUTING.md) - How to contribute

## Development

```bash
# Install
npm install

# Run locally
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

See [Deployment Guide](docs/DEPLOYMENT.md) for details.

## Support

- Issues: [GitHub Issues](https://github.com/org/repo/issues)
- Slack: #project-support
- On-call: [Runbook](docs/DEPLOYMENT.md#troubleshooting)

## License

[MIT / Apache / Proprietary]

## Contributing

See [Contributing Guidelines](CONTRIBUTING.md)
```

---

## API Documentation Standards

All REST APIs should be documented with:

1. **OpenAPI/Swagger spec** (machine-readable)
   ```yaml
   openapi: 3.0.0
   info:
     title: My API
     version: 1.0.0
   paths:
     /users/{id}:
       get:
         summary: Get a user by ID
         parameters:
           - name: id
             in: path
             required: true
             schema:
               type: string
         responses:
           '200':
             description: User found
             content:
               application/json:
                 schema:
                   $ref: '#/components/schemas/User'
   ```

2. **Human-readable API docs** with examples
   ```markdown
   # API Reference

   ## Authentication
   All requests require Bearer token in Authorization header.

   ## Get User
   GET /api/users/:id

   **Parameters:**
   - `id` (string, required): User ID

   **Response:**
   ```json
   {
     "id": "user123",
     "name": "John Doe",
     "email": "john@example.com"
   }
   ```
   ```

3. **Code examples** in TSDoc/JSDoc
   ```typescript
   /**
    * Fetch a user by ID
    * @example
    * const user = await getUser('user123');
    * console.log(user.name);
    */
   export async function getUser(id: string): Promise<User> { }
   ```

---

## General Documentation Rules

### Truth & Accuracy
- **Code is source of truth.** If docs disagree with code, code wins. Update docs.
- **Quote file paths.** Use backticks: "See `src/handlers/auth.ts`"
- **Don't infer business intent from filenames.** Read code or ask the team.
- **No stale docs.** Delete or update dead documentation. Stale docs are worse than no docs.

### Audience & Clarity
- **Write for newcomers.** Assume they know the business domain but not your codebase.
- **Explain WHY, not WHAT.** Describe constraints, tradeoffs, decisions. Code shows WHAT.
- **Use real examples.** Copy-paste-able code, not pseudocode.
- **Be concise.** Say it in 2 sentences if possible. Aim for readability over comprehensiveness.

### Structure & Formatting
- **Use clear headers.** H1 for title, H2 for sections, H3 for subsections. Don't skip levels.
- **Use tables for structured data.** Functions with parameters, config variables, etc.
- **Use code blocks with language.** ` ```javascript ... ``` ` for syntax highlighting.
- **Link liberally.** Within the repo: `[Link](relative/path)`. To external docs: `[Link](https://...)`
- **Add a table of contents** for long docs:
  ```markdown
  ## Table of Contents
  - [Section 1](#section-1)
  - [Section 2](#section-2)
  ```

### Currency
- **Update in the same PR as code changes.** Docs and code drift quickly.
- **Add dates to major docs.** "Last updated: 2026-03-28"
- **Tag docs with scope.** "[v2.0+]", "[Legacy]", "[Deprecated]"
- **Link to issues.** "See #1234" when relevant.

### Placement
- **Co-locate documentation.** Put module docs in the module, not centralized. (Easier to keep current)
- **Root docs in /docs/.** Architecture, deployment, API, onboarding.
- **ADRs in /docs/adr/** with YYYYMMDD-slug.md naming.
- **Runbooks in /docs/ops/** or /runbooks/.

---

## Uncertainty & Red Flags

When writing documentation, flag assumptions and weak evidence:

```markdown
## [Topic]

[Your explanation]

**Note:** This is based on code review of `src/handlers/auth.ts` (commit abc123).
I haven't verified this with the team yet. Please confirm in code review.
```

Never leave a doc with red flags. Either:
1. Verify with code/team and update
2. Document explicitly what's uncertain
3. Delete it if it's too weak to be useful

---

## Checklist for Documentation Review

Before shipping documentation, verify:

- [ ] Audience is clear (who reads this?)
- [ ] Examples are runnable (copy-paste works)
- [ ] File paths are quoted with backticks
- [ ] Links work (internal and external)
- [ ] No stale information (checked code)
- [ ] Explains WHY not just WHAT
- [ ] American English used consistently
- [ ] Tone is professional and friendly
- [ ] Formatted correctly (headers, code blocks, tables)
- [ ] Co-located with code if applicable
- [ ] Uncertainty is flagged if present

---

*Last updated: 2026*
*Author: Documentation Standards Guide*
