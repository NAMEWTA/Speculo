#!/usr/bin/env python3
"""Build explicitly synthetic examples without reading the real user's home/apps.

Only isolated tempfile content is audited. Native OS inventories are replaced by
fixture metadata. Never run this as evidence about a real computer.
"""
import importlib.util
import json
import os
import tempfile
import time
from pathlib import Path

WORK = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("hygiene", WORK / "scripts/hygiene.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


class FixtureAuditor(h.Auditor):
    def platform_inventory(self):
        self.coverage.append(dict(area="applications/startup", status="SIMULATED-NOT-NATIVE",
                                  detail="Synthetic application metadata only; no real registry, Applications, launchd or service reads."))
        example = {"name": "Example Editor", "version": "1.0-fixture", "system_component": False,
                   "action": "fixture candidate; not real software and never uninstalled"}
        if self.system == "Windows":
            example["identity"] = "HKCU/Uninstall/FIXTURE-EXAMPLE-ID"
        else:
            example.update(path=str(self.home / "Applications/Example Editor.app"), bundle_id="invalid.example.editor")
        return {"applications": [example], "startup": [], "persistent_environment": [],
                "errors": ["Real OS inventory intentionally disabled for this example."]}


def populate(home, system):
    h.ensure_private_dir(home)
    for folder in ("bin-primary", "bin-old"):
        name = "java.exe" if system == "Windows" else "java"
        binary = home / folder / name
        binary.parent.mkdir(parents=True)
        binary.write_text("FIXTURE: NOT EXECUTABLE CODE")
        binary.chmod(0o755)
    repo = home / ".m2/repository/example/internal/1.0"
    repo.mkdir(parents=True)
    (repo / "internal-1.0.jar").write_bytes(b"LOCAL_ONLY_FIXTURE" * 1024)
    (home / ".m2/settings.xml").write_text(f"<settings><localRepository>{home / '.m2/repository'}</localRepository><servers><server><password>DO_NOT_EXPORT_DEMO_SECRET</password></server></servers></settings>")
    cargo = home / ".cargo"
    cargo.mkdir()
    (cargo / "credentials.toml").write_text('token="DO_NOT_EXPORT_DEMO_SECRET"')
    (cargo / "config.toml").write_text("# protected fixture config")
    for kind, path in h.default_cache_allowlist(home, system).items():
        relative = {"npm-content-cache": "content-v2/aa/data", "pip-cache": "wheels/aa/demo.whl", "go-build-cache": "aa/demo-a"}[kind]
        f = path / relative
        f.parent.mkdir(parents=True)
        f.write_bytes(b"regenerable-fixture-cache\n" * 2048)
        old = time.time() - 45 * 86400
        for child in sorted(path.rglob("*"), key=lambda p: len(p.parts), reverse=True):
            os.utime(child, (old, old))
        os.utime(path, (old, old))
    project = home / "Projects/example-web"
    project.mkdir(parents=True)
    (project / ".git").mkdir()
    (project / "package.json").write_text('{"packageManager":"pnpm@9.0.0"}')
    for name in ("pnpm-lock.yaml", "package-lock.json", ".nvmrc"):
        (project / name).write_text("fixture")
    (project / "node_modules").mkdir()
    (project / "node_modules/local-note.txt").write_text("May be unique data: do not auto-delete")
    (home / ".zshrc").write_text('export JAVA_HOME="$HOME/old-jdk" # DO_NOT_EXPORT_DEMO_SECRET\n')
    (home / ".profile").write_text('export JAVA_HOME="$HOME/new-jdk"\n')
    downloads = home / "Downloads"
    downloads.mkdir()
    (downloads / "old-installer.zip").write_bytes(b"installer fixture")
    unsafe = downloads / "source-clone"
    unsafe.mkdir()
    (unsafe / ".git").write_text("gitdir: ../../Projects/example-web/.git/worktrees/example")
    delimiter = ";" if system == "Windows" else ":"
    return {"PATH": delimiter.join(str(home / n) for n in ("bin-primary", "bin-old", "bin-primary", "missing-bin")),
            "HOME": str(home), "LOCALAPPDATA": str(home / "AppData/Local"),
            "JAVA_HOME": str(home / "old-jdk"), "CARGO_HOME": str(cargo),
            "GOCACHE": str(h.default_cache_allowlist(home, system)["go-build-cache"])}


def main():
    generated = []
    for system, folder in (("Windows", "windows"), ("Darwin", "macos"), ("Linux", "linux")):
        with tempfile.TemporaryDirectory(prefix="hygiene-demo-") as temporary:
            home = Path(temporary).resolve() / "fixture-home"
            env = populate(home, system)
            auditor = FixtureAuditor(home=home, system=system, environ=env,
                                     options={"project_roots": [str(home / "Projects"), str(home / "Downloads")], "seconds_per_tree": 10},
                                     label="SYNTHETIC_FIXTURE_NOT_YOUR_COMPUTER", native_platform_reads=False)
            report, plan = auditor.run()
            report["host"].update(release="SIMULATED_OS_METADATA", machine="SIMULATED_ARCHITECTURE",
                                  elevated=False, fingerprint="FIXTURE_NOT_FOR_APPROVAL",
                                  disk_total_bytes=512 * 1024**3, disk_free_bytes=120 * 1024**3,
                                  execution_context_signals={"fixture_only": True})
            report["scope"]["limitations"].append("Disk capacity, architecture and application identity are illustrative fixture values, not real measurements.")
            report["findings"] = [x for x in report["findings"] if x["category"] != "privilege"]
            report["summary"]["findings"] = len(report["findings"])
            output = WORK / "examples" / folder
            output.mkdir(parents=True, exist_ok=True)
            date = report["date"]
            md = h.render_report(report, plan)
            public = h.redact(report, home)
            assert "DO_NOT_EXPORT_DEMO_SECRET" not in md + json.dumps(public)
            (output / f"{date}.md").write_text(md, encoding="utf-8")
            (output / f"{date}.json").write_bytes(h.json_bytes(public))
            target = h.target_root(home, system, env, None)
            (output / f"{date}.environment.md").write_text("**模拟示例，不是已执行迁移。**\n\n" + h.render_environment(report, target), encoding="utf-8")
            generated.append({"system": system, "example": str(output / f"{date}.md"), "findings": len(report["findings"]), "quarantine_candidates": len(plan["actions"])})
    print(json.dumps({"fixture_only": True, "generated": generated}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
