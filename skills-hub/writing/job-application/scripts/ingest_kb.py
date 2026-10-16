#!/usr/bin/env python3
"""Scan a knowledge-base directory into sources/manifest.json. Read-only on sources."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".next",
    ".idea",
    ".vscode",
}
SKIP_FILES = {".DS_Store", "Thumbs.db"}
TEXT_SUFFIXES = {
    ".md",
    ".txt",
    ".html",
    ".htm",
    ".json",
    ".yml",
    ".yaml",
    ".rst",
    ".csv",
    ".tsv",
    ".py",
    ".js",
    ".mjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".java",
    ".go",
    ".rs",
    ".css",
    ".xml",
    ".toml",
}
MAX_READ = 256 * 1024
SUMMARY_CHARS = 180


def summary_of(text: str) -> str:
    chunk = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            if chunk:
                break
            continue
        chunk.append(stripped)
        if sum(len(part) for part in chunk) >= SUMMARY_CHARS:
            break
    blob = " ".join(chunk).strip()
    if len(blob) > SUMMARY_CHARS:
        blob = blob[: SUMMARY_CHARS - 1].rstrip() + "…"
    return blob


def file_id(previous: dict, rel: str, used: set[str]) -> str:
    prior = previous.get(rel) or {}
    existing = prior.get("id")
    if isinstance(existing, str) and existing.startswith("src-"):
        return existing
    number = 1
    while True:
        candidate = f"src-{number:04d}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        number += 1


def sha256_and_size(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            digest.update(chunk)
    return digest.hexdigest(), size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kb-root", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    root = Path(args.kb_root).expanduser().resolve()
    if not root.is_dir():
        print(f"kb-root is not a directory: {root}", file=sys.stderr)
        raise SystemExit(2)
    out = Path(args.out).expanduser().resolve()
    previous: dict[str, dict] = {}
    if out.is_file():
        try:
            old = json.loads(out.read_text(encoding="utf-8"))
            for item in old.get("files", []):
                rel = item.get("relpath")
                if rel:
                    previous[rel] = item
        except (OSError, json.JSONDecodeError):
            previous = {}

    files = []
    used_ids: set[str] = set()
    for item in previous.values():
        existing = item.get("id")
        if isinstance(existing, str) and existing.startswith("src-"):
            used_ids.add(existing)
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        parts = path.relative_to(root).parts
        if any(part in SKIP_DIRS or part.startswith(".") for part in parts):
            continue
        if path.name in SKIP_FILES:
            continue
        rel = path.relative_to(root).as_posix()
        digest, size = sha256_and_size(path)
        mtime = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%S.000Z"
        )
        kind = "text" if path.suffix.lower() in TEXT_SUFFIXES else "binary"
        status = "indexed"
        file_summary = ""
        if kind == "binary":
            status = "skipped-binary"
        elif size > MAX_READ:
            status = "truncated"
            with path.open("rb") as handle:
                file_summary = summary_of(handle.read(8192).decode("utf-8", errors="replace"))
        else:
            text = path.read_text(encoding="utf-8", errors="replace")
            if "\x00" in text:
                kind = "binary"
                status = "skipped-binary"
            else:
                file_summary = summary_of(text)
        prior = previous.get(rel)
        if prior and prior.get("sha256") == digest and prior.get("summary"):
            file_summary = prior["summary"]
            if status == "indexed":
                status = prior.get("status", status)
        files.append(
            {
                "id": file_id(previous, rel, used_ids),
                "relpath": rel,
                "sha256": digest,
                "mtime": mtime,
                "bytes": size,
                "kind": kind,
                "summary": file_summary,
                "status": status,
            }
        )

    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": 1,
        "kb_root": str(root),
        "scanned_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "file_count": len(files),
        "files": files,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{out} files={len(files)}")


if __name__ == "__main__":
    main()
