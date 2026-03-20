#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - Python 3.11+ should provide this.
    tomllib = None

TOML_ERRORS = (tomllib.TOMLDecodeError,) if tomllib else ()


IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".idea",
    ".vscode",
    ".next",
    ".nuxt",
    ".turbo",
    ".venv",
    "venv",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "coverage",
    "dist",
    "build",
    "node_modules",
    "target",
    "out",
}

MANIFEST_FILENAMES = {
    "package.json": ("node", "package manifest"),
    "pnpm-workspace.yaml": ("node", "workspace manifest"),
    "pyproject.toml": ("python", "package manifest"),
    "requirements.txt": ("python", "requirements manifest"),
    "Pipfile": ("python", "package manifest"),
    "setup.py": ("python", "package manifest"),
    "setup.cfg": ("python", "package manifest"),
    "go.mod": ("go", "module manifest"),
    "Cargo.toml": ("rust", "package manifest"),
    "Gemfile": ("ruby", "package manifest"),
    "composer.json": ("php", "package manifest"),
    "pom.xml": ("java", "build manifest"),
    "build.gradle": ("java", "build manifest"),
    "build.gradle.kts": ("java", "build manifest"),
    "settings.gradle": ("java", "workspace manifest"),
    "settings.gradle.kts": ("java", "workspace manifest"),
    "mix.exs": ("elixir", "package manifest"),
    "deno.json": ("deno", "runtime manifest"),
    "deno.jsonc": ("deno", "runtime manifest"),
}

LOCKFILE_PATTERNS = {
    "pnpm-lock.yaml": ("node", "lockfile"),
    "package-lock.json": ("node", "lockfile"),
    "yarn.lock": ("node", "lockfile"),
    "bun.lock": ("node", "lockfile"),
    "bun.lockb": ("node", "lockfile"),
    "poetry.lock": ("python", "lockfile"),
    "Pipfile.lock": ("python", "lockfile"),
    "uv.lock": ("python", "lockfile"),
    "Cargo.lock": ("rust", "lockfile"),
    "go.sum": ("go", "lockfile"),
    "Gemfile.lock": ("ruby", "lockfile"),
    "composer.lock": ("php", "lockfile"),
    "pom.lock": ("java", "lockfile"),
}

GROUP_KIND_MAP = {
    "apps": ("application", "certain"),
    "app": ("application", "certain"),
    "services": ("service", "certain"),
    "service": ("service", "certain"),
    "packages": ("package", "certain"),
    "package": ("package", "certain"),
    "libs": ("library", "certain"),
    "lib": ("library", "certain"),
    "modules": ("module", "probable"),
    "workers": ("worker", "certain"),
    "worker": ("worker", "certain"),
    "jobs": ("job", "certain"),
    "job": ("job", "certain"),
    "cron": ("job", "probable"),
    "cmd": ("application", "probable"),
    "infra": ("infra", "certain"),
    "deploy": ("infra", "probable"),
    "deployment": ("infra", "probable"),
    "terraform": ("infra", "certain"),
    "helm": ("infra", "certain"),
    "charts": ("infra", "certain"),
    "k8s": ("infra", "certain"),
    "kubernetes": ("infra", "certain"),
}

ROLE_HINTS = [
    (("auth", "identity", "session", "oauth", "jwt"), "Probable authentication or identity boundary."),
    (("api", "route", "handler", "controller", "graphql", "rpc"), "Probable API or request-handling boundary."),
    (("web", "frontend", "client", "ui", "app"), "Probable user-facing application surface."),
    (("worker", "queue", "consumer", "processor"), "Probable background processing surface."),
    (("job", "cron", "schedule", "scheduler", "task"), "Probable scheduled or asynchronous job surface."),
    (("db", "database", "data", "model", "migration", "repository", "prisma", "orm"), "Probable data access or persistence layer."),
    (("contract", "schema", "types"), "Probable shared contracts or schema layer."),
    (("observability", "telemetry", "metrics", "logging", "tracing"), "Probable observability support layer."),
    (("infra", "terraform", "helm", "k8s", "deploy"), "Probable infrastructure or deployment code."),
    (("shared", "common", "utils", "core"), "Probable shared library or common utility layer."),
]

