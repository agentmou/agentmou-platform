# Repo Documenter Skill

## Purpose
Comprehensively document any software repository through systematic discovery, gap analysis, and collaborative documentation generation. This skill produces high-quality, maintainable documentation that helps teams understand, navigate, and operate their codebase.

## Triggers
- "Document this repo" / "Create documentation for [repo name]"
- "Generate a README for" / "I need a repo map"
- "Understand the architecture of"
- "Write ADRs" / "Document decisions"
- "Create runbooks" / "Operation guides"
- "Onboarding documentation"
- "API documentation" / "TSDoc" / "JSDoc"
- "Documentation audit" / "Find gaps in our docs"
- "Update our architecture documentation"
- Any repo understanding or technical writing task

## Output Contract
When complete, deliver:
1. **Executive Summary** — What the repo does, key tech, structure, state of docs
2. **Repo Map** — Navigable overview of folder responsibility and key modules
3. **Key Modules** — Purpose, exports, configuration, dependencies for top-level modules
4. **Critical Flows** — Request/response, deployment, data movement (2-3 key flows with diagrams if helpful)
5. **Documentation Gaps** — What's missing, prioritized by impact
6. **Recommended Files** — Concrete list of docs to create/update with reasons
7. **Open Questions** — Assumptions made, weak evidence, areas needing clarification
8. **Next Steps** — How to close gaps and maintain documentation

---

## Workflow

### Phase 1: Discovery
**Goal:** Understand repo structure, stack, and basic architecture without reading all code.

1. **Scan the root** using the discovery checklist in `references/discovery-checklist.md`
   - README, package.json, setup docs, CI/CD, docker-compose, scripts
   - Detect language, framework, build system, test framework
   - Identify entry points (main.ts, index.js, main.py, etc.)
   - Find infra/deployment config (Dockerfile, terraform, k8s, CI files)

2. **Map folder structure**
   - ls -la root dirs
   - Identify monorepo vs single package
   - Note obvious boundaries (src/, lib/, tests/, docs/, infra/, etc.)

3. **Examine package/dependency files** (if applicable)
   - Dependencies reveal architectural choices
   - Version patterns hint at maturity and update cadence
   - Peer dependencies show integration points

4. **Check CI/CD and scripts**
   - What does `npm run` / `make` / `./scripts/` reveal?
   - Build/test/deploy automation?
   - Critical scripts or workflows?

5. **Review existing documentation**
   - What docs already exist? Quality? Currency?
   - What's co-located vs centralized?
   - Obvious gaps or stale content?

### Phase 2: Inventory
**Goal:** Catalog modules, configurations, and dependencies systematically.

1. **List all top-level modules/packages** with one-line purpose
   - Create a module table: Name | Purpose | Public API | Config | Tests
   - Use helper scripts if available, or manual scan of source directories

2. **Document key configurations**
   - Environment variables (with defaults, required, purpose)
   - Config files (.env, config.json, yaml, etc.)
   - Feature flags, runtime switches

3. **Map critical dependencies**
   - Direct dependencies (what does this repo depend on?)
   - Transitive dependencies (are there surprising chains?)
   - External integrations (APIs, databases, services)

