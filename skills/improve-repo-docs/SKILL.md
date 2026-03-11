---
name: improve-repo-docs
description: Audit and expand repository documentation for monorepos and multi-package codebases. Use when Codex needs to understand a repo deeply, close documentation gaps, write or improve README files in apps/services/packages, add or update TSDoc for public exports in packages, document REST endpoints with OpenAPI and JSDoc, create ADRs or runbooks, or rewrite technical docs so a newcomer with zero context can understand the system in clear American English.
---

# Improve Repo Docs

## Overview

Turn an under-documented repository into a well-explained, newcomer-friendly codebase without drifting away from the source code. Audit what exists first, then expand the documentation in layers so the repo becomes easier to navigate, operate, and change.

## Workflow

### 1. Establish the source of truth

Read the repo's existing orientation files before writing anything large.

Start with:
- `README.md`
- `whole-initial-context.md` when present
- `docs/architecture/overview.md`
- `docs/architecture/monorepo-map.md`
- `docs/architecture/current-implementation.md`
- `docs/architecture/conventions.md`
- `package.json`, `pnpm-workspace.yaml`, and `turbo.json` when present

Treat the code as the final authority. If documentation and code disagree, update the documentation to match the code unless the user explicitly asks for a design proposal.

### 2. Run the documentation audit

Run the bundled audit script before making broad changes:

```bash
python3 skills/improve-repo-docs/scripts/audit_documentation.py
```

Use `--format json` when a machine-readable report is more useful.

Use the audit output to identify:
- Missing `README.md` files in `apps/`, `services/`, and `packages/`
- Package export surfaces that appear to lack TSDoc coverage
- Weak or missing repo-level orientation docs
- Missing operational documentation such as ADRs and runbooks

Treat the TSDoc coverage numbers as heuristics. Confirm suspicious files manually before editing them.

### 3. Expand documentation in impact order

Document the repo in this order unless the user asks for a narrower scope:

1. Root orientation docs for the monorepo
2. Package, service, and app `README.md` files
3. Public APIs in `packages/` with TSDoc
4. REST endpoints with OpenAPI and JSDoc
5. ADRs for architectural decisions
6. Runbooks for operational procedures

Prefer updating existing documents over creating parallel replacements. Avoid duplicating the same explanation in multiple places.

### 4. Write for a true newcomer

Assume the reader has zero context about the repo, the domain, and the implementation history.

Explain:
- What each package or service is for
- How the pieces connect
- What the main workflows are
- What a developer must run locally
- What can break in production and how to recover

Do not use vague shorthand like "handles orchestration" without naming the inputs, outputs, and dependencies.

### 5. Keep docs close to the code

Follow these placement rules:
- Put package purpose and usage in the package root `README.md`
- Put public API details in TSDoc on exported declarations
- Put REST contract details in OpenAPI annotations and endpoint-adjacent JSDoc
- Put architecture decisions in `docs/adr/NNNN-title.md`
- Put operational procedures in `docs/runbooks/`
- Put environment variable examples in `infra/compose/.env.example` with comments

Avoid central-wiki behavior. Prefer co-located documentation whenever a file has a clear owner.

## Repo-Specific Priorities

For this repository shape, pay extra attention to:
- Monorepo navigation across `apps/`, `services/`, `packages/`, `catalog/`, `workflows/`, `infra/`, and `docs/`
- Shared contracts and type ownership in `packages/contracts`
- API, worker, and web interactions across `services/api`, `services/worker`, and `apps/web`
- Infrastructure and operational expectations under `infra/` and `docs/runbooks/`
- Architecture history already captured under `docs/architecture/` and `docs/adr/`

When documenting a package or service, connect it explicitly to the neighboring parts of the system instead of describing it in isolation.

## Documentation Standard

Read `references/documentation-standards.md` before making broad documentation edits. Use it as the checklist for tone, required artifacts, templates, and comment rules.

Apply these non-negotiable rules:
- Use American English
- Update docs in the same change as behavior changes
- Remove stale statements instead of layering new text on top
- Prefer concrete examples over abstract promises
- Never claim behavior that has not been verified in code or tests

## Commit Completion

Finish documentation work by creating the commit unless the user explicitly asks not to.

Use this sequence:
1. Inspect the repo rules in `.codex/rules/git-commit-standards.mdc` first. If that file is absent, check `.cursor/rules/git-commit-standards.mdc`.
2. Stage only the documentation files that belong to the current task. Do not stage unrelated dirty files.
3. Use `python3 skills/improve-repo-docs/scripts/suggest_docs_commit.py <paths...>` to get a recommended scope and subject.
4. Commit the staged documentation changes with a Conventional Commit message. Documentation-only work should normally use `docs(<scope>): <description>`.

Follow these scope rules for this repository:
- `apps/<name>/...` -> `docs(<name>)`
- `services/<name>/...` -> `docs(<name>)`
- `packages/<name>/...` -> `docs(<name>)`
- `infra/...` -> `docs(infra)`
- `workflows/...` -> `docs(workflows)`
- Root-level docs, repo-wide docs, skills, and agent instructions -> `docs(monorepo)`

If the documentation work spans several independent scopes, prefer multiple commits. Omit the scope only for truly cross-cutting changes that touch four or more scopes and cannot be split cleanly.

Before committing, confirm that:
- The staged diff contains only the documentation task you just completed
- The subject line is imperative, lowercase, and has no trailing period
- The commit body explains why the documentation change matters when a body is useful
- Generated or unrelated files remain unstaged

If the worktree already contains unrelated changes, leave them untouched and commit only the relevant paths with explicit `git add <path>` commands.

## Quality Bar

Before finishing, verify that the documentation:
- Matches the current code paths, scripts, and file names
- Explains the happy path and the important failure modes
- Uses consistent terminology for the same concept everywhere
- Gives readers enough context to act without opening five unrelated files
- Links related docs instead of repeating entire sections

## Validation

After edits, rerun the audit script and spot-check the changed files.

Validate at least these points:
- Every touched package, app, or service root still has a `README.md`
- New README examples reference real commands and exported APIs
- TSDoc blocks describe parameters, returns, and thrown errors when relevant
- New ADRs and runbooks use the repository's existing structure
- Links between docs resolve correctly
- The resulting commit message matches the repo's Conventional Commit rules
