#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Suggest a Conventional Commit subject for documentation changes."
    )
    parser.add_argument("paths", nargs="*", help="Changed documentation paths.")
    parser.add_argument(
        "--staged",
        action="store_true",
        help="Read the path list from `git diff --cached --name-only`.",
    )
    parser.add_argument(
        "--summary",
        default="update documentation",
        help="Imperative summary to use after the scope.",
    )
    return parser.parse_args()


def staged_paths() -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def infer_scope(path: str) -> str:
    normalized = Path(path).as_posix()
    parts = [part for part in normalized.split("/") if part]
    if len(parts) >= 2 and parts[0] in {"apps", "services", "packages"}:
        return parts[1]
    if parts and parts[0] == "infra":
        return "infra"
    if parts and parts[0] == "workflows":
        return "workflows"
    return "monorepo"


def render_message(paths: list[str], summary: str) -> tuple[str, list[str]]:
    scopes = []
    for path in paths:
        scope = infer_scope(path)
        if scope not in scopes:
            scopes.append(scope)

    notes: list[str] = []
    if not scopes:
        return "docs(monorepo): " + summary, [
            "No paths were provided; defaulting to monorepo scope."
        ]

    if len(scopes) == 1:
        return f"docs({scopes[0]}): {summary}", notes

    if len(scopes) >= 4:
        notes.append(
            "Cross-cutting change detected across four or more scopes; omitting the scope is allowed by the repo rule."
        )
        return f"docs: {summary}", notes

    notes.append(
        "Multiple scopes detected; prefer splitting the work into separate commits if the changes are independently understandable."
    )
    notes.append(
        "If you keep a single commit, use the dominant scope or `docs` without scope only when the change is truly cross-cutting."
    )
    return f"docs({scopes[0]}): {summary}", notes


def main() -> int:
    args = parse_args()
    paths = staged_paths() if args.staged else args.paths
    message, notes = render_message(paths, args.summary.strip())
    print(message)
    if paths:
        print("")
        print("paths:")
        for path in paths:
            print(f"- {path}")
    if notes:
        print("")
        print("notes:")
        for note in notes:
            print(f"- {note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
