#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from inventory_repo import build_inventory


PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_inventory(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def add_gap(
    gaps: list[dict[str, Any]],
    priority: str,
    title: str,
    reason: str,
    recommended_doc: str,
    evidence: list[str],
    confidence: str = "probable",
) -> None:
    gaps.append(
        {
            "priority": priority,
            "title": title,
            "reason": reason,
            "recommended_doc": recommended_doc,
            "evidence": evidence,
            "confidence": confidence,
        }
    )


def build_gaps(repo_root: Path, inventory: dict[str, Any]) -> dict[str, Any]:
    documentation = inventory["documentation"]
    modules = inventory["modules"]
    service_like_modules = [module for module in modules if module["kind"] in {"application", "service", "worker", "job"}]
    complex_repo = len(modules) >= 4 or len(inventory["overview"]["detected_stacks"]) >= 2
    gaps: list[dict[str, Any]] = []

    if not documentation["root_readme"]:
        add_gap(
            gaps,
            "high",
            "Missing root orientation document",
            "A newcomer does not have an obvious starting point for purpose, structure, and local workflow.",
            "README.md",
            ["No root README was detected."],
            "certain",
        )

    if complex_repo and not documentation["repo_map_paths"]:
        add_gap(
            gaps,
            "high",
            "Missing repo map",
            "Multi-module repositories are much harder to navigate without a folder and module map.",
            "docs/repo-map.md",
            [f"Detected modules: {len(modules)}", f"Probable shapes: {', '.join(inventory['overview']['probable_repo_shapes']) or 'unspecified'}"],
            "probable",
        )

    if (complex_repo or service_like_modules) and not documentation["architecture_paths"]:
        add_gap(
            gaps,
            "high",
            "Missing architecture overview",
            "The repository has enough moving parts that boundaries, flows, and dependency directions should be written down explicitly.",
            "docs/architecture.md",
            [f"Service-like modules: {len(service_like_modules)}", f"Detected stacks: {', '.join(item['name'] for item in inventory['overview']['detected_stacks']) or 'none'}"],
            "probable",
        )

    if inventory["artifacts"]["tests"] and not documentation["testing_paths"]:
        add_gap(
            gaps,
            "medium",
            "Missing testing guide",
            "Tests exist, but there is no obvious document explaining where they live, how to run them, or what the layers mean.",
            "docs/testing.md",
            [f"Test artifacts detected: {len(inventory['artifacts']['tests'])}"],
            "certain",
        )

    if (inventory["artifacts"]["docker"] or inventory["artifacts"]["infra"] or inventory["artifacts"]["ci_cd"]) and not documentation["deployment_paths"]:
        add_gap(
            gaps,
            "high",
            "Missing deployment documentation",
            "Deployment-related files exist, but there is no obvious deployment guide or release overview.",
            "docs/deployment.md",
            [
                f"Docker artifacts: {len(inventory['artifacts']['docker'])}",
                f"Infrastructure artifacts: {len(inventory['artifacts']['infra'])}",
                f"CI/CD artifacts: {len(inventory['artifacts']['ci_cd'])}",
            ],
            "probable",
        )

    if any(module["kind"] in {"worker", "job"} for module in modules) and not documentation["runbook_paths"]:
        add_gap(
            gaps,
            "high",
            "Missing operational runbook",
            "Background execution surfaces were detected, but no runbook explains diagnosis or recovery.",
            "docs/runbooks/background-operations.md",
            [f"Worker or job modules: {', '.join(module['path'] for module in modules if module['kind'] in {'worker', 'job'})}"],
            "probable",
        )

    if service_like_modules and not documentation["troubleshooting_paths"]:
        add_gap(
            gaps,
            "medium",
            "Missing troubleshooting guide",
            "Runtime-facing modules exist, but there is no obvious troubleshooting document for common failures.",
            "docs/troubleshooting.md",
            [f"Runtime-facing modules: {len(service_like_modules)}"],
            "probable",
        )

    if complex_repo and not documentation["onboarding_paths"]:
        add_gap(
            gaps,
            "medium",
            "Missing onboarding guide",
            "The repository appears large enough that a newcomer would benefit from a curated reading order and setup guide.",
            "docs/onboarding.md",
            [f"Top-level directories: {len(inventory['overview']['top_level_directories'])}", f"Modules: {len(modules)}"],
            "probable",
        )

    if complex_repo and not documentation["glossary_paths"]:
        add_gap(
            gaps,
            "low",
            "Missing glossary",
            "A glossary can reduce ambiguity in multi-module repositories with domain-specific terms.",
            "docs/glossary.md",
            [f"Modules: {len(modules)}"],
            "possible",
        )

    if complex_repo and not documentation["adr_paths"]:
        add_gap(
            gaps,
            "low",
            "No ADRs detected",
            "A complex repository often benefits from lightweight records for durable architectural decisions.",
            "docs/adr/0001-example.md",
            [f"Probable shapes: {', '.join(inventory['overview']['probable_repo_shapes']) or 'unspecified'}"],
            "possible",
        )

    for module in modules:
        has_obvious_docs = bool(module["local_doc_paths"] or module["related_doc_paths"])
        if has_obvious_docs:
            continue
        priority = "medium"
        if module["kind"] in {"service", "worker", "job"}:
            priority = "high"
        elif module["kind"] in {"application", "package", "library"}:
            priority = "medium"
        add_gap(
            gaps,
            priority,
            f"Module lacks obvious documentation: {module['path']}",
            "This module looks important enough to merit a local README or a focused module document, but no obvious matching doc was found.",
            f"{module['path']}/README.md",
            [
                f"Kind: {module['kind']}",
                f"Entrypoints: {', '.join(module['entrypoints']) or 'none obvious'}",
                f"Internal deps: {', '.join(module['internal_dependency_paths']) or 'none detected'}",
            ],
            "probable" if module["confidence"] != "certain" else "certain",
        )
        if module["confidence"] != "certain":
            add_gap(
                gaps,
                "medium",
                f"Module role is still unclear: {module['path']}",
                "The scan found a candidate module, but its role could not be classified with high confidence.",
                f"{module['path']}/README.md",
                [module["probable_responsibility"]],
                "possible",
            )

    gaps.sort(key=lambda gap: (PRIORITY_ORDER[gap["priority"]], gap["title"]))
    summary = {
        "high": sum(1 for gap in gaps if gap["priority"] == "high"),
        "medium": sum(1 for gap in gaps if gap["priority"] == "medium"),
        "low": sum(1 for gap in gaps if gap["priority"] == "low"),
    }
    return {
        "generated_at": utc_now(),
        "repo_root": str(repo_root.resolve()),
        "repo_name": inventory["repo_name"],
        "summary": summary,
        "gaps": gaps,
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Documentation Gaps",
        "",
        f"Generated: `{report['generated_at']}`",
        f"Repo root: `{report['repo_root']}`",
        "",
        "## Summary",
        "",
        f"- High priority gaps: {report['summary']['high']}",
        f"- Medium priority gaps: {report['summary']['medium']}",
        f"- Low priority gaps: {report['summary']['low']}",
        "",
    ]
    if report["gaps"]:
        lines.extend(
            [
                "## Prioritized gaps",
                "",
                "| Priority | Gap | Recommended doc | Confidence |",
                "| --- | --- | --- | --- |",
            ]
        )
        for gap in report["gaps"]:
            lines.append(
                f"| {gap['priority']} | {gap['title']} | `{gap['recommended_doc']}` | {gap['confidence']} |"
            )
        lines.append("")
        lines.extend(["## Gap details", ""])
        for gap in report["gaps"]:
            lines.append(f"### {gap['title']}")
            lines.append("")
            lines.append(f"- Priority: {gap['priority']}")
            lines.append(f"- Reason: {gap['reason']}")
            lines.append(f"- Recommended doc: `{gap['recommended_doc']}`")
            lines.append(f"- Confidence: {gap['confidence']}")
            lines.append("- Evidence:")
            for item in gap["evidence"]:
                lines.append(f"  - {item}")
            lines.append("")
    else:
        lines.append("No obvious documentation gaps were detected by the heuristic scan.")
        lines.append("")
    lines.append("These findings are heuristics. Confirm the highest-priority gaps against the code and existing docs before writing new files.")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Identify likely high-value documentation gaps in a repository.")
    parser.add_argument("repo_root", type=Path, help="Path to the repository root to inspect.")
    parser.add_argument("--inventory", type=Path, help="Optional JSON inventory created by inventory_repo.py.")
    parser.add_argument("--format", choices=("json", "markdown"), default="markdown")
    parser.add_argument("--write", type=Path, help="Optional output path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    inventory = load_inventory(args.inventory) if args.inventory else build_inventory(args.repo_root)
    report = build_gaps(args.repo_root, inventory)
    output = json.dumps(report, indent=2) if args.format == "json" else render_markdown(report)
    if args.write:
        args.write.write_text(output + ("" if output.endswith("\n") else "\n"), encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