4. **Identify entry points and exports**
   - Main executable/handler/function
   - Public API (what's exported for external use?)
   - CLI commands (if applicable)

### Phase 3: Classification
**Goal:** Organize understanding by documentation type.

Use the taxonomy in `references/doc-taxonomy.md`. For each documentation category, note:
- What exists
- Quality (clear, current, discoverable, useful?)
- What's missing
- Priority for gap-filling

Categories: Functional, Technical, Architecture, Operational, Onboarding, Testing, Conventions, ADRs.

### Phase 4: Gap Analysis
**Goal:** Identify highest-impact documentation to create or improve.

1. **Against the checklist** in `references/documentation-standards.md`:
   - Is there a root README? Is it current and useful?
   - Is there an architecture overview?
   - Are packages/modules documented at the source?
   - Are public APIs TSDoc/JSDoc annotated?
   - Is there a deployment runbook?
   - Are there ADRs for major decisions?

2. **Prioritize gaps:**
   - Will newcomers be stuck without it?
   - Is it a common question for the team?
   - Does it block onboarding or debugging?
   - Is it high-value for low effort?

3. **Identify stale or inaccurate content:**
   - Red flags in `references/doc-taxonomy.md`
   - Out-of-date examples, wrong paths, deprecated APIs
   - Mark for update or removal

### Phase 5: Draft & Update Documentation
**Goal:** Create or improve concrete documentation artifacts.

For each gap:

1. **Choose template** from `assets/templates/`:
   - Root README? → root-readme-template.md
   - Architecture? → architecture-template.md
   - Module README? → module-template.md
   - Runbook? → runbook-template.md
   - ADR? → adr-template.md
   - (See full template list below)

2. **Draft in context:**
   - Read source code where needed (key functions, exports, logic)
   - Verify assumptions against actual code
   - Preserve any existing valid content
   - Use standards in `references/documentation-standards.md`

3. **Place strategically:**
   - Root/architecture docs → repo root or `/docs/` folder
   - Module/package docs → co-located in package folder (README.md, architecture.md)
   - Runbooks → `/docs/operations/` or `/runbooks/`
   - ADRs → `/docs/adr/` or `/adr/` with YYYYMMDD-slug.md naming
   - API docs → co-located with code as TSDoc/JSDoc + generated docs
   - Onboarding → `/docs/onboarding.md` or `/GETTING_STARTED.md`

4. **Apply quality standards** from `references/documentation-standards.md`:
   - American English, clear structure
   - Explain WHY not WHAT (motivation, constraints, tradeoffs)
   - Write for someone new to the codebase
   - Use code examples, not pseudocode
   - Keep it concise but complete
   - Never leave stale docs in place

### Phase 6: Quality Standards
**Goal:** Ensure all documentation meets team standards.

- **Truth:** Code is source of truth. Docs describe why, architecture, and guidance. Quote file paths, don't infer intent from names alone.
- **Audience:** Write for someone joining the team next week. Explain context and motivation.
- **Format:** Consistent headers, clear structure, good links within the repo.
- **Currency:** Commit documentation in the same PR as code changes. Dead docs are worse than no docs.
- **Completeness:** Don't leave red flags in the doc taxonomy—each category should be clear about what exists and what doesn't.

### Phase 7: Clean Finish
**Goal:** Stage and commit documentation changes properly.

1. **List all new/modified doc files**
2. **Review for accuracy:**
   - Check code references (file paths, function names)
   - Verify examples run or make sense
   - Ensure links work
3. **Stage and commit:**
   - Conventional commit format: `docs: add [what]` or `docs: update [what]`
   - Example: `docs: add repo map and module inventory` or `docs: update deployment runbook for k8s`
4. **Link to issue tracker** if applicable

### Phase 8: Uncertainty Disclosure
**Goal:** Call out assumptions and weak evidence.

In the "Open Questions" section of output:
- What did I assume without verifying?
- Where is the code hard to understand?
- What would benefit from talking to the team?
- Are there architectural decisions that should be documented as ADRs but aren't yet?
- What changed recently that docs haven't caught up with?

---

## Helper Scripts & References

All located in the skill directory:

- **`references/discovery-checklist.md`** — Thorough checklist for discovering unfamiliar codebases
- **`references/documentation-standards.md`** — Writing standards, required artifacts, code-level docs rules
- **`references/doc-taxonomy.md`** — 8 doc categories with audit checklists and priority order
- **`references/repo-mapping.md`** — How to build navigable repo maps with dark zone identification

- **`assets/templates/root-readme-template.md`** — Top-level repo README scaffold
- **`assets/templates/architecture-template.md`** — Architecture overview scaffold
- **`assets/templates/repo-map-template.md`** — Repo map with modules and entry points
- **`assets/templates/module-template.md`** — Individual package/module README
- **`assets/templates/onboarding-template.md`** — Getting started for new developers
- **`assets/templates/testing-template.md`** — Testing strategy and guidelines
- **`assets/templates/deployment-template.md`** — Deployment architecture and process
- **`assets/templates/runbook-template.md`** — Operations runbook scaffold
- **`assets/templates/troubleshooting-template.md`** — Common issues and debugging
- **`assets/templates/glossary-template.md`** — Domain terms and acronyms
- **`assets/templates/adr-template.md`** — Architecture Decision Record scaffold

---

## Truth Rules & Principles

1. **Code is the source of truth.** If code and docs disagree, code wins. Update docs to match code.
2. **Quote file paths.** Use backticks for paths: `src/handlers/auth.ts`, not "the auth handler."
3. **Don't infer business intent from filenames alone.** Read the code or talk to the team.
4. **Preserve existing valid content.** Don't delete docs that are still useful; update them.
5. **Co-locate documentation.** Package READMEs go in package folders, not centralized, so they stay current.
6. **Update in the same PR.** Documentation changes should land with code changes.
7. **Call out assumptions.** If you're unsure about why something is designed a certain way, say so.
8. **Explain WHY.** Don't just describe WHAT the code does; explain constraints, tradeoffs, and decisions.

---

## Example Workflow for a New Repository

1. Run discovery checklist on root artifacts
2. Detect stack (Node.js + Express + PostgreSQL + React, for example)
3. List modules: `src/api/`, `src/web/`, `src/db/`, `src/utils/`
4. Classify existing docs (sparse README, no architecture, no runbook)
5. Gap analysis: High-priority = root README, module READMEs, deployment runbook, ADR for major decisions
6. Draft using templates:
   - Root README (why does this repo exist, how do I start)
   - Architecture doc (layers, data flow, external services)
   - Module READMEs (purpose, exports, configuration)
   - Deployment runbook (how to deploy, rollback, monitor)
7. Review and commit with conventional format
8. Note open questions: Why was middleware structured this way? When will we migrate from X to Y?

---

## Success Criteria

Documentation is successful when:
- ✓ A new team member can understand the repo's purpose and structure in 30 minutes
- ✓ They can find and understand a specific module or flow in 10 minutes
- ✓ Deployment, debugging, and operation are covered by runbooks and guides
- ✓ Major design decisions are explained in ADRs or architecture docs
- ✓ All public APIs are documented with TSDoc/JSDoc
- ✓ Docs are co-located with code and updated in the same PR
- ✓ No red flags in the doc taxonomy (every category is accounted for, even if it says "we don't use X")
- ✓ README and key docs point to the right entry points and next steps

---

## Related Skills & Tools

- **Code readers** (grep, codebase search) — for understanding implementation
- **Terminal scripts** — for running inventory and testing commands
- **Version control** — for staging and committing documentation
- **Template expansion** — for applying standards consistently

---

*Last updated: 2026*
*Author: Repo Documenter Skill*
