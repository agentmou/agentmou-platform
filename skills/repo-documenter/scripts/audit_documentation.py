#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

WORKSPACE_GROUPS = ("apps", "services", "packages")
IGNORED_DIRS = {
    ".git",
    ".next",
    ".turbo",
    ".venv",
    "__pycache__",
    "coverage",
    "dist",
    "build",
    "node_modules",
}
SOURCE_SUFFIXES = {".ts", ".tsx"}
EXPORT_RE = re.compile(
    r"(?m)^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|enum)\b"
)
DOCUMENTED_EXPORT_RE = re.compile(
    r"(?ms)/\*\*.*?\*/\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|enum)\b"
)


@dataclass
class WorkspaceUnit:
    group: str
    path: str
    package_name: str | None
    has_readme: bool
    source_files: int
    exported_declarations: int
    documented_exports: int

    @property
    def missing_export_docs(self) -> int:
        return max(self.exported_declarations - self.documented_exports, 0)


@dataclass
class AuditReport:
    generated_at: str
    repo_root: str
    root_readme: bool
    current_state_doc: bool
    env_example: bool
    adr_count: int
    runbook_count: int
    units: list[WorkspaceUnit]


def repo_root_from_script() -> Path:
    return Path(__file__).resolve().parents[3]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit documentation coverage for a monorepo.")
    parser.add_argument("--repo-root", type=Path, default=repo_root_from_script())
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--write", type=Path, help="Optional output file path.")
    return parser.parse_args()


def iter_workspace_units(repo_root: Path) -> Iterable[WorkspaceUnit]:
    for group in WORKSPACE_GROUPS:
        group_root = repo_root / group
        if not group_root.is_dir():
            continue
        for entry in sorted(group_root.iterdir()):
            if not entry.is_dir() or entry.name.startswith(".") or entry.name in IGNORED_DIRS:
                continue
            package_json = entry / "package.json"
            package_name = None
            if package_json.is_file():
                try:
                    package_name = json.loads(package_json.read_text()).get("name")
                except json.JSONDecodeError:
                    package_name = None
            source_files = list(iter_source_files(entry))
            exported_declarations = 0
            documented_exports = 0
            for source_file in source_files:
                text = source_file.read_text(encoding="utf-8")
                exported_declarations += len(EXPORT_RE.findall(text))
                documented_exports += len(DOCUMENTED_EXPORT_RE.findall(text))
            yield WorkspaceUnit(
                group=group,
                path=str(entry.relative_to(repo_root)),
                package_name=package_name,
                has_readme=(entry / "README.md").is_file(),
                source_files=len(source_files),
                exported_declarations=exported_declarations,
                documented_exports=documented_exports,
            )


def iter_source_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in SOURCE_SUFFIXES or path.name.endswith(".d.ts"):
            continue
        if any(part in IGNORED_DIRS for part in path.parts):
            continue
        yield path


def count_docs(repo_root: Path, relative_dir: str) -> int:
    doc_dir = repo_root / relative_dir
    if not doc_dir.is_dir():
        return 0
    return len([path for path in doc_dir.iterdir() if path.is_file() and path.suffix == ".md" and path.name != ".gitkeep"])


def build_report(repo_root: Path) -> AuditReport:
    return AuditReport(
        generated_at=datetime.now(timezone.utc).isoformat(),
        repo_root=str(repo_root),
        root_readme=(repo_root / "README.md").is_file(),
        current_state_doc=(repo_root / "docs/architecture/current-state.md").is_file(),
        env_example=(repo_root / "infra/compose/.env.example").is_file(),
        adr_count=count_docs(repo_root, "docs/adr"),
        runbook_count=count_docs(repo_root, "docs/runbooks"),
        units=list(iter_workspace_units(repo_root)),
    )


def render_markdown(report: AuditReport) -> str:
    lines: list[str] = []
    lines.append("# Documentation Audit")
    lines.append("")
    lines.append(f"Generated: `{report.generated_at}`")
    lines.append(f"Repo root: `{report.repo_root}`")
    lines.append("")
    lines.append("## Repo-Level Coverage")
    lines.append("")
    lines.append("| Check | Status |")
    lines.append("| --- | --- |")
    lines.append(f"| Root README | {'yes' if report.root_readme else 'no'} |")
    lines.append(
        f"| Current state (`docs/architecture/current-state.md`) | {'yes' if report.current_state_doc else 'no'} |"
    )
    lines.append(f"| Env example (`infra/compose/.env.example`) | {'yes' if report.env_example else 'no'} |")
    lines.append(f"| ADR count | {report.adr_count} |")
    lines.append(f"| Runbook count | {report.runbook_count} |")
    lines.append("")
    lines.append("## Workspace Units")
    lines.append("")
    lines.append("| Path | Package name | README | Source files | Exported declarations | TSDoc-covered exports | Missing export docs |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- |")
    for unit in report.units:
        lines.append(
            "| {path} | {package_name} | {readme} | {source_files} | {exports} | {documented} | {missing} |".format(
                path=unit.path,
                package_name=unit.package_name or "-",
                readme="yes" if unit.has_readme else "no",
                source_files=unit.source_files,
                exports=unit.exported_declarations,
                documented=unit.documented_exports,
                missing=unit.missing_export_docs,
            )
        )
    lines.append("")
    lines.extend(render_actions(report))
    return "\n".join(lines)


def render_actions(report: AuditReport) -> list[str]:
    lines = ["## Suggested Next Actions", ""]
    missing_readmes = [unit.path for unit in report.units if not unit.has_readme]
    packages_with_export_gaps = [
        unit for unit in report.units if unit.group == "packages" and unit.missing_export_docs > 0
    ]
    if missing_readmes:
        lines.append("1. Add or expand README files for: " + ", ".join(f"`{path}`" for path in missing_readmes) + ".")
    else:
        lines.append("1. README coverage is present for all first-level apps, services, and packages.")
    if packages_with_export_gaps:
        ranked = sorted(packages_with_export_gaps, key=lambda unit: unit.missing_export_docs, reverse=True)
        summary = ", ".join(
            f"`{unit.path}` ({unit.missing_export_docs})" for unit in ranked[:5]
        )
        lines.append(
            "2. Review package exports that appear to lack TSDoc, starting with: " + summary + "."
        )
    else:
        lines.append("2. No package-level TSDoc gaps were detected by the heuristic export scan.")
    if report.runbook_count == 0:
        lines.append("3. Add at least one runbook under `docs/runbooks/` for local recovery, deployment, or operations.")
    else:
        lines.append("3. Check whether existing runbooks cover the most failure-prone operational paths.")
    if report.adr_count == 0:
        lines.append("4. Capture major architectural decisions under `docs/adr/` before the code diverges from team memory.")
    else:
        lines.append("4. Review whether recent cross-package decisions need new ADRs or ADR updates.")
    if not report.env_example:
        lines.append("5. Add `infra/compose/.env.example` comments for every required environment variable.")
    else:
        lines.append("5. Confirm `infra/compose/.env.example` still documents every required environment variable.")
    return lines


def render_json(report: AuditReport) -> str:
    payload = asdict(report)
    for unit in payload["units"]:
        unit["missing_export_docs"] = max(unit["exported_declarations"] - unit["documented_exports"], 0)
    return json.dumps(payload, indent=2)


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    report = build_report(repo_root)
    output = render_markdown(report) if args.format == "markdown" else render_json(report)
    if args.write:
        args.write.write_text(output + ("\n" if not output.endswith("\n") else ""), encoding="utf-8")
    else:
        sys.stdout.write(output)
        if not output.endswith("\n"):
            sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
