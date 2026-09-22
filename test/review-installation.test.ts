import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { updateAgentsContent } from "../src/agent-files.js";
import { doctorSpeculo } from "../src/doctor.js";
import { fingerprintTree } from "../src/manifest.js";
import { resolvePathReference } from "../src/paths.js";
import { readTransaction, recoverInstall } from "../src/transaction.js";

const packageRoot = process.cwd();
const opts = { packageRoot, selection: { workflowIds: [] as string[] } };
const refs = [{ workflow: "specdev", path: "<Path>{roots.state}/specdev/adr/</Path>" }];
async function fixture(fn: (target: string) => Promise<void>): Promise<void> {
  const target = await mkdtemp(join(tmpdir(), "speculo-review-"));
  try { await fn(target); } finally { await rm(target, { recursive: true, force: true }); }
}

describe("review: safe handbooks, discovery and deterministic installation", () => {
  it("is byte-idempotent with LF/CRLF and preserves non-owned bytes", () => {
    for (const nl of ["\n", "\r\n"]) {
      const before = `# Custom${nl}${nl}Keep trailing whitespace.  ${nl}`;
      const first = updateAgentsContent(before, refs);
      assert.ok(first.startsWith(before));
      assert.equal(updateAgentsContent(first, refs), first);
      assert.equal(updateAgentsContent(updateAgentsContent(first, []), []), updateAgentsContent(first, []));
      const withSuffix = first + `UNOWNED SUFFIX  ${nl}`;
      assert.ok(updateAgentsContent(withSuffix, []).endsWith(`UNOWNED SUFFIX  ${nl}`));
    }
  });
  it("rejects malformed/duplicate owned markers instead of guessing a destructive repair", () => {
    for (const content of ["<!-- SPECULO-BOOTSTRAP:START -->", "<!-- SPECULO-BOOTSTRAP:END -->", updateAgentsContent("", refs).repeat(2)]) {
      assert.throws(() => updateAgentsContent(content, refs), /invalid-agent-markers/);
    }
  });
  it("rejects external/dangling/same-project handbooks links without changing the link or target", { skip: process.platform === "win32" }, async () => {
    for (const name of ["AGENTS.md", "CLAUDE.md", ".gitignore"]) await fixture(async (target) => {
      const outside = await mkdtemp(join(tmpdir(), "speculo-handbook-source-"));
      try {
        const source = join(outside, "handbook.md"); await writeFile(source, "original\n");
        await symlink(source, join(target, name));
        await assert.rejects(initSpeculo(target, opts), /unsafe-external-file/);
        assert.equal(await readFile(source, "utf8"), "original\n");
        assert.ok((await lstat(join(target, name))).isSymbolicLink());
        await rm(source);
        await assert.rejects(initSpeculo(target, opts), /unsafe-external-file/);
        assert.ok((await lstat(join(target, name))).isSymbolicLink());
      } finally { await rm(outside, { recursive: true, force: true }); }
    });
  });
  it("preserves concurrent external edits and the previous installation", async () => fixture(async (target) => {
    await initSpeculo(target, opts);
    const before = await fingerprintTree(join(target, "speculo"));
    await assert.rejects(initSpeculo(target, { ...opts, beforeCommit: async () => { await writeFile(join(target, "AGENTS.md"), "concurrent user text\n"); } }), /external-drift/);
    assert.equal(await readFile(join(target, "AGENTS.md"), "utf8"), "concurrent user text\n");
    assert.equal(await fingerprintTree(join(target, "speculo")), before);
    assert.ok(!(await readdir(target)).includes(".speculo-init.lock"));
  }));
  it("detects a link swap during staging without following it", { skip: process.platform === "win32" }, async () => fixture(async (target) => {
    await initSpeculo(target, opts); const source = join(target, "separate-handbook.md"); await writeFile(source, "separate\n");
    await assert.rejects(initSpeculo(target, { ...opts, beforeCommit: async () => { await rm(join(target, "AGENTS.md")); await symlink(source, join(target, "AGENTS.md")); } }), /unsafe-external-file/);
    assert.equal(await readFile(source, "utf8"), "separate\n");
    assert.ok((await lstat(join(target, "AGENTS.md"))).isSymbolicLink());
  }));
  it("non-interactive fresh init is core-only; refresh retains installed supported workflows", async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot });
    assert.deepEqual(JSON.parse(await readFile(join(target, "speculo/.speculo/install.json"), "utf8")).workflows, []);
    assert.match(await readFile(join(target, "AGENTS.md"), "utf8"), /workspace\.json/);
    assert.match(await readFile(join(target, "speculo/.speculo/catalog.md"), "utf8"), /docs-sync/);
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
    await initSpeculo(target, { packageRoot });
    const install = JSON.parse(await readFile(join(target, "speculo/.speculo/install.json"), "utf8"));
    assert.deepEqual(install.workflows, ["learning"]);
    const catalog = await readFile(join(target, "speculo/.speculo/catalog.md"), "utf8");
    assert.match(catalog, /workflows\/learning\/INDEX\.md/); assert.doesNotMatch(catalog, /workflows\/ops/);
  }));
  it("resolves explicit pointers without shell execution and rejects traversal/placeholders", async () => fixture(async (target) => {
    await initSpeculo(target, opts);
    assert.equal(await resolvePathReference(target, "<Path>{roots.skills}/docs-sync/SKILL.md</Path>"), join(target, "speculo/skills/docs-sync/SKILL.md"));
    for (const value of ["../outside", "<Path>{roots.state}/../outside</Path>", "<Path>{roots.state}/changes/{change}</Path>", "<Path>{roots.unknown}/x</Path>", "C:\\escape", "<Path>bad"]) await assert.rejects(resolvePathReference(target, value));
  }));
});

