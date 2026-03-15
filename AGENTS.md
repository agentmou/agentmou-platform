## Skills
### Available skills
- improve-repo-docs: Audit and expand repository documentation for monorepos and multi-package codebases. Use when Codex needs to understand the repo deeply, close documentation gaps, write or improve README files, add TSDoc, document REST endpoints, create ADRs or runbooks, or rewrite docs so a newcomer can understand the system clearly. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/improve-repo-docs/SKILL.md)
- frontend-product-design: Apply professional product design aesthetics to the frontend. Use when refining visual design, improving UI polish, elevating component aesthetics, applying design-system principles, or making interfaces look more intentional and professional. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/frontend-product-design/SKILL.md)

### How to use skills
- Trigger rule: If the user asks to create, audit, expand, rewrite, reorganize, or explain repository documentation, use `improve-repo-docs`.
- Trigger rule: If the user asks to improve visual design, polish the UI, apply product design aesthetics, refine component appearance, or touch the frontend “look and feel” like a product designer, use `frontend-product-design`.
- Trigger rule: If the task changes README files, ADRs, runbooks, TSDoc, OpenAPI docs, or repo-orientation docs, use `improve-repo-docs`.
- After documentation edits, stage only the relevant files and create the commit unless the user explicitly says not to.
- Follow `.codex/rules/documentation-rules.mdc` for documentation standards.
- Follow `.codex/rules/git-commit-standards.mdc` for the commit format and scope selection.
