#!/usr/bin/env python3
"""Render a minimal Mihomo rules-extension fragment to stdout; never edits a profile."""
from __future__ import annotations
import argparse
import json
import sys

DOMAINS = ("anthropic.com", "claude.ai", "claude.com", "openai.com", "chatgpt.com",
           "oaistatic.com", "oaiusercontent.com", "cursor.com", "cursor.sh", "x.ai", "grok.com")


def render(group: str) -> str:
    if not group.strip() or group != group.strip() or any(c in group for c in ",\r\n\x00"):
        raise ValueError("Group must be a nonempty exact name without comma or control characters")
    if any(ord(c) < 32 for c in group) or group.upper() in ("DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"):
        raise ValueError("Choose a real proxy policy group, not a direct/reject/reserved target")
    rules = [json.dumps("DOMAIN-SUFFIX," + d + "," + group, ensure_ascii=False) for d in DOMAINS]
    return "# Minimal domain baseline, not an exhaustive service allowlist.\nprepend:\n" + "".join("  - " + r + "\n" for r in rules) + "append: []\ndelete: []\n"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--group", required=True, help="Exact existing group name; verify its currently selected leaf is not DIRECT")
    args = p.parse_args()
    try:
        text = render(args.group)
    except ValueError as exc:
        p.error(str(exc))
    # Keep redirected output UTF-8 even on Windows legacy code pages.
    sys.stdout.buffer.write(text.encode("utf-8"))


if __name__ == "__main__":
    main()
