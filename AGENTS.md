## Skills

### Available skills

- repo-documenter: Document and explain any software repository with repo mapping, architecture analysis, documentation audits, README generation, TSDoc, OpenAPI/JSDoc, ADRs, runbooks, and onboarding outputs so humans and future agents can understand the codebase quickly. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/repo-documenter/SKILL.md)
- frontend-product-design: Apply professional product design aesthetics to the frontend. Use when refining visual design, improving UI polish, elevating component aesthetics, applying design-system principles, or making interfaces look more intentional and professional. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/frontend-product-design/SKILL.md)
- n8n-workflow-builder: Build, refine, debug, and promote n8n workflows from natural language using the repo's MCP-first workflow. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/n8n-workflow-builder/SKILL.md)
- n8n-mcp-tools-expert: Use the n8n MCP toolset effectively for node discovery, workflow editing, and validation. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/n8n-mcp-tools-expert/SKILL.md)
- n8n-workflow-patterns: Choose the right n8n workflow architecture or hybrid agent-plus-workflow pattern. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/n8n-workflow-patterns/SKILL.md)
- n8n-validation-expert: Interpret and fix n8n validation errors, warnings, and false positives. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/n8n-validation-expert/SKILL.md)
- n8n-expression-syntax: Write and debug n8n expressions, especially around `$json`, `$node`, and webhook payloads. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/n8n-expression-syntax/SKILL.md)
- n8n-node-configuration: Configure n8n nodes operation-by-operation with the right required fields and dependencies. (file: /Users/timbrandt/Agentmou/agentmou-platform/skills/n8n-node-configuration/SKILL.md)

### How to use skills

- Trigger rule: If the user asks to create, audit, expand, rewrite, reorganize, or explain repository documentation, use `repo-documenter`.
- Trigger rule: If the user asks to improve visual design, polish the UI, apply product design aesthetics, refine component appearance, or touch the frontend “look and feel” like a product designer, use `frontend-product-design`.
- Trigger rule: If the task changes README files, ADRs, runbooks, TSDoc, OpenAPI docs, or repo-orientation docs, use `repo-documenter`.
- Trigger rule: If the user asks to create, update, debug, validate, or explain an n8n workflow, use `n8n-workflow-builder`.
- Trigger rule: If the task is specifically about which n8n MCP tool to use, how to inspect nodes, or how to edit workflows through MCP, use `n8n-mcp-tools-expert`.
- Trigger rule: If the task is about workflow structure, pattern choice, or deciding between pure n8n and a hybrid agent-plus-workflow shape, use `n8n-workflow-patterns`.
- Trigger rule: If the task is about fixing n8n validation errors or interpreting warnings and false positives, use `n8n-validation-expert`.
- Trigger rule: If the task is about n8n expressions or webhook payload access, use `n8n-expression-syntax`.
- Trigger rule: If the task is about configuring a specific n8n node, operation, or property dependency, use `n8n-node-configuration`.
- After documentation edits, stage only the relevant files and create the commit unless the user explicitly says not to.
- Follow `.codex/rules/documentation-rules.mdc` for documentation standards.
- Follow `.codex/rules/git-commit-standards.mdc` for the commit format and scope selection.
