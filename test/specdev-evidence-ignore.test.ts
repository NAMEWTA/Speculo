import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { planExternalEdits, updateSpecdevEvidenceIgnore } from "../src/agent-files.js";
import { image, bytes, type ExternalName, type FileImage } from "../src/external-files.js";
import { initSpeculo } from "../src/index.js";

function policy(content: string, installed = true): string {
  const snapshots = new Map<ExternalName, FileImage>([[".gitignore", image(content)]]);
  return bytes(planExternalEdits(snapshots, [], installed)[0].after).toString("utf8");
}
test("SpecDev evidence policy is idempotent, scoped and preserves user lines and CRLF", () => {
  const original = "# Owner ignore\r\nmanual/\r\n";
  const first = policy(original);
  assert.ok(first.startsWith(original));
  assert.equal(policy(first), first);
  assert.ok(first.includes("SPECULO-EVIDENCE:START"));
  assert.equal(policy(first, false).includes("SPECULO-EVIDENCE:START"), false);
  assert.match(policy(original, false), /manual\//);
  assert.equal(updateSpecdevEvidenceIgnore(first, true), first);
  assert.throws(() => policy(original + "# SPECULO-EVIDENCE:START\r\n"), /invalid-evidence-ignore-markers/);
  assert.doesNotMatch(first.replaceAll("\r\n", ""), /\n/);
});
test("Git tracks only result reports throughout active/archive, prototype and session evidence", async t => {
  const root = await mkdtemp(join(tmpdir(), "specdev-evidence-ignore-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
  await writeFile(join(root, ".gitignore"), policy("# user rules\n"));
  const paths = [
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/evidence/T-01.md", false],
    [" .agents/speculo/.speculo/specdev/changes/archive/2026-11-01-a/evidence/report-summary.md", false],
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/prototypes/UI-001/evidence/approval-final.md", false],
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/sessions/run/evidence/report-verification.md", false],
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/evidence/review-input.json", true],
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/evidence/pr-001.patch", true],
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/prototypes/UI-001/evidence/browser.json", true],
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/prototypes/UI-001/evidence/390.png", true],
    [" .agents/speculo/.speculo/specdev/changes/2026-11-01-a/sessions/run/evidence/build.log", true],
  ] as const;
  for (const [marked, ignored] of paths) {
    const path = marked.trim();
    const result = spawnSync("git", ["-C", root, "check-ignore", "-q", "--", path]);
    assert.equal(result.status === 0, ignored, path);
  }
});
test("init, refresh and failed staging preserve evidence rules transactionally", async t => {
  const root = await mkdtemp(join(tmpdir(), "specdev-evidence-install-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, ".gitignore"), "# user-owned\n");
  const options = { packageRoot: process.cwd(), selection: { workflowIds: ["specdev"] } };
  await initSpeculo(root, options);
  const first = await readFile(join(root, ".gitignore"), "utf8");
  assert.match(first, /SPECULO-EVIDENCE:START/);
  await initSpeculo(root, options);
  assert.equal(await readFile(join(root, ".gitignore"), "utf8"), first);
  await assert.rejects(initSpeculo(root, { ...options, beforeCommit: async () => { throw new Error("injected before commit"); } }), /injected before commit/);
  assert.equal(await readFile(join(root, ".gitignore"), "utf8"), first);
});
