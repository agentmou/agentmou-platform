#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from inventory_repo import build_inventory


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_inventory(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def summarize_module(module: dict[str, Any]) -> dict[str, Any]:
    notes: list[str] = []
    if not module["local_doc_paths"] and not module["related_doc_paths"]:
        notes.append("No obvious module documentation detected.")
    if not module["entrypoints"] and module["kind"] in {"application", "service", "worker", "job"}:
        notes.append("Runtime entrypoint is not obvious from the scanned paths.")
    if module["confidence"] != "certain":
        notes.append("Classification is heuristic.")
    return {
        "path": module["path"],
        "kind": module["kind"],
        "responsibility": module["probable_responsibility"],
        "entrypoints": module["entrypoints"],
        "internal_dependency_paths": module["internal_dependency_paths"],
        "notes": notes,
    }


def build_repo_map(repo_root: Path, inventory: dict[str, Any]) -> dict[str, Any]:
    modules = [summarize_module(module) for module in inventory["modules"]]
    request_surfaces = [
        module["path"]
        for module in modules
        if module["kind"] in {"application", "service"}
    ]
    background_surfaces = [
        module["path"]
        for module in modules
        if module["kind"] in {"worker", "job"}
    ]
    internal_edges = [
        {
            "from": module["path"],
            "to": module["internal_dependency_paths"],
        }
        for module in modules
        if module["internal_dependency_paths"]
    ]
    dark_zones = []
    for module in modules:
        if module["notes"]:
            dark_zones.append(
                {
                    "path": module["path"],
                    "notes": module["notes"],
                }
            )
    critical_configuration = (
        inventory["artifacts"]["configs"][:8]
        + inventory["artifacts"]["docker"][:4]
        + inventory["artifacts"]["infra"][:6]
        + inventory["artifacts"]["ci_cd"][:4]
    )
    return {
        "generated_at": utc_now(),
        "repo_root": str(repo_root.resolve()),
        "repo_name": inventory["repo_name"],
        "overview": {
            "purpose_heading": inventory["overview"].get("root_readme_heading"),
            "purpose_summary": inventory["overview"].get("root_readme_summary"),
            "probable_repo_shapes": inventory["overview"].get("probable_repo_shapes", []),
            "detected_stacks": inventory["overview"].get("detected_stacks", []),
        },
        "top_level_structure": inventory["top_level_structure"],
        "modules": modules,
        "flows": {
            "request_surfaces": request_surfaces,
            "background_surfaces": background_surfaces,
            "internal_dependency_edges": internal_edges,
        },
        "critical_configuration": critical_configuration,
        "dark_zones": dark_zones,
    }


def render_repo_map_markdown(repo_map: dict[str, Any]) -> str:
    overview = repo_map["overview"]
    detected_stacks = (
        ", ".join(f"{item['name']} ({item['confidence']})" for item in overview["detected_stacks"])
        if overview["detected_stacks"]
        else "none detected"
    )
    lines = [
        "# Repo Map",
        "",
        f"Generated: `{repo_map['generated_at']}`",
        f"Repo root: `{repo_map['repo_root']}`",
        "",
        "## Overview",
        "",
    ]
    if overview.get("purpose_heading"):
        lines.append(f"- Heading signal: {overview['purpose_heading']}")
    if overview.get("purpose_summary"):
        lines.append(f"- Purpose hint: {overview['purpose_summary']}")
    if not overview.get("purpose_heading") and not overview.get("purpose_summary"):
        lines.append("- Purpose hint: not explicitly stated in the scanned root documentation.")
    lines.append(
        f"- Probable repo shapes: {', '.join(overview['probable_repo_shapes']) if overview['probable_repo_shapes'] else 'not obvious from the scanned artifacts'}"
    )
    lines.append(f"- Detected stacks: {detected_stacks}")
    lines.append("")
    if repo_map["top_level_structure"]:
        lines.extend(["## Top-level structure", "", "| Path | Probable role |", "| --- | --- |"])
        for item in repo_map["top_level_structure"]:
            lines.append(f"| `{item['path']}` | {item['probable_role']} |")
        lines.append("")
    if repo_map["modules"]:
        lines.extend(
            [
                "## Key modules",
                "",
                "| Path | Kind | Responsibility | Entrypoints | Depends on |",
                "| --- | --- | --- | --- | --- |",
            ]
        )
        for module in repo_map["modules"]:
            lines.append(
                "| `{path}` | {kind} | {responsibility} | {entrypoints} | {deps} |".format(
                    path=module["path"],
                    kind=module["kind"],
                    responsibility=module["responsibility"],
                    entrypoints=", ".join(f"`{path}`" for path in module["entrypoints"][:3]) or "-",
                    deps=", ".join(f"`{path}`" for path in module["internal_dependency_paths"][:4]) or "-",
                )
            )
        lines.append("")
    lines.extend(["## Entrypoints and flows", ""])
    lines.append(
        f"- Request-facing surfaces: {', '.join(f'`{path}`' for path in repo_map['flows']['request_surfaces']) if repo_map['flows']['request_surfaces'] else 'none confidently identified'}"
    )
    lines.append(
        f"- Background surfaces: {', '.join(f'`{path}`' for path in repo_map['flows']['background_surfaces']) if repo_map['flows']['background_surfaces'] else 'none confidently identified'}"
    )
    if repo_map["flows"]["internal_dependency_edges"]:
        lines.append("- Internal dependency edges:")
        for edge in repo_map["flows"]["internal_dependency_edges"]:
            lines.append(f"  - `{edge['from']}` -> {', '.join(f'`{path}`' for path in edge['to'])}")
    else:
        lines.append("- Internal dependency edges: none confidently detected from manifest metadata.")
    lines.append("")
    if repo_map["critical_configuration"]:
        lines.extend(["## Critical configuration", ""])
        for artifact in repo_map["critical_configuration"]:
            lines.append(f"- `{artifact['path']}`: {artifact['kind']}")
        lines.append("")
    lines.extend(["## Dark zones", ""])
    if repo_map["dark_zones"]:
        for dark_zone in repo_map["dark_zones"]:
            lines.append(f"- `{dark_zone['path']}`: {' '.join(dark_zone['notes'])}")
    else:
        lines.append("- No obvious dark zones were detected by the heuristic scan.")
    lines.append("")
    lines.append("All flow and ownership statements above should be treated as evidence-based heuristics, not a full architectural proof.")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a repository map from a live scan or an inventory JSON file.")
    parser.add_argument("repo_root", type=Path, help="Path to the repository root to inspect.")
    parser.add_argument("--inventory", type=Path, help="Optional JSON inventory created by inventory_repo.py.")
    parser.add_argument("--format", choices=("json", "markdown"), default="markdown")
    parser.add_argument("--write", type=Path, help="Optional output path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    inventory = load_inventory(args.inventory) if args.inventory else build_inventory(args.repo_root)
    repo_map = build_repo_map(args.repo_root, inventory)
    output = json.dumps(repo_map, indent=2) if args.format == "json" else render_repo_map_markdown(repo_map)
    if args.write:
        args.write.write_text(output + ("" if output.endswith("\n") else "\n"), encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
