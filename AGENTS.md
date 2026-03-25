## Skills
### Available skills
- repo-documenter: Document and explain any software repository with repo mapping, architecture analysis, documentation audits, README generation, TSDoc, OpenAPI/JSDoc, ADRs, runbooks, and onboarding outputs so humans and future agents can understand the codebase quickly. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/repo-documenter/SKILL.md)
- frontend-product-design: Apply professional product design aesthetics to the frontend. Use when refining visual design, improving UI polish, elevating component aesthetics, applying design-system principles, or making interfaces look more intentional and professional. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/frontend-product-design/SKILL.md)

### How to use skills
- Trigger rule: If the user asks to create, audit, expand, rewrite, reorganize, or explain repository documentation, use `repo-documenter`.
- Trigger rule: If the user asks to improve visual design, polish the UI, apply product design aesthetics, refine component appearance, or touch the frontend “look and feel” like a product designer, use `frontend-product-design`.
- Trigger rule: If the task changes README files, ADRs, runbooks, TSDoc, OpenAPI docs, or repo-orientation docs, use `repo-documenter`.
- After documentation edits, stage only the relevant files and create the commit unless the user explicitly says not to.
- Follow `.codex/rules/documentation-rules.mdc` for documentation standards.
- Follow `.codex/rules/git-commit-standards.mdc` for the commit format and scope selection.
