#!/usr/bin/env python3
"""Linux-only end-to-end CLI test in a temporary HOME; no real account scan."""
import hashlib
import json
import os
import platform
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def main():
    if platform.system() != "Linux":
        print(json.dumps({"status": "skipped", "reason": "Linux fixture test; native platform acceptance is separate"}))
        return 0
    script = Path(__file__).resolve().parents[1] / "scripts/hygiene.py"
    stages = []
    with tempfile.TemporaryDirectory(prefix="hygiene-cli-fixture-") as tmp:
        root = Path(tmp).resolve()
        home = root / "home"
        cache = home / ".npm/_cacache"
        payload = cache / "content-v2/aa/data"
        payload.parent.mkdir(parents=True)
        payload.write_bytes(b"CLI-FIXTURE-ONLY\n")
        original = hashlib.sha256(payload.read_bytes()).hexdigest()
        old = time.time() - 40 * 86400
        for path in sorted(cache.rglob("*"), key=lambda x: len(x.parts), reverse=True):
            os.utime(path, (old, old))
        os.utime(cache, (old, old))
        (home / "bin").mkdir()
        env = {"HOME": str(home), "PATH": str(home / "bin"), "LANG": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"}
        def call(stage, args, expected=0, raw=False):
            result = subprocess.run([sys.executable, str(script), *args], env=env, cwd=root,
                                    capture_output=True, text=True, timeout=30, check=False)
            stages.append({"stage": stage, "exit_code": result.returncode, "expected": expected})
            if result.returncode != expected:
                raise RuntimeError(f"{stage} failed: {result.stderr}")
            return result.stdout.strip() if raw else (json.loads(result.stdout) if result.stdout.strip() else None)
        version = call("version", ["--version"], raw=True)
        files = call("audit", ["audit", "--output", str(root / "reports")])
        assert payload.exists() and not (home / ".speculo-hygiene").exists()
        review = call("review", ["review", "--plan", files["plan"]])
        assert len(review["actions"]) == 1
        approval = root / "approval.json"
        result = call("approve", ["approve", "--plan", files["plan"], "--ids", review["actions"][0]["id"],
                                   "--output", str(approval), "--ack", "I_REVIEWED_EACH_ID"])
        args = ["apply", "--plan", files["plan"], "--approval", str(approval), "--confirm", result["apply_confirmation"]]
        call("missing-tools-closed-refused", args, expected=2)
        assert payload.exists()
        applied = call("apply", [*args, "--tools-closed"])
        assert not payload.exists() and applied["freed_disk_space"] is False
        preview = call("restore-preview", ["restore", "--receipt", applied["receipt"]])
        call("restore", ["restore", "--receipt", applied["receipt"], "--confirm", preview["confirmation"]])
        assert payload.exists() and hashlib.sha256(payload.read_bytes()).hexdigest() == original
        output = {"status": "passed", "fixture_only": True, "temporary_home_only": True,
                  "version": version, "stages": stages, "restored_payload_hash_matches": True,
                  "default_audit_no_source_mutation": True, "no_permanent_deletion": True}
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
