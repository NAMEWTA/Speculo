import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { pathExists } from "../src/utils.js";
import {
  discoverWorkflowCatalog,
  promptWorkflowSelection,
  selectAllFromCatalog,
} from "../src/workflows.js";

const packageRoot = process.cwd();

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "speculo-test-"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

async function createBrokenPackageRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "speculo-broken-package-"));
  const template = join(root, "template");
  await mkdir(join(template, ".speculo"), { recursive: true });
  await mkdir(join(template, "commands"), { recursive: true });
  await mkdir(join(template, "skills"), { recursive: true });
  await mkdir(join(template, "workflows", "example"), { recursive: true });
  await writeFile(join(template, ".speculo", "workspace.json"), "{}\n");
  await writeFile(join(template, ".speculo", "README.md"), "state\n");
  await writeFile(join(template, "config.json"), "{}\n");
  await writeFile(
    join(template, "workflows", "example", "INDEX.md"),
    "---\nworkflow: example\nname: Example\ndescription: broken fixture\n---\n",
  );
  return root;
}

describe("Speculo CLI", () => {
  it("fresh init installs core assets, selected workflows, runtime state, and agent instructions", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.mode, "init");
      assert.equal(await pathExists(join(root, "config.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "workspace.json")), true);
      assert.equal(await pathExists(join(root, "commands", "handoff.md")), true);
      assert.equal(await pathExists(join(root, "skills", "docs-sync", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "specdev", "INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person")), false);
      assert.deepEqual(JSON.parse(await readFile(join(root, ".speculo", "specdev", "status.json"), "utf8")), {
        schema_version: 4,
        workflow: "specdev",
        active: [],
        archived: [],
      });
      assert.equal(await readFile(join(target, ".gitignore"), "utf8"), "specdev-worktree/\n");
      assert.equal(await pathExists(join(target, "CLAUDE.md")), true);
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /workflows\/specdev\/INDEX\.md/);
      assert.doesNotMatch(agents, /workflows\/person\/INDEX\.md/);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("preserves user AGENTS content while replacing only the Speculo block", async () => {
    const target = await tempProject();
    try {
      await writeFile(
        join(target, "AGENTS.md"),
        "# Local Rules\n\nKeep this text.\n\n<SPECULO>\nstale\n</SPECULO>\n",
      );
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person"] } });
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /Keep this text./);
      assert.match(agents, /workflows\/person\/INDEX\.md/);
      assert.doesNotMatch(agents, /stale/);
      assert.equal((agents.match(/<SPECULO>/g) ?? []).length, 1);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("refreshes a malformed legacy installation without migration and preserves only audit history", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const state = join(root, ".speculo");
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev", "person"] } });
      await writeJson(join(root, "config.json"), { schema_version: 999, stale: true });
      await writeJson(join(state, "specdev", "status.json"), { schema_version: 2, workflow: "specdev", active: [] });
      await mkdir(join(state, "specdev", "changes", "2026-08-09-history"), { recursive: true });
      await writeFile(join(state, "specdev", "changes", "2026-08-09-history", "source.md"), "history\n");
      await mkdir(join(state, "specdev", "archive", "2026-08", "2026-08-01-archive"), { recursive: true });
      await writeFile(join(state, "specdev", "archive", "2026-08", "2026-08-01-archive", "evidence.md"), "archive\n");
      await mkdir(join(state, "specdev", ".config"), { recursive: true });
      await writeFile(join(state, "specdev", ".config", "legacy.md"), "remove\n");
      await writeFile(join(state, "specdev", "config.json"), "{}\n");
      await writeFile(join(state, "specdev", "docs-sync.json"), "{}\n");
      await writeFile(join(state, "specdev", "marker.txt"), "remove\n");
      await mkdir(join(state, "commands", "docs-sync"), { recursive: true });
      await writeFile(join(state, "commands", "docs-sync", "state.json"), "{}\n");
      await writeFile(join(state, "commands", "docs-sync", "2026-08-09-workspace-report.md"), "report\n");
      await mkdir(join(state, "commands", ".config"), { recursive: true });
      await writeFile(join(state, "commands", ".config", "legacy.json"), "{}\n");
      await writeFile(join(root, "commands", "legacy.md"), "remove\n");
      await mkdir(join(root, "skills", "legacy-skill"), { recursive: true });
      await writeFile(join(root, "skills", "legacy-skill", "SKILL.md"), "remove\n");
      await mkdir(join(root, "workflows", "dev"), { recursive: true });
      await writeFile(join(root, "workflows", "dev", "INDEX.md"), "remove\n");
      await mkdir(join(state, "dev"), { recursive: true });
      await writeFile(join(state, "dev", "status.json"), "{}\n");

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.mode, "refresh");
      assert.deepEqual(JSON.parse(await readFile(join(root, "config.json"), "utf8")), JSON.parse(await readFile(join(packageRoot, "template", "config.json"), "utf8")));
      assert.deepEqual(JSON.parse(await readFile(join(state, "specdev", "status.json"), "utf8")), {
        schema_version: 4,
        workflow: "specdev",
        active: [],
        archived: [],
      });
      assert.equal(await readFile(join(state, "specdev", "changes", "2026-08-09-history", "source.md"), "utf8"), "history\n");
      assert.equal(await readFile(join(state, "specdev", "archive", "2026-08", "2026-08-01-archive", "evidence.md"), "utf8"), "archive\n");
      for (const removed of [
        join(state, "specdev", ".config"),
        join(state, "specdev", "config.json"),
        join(state, "specdev", "docs-sync.json"),
        join(state, "specdev", "marker.txt"),
        join(state, "commands", "docs-sync", "state.json"),
        join(state, "commands", ".config"),
        join(root, "commands", "legacy.md"),
        join(root, "skills", "legacy-skill"),
        join(root, "workflows", "dev"),
        join(state, "dev"),
      ]) {
        assert.equal(await pathExists(removed), false, removed);
      }
      assert.equal(await readFile(join(state, "commands", "docs-sync", "2026-08-09-workspace-report.md"), "utf8"), "report\n");
      assert.equal(await pathExists(join(root, "workflows", "person", "INDEX.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("leaves an unselected current workflow and its state untouched", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person", "specdev"] } });
      await writeFile(join(root, "workflows", "person", "local-marker.txt"), "keep\n");
      await writeFile(join(root, ".speculo", "person", "state-marker.txt"), "keep\n");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(await readFile(join(root, "workflows", "person", "local-marker.txt"), "utf8"), "keep\n");
      assert.equal(await readFile(join(root, ".speculo", "person", "state-marker.txt"), "utf8"), "keep\n");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("keeps the existing installation intact when staging a broken package fails", async () => {
    const target = await tempProject();
    const brokenPackageRoot = await createBrokenPackageRoot();
    try {
      await mkdir(join(target, "speculo"), { recursive: true });
      await writeFile(join(target, "speculo", "keep.txt"), "original\n");
      await assert.rejects(
        initSpeculo(target, { packageRoot: brokenPackageRoot, selection: { workflowIds: ["example"] } }),
        /missing _state/,
      );
      assert.equal(await readFile(join(target, "speculo", "keep.txt"), "utf8"), "original\n");
      const entries = await readdir(target);
      assert.equal(entries.some((name) => name.startsWith(".speculo-init-stage-")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
      await rm(brokenPackageRoot, { recursive: true, force: true });
    }
  });

  it("maintains the specdev worktree ignore without altering existing lines", async () => {
    const target = await tempProject();
    try {
      await writeFile(join(target, ".gitignore"), "node_modules/\r\n# keep\r\n");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(await readFile(join(target, ".gitignore"), "utf8"), "node_modules/\r\n# keep\r\nspecdev-worktree/\r\n");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("discovers workflow packages and selects all in non-interactive environments", async () => {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    assert.deepEqual([...catalog.keys()].sort(), ["person", "specdev"]);
    assert.deepEqual(selectAllFromCatalog(catalog).workflowIds, ["person", "specdev"]);
    assert.deepEqual((await promptWorkflowSelection(catalog)).workflowIds, ["person", "specdev"]);
  });

  it("compiled CLI exposes only init and version and rejects removed commands and flags", async () => {
    const cliPath = join(packageRoot, "dist", "src", "cli.js");
    const help = execFileSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
    assert.match(help, /speculo \[init\] \[target\]/);
    assert.match(help, /speculo version/);
    assert.doesNotMatch(help, /^\s+(?:migrate|mirror-skills|update)\b|--all|--apply|--dry-run/m);
    for (const args of [["migrate"], ["mirror-skills"], ["update"], ["init", "--all"]]) {
      const result = spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /has been removed/);
    }
  });

  it("compiled bare CLI invocation is an init alias", async () => {
    const target = await tempProject();
    const cliPath = join(packageRoot, "dist", "src", "cli.js");
    try {
      const result = spawnSync(process.execPath, [cliPath, target], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /Speculo initialized/);
      assert.equal(await pathExists(join(target, "speculo", "workflows", "specdev", "INDEX.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
