import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { RefreshBlockedError } from "../src/refresh.js";
import { pathExists } from "../src/utils.js";
import { discoverWorkflowCatalog, selectAllFromCatalog } from "../src/workflows.js";
import { doctorSpeculo } from "../src/doctor.js";

const packageRoot = process.cwd();
const isWindows = process.platform === "win32";

async function tempProject(prefix = "speculo-test-"): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, any>;
}

async function hash(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function packageFixture(version = "3.0.0"): Promise<string> {
  const root = await tempProject("speculo-package-");
  await cp(join(packageRoot, "template"), join(root, "template"), { recursive: true });
  await writeJson(join(root, "package.json"), { version });
  return root;
}

async function residue(target: string): Promise<string[]> {
  const result: string[] = [];
  if (await pathExists(join(target, ".agents/.speculo-install.lock"))) result.push(".agents/.speculo-install.lock");
  if (await pathExists(join(target, ".agents/.speculo-transactions"))) result.push(".agents/.speculo-transactions", ...await readdir(join(target, ".agents/.speculo-transactions")));
  return result;
}

function expectBlocked(error: unknown, code: string): boolean {
  assert.ok(error instanceof RefreshBlockedError);
  assert.ok(error.blockers.some((blocker) => blocker.code === code), JSON.stringify(error.blockers));
  return true;
}

describe("Speculo init refresh", () => {
  it("excludes template Gradle caches on init and refresh while preserving source and runtime bytes", async () => {
    const target = await tempProject();
    const pkg = await packageFixture();
    const fixture = "commands/upstream-assess";
    try {
      await mkdir(join(pkg, "template", fixture, ".gradle"), { recursive: true });
      await writeFile(join(pkg, "template", fixture, ".gradle/cache.bin"), "template cache");
      const root = join(target, ".agents/speculo");
      const runtime = join(root, ".speculo/skills/example/.gradle/cache.bin");
      for (const mode of ["init", "refresh"]) {
        await initSpeculo(target, { packageRoot: pkg, selection: { workflowIds: ["specdev"] } });
        assert.equal(await pathExists(join(root, fixture, ".gradle")), false, mode);
        for (const file of ["COMMAND.md"]) {
          assert.equal(await readFile(join(root, fixture, file), "utf8"), await readFile(join(pkg, "template", fixture, file), "utf8"));
        }
        const managed = await readJson(join(root, ".speculo/managed.json"));
        assert.ok(!managed.files.some((entry: any) => entry.path.startsWith(`${fixture}/.gradle/`)));
        if (mode === "init") {
          await mkdir(dirname(runtime), { recursive: true });
          await writeFile(runtime, "user runtime bytes");
        } else assert.equal(await readFile(runtime, "utf8"), "user runtime bytes");
      }
    } finally { await rm(target, { recursive: true, force: true }); await rm(pkg, { recursive: true, force: true }); }
  });

  it("installs standard Skills with ownership metadata and no workflow state seeds", async () => {
    const target = await tempProject();
    try {
      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo");
      assert.equal(result.refresh.status, "initialized");
      assert.equal((await readJson(join(root, ".speculo/install.json"))).schema_version, 4);
      const managed = await readJson(join(root, ".speculo/managed.json"));
      assert.equal(managed.schema_version, 2);
      assert.ok(managed.files.some((entry: any) => entry.path === "commands/status/COMMAND.md" && entry.owner === "core/commands"));
      assert.ok(managed.files.some((entry: any) => entry.path === "workflows/specdev/SKILL.md" && entry.owner === "workflow/specdev"));
      assert.deepEqual(await readdir(join(root, "workflows/specdev")), ["SKILL.md"]);
      assert.deepEqual(await readJson(join(root, ".speculo/baselines/config.json")), await readJson(join(packageRoot, "template/config.json")));
      for (const path of ["lib", ".speculo/specdev", ".speculo/knowledge", ".speculo/releases", ".speculo/environments", ".speculo/migration.json"]) assert.equal(await pathExists(join(root, path)), false, path);
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /speculo\/\.speculo\/knowledge\//);
      assert.match(agents, /references\/memory\.md/);
      assert.doesNotMatch(agents, /INDEX\.md|SPECULO-PERSISTENT-KNOWLEDGE/);
      assert.equal(await readFile(join(target, "CLAUDE.md"), "utf8"), "# CLAUDE.md\n\n@AGENTS.md\n");
      assert.deepEqual(await residue(target), []);
    } finally { await rm(target, { recursive: true, force: true }); }
  });

  it("replaces selected managed assets and preserves arbitrary runtime bytes", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo");
      const opaque = join(root, ".speculo", "skills", "upstream-assess", "state.json");
      await mkdir(dirname(opaque), { recursive: true });
      await writeFile(opaque, Buffer.from([0, 255, 10, 123, 0, 1]));
      const before = await hash(opaque);
      await writeFile(join(root, "commands", "status", "COMMAND.md"), "local static edit\n");
      await writeFile(join(root, "workflows", "specdev", "local-only.md"), "remove me\n");
      const config = await readJson(join(root, "config.json"));
      config.custom = { keep: true };
      await writeJson(join(root, "config.json"), config);

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.refresh.status, "updated");
      assert.equal(await hash(opaque), before);
      assert.ok(result.refresh.preservedFiles >= 1);
      assert.notEqual(await readFile(join(root, "commands", "status", "COMMAND.md"), "utf8"), "local static edit\n");
      assert.equal(await pathExists(join(root, "workflows", "specdev", "local-only.md")), true);
      assert.deepEqual((await readJson(join(root, "config.json"))).custom, { keep: true });
      assert.equal(result.refresh.backupPath, null);
      assert.deepEqual(await residue(target), []);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("refresh preserves old archives, arbitrary release notes, prototype code and permissions", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo"), state = join(root, ".speculo");
      const files = new Map([
        ["specdev/changes/archive/2026-07/old/README.md", Buffer.from("historical Outcome: anything\r\n")],
        ["releases/current/README.md", Buffer.from("# Release\nNo required format.\n")],
        ["knowledge/design/prototype.html", Buffer.from("<!doctype html><button>Original UI</button>\r\n")],
        ["environments/nas.md", Buffer.from("# NAS\nUse the existing deployment script.\n")],
        ["ops/status.json", Buffer.from("{ partially written legacy JSON")],
        ["specdev/changes/current/evidence.bin", Buffer.from([0, 255, 42, 10])],
      ]);
      for (const [name, bytes] of files) {
        const path = join(state, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes);
        if (!isWindows) await chmod(path, 0o600);
      }
      await initSpeculo(target, { packageRoot });
      for (const [name, bytes] of files) {
        const path = join(state, name); assert.deepEqual(await readFile(path), bytes, name);
        if (!isWindows) assert.equal((await lstat(path)).mode & 0o777, 0o600, name);
      }
      assert.equal((await doctorSpeculo(target)).healthy, true);
    } finally { await rm(target, { recursive: true, force: true }); }
  });

  it("refreshes a 2.x selection into the unified method and preserves all old project data", async () => {
    const target = await tempProject(), oldPackage = await packageFixture("2.1.17");
    try {
      const oldTemplate = join(oldPackage, "template");
      await mkdir(join(oldTemplate, "workflows/ops"), { recursive: true });
      await writeFile(join(oldTemplate, "workflows/ops/SKILL.md"), "---\nname: ops\ndescription: Historical operations entry\n---\n# OPS\n");
      await mkdir(join(oldTemplate, "workflows/specdev/specdev-i-implement"), { recursive: true });
      await writeFile(join(oldTemplate, "workflows/specdev/specdev-i-implement/SKILL.md"), "Historical Work method\n");
      await mkdir(join(oldTemplate, "commands/coordination-init"), { recursive: true });
      await writeFile(join(oldTemplate, "commands/coordination-init/COMMAND.md"), "---\nid: coordination-init\ndescription: Historical coordination entry\n---\n");
      await initSpeculo(target, { packageRoot: oldPackage, selection: { workflowIds: ["ops", "specdev"] }, skills: { mode: "all" } });
      const root = join(target, ".agents/speculo"), state = join(root, ".speculo");
      const files = new Map([
        ["ops/deployments/nas.json", "{ old deployment format\r\n"],
        ["specdev/changes/old/README.md", "# Old release\nOutcome: active\n"],
        ["specdev/changes/old/DESIGN.md", "Original approved design\r\n"],
        ["specdev/design/prototype.tsx", "export default () => <main>Design</main>;\n"],
        ["coordination/project.json", "{ old preferences without a valid schema"],
      ]);
      for (const [name, text] of files) { const path = join(state, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, text); }
      const legacyPointer = ".agents/skills/specdev-i-implement/SKILL.md";
      await mkdir(dirname(join(target, legacyPointer)), { recursive: true });
      await writeFile(join(target, legacyPointer), "Historical Work pointer\n");
      const projections = await readJson(join(state, "projections.json"));
      projections.asset_ids.push("specdev/implement");
      projections.files.push({ path: legacyPointer, asset_id: "specdev/implement", sha256: await hash(join(target, legacyPointer)) });
      await writeJson(join(state, "projections.json"), projections);

      const result = await initSpeculo(target, { packageRoot });
      assert.equal(result.refresh.sourceVersion, "2.1.17");
      assert.ok(result.warnings.some(warning => warning.includes("OPS is now part of SpecDev")));
      assert.deepEqual((await readJson(join(state, "install.json"))).workflows, ["specdev"]);
      assert.ok(result.exposure.assetIds.includes("domain/specdev"));
      for (const id of ["domain/ops", "specdev/implement", "command/coordination-init"]) assert.ok(!result.exposure.assetIds.includes(id), id);
      for (const path of [legacyPointer, ".agents/skills/ops/SKILL.md", ".agents/skills/speculo-coordination-init/SKILL.md", ".agents/speculo/workflows/ops/SKILL.md", ".agents/speculo/workflows/specdev/specdev-i-implement/SKILL.md"]) assert.equal(await pathExists(join(target, path)), false, path);
      for (const [name, text] of files) assert.equal(await readFile(join(state, name), "utf8"), text, name);
      assert.equal((await doctorSpeculo(target)).healthy, true);
      assert.ok(!(await initSpeculo(target, { packageRoot })).warnings.some(warning => warning.includes("OPS is now")));
      const current = await hash(join(state, "install.json"));
      await assert.rejects(initSpeculo(target, { packageRoot, skills: { mode: "set", assetIds: ["specdev/implement"] } }), error => expectBlocked(error, "unknown-projection-asset"));
      assert.equal(await hash(join(state, "install.json")), current);
    } finally { await rm(target, { recursive: true, force: true }); await rm(oldPackage, { recursive: true, force: true }); }
  });

  it("three-way merges config additions, removals, defaults, and user overrides", async () => {
    const target = await tempProject();
    const nextPackage = await packageFixture();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo");
      const local = await readJson(join(root, "config.json"));
      local.defaults.report_language = "en-US";
      await writeJson(join(root, "config.json"), local);
      const incoming = await readJson(join(nextPackage, "template", "config.json"));
      delete incoming.persistence;
      incoming.defaults.report_language = "ja-JP";
      incoming.defaults.confirm_before_external_write = false;
      incoming.defaults.new_setting = "added";
      await writeJson(join(nextPackage, "template", "config.json"), incoming);

      const result = await initSpeculo(target, { packageRoot: nextPackage, selection: { workflowIds: ["specdev"] } });
      const merged = await readJson(join(root, "config.json"));
      assert.equal(merged.persistence, undefined);
      assert.equal(merged.defaults.report_language, "en-US");
      assert.equal(merged.defaults.confirm_before_external_write, false);
      assert.equal(merged.defaults.new_setting, "added");
      assert.equal(result.refresh.config.removed, 1);
      assert.ok(result.refresh.config.updated >= 1);
      assert.ok(result.refresh.config.preserved >= 1);
      assert.match(result.refresh.backupPath!, /^\.agents\/speculo\/\.speculo\/back\/[a-f0-9-]+$/);
      const backupRoot = join(target, result.refresh.backupPath!);
      const backup = await readJson(join(backupRoot, "config.json"));
      assert.ok(backup.persistence);
      const backupManifest = await readJson(join(backupRoot, "manifest.json"));
      assert.equal(backupManifest.scope, "targeted-refresh-backup");
      assert.deepEqual(backupManifest.files.map((entry: any) => entry.source_path), ["config.json"]);
      const backupBefore = await readFile(join(backupRoot, "config.json"));
      await initSpeculo(target, { packageRoot: nextPackage, selection: { workflowIds: ["specdev"] } });
      assert.deepEqual(await readFile(join(backupRoot, "config.json")), backupBefore);
    } finally {
      await rm(target, { recursive: true, force: true });
      await rm(nextPackage, { recursive: true, force: true });
    }
  });

  it("blocks 0.x installations without reading or migrating state", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo");
      await writeJson(join(root, ".speculo", "install.json"), { schema_version: 1, package_version: "0.7.0", workflows: ["specdev"] });
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "unsupported-installation-version"));
      assert.equal((await readJson(join(root, ".speculo", "install.json"))).package_version, "0.7.0");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });





  it("blocks malformed config before replacement and creates no pending marker", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo");
      const sentinel = join(root, "commands", "status", "COMMAND.md");
      await writeFile(sentinel, "active stays\n", "utf8");
      await writeFile(join(root, "config.json"), "{ invalid\n", "utf8");
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "invalid-json"));
      assert.equal(await readFile(sentinel, "utf8"), "active stays\n");
      assert.equal(await pathExists(join(root, ".speculo", "migration.json")), false);
      assert.deepEqual(await residue(target), []);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("leaves legacy pending installations untouched", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo");
      await writeJson(join(root, ".speculo", "migration.json"), { schema_version: 1, status: "pending" });
      await writeFile(join(root, "commands", "migrate-runtime-state.md"), "legacy repair\n", "utf8");
      const marker = await readFile(join(root, ".speculo", "migration.json"), "utf8");
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), /unsupported-installation-version/);
      assert.equal(await readFile(join(root, ".speculo", "migration.json"), "utf8"), marker);
      assert.equal(await readFile(join(root, "commands", "migrate-runtime-state.md"), "utf8"), "legacy repair\n");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("blocks runtime symlinks without replacing active files", { skip: isWindows ? "requires Windows Developer Mode symlink privileges" : false }, async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, ".agents/speculo");
      const sentinel = join(root, "commands", "status", "COMMAND.md");
      await writeFile(sentinel, "active stays\n", "utf8");
      await mkdir(join(root, ".speculo", "specdev"), { recursive: true });
      await symlink("status.json", join(root, ".speculo", "specdev", "status-link.json"));
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "runtime-symlink"));
      assert.equal(await readFile(sentinel, "utf8"), "active stays\n");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("preserves symlinked selected static assets and blocks unsafe replacement", { skip: isWindows ? "requires Windows Developer Mode symlink privileges" : false }, async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const command = join(target, ".agents/speculo", "commands", "status", "COMMAND.md");
      await rm(command);
      await symlink("../config.json", command);
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "unsafe-managed-asset"));
      assert.equal((await lstat(command)).isSymbolicLink(), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("keeps supported unselected workflows untouched and preserves unknown files", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person", "specdev"] } });
      const root = join(target, ".agents/speculo");
      await writeFile(join(root, "workflows", "person", "local.md"), "keep\n", "utf8");
      await writeFile(join(root, "workflows", "specdev", "local.md"), "remove\n", "utf8");
      await mkdir(join(root, ".speculo", "person"), { recursive: true });
      await writeFile(join(root, ".speculo", "person", "custom.bin"), Buffer.from([1, 2, 3]));
      await mkdir(join(root, "workflows", "removed"), { recursive: true });
      await writeFile(join(root, "workflows", "removed", "INDEX.md"), "legacy\n");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(await readFile(join(root, "workflows", "person", "local.md"), "utf8"), "keep\n");
      assert.equal(await pathExists(join(root, "workflows", "specdev", "local.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "removed")), true);
      assert.deepEqual(await readFile(join(root, ".speculo", "person", "custom.bin")), Buffer.from([1, 2, 3]));
      const managed = await readJson(join(root, ".speculo", "managed.json"));
      assert.equal(managed.files.some((entry: any) => entry.path === "workflows/person/local.md"), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("detects concurrent active drift and cleans transaction residues", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const sentinel = join(target, ".agents/speculo", "commands", "status", "COMMAND.md");
      await assert.rejects(initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
        beforeCommit: async () => writeFile(sentinel, "concurrent edit\n", "utf8"),
      }), (error) => expectBlocked(error, "concurrent-drift"));
      assert.equal(await readFile(sentinel, "utf8"), "concurrent edit\n");
      assert.deepEqual(await residue(target), []);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("uses an exclusive project lock", async () => {
    const target = await tempProject();
    try {
      await mkdir(join(target, ".agents/.speculo-install.lock"),{recursive:true});
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "refresh-locked"));
      assert.equal(await pathExists(join(target, ".agents/speculo")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("keeps the prior install when package staging fails", async () => {
    const target = await tempProject();
    const brokenPackage = await packageFixture();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const sentinel = join(target, ".agents/speculo", "commands", "status", "COMMAND.md");
      await writeFile(sentinel, "active stays\n", "utf8");
      await writeFile(join(brokenPackage, "template", "workflows", "learning", "SKILL.md"), "invalid entry");
      await assert.rejects(initSpeculo(target, { packageRoot: brokenPackage, selection: { workflowIds: ["learning"] } }), /invalid-frontmatter/);
      assert.equal(await readFile(sentinel, "utf8"), "active stays\n");
      assert.deepEqual(await residue(target), []);
    } finally {
      await rm(target, { recursive: true, force: true });
      await rm(brokenPackage, { recursive: true, force: true });
    }
  });

  it("preserves domain notes and malformed historical state without interpreting it", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
      const state = join(target, ".agents/speculo/.speculo/learning");
      const records = new Map([
        ["context/course.md", Buffer.from("# Course\r\nCustom \u0000 bytes.\r\n")],
        ["status.json", Buffer.from("{unfinished historical status")],
        ["changes/topic/.status.json", Buffer.from('{"unknown_schema":99}\r\n')],
      ]);
      for (const [name, bytes] of records) { const path = join(state, name); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes); }
      await initSpeculo(target, { packageRoot, selection: { workflowIds: [] } });
      for (const [name, bytes] of records) assert.deepEqual(await readFile(join(state, name)), bytes);
      assert.equal((await doctorSpeculo(target)).healthy, true);
      const managed = await readJson(join(target, ".agents/speculo/.speculo/managed.json"));
      assert.equal(managed.files.some((entry: any) => entry.path.startsWith(".speculo/learning/")), false);
    } finally { await rm(target, { recursive: true, force: true }); }
  });



});

describe("CLI surface", () => {
  it("accepts --workflows all without prompts in a non-interactive invocation", async () => {
    const target = await tempProject();
    try {
      const child = spawnSync(process.execPath, [
        join(packageRoot, "dist/src/cli.js"), "init", target, "--workflows", "all",
        "--skills", "domain/specdev,domain/learning,command/status",
        "--skill-targets", "agents,claude",
      ], { encoding: "utf8", timeout: 60000 });
      assert.equal(child.status, 0, child.stderr);
      assert.doesNotMatch(child.stdout, /选择曝光方式|确认应用/);
      const projection = await readJson(join(target, ".agents/speculo/.speculo/projections.json"));
      assert.deepEqual(projection.targets, ["agents", "claude"]);
      assert.deepEqual(projection.asset_ids, ["command/status", "domain/learning", "domain/specdev"]);
      assert.equal(projection.schema_version, 3);
      assert.equal(projection.files.filter((f: { path: string }) => f.path.endsWith("SKILL.md")).length, 6);
      assert.deepEqual((await readdir(join(target, ".agents/speculo/workflows"))).sort(), ["learning", "media", "person", "specdev"]);
      const disabled = spawnSync(process.execPath, [join(packageRoot, "dist/src/cli.js"), "init", target, "--core-only", "--skill-targets", "none"], { encoding: "utf8", timeout: 60000 });
      assert.equal(disabled.status, 0, disabled.stderr);
      const stopped = await readJson(join(target, ".agents/speculo/.speculo/projections.json"));
      assert.deepEqual((await readJson(join(target, ".agents/speculo/.speculo/install.json"))).workflows, []);
      assert.deepEqual(stopped.targets, []);
      assert.deepEqual(stopped.asset_ids, []);
      for (const host of ["agents", "claude"]) assert.deepEqual(await readdir(join(target, `.${host}/skills`)), []);
      assert.deepEqual(await residue(target), []);
    } finally { await rm(target, { recursive: true, force: true }); }
  });

  it("rejects retired flags, invalid targets and contradictory exposure before creating files", async () => {
    const target = await tempProject();
    try {
      for (const args of [
        ["--hub-skills", "../orca"], ["--core-only", "--hub-skills", "all"], ["--hub-skills", "automation/orca", "--skill-targets", "none"],
        ["--agent-skills", "all"], ["--claude-skills", "all"], ["--skills", "domains"],
        ["--skill-targets", "elsewhere"], ["--skill-targets", "none,agents"],
        ["--skill-targets", "none", "--skills", "all"],
        ["--skill-targets", "none", "--skills", "keep"],
      ]) {
        const child = spawnSync(process.execPath, [join(packageRoot, "dist/src/cli.js"), "init", target, ...args], { encoding: "utf8", timeout: 10000 });
        assert.equal(child.status, 1, child.stderr);
        assert.deepEqual(await readdir(target), []);
      }
    } finally { await rm(target, { recursive: true, force: true }); }
  });

  it("discovers all packaged workflows", async () => {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    assert.deepEqual(selectAllFromCatalog(catalog).workflowIds, ["learning", "media", "person", "specdev"]);
  });

  it("exposes init, version, and read-only doctor", () => {
    const cli = join(packageRoot, "dist", "src", "cli.js");
    const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /speculo \[init\] \[target\]/);
    assert.match(help.stdout, /speculo version/);
    assert.match(help.stdout, /speculo doctor/);
    assert.doesNotMatch(help.stdout, /migrate-runtime-state|mirror-skills|update\s+/);
    const removed = spawnSync(process.execPath, [cli, "update"], { encoding: "utf8" });
    assert.equal(removed.status, 1);
    assert.match(removed.stderr, /has been removed/);
  });

  it("preserves existing handbooks while managing persistent knowledge references", async () => {
    const target = await tempProject();
    try {
      const agents = "# Project rules\n\nKeep this handbook unchanged.\n";
      const claude = "# Local Claude rules\n";
      await writeFile(join(target, "AGENTS.md"), agents, "utf8");
      await writeFile(join(target, "CLAUDE.md"), claude, "utf8");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const updatedAgents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.ok(updatedAgents.startsWith(agents.trimEnd()));
      assert.match(updatedAgents, /SPECULO-BOOTSTRAP:START/);
      assert.match(updatedAgents, /speculo\/\.speculo\/knowledge\//);
      assert.equal(await readFile(join(target, "CLAUDE.md"), "utf8"), claude);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("shares one knowledge location without creating empty project data", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning", "person"] } });
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /speculo\/\.speculo\/knowledge\//);
      assert.equal(await pathExists(join(target, ".agents/speculo/.speculo/knowledge")), false);
      assert.doesNotMatch(agents, /INDEX\.md|learning\/context|ops\/hosts/);
    } finally { await rm(target, { recursive: true, force: true }); }
  });

  it("uses the same concise discovery block for person-only selection", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person"] } });
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /SPECULO-BOOTSTRAP:START/);
      assert.match(agents, /speculo\/catalog\.json/);
      assert.doesNotMatch(agents, /SPECULO-PERSISTENT-KNOWLEDGE|<SPECULO>/);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("removes uninstalled workflow navigation and preserves unrelated handbook bytes", async () => {
    const target = await tempProject();
    try {
      await writeFile(join(target, "AGENTS.md"), "# Project rules\n\n<SPECULO>\nlegacy forced workflow\n</SPECULO>\n", "utf8");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev", "learning"] } });
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /# Project rules/);
      assert.match(agents, /<SPECULO>\nlegacy forced workflow\n<\/SPECULO>/);
      assert.match(agents, /speculo\/\.speculo\/knowledge\//);
      assert.doesNotMatch(agents, /learning\/context/);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("reports a healthy initialized installation", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const result = await doctorSpeculo(target);
      assert.equal(result.healthy, true, JSON.stringify(result.checks));
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
