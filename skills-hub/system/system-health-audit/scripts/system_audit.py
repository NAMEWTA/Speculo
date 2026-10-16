#!/usr/bin/env python3
"""Bounded, local-only baseline for Windows/macOS/Linux. No cleanup or tuning."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import platform
import shutil


def audit(path: Path) -> dict:
    if not path.is_dir():
        raise ValueError("Select an existing directory on the filesystem to inspect")
    usage = shutil.disk_usage(path)
    release = platform.release()
    return {"schema_version": 1, "os": platform.system(), "release": release,
            "architecture": platform.machine(), "logical_cpus": os.cpu_count(),
            "python": platform.python_version(),
            "wsl_hint": "microsoft" in release.lower(),
            "container_hint": Path("/.dockerenv").exists() if os.name != "nt" else False,
            "filesystem": {"total_bytes": usage.total, "used_bytes": usage.used, "free_bytes": usage.free},
            "tools_present": {name: shutil.which(name) is not None for name in
                              ("git", "node", "npm", "code", "gh", "bash", "curl.exe" if os.name == "nt" else "curl")},
            "limitations": ["Current filesystem only, no recursive scan", "Hints are not environment proof",
                            "Tool presence is not version or health verification", "No performance conclusion from a single sample"],
            "actions": {"network_requests": 0, "files_deleted": 0, "settings_changed": 0}}


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--path", type=Path, default=Path.cwd(), help="Existing directory on the target filesystem; path is not echoed")
    args = p.parse_args()
    try:
        print(json.dumps(audit(args.path), ensure_ascii=False, indent=2))
    except (OSError, ValueError):
        p.error("Unable to inspect the selected filesystem; verify path and read access")


if __name__ == "__main__":
    main()
