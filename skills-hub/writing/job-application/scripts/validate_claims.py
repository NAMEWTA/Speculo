#!/usr/bin/env python3
"""Fail if tailored text cites a claim id missing from the evidence map."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

CLAIM_RE = re.compile(r"claim:(C-\d+)", re.IGNORECASE)
ID_RE = re.compile(r"\b(C-\d+)\b")


def known_ids(evidence_text: str) -> set[str]:
    return {match.group(1).upper() for match in ID_RE.finditer(evidence_text)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", required=True)
    parser.add_argument("--files", nargs="+", required=True)
    args = parser.parse_args()

    evidence = Path(args.evidence)
    if not evidence.is_file():
        print(f"missing evidence map: {evidence}", file=sys.stderr)
        raise SystemExit(2)
    allowed = known_ids(evidence.read_text(encoding="utf-8"))
    orphans: list[str] = []
    used = 0
    for raw in args.files:
        path = Path(raw)
        if not path.is_file():
            print(f"missing file: {path}", file=sys.stderr)
            raise SystemExit(2)
        text = path.read_text(encoding="utf-8")
        for match in CLAIM_RE.finditer(text):
            used += 1
            claim = match.group(1).upper()
            if claim not in allowed:
                orphans.append(f"{path}: {claim}")
    if orphans:
        print("orphan claims:", file=sys.stderr)
        for item in orphans:
            print(f"  {item}", file=sys.stderr)
        raise SystemExit(1)
    print(f"ok claims={used} evidence_ids={len(allowed)}")


if __name__ == "__main__":
    main()
