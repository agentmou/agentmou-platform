# Modular Documentation Patterns

Use this guide when deciding which docs to generate or update.

## Recommended file set

These names are suggestions, not hard requirements:

| Need | Typical file |
| --- | --- |
| Root orientation | `README.md` |
| Architecture overview | `docs/architecture.md` |
| Repo navigation | `docs/repo-map.md` |
| Module or service detail | `docs/modules/<name>.md` or local `README.md` |
| Onboarding | `docs/onboarding.md` |
| Testing | `docs/testing.md` |
| Deployment | `docs/deployment.md` |
| Runbook | `docs/runbook.md` or `docs/runbooks/<topic>.md` |
| Troubleshooting | `docs/troubleshooting.md` |
| Glossary | `docs/glossary.md` |
| ADR | `docs/adr/NNNN-title.md` |

## What each document should include

- Root README:
  - purpose, structure, local usage, key modules, next reads
- Architecture doc:
  - boundaries, flows, dependencies, critical config, tradeoffs
- Repo map:
  - folder overview, modules, entrypoints, dark zones
- Module or service doc:
  - responsibility, entrypoints, dependencies, local commands, tests
- Onboarding:
  - first reads, local setup, common workflows, pitfall notes
- Testing:
  - test locations, commands, layers, fixtures, expectations
- Deployment:
  - environments, release path, critical config, rollback notes
- Runbook:
  - trigger, diagnosis, recovery, verification
- Troubleshooting:
  - symptoms, likely causes, evidence, fixes
- Glossary:
  - project-specific terms and abbreviations
- ADR:
  - context, decision, alternatives, consequences

## Writing rules

- Prefer concrete paths over abstract descriptions.
- Link related docs instead of repeating the same paragraphs.
- Document the most important modules first.
- Explain why a reader should care, not just what the file contains.
- Say when evidence is incomplete.

## Template usage

Use the templates under `assets/templates/` as starting scaffolds. Rename or
trim them to fit the repository instead of forcing every section into every doc.
