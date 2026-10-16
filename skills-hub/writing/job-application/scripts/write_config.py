#!/usr/bin/env python3
"""Write job-application path pointer JSON into the skill dir and persist_root."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def die(message: str, code: int = 2) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def abs_dir(raw: str, label: str, must_exist: bool) -> Path:
    path = Path(raw).expanduser().resolve()
    if path.exists() and not path.is_dir():
        die(f"{label} is not a directory: {path}")
    if must_exist and not path.is_dir():
        die(f"{label} does not exist: {path}")
    return path


def inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill-dir", required=True)
    parser.add_argument("--persist-root", required=True)
    parser.add_argument("--kb-root", required=True)
    parser.add_argument("--locale", default="zh")
    parser.add_argument("--page-budget", type=int, default=2)
    args = parser.parse_args()

    skill_dir = abs_dir(args.skill_dir, "skill-dir", must_exist=True)
    if not (skill_dir / "SKILL.md").is_file():
        die(f"skill-dir has no SKILL.md: {skill_dir}")
    kb_root = abs_dir(args.kb_root, "kb-root", must_exist=True)
    persist_root = abs_dir(args.persist_root, "persist-root", must_exist=False)
    if inside(persist_root, skill_dir):
        die("persist-root must not live inside the skill directory")
    if args.page_budget < 1 or args.page_budget > 4:
        die("page-budget must be 1..4")

    persist_root.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "skill": "job-application",
        "persist_root": str(persist_root),
        "kb_root": str(kb_root),
        "locale": args.locale,
        "page_budget": args.page_budget,
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    targets = [skill_dir / "config.json", persist_root / "config.json"]
    for target in targets:
        target.write_text(text, encoding="utf-8")
        print(target)


if __name__ == "__main__":
    main()
