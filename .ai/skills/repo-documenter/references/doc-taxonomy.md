# Documentation Taxonomy

Documentation falls into 8 categories. Each repository should have clear, useful content for each category it applies to. If your repo doesn't need a category, document why.

---

## 1. Functional Documentation

**What it is:** How to use the system from the outside. Feature descriptions, workflows, use cases.

**Examples:**
- Product README ("This is a task management app. You can create tasks, assign them, track progress.")
- User guides ("How to create a task" / "How to integrate with Slack")
- Feature specifications ("What does this API endpoint do?")
- Screenshots or video walkthroughs
- Example workflows ("Here's how to set up a CI/CD pipeline with this tool")

**Audit Checklist:**
- [ ] Does the README explain what this project does in plain English?
- [ ] Can someone understand the main features without reading code?
- [ ] Are there examples of common workflows?
- [ ] Are integration points documented (APIs, webhooks, CLI)?
- [ ] Would a product manager understand what this is?

**Red Flags:**
- README talks only about implementation, not usage
- Feature names but no explanations
- Screenshots that are outdated or show deprecated UI
- No examples of actual usage

---

## 2. Technical Documentation

**What it is:** How the code works. For developers who need to understand and modify the system.

**Examples:**
- Architecture overview ("The system has 3 layers: API, business logic, database")
- Data flow diagrams ("Requests flow through auth middleware, then handlers, then ORM")
- Module READMEs ("This package handles user authentication. It exports User, Session, Login().")
- API reference ("GET /users/:id returns a User object with these fields")
- Database schema ("Users table has these columns and relationships")
- Code examples in docs or comments

**Audit Checklist:**
- [ ] Is the system architecture documented (layers, modules, flow)?
- [ ] Are major data structures explained (User, Order, etc.)?
- [ ] Are APIs documented with request/response examples?
- [ ] Are database schemas documented?
- [ ] Is the flow of a typical request traced (e.g., through middleware)?
- [ ] Would a developer new to the codebase understand how to add a feature?

**Red Flags:**
- Architecture docs are missing
- APIs documented only in code comments
- Database schema only exists in migrations, not documented
- No examples of how to use public APIs
- Complex algorithms unexplained

---

## 3. Architectural Documentation

**What it is:** Why decisions were made. System design choices, constraints, tradeoffs.

**Examples:**
- Architecture Decision Records (ADRs): "We chose PostgreSQL because X and Y, vs MySQL which would have Z downside"
- Design rationale: "We split auth into a separate service because of these scaling constraints"
- Tradeoff analysis: "Real-time vs batch processing: chose batch because..."
- System design doc: "Here's our three-tier architecture and why we use each tier"
- Technology choices: "We use TypeScript for static typing, not Python"

**Audit Checklist:**
- [ ] Are major design decisions documented with rationale (ADRs)?
- [ ] Are tradeoffs explained (why this approach vs alternatives)?
- [ ] Are constraints documented (scalability, security, compliance)?
- [ ] Are technology choices explained?
- [ ] Would a new architect understand why the system is designed this way?
- [ ] Are old/deprecated decisions documented as superseded?

**Red Flags:**
- No ADRs; decisions are only in commit messages or Jira
- "We built it this way because..." with no context
- Architecture differs from documentation
- No trace of why certain choices were made
- Decision documents are private (should be in repo)

---

## 4. Operational Documentation

**What it is:** How to operate the system in production. Deployment, monitoring, troubleshooting, on-call.

**Examples:**
- Deployment runbook ("How to deploy to production, rollback, check health")
- Environment setup ("These env vars are required; here's what they do")
- Monitoring guide ("These metrics matter; alert thresholds are X")
- Troubleshooting guide ("If you see error Y, do Z")
- Scaling guide ("How to scale horizontally/vertically")
- Disaster recovery ("How to restore from backups")
- On-call guide ("Who's on call, how to find the runbook, escalation path")

