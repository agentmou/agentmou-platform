PYTHON ?= python3
MARKDOWNLINT ?= pnpm exec markdownlint-cli2
YAMLLINT ?= $(PYTHON) -m yamllint
YAML_TARGETS := .github infra catalog templates workflows skills pnpm-workspace.yaml

.PHONY: validate-markdown validate-yaml validate-content

validate-markdown:
	@$(MARKDOWNLINT)

validate-yaml:
	@$(PYTHON) -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('yamllint') else 1)" \
		|| (echo "yamllint is not installed. Run 'python3 -m pip install --user yamllint'."; exit 1)
	@$(YAMLLINT) -c .yamllint.yml $(YAML_TARGETS)

validate-content: validate-markdown validate-yaml
