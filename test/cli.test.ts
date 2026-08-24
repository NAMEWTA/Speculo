import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { RefreshBlockedError } from "../src/refresh.js";
import { pathExists } from "../src/utils.js";
import { discoverWorkflowCatalog, selectAllFromCatalog } from "../src/workflows.js";

const packageRoot = process.cwd();

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

async function packageFixture(version = "0.7.7"): Promise<string> {
  const root = await tempProject("speculo-package-");
  await cp(join(packageRoot, "template"), join(root, "template"), { recursive: true });
  await writeJson(join(root, "package.json"), { version });
  return root;
}

async function residue(target: string): Promise<string[]> {
  return (await readdir(target)).filter((name) => name.startsWith(".speculo-init-stage-") || name === ".speculo-init.lock");
}

function expectBlocked(error: unknown, code: string): boolean {
  assert.ok(error instanceof RefreshBlockedError);
  assert.ok(error.blockers.some((blocker) => blocker.code === code), JSON.stringify(error.blockers));
  return true;
}

describe("Speculo init refresh", () => {
  it("creates manifest v2, baselines, selected state, and no migration repair assets", async () => {
    const target = await tempProject();
    try {
      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, "speculo");
      assert.equal(result.mode, "init");
      assert.equal(result.refresh.status, "initialized");
      assert.equal((await readJson(join(root, ".speculo", "install.json"))).schema_version, 2);
      const managed = await readJson(join(root, ".speculo", "managed.json"));
      assert.equal(managed.schema_version, 1);
      assert.ok(managed.files.some((entry: any) => entry.path === "commands/status.md" && entry.owner === "core/commands"));
      assert.ok(managed.files.some((entry: any) => entry.path === "workflows/specdev/runtime-contract.json" && entry.kind === "contract"));
      assert.deepEqual(
        await readJson(join(root, ".speculo", "baselines", "config.json")),
        await readJson(join(packageRoot, "template", "config.json")),
      );
      assert.equal(await pathExists(join(root, "commands", "migrate-runtime-state.md")), false);
      assert.equal(await pathExists(join(root, "skills", "migrate-runtime-state")), false);
      assert.equal(await pathExists(join(root, ".speculo", "migration.json")), false);
      assert.match(await readFile(join(target, "AGENTS.md"), "utf8"), /refresh contract/);
      assert.doesNotMatch(await readFile(join(target, "AGENTS.md"), "utf8"), /migrate-runtime-state/);
      assert.deepEqual(await residue(target), []);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("replaces selected managed assets and preserves arbitrary runtime bytes", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, "speculo");
      const opaque = join(root, ".speculo", "skills", "upstream-fork-sync", "state.json");
      await mkdir(dirname(opaque), { recursive: true });
      await writeFile(opaque, Buffer.from([0, 255, 10, 123, 0, 1]));
      const before = await hash(opaque);
      await writeFile(join(root, "commands", "status.md"), "local static edit\n");
      await writeFile(join(root, "workflows", "specdev", "local-only.md"), "remove me\n");
      const config = await readJson(join(root, "config.json"));
      config.custom = { keep: true };
      await writeJson(join(root, "config.json"), config);

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.refresh.status, "updated");
      assert.equal(await hash(opaque), before);
      assert.ok(result.refresh.preservedFiles >= 1);
      assert.notEqual(await readFile(join(root, "commands", "status.md"), "utf8"), "local static edit\n");
      assert.equal(await pathExists(join(root, "workflows", "specdev", "local-only.md")), false);
      assert.deepEqual((await readJson(join(root, "config.json"))).custom, { keep: true });
      assert.equal(result.refresh.backupPath, null);
      assert.deepEqual(await residue(target), []);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("three-way merges config additions, removals, defaults, and user overrides", async () => {
    const target = await tempProject();
    const nextPackage = await packageFixture();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, "speculo");
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
      assert.equal(result.refresh.backupPath, "speculo/.speculo/back");
      const backup = await readJson(join(root, ".speculo", "back", "config.json"));
      assert.ok(backup.persistence);
      const backupManifest = await readJson(join(root, ".speculo", "back", "manifest.json"));
      assert.equal(backupManifest.scope, "targeted-refresh-backup");
      assert.deepEqual(backupManifest.files.map((entry: any) => entry.source_path), ["config.json"]);
    } finally {
      await rm(target, { recursive: true, force: true });
      await rm(nextPackage, { recursive: true, force: true });
    }
  });

  it("bootstraps v0.7 without baselines and explicitly migrates SpecDev config", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, "speculo");
      await rm(join(root, ".speculo", "baselines"), { recursive: true, force: true });
      await writeJson(join(root, ".speculo", "install.json"), { schema_version: 1, package_version: "0.7.0", workflows: ["specdev"] });
      await writeJson(join(root, ".speculo", "specdev", "config.json"), {
        schema_version: 4,
        interaction_language: "en-US",
        artifact_language: "zh-CN",
        git: { auto_commit: true, default_branch: "develop", worktree_for_parallel: true },
        execution: { max_parallel: 7, deep_ticket_human_approval: false, shared_path_owner: "lead" },
        verification: { test: "pnpm test" },
        planning: { default_depth: "deep" },
      });

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const config = await readJson(join(root, ".speculo", "specdev", "config.json"));
      assert.equal(config.schema_version, 5);
      assert.equal(config.interaction_language, "en-US");
      assert.equal(config.git.default_branch, "develop");
      assert.equal(config.git.auto_commit, undefined);
      assert.equal(config.execution.max_implementation_agents, 7);
      assert.equal(config.execution.max_parallel, undefined);
      assert.equal(result.refresh.sourceVersion, "0.7.0");
      assert.equal(result.refresh.backupPath, "speculo/.speculo/back");
      assert.equal((await readJson(join(root, ".speculo", "install.json"))).schema_version, 2);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migrates registered structured state and backs up only changed originals", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, "speculo");
      const state = join(root, ".speculo", "specdev");
      const change = "2026-08-23-refresh-state";
      await writeJson(join(state, "status.json"), {
        schema_version: 4,
        workflow: "specdev",
        active: [{ change, current_work: null, works_run: [] }],
        archived: [],
      });
      await writeJson(join(state, "changes", change, ".status.json"), {
        schema_version: 3,
        artifact: "change-status",
        change,
        change_status: "active",
        current_work: null,
        created_at: "2026-08-23T00:00:00.000Z",
        updated_at: "2026-08-23T00:00:00.000Z",
        completed_at: null,
        archived: false,
        archive_path: null,
        blockers: [],
        deviations: [],
        worktrees: [],
      });
      await writeFile(join(state, "changes", change, "goal-plan.md"), "---\nschema_version: 5\nimplementation_agent_limit: 3\n---\n\n# Plan\n", "utf8");

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal((await readJson(join(state, "status.json"))).schema_version, 5);
      assert.equal((await readJson(join(state, "changes", change, ".status.json"))).schema_version, 6);
      assert.match(await readFile(join(state, "changes", change, "goal-plan.md"), "utf8"), /integration_attempt_limit: 3/);
      assert.equal(result.refresh.structuredUpgrades, 3);
      const manifest = await readJson(join(root, ".speculo", "back", "manifest.json"));
      assert.equal(manifest.files.length, 3);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("blocks malformed config before replacement and creates no pending marker", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, "speculo");
      const sentinel = join(root, "commands", "status.md");
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
      const root = join(target, "speculo");
      await writeJson(join(root, ".speculo", "migration.json"), { schema_version: 1, status: "pending" });
      await writeFile(join(root, "commands", "migrate-runtime-state.md"), "legacy repair\n", "utf8");
      const marker = await readFile(join(root, ".speculo", "migration.json"), "utf8");
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "legacy-pending-migration"));
      assert.equal(await readFile(join(root, ".speculo", "migration.json"), "utf8"), marker);
      assert.equal(await readFile(join(root, "commands", "migrate-runtime-state.md"), "utf8"), "legacy repair\n");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("blocks runtime symlinks without replacing active files", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const root = join(target, "speculo");
      const sentinel = join(root, "commands", "status.md");
      await writeFile(sentinel, "active stays\n", "utf8");
      await symlink("status.json", join(root, ".speculo", "specdev", "status-link.json"));
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "runtime-symlink"));
      assert.equal(await readFile(sentinel, "utf8"), "active stays\n");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("replaces symlinked selected static assets instead of treating them as runtime", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const command = join(target, "speculo", "commands", "status.md");
      await rm(command);
      await symlink("../config.json", command);
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal((await lstat(command)).isSymbolicLink(), false);
      assert.match(await readFile(command, "utf8"), /status/i);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("keeps supported unselected workflows untouched and removes unknown ones", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person", "specdev"] } });
      const root = join(target, "speculo");
      await writeFile(join(root, "workflows", "person", "local.md"), "keep\n", "utf8");
      await writeFile(join(root, "workflows", "specdev", "local.md"), "remove\n", "utf8");
      await writeFile(join(root, ".speculo", "person", "custom.bin"), Buffer.from([1, 2, 3]));
      await mkdir(join(root, "workflows", "removed"), { recursive: true });
      await writeFile(join(root, "workflows", "removed", "INDEX.md"), "legacy\n");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(await readFile(join(root, "workflows", "person", "local.md"), "utf8"), "keep\n");
      assert.equal(await pathExists(join(root, "workflows", "specdev", "local.md")), false);
      assert.equal(await pathExists(join(root, "workflows", "removed")), false);
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
      const sentinel = join(target, "speculo", "commands", "status.md");
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
      await mkdir(join(target, ".speculo-init.lock"));
      await assert.rejects(initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }), (error) => expectBlocked(error, "refresh-locked"));
      assert.equal(await pathExists(join(target, "speculo")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("keeps the prior install when package staging fails", async () => {
    const target = await tempProject();
    const brokenPackage = await packageFixture();
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const sentinel = join(target, "speculo", "commands", "status.md");
      await writeFile(sentinel, "active stays\n", "utf8");
      await rm(join(brokenPackage, "template", "workflows", "specdev", "_state"), { recursive: true, force: true });
      await assert.rejects(initSpeculo(target, { packageRoot: brokenPackage, selection: { workflowIds: ["specdev"] } }), /missing _state/);
      assert.equal(await readFile(sentinel, "utf8"), "active stays\n");
      assert.deepEqual(await residue(target), []);
    } finally {
      await rm(target, { recursive: true, force: true });
      await rm(brokenPackage, { recursive: true, force: true });
    }
  });
});

describe("CLI surface", () => {
  it("discovers all packaged workflows", async () => {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    assert.deepEqual(selectAllFromCatalog(catalog).workflowIds, ["person", "specdev"]);
  });

  it("exposes only init and version", () => {
    const cli = join(packageRoot, "dist", "src", "cli.js");
    const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /speculo \[init\] \[target\]/);
    assert.match(help.stdout, /speculo version/);
    assert.doesNotMatch(help.stdout, /migrate-runtime-state|mirror-skills|update\s+/);
    const removed = spawnSync(process.execPath, [cli, "update"], { encoding: "utf8" });
    assert.equal(removed.status, 1);
    assert.match(removed.stderr, /has been removed/);
  });
});
