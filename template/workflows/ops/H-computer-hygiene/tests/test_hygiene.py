"""Isolated tests. Never scan/delete the real user's home or execute package tools."""
import datetime as dt
import importlib.util
import json
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/hygiene.py"
spec = importlib.util.spec_from_file_location("hygiene", SCRIPT)
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)


@unittest.skipUnless(os.name == "posix", "POSIX fixture suite; native Windows requires separate acceptance")
class HygieneTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="hygiene-test-")
        self.root = Path(self.temp.name).resolve()
        self.home = self.root / "home"
        self.home.mkdir()
        self.env = {"PATH": str(self.home / "bin"), "HOME": str(self.home)}
        self.opts = {"seconds_per_tree": 10, "seconds_total": 30}

    def tearDown(self):
        self.temp.cleanup()  # test fixture only, never a production cleanup operation

    def old(self, path):
        timestamp = time.time() - 45 * 86400
        if path.is_dir():
            for p in sorted(path.rglob("*"), key=lambda x: len(x.parts), reverse=True):
                if not p.is_symlink():
                    os.utime(p, (timestamp, timestamp))
        os.utime(path, (timestamp, timestamp))
        return path

    def cache(self, kind="npm-content-cache"):
        path = h.default_cache_allowlist(self.home, "Linux")[kind]
        child = {"npm-content-cache": "content-v2/aa/payload", "pip-cache": "wheels/aa/payload.whl", "go-build-cache": "aa/payload-a"}[kind]
        p = path / child
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b"fixture data 123\n")
        return self.old(path)

    def audit(self, options=None, system="Linux"):
        a = h.Auditor(home=self.home, system=system, environ=self.env,
                      options={**self.opts, **(options or {})}, label="ISOLATED_TEST_FIXTURE", native_platform_reads=False)
        return a, *a.run()

    def plan(self, kinds=("npm-content-cache",)):
        paths = [self.cache(k) for k in kinds]
        _, report, plan = self.audit()
        self.assertEqual(len(plan["actions"]), len(kinds))
        pp = self.root / "plan.json"
        h.atomic_json(pp, plan, exclusive=True)
        ap = self.root / "approval.json"
        approved = h.approve_plan(pp, [a["id"] for a in plan["actions"]], ap, "I_REVIEWED_EACH_ID", home=self.home, system="Linux")
        return paths, plan, pp, ap, approved["apply_confirmation"]

    def apply(self, pp, ap, token):
        return h.apply_plan(pp, ap, token, True, home=self.home, system="Linux")

    def restore(self, receipt):
        preview = h.restore_receipt(receipt, None, home=self.home, system="Linux")
        return h.restore_receipt(receipt, preview["confirmation"], home=self.home, system="Linux")

    def test_default_does_not_mutate_source(self):
        p = self.cache()
        before = {str(x.relative_to(self.home)): x.read_bytes() for x in self.home.rglob("*") if x.is_file()}
        self.audit()
        after = {str(x.relative_to(self.home)): x.read_bytes() for x in self.home.rglob("*") if x.is_file()}
        self.assertEqual(before, after)
        self.assertTrue(p.exists())
        self.assertFalse((self.home / ".speculo-hygiene").exists())

    def test_no_sensitive_environment_export(self):
        self.env.update({"AWS_SECRET_ACCESS_KEY": "secret-marker", "OPENAI_API_KEY": "api-marker"})
        _, report, _ = self.audit()
        self.assertNotIn("secret-marker", json.dumps(report))
        self.assertNotIn("api-marker", json.dumps(report))

    def test_profile_never_exports_line_contents(self):
        (self.home / ".zshrc").write_text('export JAVA_HOME="/sdk" # secret-marker\nexport TOKEN="private"\n', encoding="utf-8")
        _, r, _ = self.audit()
        text = json.dumps(r)
        self.assertNotIn("secret-marker", text)
        self.assertNotIn('TOKEN', text)
        self.assertIn("JAVA_HOME", text)

    def test_npmrc_credentials_not_exported(self):
        (self.home / ".npmrc").write_text("//registry.example/:_authToken=secret-marker\ncache=" + str(self.home / "custom-cache") + "\n")
        _, r, _ = self.audit()
        self.assertNotIn("secret-marker", json.dumps(r))
        self.assertTrue(any(x["kind"] == "configured-cache" for x in r["storage"]))

    def test_maven_repository_is_protected(self):
        p = self.home / ".m2/settings.xml"
        p.parent.mkdir()
        repo = self.home / "local-only-artifacts"
        repo.mkdir()
        p.write_text(f"<settings><localRepository>{repo}</localRepository><servers><server><password>secret-marker</password></server></servers></settings>")
        _, r, plan = self.audit()
        self.assertNotIn("secret-marker", json.dumps(r))
        item = next(x for x in r["storage"] if x["path"] == str(repo))
        self.assertEqual(item["risk"], "P")
        self.assertFalse(plan["actions"])

    def test_path_duplicate_and_multiple_candidates(self):
        for name in ("bin", "bin2"):
            p = self.home / name / "java"
            p.parent.mkdir()
            p.write_text("not executed")
            p.chmod(0o755)
        self.env["PATH"] = ":".join(str(self.home / n) for n in ("bin", "bin2", "bin"))
        _, r, _ = self.audit()
        self.assertEqual(len(r["environment"]["commands"]["java"]["matches"]), 2)
        self.assertTrue(any("duplicate_of" in x for x in r["environment"]["path"]))

    def test_empty_path_flagged_not_searched(self):
        self.env["PATH"] = ":"
        _, r, _ = self.audit()
        self.assertTrue(all(x["status"] == "unsafe-empty" for x in r["environment"]["path"]))

    def test_expand_rejects_shell_expressions(self):
        for value in ("$(touch bad)", "`id`", "/tmp/a;rm", "$UNSET/x", "relative/path"):
            self.assertIsNone(h.expand_path(value, self.home, self.env))
        self.assertEqual(h.expand_path("$HOME/cache", self.home, self.env), self.home / "cache")

    def test_invalid_options_rejected(self):
        for value in ({"delete_all": True}, {"max_entries_total": True}, {"seconds_total": 0}, {"min_age_days": 0}, {"project_roots": "~"}):
            with self.subTest(value=value), self.assertRaises(h.SafetyError):
                h.validate_options(value)

    def test_target_root_rejects_home(self):
        with self.assertRaises(h.SafetyError):
            h.target_root(self.home, "Linux", self.env, str(self.home))

    def test_same_day_reports_do_not_overwrite(self):
        first = h.save_audit(h.Auditor(home=self.home, system="Linux", environ=self.env, options=self.opts), self.root / "reports")
        second = h.save_audit(h.Auditor(home=self.home, system="Linux", environ=self.env, options=self.opts), self.root / "reports")
        self.assertNotEqual(first["report"], second["report"])
        self.assertEqual(Path(first["report"]).name, h.now_local().strftime("%Y-%m-%d") + ".md")
        self.assertNotIn(str(self.home), Path(first["report"]).read_text())
        self.assertNotIn(str(self.home), Path(first["json"]).read_text())
        self.assertIn(str(self.home), Path(first["plan"]).read_text())

    @unittest.skipUnless(hasattr(os, "symlink"), "symlink unavailable")
    def test_symlink_cache_root_blocked(self):
        target = self.home / "other"
        (target / "content-v2").mkdir(parents=True)
        cache = self.home / ".npm/_cacache"
        cache.parent.mkdir()
        cache.symlink_to(target, target_is_directory=True)
        _, r, p = self.audit()
        self.assertFalse(p["actions"])
        self.assertEqual(next(x for x in r["storage"] if x["path"] == str(cache))["status"], "blocked")

    def test_symlink_child_blocks_quarantine(self):
        p = self.cache()
        (p / "content-v2/link").symlink_to(self.home, target_is_directory=True)
        self.old(p)
        _, _, plan = self.audit()
        self.assertFalse(plan["actions"])

    def test_symlink_ancestor_blocked(self):
        target = self.root / "linked-npm"
        (target / "_cacache/content-v2").mkdir(parents=True)
        (self.home / ".npm").symlink_to(target, target_is_directory=True)
        _, _, plan = self.audit()
        self.assertFalse(plan["actions"])

    def test_hardlinks_not_quarantined_and_size_deduped(self):
        p = self.cache()
        source = p / "content-v2/aa/payload"
        os.link(source, p / "content-v2/aa/payload2")
        self.old(p)
        _, r, plan = self.audit()
        self.assertFalse(plan["actions"])
        self.assertEqual(r["summary"]["observed_unique_logical_bytes"], source.stat().st_size)

    def test_unknown_cache_structure_not_quarantined(self):
        p = self.cache()
        (p / "important-notes.txt").write_text("unique user data")
        self.old(p)
        _, _, plan = self.audit()
        self.assertFalse(plan["actions"])

    def test_recent_cache_not_quarantined(self):
        p = self.cache()
        os.utime(p / "content-v2/aa/payload", None)
        _, _, plan = self.audit()
        self.assertFalse(plan["actions"])

    def test_custom_cache_not_quarantined(self):
        p = self.home / "custom-go-cache/aa"
        p.mkdir(parents=True)
        (p / "data").write_text("cache")
        self.env["GOCACHE"] = str(p.parent)
        self.old(p.parent)
        _, _, plan = self.audit()
        self.assertFalse(plan["actions"])

    def test_explicit_exclusion_blocks_action(self):
        p = self.cache()
        _, r, plan = self.audit({"exclude_roots": [str(p)]})
        self.assertFalse(plan["actions"])
        self.assertTrue(any(x["status"] == "excluded" for x in r["storage"]))

    def test_tree_budget_reports_partial(self):
        p = self.cache()
        tree = h.snapshot(p, h.Budget(h.validate_options({"max_entries_per_tree": 1})))
        self.assertFalse(tree["complete"])
        self.assertLessEqual(tree["entries"], 1)

    def test_global_budget_reports_partial(self):
        self.cache()
        _, r, p = self.audit({"max_entries_total": 1})
        self.assertTrue(r["scope"]["global_budget_exhausted"])
        self.assertFalse(p["actions"])

    def test_protected_directory_not_traversed(self):
        p = self.home / ".ssh"
        p.mkdir()
        (p / "secret").write_text("credential")
        tree = h.snapshot(p, h.Budget(h.validate_options({})))
        self.assertFalse(tree["complete"])
        self.assertEqual(tree["files"], 0)

    def test_no_project_roots_is_explicit_gap(self):
        _, r, _ = self.audit()
        self.assertEqual(next(x for x in r["scope"]["coverage"] if x["area"] == "projects")["status"], "not-checked")

    def test_project_version_pin_files_are_preserved(self):
        p = self.home / "Projects/pinned"
        p.mkdir(parents=True)
        (p / ".nvmrc").write_text("20")
        (p / "rust-toolchain.toml").write_text('[toolchain]\nchannel = "stable"')
        _, report, plan = self.audit({"project_roots": [str(p.parent)]})
        self.assertIn(".nvmrc", report["projects"][0]["version_pin_files"])
        self.assertFalse(plan["actions"])
        self.assertTrue((p / ".nvmrc").exists())

    def test_repo_in_downloads_is_location_warning_not_deletion(self):
        p = self.home / "Downloads/source"
        p.mkdir(parents=True)
        (p / ".git").mkdir()
        _, report, plan = self.audit({"project_roots": [str(p.parent)]})
        self.assertTrue(any(x["category"] == "project-location" for x in report["findings"]))
        self.assertFalse(plan["actions"])

    def test_project_markers_and_lock_conflict_never_delete(self):
        p = self.home / "Projects/example"
        p.mkdir(parents=True)
        (p / ".git").mkdir()
        (p / "package.json").write_text('{"packageManager":"pnpm@9.0.0","scripts":{"preinstall":"do-not-run"}}')
        for name in ("pnpm-lock.yaml", "package-lock.json"):
            (p / name).write_text("fixture")
        (p / "node_modules").mkdir()
        _, r, plan = self.audit({"project_roots": [str(p.parent)]})
        self.assertTrue(r["projects"])
        self.assertTrue(any("多个 Node" in f["title"] for f in r["findings"]))
        self.assertFalse(plan["actions"])
        self.assertNotIn("do-not-run", json.dumps(r))

    def test_gitfile_worktree_not_called_broken_repo(self):
        p = self.home / "Projects/worktree"
        p.mkdir(parents=True)
        (p / ".git").write_text("gitdir: ../../main/.git/worktrees/feature")
        _, r, _ = self.audit({"project_roots": [str(p.parent)]})
        self.assertEqual(r["projects"][0]["git"], "gitfile/worktree-or-submodule")

    def test_downloads_are_manual_only(self):
        p = self.home / "Downloads/installer.dmg"
        p.parent.mkdir()
        p.write_bytes(b"installer")
        _, r, plan = self.audit()
        self.assertTrue(r["loose_files"])
        self.assertFalse(plan["actions"])

    def test_all_three_cache_kinds_eligible(self):
        _, plan, _, _, _ = self.plan(tuple(h.default_cache_allowlist(self.home, "Linux")))
        self.assertEqual(len(plan["actions"]), 3)

    def test_approval_requires_exact_ids(self):
        _, plan, pp, _, _ = self.plan()
        for ids in ([], ["*"], [plan["actions"][0]["id"]] * 2):
            with self.assertRaises(h.SafetyError):
                h.approve_plan(pp, ids, self.root / "new-approval.json", "I_REVIEWED_EACH_ID", home=self.home, system="Linux")

    def test_approval_requires_ack(self):
        _, plan, pp, _, _ = self.plan()
        with self.assertRaises(h.SafetyError):
            h.approve_plan(pp, [plan["actions"][0]["id"]], self.root / "new.json", "yes", home=self.home, system="Linux")

    def test_plan_changed_after_approval_refused(self):
        paths, plan, pp, ap, token = self.plan()
        plan["warning"] += " modified"
        h.atomic_json(pp, plan)
        with self.assertRaises(h.SafetyError):
            self.apply(pp, ap, token)
        self.assertTrue(paths[0].exists())

    def test_expired_plan_refused(self):
        _, plan, pp, _, _ = self.plan()
        plan["created_at"] = (h.now_local() - dt.timedelta(days=2)).isoformat()
        plan["expires_at"] = (h.now_local() - dt.timedelta(days=1)).isoformat()
        h.atomic_json(pp, plan)
        with self.assertRaises(h.SafetyError):
            h.read_plan(pp, self.home, "Linux")

    def test_cross_host_plan_refused(self):
        _, plan, pp, _, _ = self.plan()
        plan["host_fingerprint"] = "different-host"
        h.atomic_json(pp, plan)
        with self.assertRaises(h.SafetyError):
            h.read_plan(pp, self.home, "Linux")

    def test_arbitrary_path_refused(self):
        _, plan, pp, _, _ = self.plan()
        plan["actions"][0]["path"] = str(self.home / "Documents")
        h.atomic_json(pp, plan)
        with self.assertRaises(h.SafetyError):
            h.read_plan(pp, self.home, "Linux")

    def test_arbitrary_command_field_refused(self):
        _, plan, pp, _, _ = self.plan()
        plan["actions"][0]["command"] = "rm -rf user-data"
        h.atomic_json(pp, plan)
        with self.assertRaises(h.SafetyError):
            h.read_plan(pp, self.home, "Linux")

    def test_tools_closed_assertion_required(self):
        paths, _, pp, ap, token = self.plan()
        with self.assertRaises(h.SafetyError):
            h.apply_plan(pp, ap, token, False, home=self.home, system="Linux")
        self.assertTrue(paths[0].exists())

    def test_metadata_drift_refused_before_move(self):
        paths, _, pp, ap, token = self.plan()
        (paths[0] / "content-v2/aa/payload").write_text("changed")
        with self.assertRaises(h.SafetyError):
            self.apply(pp, ap, token)
        self.assertTrue(paths[0].exists())

    def test_successful_quarantine_and_restore(self):
        paths, _, pp, ap, token = self.plan()
        result = self.apply(pp, ap, token)
        self.assertFalse(paths[0].exists())
        self.assertFalse(result["freed_disk_space"])
        self.restore(Path(result["receipt"]))
        self.assertTrue(paths[0].exists())
        self.assertEqual((paths[0] / "content-v2/aa/payload").read_bytes(), b"fixture data 123\n")

    def test_restore_does_not_overwrite_recreated_cache(self):
        paths, _, pp, ap, token = self.plan()
        result = self.apply(pp, ap, token)
        paths[0].mkdir()
        (paths[0] / "new-data").write_text("keep")
        with self.assertRaises(h.SafetyError):
            self.restore(Path(result["receipt"]))
        self.assertEqual((paths[0] / "new-data").read_text(), "keep")

    def test_restore_receipt_tampering_refused(self):
        _, _, pp, ap, token = self.plan()
        receipt = Path(self.apply(pp, ap, token)["receipt"])
        value = h.load_json(receipt)
        value["actions"][0]["destination"] = str(self.home / "Documents")
        h.atomic_json(receipt, value)
        with self.assertRaises(h.SafetyError):
            h.restore_receipt(receipt, None, home=self.home, system="Linux")

    def test_quarantine_root_symlink_refused(self):
        paths, _, pp, ap, token = self.plan()
        state = self.home / ".speculo-hygiene"
        state.mkdir()
        (state / "quarantine").symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(h.SafetyError):
            self.apply(pp, ap, token)
        self.assertTrue(paths[0].exists())

    def test_existing_operation_lock_refused(self):
        paths, _, pp, ap, token = self.plan()
        state = self.home / ".speculo-hygiene"
        state.mkdir()
        lock = state / "operation.lock"
        lock.write_text('{"pid":-1}')
        with self.assertRaises(h.SafetyError):
            self.apply(pp, ap, token)
        self.assertTrue(lock.exists())
        self.assertTrue(paths[0].exists())

    def test_cross_volume_refused_without_copy_fallback(self):
        paths, _, pp, ap, token = self.plan()
        original = Path.stat
        def altered(path, *args, **kwargs):
            value = original(path, *args, **kwargs)
            if "quarantine" in path.parts and path.is_relative_to(self.home / ".speculo-hygiene"):
                parts = list(value)
                parts[2] = value.st_dev + 123
                return os.stat_result(parts)
            return value
        with mock.patch.object(Path, "stat", altered), self.assertRaises(h.SafetyError):
            self.apply(pp, ap, token)
        self.assertTrue(paths[0].exists())

    def test_write_ahead_recovers_rename_then_exception(self):
        paths, _, pp, ap, token = self.plan()
        original = os.rename
        def crash(src, dst):
            original(src, dst)
            raise OSError("simulated interruption after rename")
        with mock.patch.object(h.os, "rename", side_effect=crash), self.assertRaises(h.SafetyError):
            self.apply(pp, ap, token)
        self.assertFalse(paths[0].exists())
        receipt = next((self.home / ".speculo-hygiene/quarantine").glob("*/receipt.json"))
        self.restore(receipt)
        self.assertTrue(paths[0].exists())

    def test_partial_failure_preserves_and_restores_prior_move(self):
        paths, _, pp, ap, token = self.plan(("npm-content-cache", "pip-cache"))
        original = os.rename
        count = 0
        def fail_second(src, dst):
            nonlocal count
            count += 1
            if count == 2:
                raise OSError("simulated locked file")
            return original(src, dst)
        with mock.patch.object(h.os, "rename", side_effect=fail_second), self.assertRaises(h.SafetyError):
            self.apply(pp, ap, token)
        receipt = next((self.home / ".speculo-hygiene/quarantine").glob("*/receipt.json"))
        value = h.load_json(receipt)
        self.assertEqual(value["status"], "stopped-on-error")
        self.assertEqual(sum(p.exists() for p in paths), 1)
        self.restore(receipt)
        self.assertTrue(all(p.exists() for p in paths))

    def test_mac_bundle_and_launchd_fixture(self):
        import plistlib
        for name in ("Example", "Example Copy"):
            info = self.home / f"Applications/{name}.app/Contents/Info.plist"
            info.parent.mkdir(parents=True)
            info.write_bytes(plistlib.dumps({"CFBundleIdentifier": "test.example", "CFBundleShortVersionString": "1.0"}))
        agent = self.home / "Library/LaunchAgents/test.example.plist"
        agent.parent.mkdir(parents=True)
        agent.write_bytes(plistlib.dumps({"Label": "test.example", "ProgramArguments": ["/missing/tool", "secret-marker"], "EnvironmentVariables": {"TOKEN": "secret-marker"}}))
        _, r, _ = self.audit(system="Darwin")
        self.assertEqual(len(r["software"]["applications"]), 2)
        self.assertNotIn("secret-marker", json.dumps(r))
        self.assertTrue(any(f["category"] == "software" for f in r["findings"]))

    def test_windows_fixture_does_not_claim_registry_success(self):
        if os.name == "nt":
            self.skipTest("This test checks the non-Windows capability gap")
        _, r, _ = self.audit(system="Windows")
        self.assertTrue(any("registry unavailable" in x for x in r["software"]["errors"]))
        self.assertEqual(r["software"]["applications"], [])

    def test_reparse_and_placeholder_flags(self):
        class FakeStat:
            st_mode = stat_mode = 0o040700
            st_file_attributes = h.REPARSE
        self.assertTrue(h.is_linklike(self.home, FakeStat()))
        FakeStat.st_file_attributes = h.OFFLINE
        self.assertTrue(h.is_placeholder(FakeStat()))

    def test_markdown_metadata_cannot_inject_images_or_html(self):
        rendered = h.cell('![remote](https://example.invalid/track) <script>bad</script>')
        self.assertNotIn('![', rendered)
        self.assertNotIn('<script>', rendered)
        self.assertIn('&lt;script&gt;', rendered)

    def test_report_has_required_sections_and_no_delete_claim(self):
        _, r, p = self.audit()
        text = h.render_report(r, p)
        for heading in ("覆盖范围", "PATH", "配置来源", "工具链", "项目", "软件", "隔离", "回滚", "隐私"):
            self.assertIn(heading, text)
        self.assertIn("不释放磁盘空间", text)
        self.assertIn("未在线访问", text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
