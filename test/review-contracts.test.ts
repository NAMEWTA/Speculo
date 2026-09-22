import assert from "node:assert/strict";
import { chmod, link, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { initSpeculo } from "../src/index.js";
import { fingerprintTree } from "../src/manifest.js";

const root = process.cwd();
const read = (path: string) => readFile(join(root, path), "utf8");

test("Learning conditional contracts remain directly reachable without unrelated full sections", async () => {
  const readme = await read("template/workflows/learning/README.md");
  for (const [work, rule, required] of [
    ["L-lesson", "lesson-contract", "estimated_minutes"],
    ["H-homework", "homework-contract", "Submission: ready"],
    ["C-consolidate", "consolidation-contract", "source_change_id"],
    ["A-archive", "consolidation-contract", "archive/YYYY-MM"],
    ["A-assess-and-plan", "artifact-layouts", "background/foundation.md"],
  ]) {
    assert.ok(readme.includes(`/common/rules/${rule}.md`));
    assert.ok((await read(`template/workflows/learning/${work}/${work}.md`)).includes(`/common/rules/${rule}.md`));
    assert.ok((await read(`template/workflows/learning/common/rules/${rule}.md`)).includes(required));
  }
  assert.ok(!readme.includes("Submission: pending"));
  assert.match(await read("template/workflows/learning/G-goal/references/external-goal-runner.md"), /无 slash-command 宿主/);
});

test("Docs Sync routes effects before per-mode Git contracts and preserves cursor semantics", async () => {
  const skill = await read("template/skills/docs-sync/SKILL.md");
  const command = await read("template/commands/docs-sync.md");
  const modes = await read("template/skills/docs-sync/references/mode-contract.md");
  assert.ok(!skill.includes("references/entry-procedure.md"), "no unconditional intermediate wrapper");
  for (const mode of ["audit", "update", "commit"]) assert.ok(skill.includes(mode) && command.includes(mode));
  assert.match(modes, /No cursor, synchronization counter or workflow sidecar advances/);
  assert.match(modes, /no-op synchronization commit/);
  assert.ok(!command.includes("调用本命令即授权"));
});

test("source inventory distinguishes missing historical sources from verified hashes", async () => {
  const project = await mkdtemp(join(tmpdir(), "speculo-inventory-"));
  try {
    await mkdir(join(project,"scripts"));
    await writeFile(join(project,"scripts/check-specdev-source-parity.mjs"), await read("scripts/check-specdev-source-parity.mjs"));
    await writeFile(join(project,"scripts/specdev-source-map.json"), JSON.stringify({schema_version:1,entries:[{source:"temp/skills/example/SKILL.md",source_sha256:"a".repeat(64),classification:"excluded",rationale:"explicit test fixture",targets:[]}]}));
    const script = join(project,"scripts/check-specdev-source-parity.mjs");
    const run = spawnSync(process.execPath, [script], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr); assert.match(run.stdout, /NOT VERIFIED/);
    const strict = spawnSync(process.execPath, [script, "--require-sources"], { encoding: "utf8" });
    assert.notEqual(strict.status, 0);
  } finally { await rm(project,{recursive:true,force:true}); }
});

test("external hardlinks and read-only handbooks are preserved", { skip: process.platform === "win32" }, async () => {
  const project = await mkdtemp(join(tmpdir(), "speculo-external-contract-"));
  try {
    await writeFile(join(project, "original.md"), "owned source\n");
    await link(join(project, "original.md"), join(project, "AGENTS.md"));
    const before = await fingerprintTree(project);
    await assert.rejects(initSpeculo(project, { packageRoot: root, selection: { workflowIds: [] } }), /unsafe-external-file/);
    assert.equal(await fingerprintTree(project), before);
    await rm(join(project, "AGENTS.md"));
    await writeFile(join(project, "AGENTS.md"), "read only\n");
    await chmod(join(project, "AGENTS.md"), 0o444);
    await assert.rejects(initSpeculo(project, { packageRoot: root, selection: { workflowIds: [] } }), /read-only-external-file/);
    assert.equal(await readFile(join(project, "AGENTS.md"), "utf8"), "read only\n");
  } finally { await chmod(join(project, "AGENTS.md"), 0o600).catch(() => {}); await rm(project, { recursive: true, force: true }); }
});