**Audit Checklist:**
- [ ] Is there a clear deployment runbook?
- [ ] Are environment variables documented with required vs optional?
- [ ] Are common errors and their solutions documented?
- [ ] Is the monitoring/alerting strategy documented?
- [ ] Would an on-call engineer be able to debug a production issue?
- [ ] Are rollback procedures documented?
- [ ] Is there a playbook for common incidents?

**Red Flags:**
- Only the original author can deploy
- Environment setup is tribal knowledge ("Ask Bob")
- No runbook; deployment is ad-hoc
- "If it breaks, restart it" is the only troubleshooting guide
- No monitoring or alerting documentation
- Runbook is stale (last updated 2 years ago)

---

## 5. Onboarding Documentation

**What it is:** How to get productive as a new team member. Setup, conventions, how to contribute.

**Examples:**
- Getting started guide ("Clone, npm install, npm run dev, visit localhost:3000")
- Development environment setup ("Here's how to set up Postgres and Redis locally")
- Code style guide ("We use Prettier, ESLint, these conventions")
- First task guide ("Your first PR should be a small bug fix. Here's where to start.")
- Team workflows ("How we do code review, naming conventions, commit messages")
- Contributing guide (CONTRIBUTING.md)
- Key people and slack channels

**Audit Checklist:**
- [ ] Can someone set up the dev environment in 30 minutes?
- [ ] Are code style/naming conventions documented?
- [ ] Is the PR/code review process clear?
- [ ] Is there a list of recommended first tasks?
- [ ] Do they know who to ask for help?
- [ ] Are key Slack channels documented?
- [ ] Would someone understand the team's working agreements?

**Red Flags:**
- No getting-started guide
- Setup requires "ask someone on the team"
- Code style is tribal knowledge
- No documented PR process
- Onboarding guide is 3 months out of date

---

## 6. Testing Documentation

**What it is:** Testing strategy, coverage expectations, how to write and run tests.

**Examples:**
- Testing strategy ("We do unit tests for business logic, integration tests for APIs, E2E for critical flows")
- Test running guide ("npm test runs all tests; npm test -- --watch for TDD")
- Test coverage ("We target 80% coverage on src/, optional on test-helpers")
- Writing tests ("Here's how to write a good unit test in this codebase")
- Test data / fixtures ("How to set up test databases, seed data")
- CI/CD testing ("These tests run on every PR; these only on merge to main")

**Audit Checklist:**
- [ ] Is the testing strategy documented (unit, integration, E2E)?
- [ ] Are coverage expectations clear?
- [ ] Can someone run tests locally easily?
- [ ] Are there guidelines for writing tests?
- [ ] Is test data/fixture setup documented?
- [ ] Are CI/CD test stages clear?
- [ ] Would someone understand what to test vs what to skip?

**Red Flags:**
- No tests or tests aren't documented
- Test coverage is unmeasured or unknown
- No guidelines for writing tests (inconsistent style)
- Tests are slow or flaky with no explanation
- Test data is hardcoded instead of using fixtures
- CI tests don't match local tests

---

## 7. Convention Documentation

**What it is:** Team agreements and patterns. Naming, file organization, patterns.

**Examples:**
- Naming conventions ("APIs start with /api/, files use kebab-case")
- Folder structure ("src/handlers/ for request handlers, src/services/ for business logic")
- Code patterns ("How we handle errors, write async code, structure components")
- Commit message format ("feat: ..., fix: ..., docs: ...")
- PR expectations ("All PRs need tests, code review, passing CI")
- Documentation patterns ("Every module gets a README.md")

**Audit Checklist:**
- [ ] Are naming conventions documented?
- [ ] Is the folder structure explained?
- [ ] Are common code patterns documented?
- [ ] Is commit message format specified?
- [ ] Are PR expectations clear?
- [ ] Do actual files follow the documented conventions?
- [ ] Would someone know how to structure a new feature?