DOC_SUFFIXES = {".md", ".mdx", ".rst", ".adoc"}
TEST_DIR_TOKENS = {"test", "tests", "__tests__", "spec", "specs", "e2e", "integration", "fixtures", "cypress", "playwright"}
SCRIPT_DIR_TOKENS = {"scripts", "bin", "tools", "hack"}
INFRA_DIR_TOKENS = {"infra", "terraform", "helm", "charts", "k8s", "kubernetes", "deploy", "deployment"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def path_depth(relative_path: str) -> int:
    return 0 if relative_path == "." else len(Path(relative_path).parts)


def relative_string(path: Path, repo_root: Path) -> str:
    relative = path.relative_to(repo_root)
    return "." if str(relative) == "." else relative.as_posix()


def normalize_dependency_name(raw: str) -> str:
    cleaned = raw.strip().strip("\"' ")
    if not cleaned:
        return ""
    cleaned = cleaned.split(";", 1)[0]
    cleaned = cleaned.split("[", 1)[0]
    cleaned = re.split(r"[<>=!~ ()]", cleaned, maxsplit=1)[0]
    return cleaned.strip()


def xml_local_name(tag: str) -> str:
    return tag.split("}", 1)[-1]


def unique_sorted(values: list[str]) -> list[str]:
    return sorted({value for value in values if value})


def make_artifact(path: str, kind: str, confidence: str = "certain", details: dict[str, Any] | None = None) -> dict[str, Any]:
    artifact: dict[str, Any] = {
        "path": path,
        "kind": kind,
        "confidence": confidence,
    }
    if details:
        artifact["details"] = details
    return artifact


def looks_like_doc(path: str) -> tuple[bool, str | None]:
    lowered = path.lower()
    name = Path(path).name.lower()
    suffix = Path(path).suffix.lower()
    parts = [part.lower() for part in Path(path).parts]
    if parts and parts[0] == "skills" and ("references" in parts or "assets" in parts):
        return False, None
    if suffix not in DOC_SUFFIXES and not name.startswith("readme"):
        return False, None
    if name.startswith("readme"):
        return True, "readme"
    if "/adr/" in lowered or lowered.startswith("adr/"):
        return True, "adr"
    if "architecture" in lowered:
        return True, "architecture"
    if "repo-map" in lowered or "monorepo-map" in lowered or "codebase-map" in lowered:
        return True, "repo-map"
    if "runbook" in lowered:
        return True, "runbook"
    if "troubleshoot" in lowered or "debug" in lowered:
        return True, "troubleshooting"
    if "onboarding" in lowered or "getting-started" in lowered:
        return True, "onboarding"
    if "testing" in lowered or "test-strategy" in lowered or "quality" in lowered:
        return True, "testing"
    if "deploy" in lowered or "release" in lowered:
        return True, "deployment"
    if "glossary" in lowered or "terminology" in lowered:
        return True, "glossary"
    if lowered.startswith("docs/") or "/docs/" in lowered:
        return True, "doc"
    if name in {"contributing.md", "contributing.rst"}:
        return True, "conventions"
    return False, None


def detect_ci(path: str) -> tuple[str, str] | None:
    lowered = path.lower()
    if lowered.startswith(".github/workflows/") and lowered.endswith((".yml", ".yaml")):
        return "GitHub Actions workflow", "certain"
    if lowered == ".gitlab-ci.yml":
        return "GitLab CI pipeline", "certain"
    if lowered.startswith(".circleci/"):
        return "CircleCI config", "certain"
    if lowered == "azure-pipelines.yml":
        return "Azure Pipelines config", "certain"
    if Path(path).name == "Jenkinsfile":
        return "Jenkins pipeline", "certain"
    if lowered.startswith(".buildkite/") or "buildkite" in lowered:
        return "Buildkite pipeline", "probable"
    if lowered == ".drone.yml":
        return "Drone CI pipeline", "certain"
    if lowered == ".travis.yml":
        return "Travis CI pipeline", "certain"
    return None


def detect_docker(path: str) -> tuple[str, str] | None:
    name = Path(path).name
    lowered = name.lower()
    if name.startswith("Dockerfile"):
        return "Docker image definition", "certain"
    if lowered in {"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}:
        return "Compose topology", "certain"
    return None


def detect_infra(path: str) -> tuple[str, str] | None:
    lowered = path.lower()
    suffix = Path(path).suffix.lower()
    if suffix in {".tf", ".tfvars"}:
        return "Terraform configuration", "certain"
    if Path(path).name == "Chart.yaml":
        return "Helm chart", "certain"
    if Path(path).name in {"kustomization.yaml", "kustomization.yml"}:
        return "Kustomize configuration", "certain"
    if any(token in lowered.split("/") for token in INFRA_DIR_TOKENS):
        return "Infrastructure-related file", "probable"
    return None


def detect_config(path: str) -> tuple[str, str] | None:
    name = Path(path).name
    lowered = name.lower()
    if lowered.startswith(".env"):
        return "Environment configuration sample", "certain"
    if name in {"Makefile", "Taskfile.yml", "Taskfile.yaml", "justfile", "Procfile"}:
        return "Developer workflow config", "certain"
    if re.fullmatch(r"(tsconfig|turbo|wrangler|eslint|prettier|vitest|vite|jest|playwright|cypress|next|nuxt|astro|tailwind)\..+", lowered):
        return "Tooling configuration", "certain"
    if lowered in {"tox.ini", "pytest.ini", ".python-version", ".tool-versions"}:
        return "Tooling configuration", "certain"
    if lowered.endswith((".ini", ".toml", ".yaml", ".yml", ".json")) and path_depth(path) <= 2:
        return "Possible project configuration", "possible"
    return None


def detect_test(path: str) -> tuple[str, str] | None:
    path_obj = Path(path)
    lowered = path.lower()
    parts = {part.lower() for part in path_obj.parts}
    if parts & TEST_DIR_TOKENS:
        if "e2e" in parts or "playwright" in parts or "cypress" in parts:
            return "End-to-end tests", "certain"
        if "integration" in parts:
            return "Integration tests", "certain"
        return "Test asset", "certain"
    name = path_obj.name.lower()
    if re.search(r"(^test_.*\.py$|.*_test\.go$|.*_spec\.rb$|.*\.(spec|test)\.[cm]?[jt]sx?$|.*_test\.rs$)", name):
        return "Test file", "certain"
    return None


def detect_script(path: str) -> tuple[str, str] | None:
    path_obj = Path(path)
    parts = {part.lower() for part in path_obj.parts}
    if parts & SCRIPT_DIR_TOKENS:
        return "Script or automation helper", "certain"
    if path_obj.name in {"Makefile", "Taskfile.yml", "Taskfile.yaml", "justfile"}:
        return "Task runner entrypoint", "certain"
    return None


def detect_entrypoint(path: str) -> tuple[str, str] | None:
    path_obj = Path(path)
    name = path_obj.name
    lowered = path.lower()
    parent = path_obj.parent.name.lower()
    if name in {"main.py", "app.py", "server.py", "manage.py", "wsgi.py", "asgi.py", "__main__.py"}:
        return "Python runtime entrypoint", "certain"
    if name == "main.go":
        return "Go runtime entrypoint", "certain"
    if lowered == "src/main.rs" or (parent == "bin" and path_obj.suffix == ".rs"):
        return "Rust runtime entrypoint", "certain"
    if name in {"main.ts", "main.js", "server.ts", "server.js", "app.ts", "app.js", "cli.ts", "cli.js"}:
        return "JavaScript or TypeScript entrypoint", "probable"
    if name in {"index.ts", "index.js"} and path_depth(path) <= 3 and any(token in lowered for token in ("src/", "api/", "server", "cli")):
        return "JavaScript or TypeScript entrypoint", "possible"
    if name in {"artisan", "config.ru"}:
        return "Framework runtime entrypoint", "certain"
    if name == "index.php" and "public" in {part.lower() for part in path_obj.parts}:
        return "PHP web entrypoint", "certain"
    if re.search(r"(Main|Application)\.java$", name):
        return "JVM runtime entrypoint", "probable"
    if path_obj.parent.parts and path_obj.parent.parts[0] == "cmd" and name.endswith(".go"):
        return "Go command entrypoint", "probable"
    return None


def parse_package_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    dependencies: list[str] = []
    for field in ("dependencies", "peerDependencies", "optionalDependencies", "devDependencies"):
        if isinstance(data.get(field), dict):
            dependencies.extend(data[field].keys())
    scripts = sorted(data.get("scripts", {}).keys()) if isinstance(data.get("scripts"), dict) else []
    return {
        "ecosystem": "node",
        "name": data.get("name"),
        "dependencies": unique_sorted(dependencies),
        "scripts": scripts,
    }


def parse_pyproject(path: Path) -> dict[str, Any]:
    if tomllib is None:
        return {"ecosystem": "python", "name": None, "dependencies": []}
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    project = data.get("project", {})
    poetry = data.get("tool", {}).get("poetry", {})
    dependencies: list[str] = []
    for item in project.get("dependencies", []) or []:
        normalized = normalize_dependency_name(str(item))
        if normalized:
            dependencies.append(normalized)
    poetry_deps = poetry.get("dependencies", {})
    if isinstance(poetry_deps, dict):
        for name in poetry_deps:
            if name.lower() != "python":
                dependencies.append(name)
    return {
        "ecosystem": "python",
        "name": project.get("name") or poetry.get("name"),
        "dependencies": unique_sorted(dependencies),
    }


def parse_requirements(path: Path) -> dict[str, Any]:
    dependencies: list[str] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("-r "):
            continue
        normalized = normalize_dependency_name(stripped)
        if normalized:
            dependencies.append(normalized)
    return {
        "ecosystem": "python",
        "name": path.parent.name if path.parent.name != "." else None,
        "dependencies": unique_sorted(dependencies),
    }


def parse_cargo_toml(path: Path) -> dict[str, Any]:
    if tomllib is None:
        return {"ecosystem": "rust", "name": None, "dependencies": []}
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    dependencies: list[str] = []
    for field in ("dependencies", "dev-dependencies", "build-dependencies"):
        table = data.get(field, {})
        if isinstance(table, dict):
            dependencies.extend(table.keys())
    return {
        "ecosystem": "rust",
        "name": data.get("package", {}).get("name"),
        "dependencies": unique_sorted(dependencies),
    }


def parse_go_mod(path: Path) -> dict[str, Any]:
    module_name = None
    dependencies: list[str] = []
    in_require_block = False
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("//"):
            continue
        if stripped.startswith("module "):
            module_name = stripped.split(None, 1)[1].strip()
            continue
        if stripped == "require (":
            in_require_block = True
            continue
        if in_require_block and stripped == ")":
            in_require_block = False
            continue
        if stripped.startswith("require "):
            tokens = stripped.split()
            if len(tokens) >= 2:
                dependencies.append(tokens[1])
            continue
        if in_require_block:
            tokens = stripped.split()
            if tokens:
                dependencies.append(tokens[0])
    return {
        "ecosystem": "go",
        "name": module_name,
        "dependencies": unique_sorted(dependencies),
    }


def parse_composer_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    dependencies: list[str] = []
    for field in ("require", "require-dev"):
        table = data.get(field, {})
        if isinstance(table, dict):
            dependencies.extend(name for name in table.keys() if name.lower() != "php")
    return {
        "ecosystem": "php",
        "name": data.get("name"),
        "dependencies": unique_sorted(dependencies),
    }


def parse_gemfile(path: Path) -> dict[str, Any]:
    dependencies: list[str] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"\s*gem\s+['\"]([^'\"]+)['\"]", raw_line)
        if match:
            dependencies.append(match.group(1))
    return {
        "ecosystem": "ruby",
        "name": path.parent.name if path.parent.name != "." else None,
        "dependencies": unique_sorted(dependencies),
    }


def parse_pom_xml(path: Path) -> dict[str, Any]:
    tree = ET.parse(path)
    root = tree.getroot()
    artifact_id = None
    group_id = None
    dependencies: list[str] = []
    for element in root.iter():
        local = xml_local_name(element.tag)
        text = (element.text or "").strip()
        if not text:
            continue
        if local == "artifactId" and artifact_id is None:
            artifact_id = text
        if local == "groupId" and group_id is None:
            group_id = text
        if local == "dependency":
            dep_artifact = None
            dep_group = None
            for child in element:
                child_name = xml_local_name(child.tag)
                child_text = (child.text or "").strip()
                if child_name == "artifactId":
                    dep_artifact = child_text
                if child_name == "groupId":
                    dep_group = child_text
            if dep_artifact:
                dependencies.append(f"{dep_group}:{dep_artifact}" if dep_group else dep_artifact)
    name = f"{group_id}:{artifact_id}" if group_id and artifact_id else artifact_id
    return {
        "ecosystem": "java",
        "name": name,
        "dependencies": unique_sorted(dependencies),
    }


def parse_csproj(path: Path) -> dict[str, Any]:
    tree = ET.parse(path)
    root = tree.getroot()
    dependencies: list[str] = []
    for element in root.iter():
        if xml_local_name(element.tag) == "PackageReference":
            include = element.attrib.get("Include")
            if include:
                dependencies.append(include)
    return {
        "ecosystem": "dotnet",
        "name": path.stem,
        "dependencies": unique_sorted(dependencies),
    }


def parse_manifest(path: Path) -> dict[str, Any] | None:
    name = path.name
    suffix = path.suffix.lower()
    try:
        if name == "package.json":
            return parse_package_json(path)
        if name == "pyproject.toml":
            return parse_pyproject(path)
        if name == "requirements.txt":
            return parse_requirements(path)
        if name == "Cargo.toml":
            return parse_cargo_toml(path)
        if name == "go.mod":
            return parse_go_mod(path)
        if name == "composer.json":
            return parse_composer_json(path)
        if name == "Gemfile":
            return parse_gemfile(path)
        if name == "pom.xml":
            return parse_pom_xml(path)
        if suffix == ".csproj":
            return parse_csproj(path)
    except (OSError, ValueError, json.JSONDecodeError, ET.ParseError) + TOML_ERRORS:
        return None
    return None


def detect_module_kind(path: str, directory_info: dict[str, list[str]], local_entrypoints: list[str]) -> tuple[str, str]:
    path_obj = Path(path)
    name = path_obj.name.lower()
    parent = path_obj.parent.name.lower() if path_obj.parent != Path(".") else ""
    if parent in GROUP_KIND_MAP:
        return GROUP_KIND_MAP[parent]
    if name in GROUP_KIND_MAP:
        return GROUP_KIND_MAP[name]
    lowered = path.lower()
    if any(token in lowered for token in ("worker", "consumer", "queue")):
        return "worker", "probable"
    if any(token in lowered for token in ("job", "cron", "scheduler", "task")):
        return "job", "probable"
    if any(token in lowered for token in ("api", "server", "backend", "service")):
        return "service", "probable"
    if any(token in lowered for token in ("web", "frontend", "client", "ui")):
        return "application", "probable"
    if any(token in lowered for token in INFRA_DIR_TOKENS):
        return "infra", "probable"
    if local_entrypoints:
        return "application", "possible"
    if any(file_name in MANIFEST_FILENAMES for file_name in directory_info.get("files", [])):
        return "package", "possible"
    return "module", "possible"


def describe_responsibility(path: str, kind: str) -> str:
    path_tokens = {
        token
        for token in re.split(r"[/_.()\-\[\]]+", path.lower())
        if token
    }
    for role_tokens, message in ROLE_HINTS:
        if path_tokens & set(role_tokens):
            return message
    return f"Probable {kind} module."


def summarize_top_level_directory(path: str) -> str:
    name = Path(path).name.lower()
    if name in GROUP_KIND_MAP:
        kind, _ = GROUP_KIND_MAP[name]
        return f"Likely {kind} grouping directory."
    if name == "src":
        return "Possible primary source tree."
    if name == "docs":
        return "Likely long-form repository documentation."
    if name == "workflows":
        return "Possible workflow or automation definitions."
    if name == "skills":
        return "Possible packaged agent or automation skills."
    if name in SCRIPT_DIR_TOKENS:
        return "Likely automation or developer helper scripts."
    if name in TEST_DIR_TOKENS:
        return "Likely test-related assets."
    return "Role not obvious from the top-level name alone."


def infer_repo_shapes(top_level_directories: list[str], modules: list[dict[str, Any]], artifacts: dict[str, list[dict[str, Any]]]) -> list[str]:
    shapes: list[str] = []
    top_level_names = {Path(path).name.lower() for path in top_level_directories}
    module_kinds = {module["kind"] for module in modules}
    if top_level_names & {"apps", "services", "packages", "libs"}:
        shapes.append("monorepo")
    elif len(modules) >= 4:
        shapes.append("multi-module repository")
    if module_kinds & {"service", "worker", "job"}:
        shapes.append("service-oriented repository")
    if module_kinds == {"package"} or module_kinds == {"library"}:
        shapes.append("library-oriented repository")
    if artifacts["infra"] and len(modules) <= 1:
        shapes.append("infrastructure-heavy repository")
    if module_kinds & {"application", "service"} and {"package", "library"} & module_kinds:
        shapes.append("application plus shared-library layout")
    return unique_sorted(shapes)


def read_root_readme(repo_root: Path) -> tuple[str | None, str | None]:
    candidates = [repo_root / "README.md", repo_root / "README.mdx", repo_root / "README.rst"]
    for candidate in candidates:
        if not candidate.is_file():
            continue
        lines = candidate.read_text(encoding="utf-8").splitlines()
        heading = None
        paragraph: list[str] = []
        in_code_block = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("```"):
                in_code_block = not in_code_block
                continue
            if in_code_block:
                continue
            if heading is None and stripped.startswith("#"):
                heading = stripped.lstrip("#").strip()
                continue
            if heading and not stripped:
                if paragraph:
                    break
                continue
            if heading and stripped and not stripped.startswith("#") and not stripped.startswith("|") and not stripped.startswith("- "):
                paragraph.append(stripped)
        return heading, " ".join(paragraph) if paragraph else None
    return None, None


def build_inventory(repo_root: Path, max_depth: int = 6) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    artifacts: dict[str, list[dict[str, Any]]] = {
        "manifests": [],
        "lockfiles": [],
        "docs": [],
        "ci_cd": [],
        "docker": [],
        "infra": [],
        "configs": [],
        "tests": [],
        "scripts": [],
        "entrypoints": [],
    }
    directories: dict[str, dict[str, list[str]]] = {}
    manifest_by_directory: dict[str, list[dict[str, Any]]] = {}
    stack_signals: dict[str, list[str]] = {}

    for current_root, dir_names, file_names in os.walk(repo_root):
        current_path = Path(current_root)
        rel_dir = relative_string(current_path, repo_root)
        depth = path_depth(rel_dir)
        dir_names[:] = sorted(
            directory
            for directory in dir_names
            if directory not in IGNORED_DIRS and not directory.startswith(".cache")
        )
        if depth >= max_depth:
            dir_names[:] = []
        directories[rel_dir] = {
            "files": sorted(file_names),
            "dirs": list(dir_names),
        }
        for file_name in sorted(file_names):
            full_path = current_path / file_name
            rel_path = relative_string(full_path, repo_root)
            lower_name = file_name.lower()

            manifest_match = MANIFEST_FILENAMES.get(file_name)
            if manifest_match is None and full_path.suffix.lower() == ".csproj":
                manifest_match = ("dotnet", "project manifest")
            if manifest_match:
                ecosystem, kind = manifest_match
                parsed = parse_manifest(full_path) or {"ecosystem": ecosystem, "name": None, "dependencies": []}
                details = {
                    "ecosystem": parsed.get("ecosystem", ecosystem),
                    "package_name": parsed.get("name"),
                }
                if parsed.get("dependencies"):
                    details["dependency_count"] = len(parsed["dependencies"])
                artifacts["manifests"].append(make_artifact(rel_path, kind, "certain", details))
                manifest_by_directory.setdefault(rel_dir, []).append(
                    {
                        "path": rel_path,
                        "ecosystem": parsed.get("ecosystem", ecosystem),
                        "name": parsed.get("name"),
                        "dependencies": parsed.get("dependencies", []),
                        "scripts": parsed.get("scripts", []),
                    }
                )
                stack_signals.setdefault(parsed.get("ecosystem", ecosystem), []).append(rel_path)
                continue

            lockfile_match = LOCKFILE_PATTERNS.get(file_name)
            if lockfile_match:
                ecosystem, kind = lockfile_match
                artifacts["lockfiles"].append(make_artifact(rel_path, kind, "certain", {"ecosystem": ecosystem}))
                stack_signals.setdefault(ecosystem, []).append(rel_path)
                continue

            ci_match = detect_ci(rel_path)
            if ci_match:
                kind, confidence = ci_match
                artifacts["ci_cd"].append(make_artifact(rel_path, kind, confidence))
                continue

            docker_match = detect_docker(rel_path)
            if docker_match:
                kind, confidence = docker_match
                artifacts["docker"].append(make_artifact(rel_path, kind, confidence))
                stack_signals.setdefault("docker", []).append(rel_path)
                continue

            infra_match = detect_infra(rel_path)
            if infra_match:
                kind, confidence = infra_match
                artifacts["infra"].append(make_artifact(rel_path, kind, confidence))
                if kind.startswith("Terraform"):
                    stack_signals.setdefault("terraform", []).append(rel_path)
                elif kind.startswith("Helm"):
                    stack_signals.setdefault("helm", []).append(rel_path)
                elif kind.startswith("Kustomize") or "k8s" in rel_path.lower() or "kubernetes" in rel_path.lower():
                    stack_signals.setdefault("kubernetes", []).append(rel_path)
                continue

            is_doc, doc_kind = looks_like_doc(rel_path)
            if is_doc:
                artifacts["docs"].append(make_artifact(rel_path, doc_kind or "doc", "certain"))
                continue

            test_match = detect_test(rel_path)
            if test_match:
                kind, confidence = test_match
                artifacts["tests"].append(make_artifact(rel_path, kind, confidence))
                continue

            entrypoint_match = detect_entrypoint(rel_path)
            if entrypoint_match:
                kind, confidence = entrypoint_match
                artifacts["entrypoints"].append(make_artifact(rel_path, kind, confidence))
                continue

            script_match = detect_script(rel_path)
            if script_match:
                kind, confidence = script_match
                artifacts["scripts"].append(make_artifact(rel_path, kind, confidence))
                continue

            config_match = detect_config(rel_path)
            if config_match:
                kind, confidence = config_match
                artifacts["configs"].append(make_artifact(rel_path, kind, confidence))

    top_level_directories = [path for path in directories.get(".", {}).get("dirs", [])]
    top_level_directories = [path for path in top_level_directories if not path.startswith(".")]
    top_level_directories = [path for path in top_level_directories]
    top_level_paths = [path if "/" in path else path for path in top_level_directories]

    candidate_directories: set[str] = set()
    for rel_dir, info in directories.items():
        if rel_dir == ".":
            continue
        path_obj = Path(rel_dir)
        parent_name = path_obj.parent.name.lower() if path_obj.parent != Path(".") else ""
        if parent_name in GROUP_KIND_MAP and path_depth(rel_dir) <= 2:
            candidate_directories.add(rel_dir)
            continue
        if rel_dir in manifest_by_directory:
            candidate_directories.add(rel_dir)
            continue
        if path_obj.name.lower() in INFRA_DIR_TOKENS | {"docs"} and path_depth(rel_dir) == 1:
            candidate_directories.add(rel_dir)
            continue

    if not candidate_directories and manifest_by_directory.get("."):
        candidate_directories.add(".")

    module_name_to_paths: dict[str, list[str]] = {}
    for rel_dir in sorted(candidate_directories):
        for manifest in manifest_by_directory.get(rel_dir, []):
            name = manifest.get("name")
            if name:
                module_name_to_paths.setdefault(name, []).append(rel_dir)

    docs_paths = [artifact["path"] for artifact in artifacts["docs"]]
    modules: list[dict[str, Any]] = []
    for rel_dir in sorted(candidate_directories):
        directory_info = directories.get(rel_dir, {"files": [], "dirs": []})
        local_entrypoints = [
            artifact["path"]
            for artifact in artifacts["entrypoints"]
            if artifact["path"] == rel_dir or artifact["path"].startswith(rel_dir + "/")
        ]
        local_tests = [
            artifact["path"]
            for artifact in artifacts["tests"]
            if artifact["path"] == rel_dir or artifact["path"].startswith(rel_dir + "/")
        ]
        local_docs = [
            path
            for path in docs_paths
            if path == rel_dir + "/README.md"
            or path.startswith(rel_dir + "/docs/")
            or path.startswith(rel_dir + "/")
        ]
        related_docs = [
            path
            for path in docs_paths
            if path.startswith("docs/")
            and Path(path).stem.lower().replace("_", "-") in rel_dir.lower().replace("_", "-")
        ]
        manifests = manifest_by_directory.get(rel_dir, [])
        kind, confidence = detect_module_kind(rel_dir, directory_info, local_entrypoints)
        dependencies: list[str] = []
        manifest_names: list[str] = []
        for manifest in manifests:
            dependencies.extend(manifest.get("dependencies", []))
            if manifest.get("name"):
                manifest_names.append(manifest["name"])
        dependency_names = unique_sorted(dependencies)
        internal_paths = sorted(
            {
                candidate_path
                for dependency in dependency_names
                for candidate_path in module_name_to_paths.get(dependency, [])
                if candidate_path != rel_dir
            }
        )
        internal_names = sorted(
            {
                dependency
                for dependency in dependency_names
                if dependency in module_name_to_paths
                and any(candidate_path != rel_dir for candidate_path in module_name_to_paths[dependency])
            }
        )
        external_dependencies = [dependency for dependency in dependency_names if dependency not in internal_names]
        module_name = manifest_names[0] if manifest_names else Path(rel_dir).name
        modules.append(
            {
                "path": rel_dir,
                "name": module_name,
                "kind": kind,
                "confidence": confidence,
                "probable_responsibility": describe_responsibility(rel_dir, kind),
                "manifest_paths": [manifest["path"] for manifest in manifests],
                "manifest_names": manifest_names,
                "entrypoints": sorted(local_entrypoints),
                "test_paths": sorted(local_tests),
                "local_doc_paths": sorted(local_docs),
                "related_doc_paths": sorted(set(related_docs) - set(local_docs)),
                "internal_dependency_paths": internal_paths,
                "internal_dependency_names": internal_names,
                "external_dependencies_sample": external_dependencies[:8],
            }
        )

    detected_stacks: list[dict[str, Any]] = []
    for stack, evidence in sorted(stack_signals.items()):
        confidence = "certain" if any(Path(item).name in MANIFEST_FILENAMES or Path(item).suffix.lower() == ".csproj" for item in evidence) else "probable"
        detected_stacks.append(
            {
                "name": stack,
                "confidence": confidence,
                "evidence": evidence[:8],
            }
        )

    root_heading, root_summary = read_root_readme(repo_root)
    documentation = {
        "root_readme": any(artifact["kind"] == "readme" and Path(artifact["path"]).name.lower().startswith("readme") and "/" not in artifact["path"] for artifact in artifacts["docs"]),
        "architecture_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "architecture"]),
        "repo_map_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "repo-map"]),
        "runbook_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "runbook"]),
        "onboarding_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "onboarding"]),
        "testing_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "testing"]),
        "deployment_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "deployment"]),
        "troubleshooting_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "troubleshooting"]),
        "glossary_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "glossary"]),
        "adr_paths": sorted([artifact["path"] for artifact in artifacts["docs"] if artifact["kind"] == "adr"]),
        "doc_directories": sorted(
            {
                str(Path(artifact["path"]).parent)
                for artifact in artifacts["docs"]
                if str(Path(artifact["path"]).parent) not in {"", "."}
            }
        ),
    }

    inventory = {
        "generated_at": utc_now(),
        "repo_root": str(repo_root),
        "repo_name": repo_root.name,
        "max_depth": max_depth,
        "overview": {
            "top_level_directories": top_level_paths,
            "visible_root_files": sorted(file_name for file_name in directories.get(".", {}).get("files", []) if not file_name.startswith(".")),
            "detected_stacks": detected_stacks,
            "probable_repo_shapes": infer_repo_shapes(top_level_paths, modules, artifacts),
            "root_readme_heading": root_heading,
            "root_readme_summary": root_summary,
            "module_count": len(modules),
            "manifest_count": len(artifacts["manifests"]),
            "doc_count": len(artifacts["docs"]),
        },
        "documentation": documentation,
        "artifacts": {category: sorted(items, key=lambda item: item["path"]) for category, items in artifacts.items()},
        "modules": sorted(modules, key=lambda item: item["path"]),
        "top_level_structure": [
            {
                "path": path,
                "probable_role": summarize_top_level_directory(path),
            }
            for path in top_level_paths
        ],
    }
    return inventory


def render_category_table(title: str, artifacts: list[dict[str, Any]]) -> list[str]:
    if not artifacts:
        return []
    lines = [f"## {title}", "", "| Path | Kind | Confidence | Notes |", "| --- | --- | --- | --- |"]
    for artifact in artifacts:
        details = artifact.get("details", {})
        notes = []
        if "ecosystem" in details:
            notes.append(details["ecosystem"])
        if "package_name" in details and details["package_name"]:
            notes.append(f"name: {details['package_name']}")
        if "dependency_count" in details:
            notes.append(f"deps: {details['dependency_count']}")
        lines.append(
            f"| `{artifact['path']}` | {artifact['kind']} | {artifact['confidence']} | {'; '.join(notes) if notes else '-'} |"
        )
    lines.append("")
    return lines


def render_inventory_markdown(inventory: dict[str, Any]) -> str:
    overview = inventory["overview"]
    documentation = inventory["documentation"]
    detected_stacks = (
        ", ".join(f"{item['name']} ({item['confidence']})" for item in overview["detected_stacks"])
        if overview["detected_stacks"]
        else "none detected"
    )
    lines = [
        "# Repository Inventory",
        "",
        f"Generated: `{inventory['generated_at']}`",
        f"Repo root: `{inventory['repo_root']}`",
        "",
        "## Overview",
        "",
        f"- Repo: `{inventory['repo_name']}`",
        f"- Probable shapes: {', '.join(overview['probable_repo_shapes']) if overview['probable_repo_shapes'] else 'not obvious from the scanned artifacts'}",
        f"- Detected stacks: {detected_stacks}",
        f"- Root README present: {'yes' if documentation['root_readme'] else 'no'}",
        f"- Modules detected: {overview['module_count']}",
        f"- Docs detected: {overview['doc_count']}",
        "",
    ]
    if overview["root_readme_heading"] or overview["root_readme_summary"]:
        lines.extend(["## Root README signal", ""])
        if overview["root_readme_heading"]:
            lines.append(f"- Heading: {overview['root_readme_heading']}")
        if overview["root_readme_summary"]:
            lines.append(f"- Summary: {overview['root_readme_summary']}")
        lines.append("")
    if inventory["top_level_structure"]:
        lines.extend(["## Top-level structure", "", "| Path | Probable role |", "| --- | --- |"])
        for item in inventory["top_level_structure"]:
            lines.append(f"| `{item['path']}` | {item['probable_role']} |")
        lines.append("")
    for title, key in (
        ("Manifests", "manifests"),
        ("Lockfiles", "lockfiles"),
        ("Documentation Files", "docs"),
        ("CI/CD", "ci_cd"),
        ("Docker", "docker"),
        ("Infrastructure", "infra"),
        ("Configuration", "configs"),
        ("Tests", "tests"),
        ("Scripts", "scripts"),
        ("Entrypoints", "entrypoints"),
    ):
        lines.extend(render_category_table(title, inventory["artifacts"][key]))
    if inventory["modules"]:
        lines.extend(
            [
                "## Modules",
                "",
                "| Path | Kind | Confidence | Entrypoints | Internal deps | Docs |",
                "| --- | --- | --- | --- | --- | --- |",
            ]
        )
        for module in inventory["modules"]:
            lines.append(
                "| `{path}` | {kind} | {confidence} | {entrypoints} | {deps} | {docs} |".format(
                    path=module["path"],
                    kind=module["kind"],
                    confidence=module["confidence"],
                    entrypoints=", ".join(f"`{entry}`" for entry in module["entrypoints"][:3]) or "-",
                    deps=", ".join(module["internal_dependency_paths"][:4]) or "-",
                    docs=", ".join(f"`{doc}`" for doc in module["local_doc_paths"][:2]) or "-",
                )
            )
        lines.append("")
        lines.extend(["## Module notes", ""])
        for module in inventory["modules"]:
            lines.append(f"- `{module['path']}`: {module['probable_responsibility']}")
        lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inventory a repository for documentation and architecture work.")
    parser.add_argument("repo_root", type=Path, help="Path to the repository root to inspect.")
    parser.add_argument("--format", choices=("json", "markdown"), default="markdown")
    parser.add_argument("--max-depth", type=int, default=6, help="Maximum directory depth to descend while scanning.")
    parser.add_argument("--write", type=Path, help="Optional output path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    inventory = build_inventory(args.repo_root, max_depth=args.max_depth)
    output = json.dumps(inventory, indent=2) if args.format == "json" else render_inventory_markdown(inventory)
    if args.write:
        args.write.write_text(output + ("" if output.endswith("\n") else "\n"), encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