describe("review: trustworthy read-only doctor", () => {
  for (const [label, mutate] of [
    ["invalid config", async (root: string) => writeFile(join(root, "config.json"), "not json")],
    ["empty roots", async (root: string) => writeFile(join(root, ".speculo/workspace.json"), JSON.stringify({ schema_version: 1, path_base: "project-root", roots: {} }))],
    ["missing managed asset", async (root: string) => rm(join(root, "skills/docs-sync/SKILL.md"))],
    ["missing installed workflow", async (root: string) => { const p = join(root, ".speculo/install.json"), data = JSON.parse(await readFile(p, "utf8")); data.workflows = ["missing"]; await writeFile(p, JSON.stringify(data)); }],
    ["empty managed manifest", async (root: string) => { const p = join(root, ".speculo/managed.json"), data = JSON.parse(await readFile(p, "utf8")); data.files = []; await writeFile(p, JSON.stringify(data)); }],
  ] as const) {
    it(`does not report healthy: ${label}`, async () => fixture(async (target) => {
      await initSpeculo(target, opts); const root = join(target, "speculo");
      assert.equal((await doctorSpeculo(target)).healthy, true);
      await mutate(root); const before = await fingerprintTree(target);
      const result = await doctorSpeculo(target);
      assert.equal(result.healthy, false, JSON.stringify(result));
      assert.equal(result.scope, "installation-integrity"); assert.ok(result.notChecked.includes("agent-behavior"));
      assert.equal(await fingerprintTree(target), before);
    }));
  }
});

describe("review: process-interruption recovery", () => {
  for (const phase of ["prepared", "old-renamed", "installed", "external-finalized", "committed"]) {
    it(`recovers a real killed process after ${phase}`, { skip: process.platform === "win32", timeout: 60000 }, async () => fixture(async (target) => {
      await initSpeculo(target, opts);
      await writeFile(join(target, "speculo/commands/status.md"), "previous static override\n");
      await writeFile(join(target, "AGENTS.md"), "# Previous handbook\n");
      await mkdir(join(target, "speculo/.speculo/custom"), { recursive: true });
      await writeFile(join(target, "speculo/.speculo/custom/evidence.bin"), Buffer.from([0, 255, 1]));
      const before = await fingerprintTree(join(target, "speculo"));
      const program = `import {initSpeculo} from ${JSON.stringify(pathToFileURL(resolve("dist/src/index.js")).href)}; await initSpeculo(${JSON.stringify(target)}, {packageRoot:${JSON.stringify(packageRoot)},selection:{workflowIds:[]},transactionHook:async phase=>{if(phase===${JSON.stringify(phase)})process.kill(process.pid,'SIGKILL')}});`;
      const child = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8", timeout: 30000 });
      assert.equal(child.signal, "SIGKILL", child.stderr);
      const j = await readTransaction(target);
      assert.equal(j.phase, phase);
      assert.equal((await doctorSpeculo(target)).healthy, false);
      await assert.rejects(recoverInstall(target, "wrong-id"), /recovery-transaction-mismatch/);
      const outcome = await recoverInstall(target, j.id);
      if (phase === "committed") {
        assert.equal(outcome.outcome, "completed-cleanup"); assert.equal((await doctorSpeculo(target)).healthy, true);
      } else {
        assert.equal(outcome.outcome, "rolled-back"); assert.equal(await fingerprintTree(join(target, "speculo")), before);
        assert.equal(await readFile(join(target, "AGENTS.md"), "utf8"), "# Previous handbook\n");
      }
      assert.deepEqual(await readFile(join(target, "speculo/.speculo/custom/evidence.bin")), Buffer.from([0, 255, 1]));
      assert.deepEqual((await readdir(target)).filter((name) => name.startsWith(".speculo-init-")), []);
    }));
  }
  it("keeps transaction evidence when concurrent content prevents rollback", async () => fixture(async (target) => {
    await initSpeculo(target, opts);
    await assert.rejects(initSpeculo(target, { ...opts, transactionHook: async (phase) => {
      if (phase === "installed") { await writeFile(join(target, "AGENTS.md"), "concurrent unrelated text\n"); throw new Error("injected failure"); }
    } }), /recovery-required/);
    assert.equal(await readFile(join(target, "AGENTS.md"), "utf8"), "concurrent unrelated text\n");
    const j = await readTransaction(target);
    await assert.rejects(recoverInstall(target, j.id), /recovery-owner-live/);
  }));
});
