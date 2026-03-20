---
name: repo-documenter
description: Document and explain any software repository in a way that helps humans and future agents understand it quickly. Use when the user asks to document a repo, understand a codebase, map project structure, explain architecture, describe modules or services, locate where a feature or concern lives, trace request or event flow, identify dependencies, audit missing docs, create onboarding or operational docs, write or improve README files, add or update TSDoc for public exports, document REST endpoints with OpenAPI and JSDoc, create ADRs or runbooks, or answer questions such as "what does this repo do", "where is X", "how is Y organized", or "what depends on what".
---

# Repo Documenter

## Overview

Understand the repository before writing. Build a reliable map of the structure,
responsibilities, entrypoints, dependencies, and documentation gaps, then turn
that map into clear, navigable docs without inventing missing facts.

## Workflow

### 1. Discover the repository

- Inspect root files, major directories, manifests, lockfiles, configs, CI/CD,
  Docker, infra, tests, scripts, and entrypoints.
- Run `scripts/inventory_repo.py` when a fast inventory or machine-readable
  snapshot will help.
- Run `scripts/audit_documentation.py` when the repo uses `apps/`, `services/`,
  or `packages/` and you need README, TSDoc, ADR, runbook, or env-doc coverage
  heuristics.
- Read existing docs before proposing replacements.

### 2. Classify artifacts

- Separate functional, technical, architecture, operational, onboarding,
  deployment, troubleshooting, testing, ADR, and conventions docs.
- Note which important areas have code but weak or missing documentation.

### 3. Build the repo map

- Identify the repo purpose when the evidence supports it.
- Map top-level folders, module boundaries, entrypoints, critical config,
  internal dependencies, and external systems.
- Label uncertain conclusions as `probable` or `possible`.

### 4. Detect documentation gaps

- Prioritize understanding and navigation docs before lower-value polish.
- Use `scripts/find_doc_gaps.py` for a fast heuristic audit, then confirm the
  highest-priority gaps manually.

### 5. Draft or update documentation

- Prefer updating existing docs over creating overlapping replacements.
- Keep docs close to code when ownership is obvious.
- Use templates in `assets/templates/` as starting points, not mandatory names.
- When documenting exported TypeScript APIs in `packages/`, add or update TSDoc
  on the public surface.
- When documenting HTTP endpoints, keep OpenAPI and endpoint-adjacent JSDoc in
  sync with the code.

### 6. Follow repo documentation standards

- Read `references/documentation-standards.md` before broad documentation
  changes.
- Use American English unless the repo clearly uses a different documentation
  language or the user asks otherwise.
- Keep documentation co-located when ownership is clear.
- Put ADRs under `docs/adr/`, runbooks under `docs/runbooks/`, and environment
  variable examples in the repo's env example files when those conventions
  exist.

### 7. Finish the documentation change cleanly

- If the user has not opted out, stage only the relevant documentation files and
  finish with a Conventional Commit.
- Use `scripts/suggest_docs_commit.py` to suggest the scope and subject line for
  documentation-only changes.

### 8. Close with uncertainty

- Call out unanswered questions, weak evidence, and assumptions explicitly.
- Never state inferred behavior as confirmed fact.

## Output Contract

Use this response shape unless the user asks for something narrower:

1. Executive Summary
2. Repo Map
3. Key Modules
4. Flows and Dependencies
5. Documentation Gaps
6. Recommended Files
7. Open Questions / Uncertainty

## Truth Rules

- Treat code, configs, and executable definitions as the source of truth.
- If documentation and code disagree, say so and prefer the code unless the
  user is asking for a proposal.
- Quote paths, files, or concrete evidence for important claims.
- Preserve the repo's established documentation language when it is obvious;
  otherwise follow the user's language.
- Do not infer business intent from filenames alone without labeling it as a
  heuristic.

## Resources

- Read `references/repo-analysis.md` when you need a discovery checklist for an
  unfamiliar codebase.
- Read `references/doc-taxonomy.md` when auditing the current documentation or
  classifying what exists.
- Read `references/architecture-documentation.md` when describing boundaries,
  flows, contracts, auth, data, jobs, queues, or infra.
- Read `references/repo-map.md` when building a navigable structural map or
  answering "where does X live?"
- Read `references/modular-docs.md` when drafting file-level documentation plans
  or deciding which docs to add next.
- Read `references/documentation-standards.md` when the task includes TSDoc,
  OpenAPI/JSDoc, ADRs, runbooks, env docs, or repo-specific documentation rules.

## Scripts

Use the scripts when they reduce guesswork or make the output more consistent:

```bash
python3 scripts/inventory_repo.py <repo-root> --format markdown
python3 scripts/generate_repo_map.py <repo-root> --format markdown
python3 scripts/find_doc_gaps.py <repo-root> --format markdown
python3 scripts/audit_documentation.py --repo-root <repo-root>
python3 scripts/suggest_docs_commit.py <paths...>
```

- `inventory_repo.py` builds a cross-stack inventory of major artifacts.
- `generate_repo_map.py` turns the inventory into a navigable repo map.
- `find_doc_gaps.py` highlights likely high-value documentation gaps.
- `audit_documentation.py` audits README, TSDoc, ADR, runbook, and env-doc
  coverage in monorepos with `apps/`, `services/`, or `packages/`.
- `suggest_docs_commit.py` suggests a Conventional Commit subject for
  documentation-only changes.

## Templates

Use `assets/templates/` for short starting points when drafting:

- root README
- architecture overview
- repo map
- module or service docs
- onboarding, testing, deployment, runbook, troubleshooting, glossary, and ADRs

Treat the templates as scaffolds. Adapt them to the repo instead of forcing a
one-size-fits-all structure.