**Red Flags:**
- Conventions exist only in someone's head
- Documentation says one thing, code does another
- No consistency in naming/structure
- Git history shows different commit message styles
- Code review comments are "that's not how we do it" without documentation

---

## 8. Architecture Decision Records (ADRs)

**What it is:** Individual decisions documented with status, context, consequences, alternatives.

**Examples:**
- "ADR-20240315: Use PostgreSQL instead of MySQL" (Accepted)
- "ADR-20240320: Migrate REST API to GraphQL" (Proposed)
- "ADR-20230101: Use TypeScript instead of JavaScript" (Superseded by ADR-20240101)

**Audit Checklist:**
- [ ] Are major technical decisions documented?
- [ ] Does each ADR explain the problem and constraints?
- [ ] Are alternatives documented?
- [ ] Are tradeoffs clear?
- [ ] Are ADRs linked to relevant issues/PRs?
- [ ] Are old decisions marked as Superseded/Deprecated?
- [ ] Would someone understand why we made this choice 2 years later?

**Red Flags:**
- No ADRs; decisions are only in Slack or commit messages
- ADRs are incomplete (no alternatives, no tradeoffs)
- No ADRs for major rewrites/migrations
- ADRs are in a wiki or Google Doc (should be in repo)
- Decision context is lost (only the decision, no rationale)

---

## Priority Checklist: Which Gaps to Fill First

When deciding which documentation to write, use this priority order:

### Tier 1 - Do First (Block New Hires)
- [ ] Root README (what does this do?)
- [ ] Getting started / onboarding guide (how do I run it?)
- [ ] Architecture overview (how is it structured?)
- [ ] Environment variables (what do I need to configure?)

### Tier 2 - Do Second (Unblock Development)
- [ ] Module READMEs (what does each part do?)
- [ ] API documentation (what endpoints exist?)
- [ ] Deployment runbook (how do I deploy?)
- [ ] Contributing guide (how do I submit changes?)

### Tier 3 - Do Third (Improve Quality)
- [ ] Testing strategy (how comprehensive are tests?)
- [ ] ADRs for major decisions (why did we choose this?)
- [ ] Troubleshooting guide (what do I do if it breaks?)
- [ ] Code style guide (how do we write code?)

### Tier 4 - Do When Time Permits (Polish)
- [ ] Glossary (what do our acronyms mean?)
- [ ] Scaling guide (how do we handle growth?)
- [ ] Performance tuning (how do we optimize?)
- [ ] Historical context (how did we get here?)

---

## Category Assessment Matrix

For each category in your repo:

| Category | Exists? | Current? | Clear? | Complete? | Action |
| ---------- | --------- | ---------- | -------- | ----------- | -------- |
| Functional | ✓ | Stale | ✓ | Partial | Update examples |
| Technical | ✓ | ✓ | ✓ | ✓ | Good |
| Architectural | ✗ | N/A | N/A | N/A | Create ADRs |
| Operational | ✓ | ✓ | Unclear | ✓ | Simplify runbook |
| Onboarding | ✓ | ✓ | ✓ | ✓ | Good |
| Testing | ✓ | ✓ | ✓ | ✓ | Good |
| Conventions | Partial | ✓ | ✓ | ✓ | Document folder structure |
| ADRs | ✗ | N/A | N/A | N/A | Create for past decisions |

---

## Using This Taxonomy

1. **Audit:** Go through each category. Does your repo have clear, current, complete documentation?
2. **Gap Analysis:** For each gap, note:
   - Is it blocking someone from being productive?
   - Is it high-value for relatively low effort?
   - Should it be Tier 1, 2, 3, or 4?
3. **Prioritize:** Use the priority checklist to decide what to write first
4. **Write:** Use the templates and standards in the skill
5. **Track:** Update this matrix as you close gaps

---

*Last updated: 2026*
*Author: Documentation Taxonomy*
