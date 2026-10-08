import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
import { sha256Buffer } from "../src/agent-skills.js";
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
  it("rolls managed agent skills back and leaves unmanaged skills in place", { skip: process.platform === "win32", timeout: 60000 }, async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, agentSkills: { mode: "set", workflowIds: ["learning"], templateNames: [] } });
    await mkdir(join(target, ".agents", "skills", "custom-skill"), { recursive: true });
    await writeFile(join(target, ".agents", "skills", "custom-skill", "SKILL.md"), "user owned\n");
    const skillPath = join(target, ".agents", "skills", "learning-l-lesson", "SKILL.md");
    const manifestPath = join(target, ".agents", "skills", ".speculo-managed.json");
    const edited = (await readFile(skillPath, "utf8")).replace("事实源", "事实来源");
    await writeFile(skillPath, edited);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { works: Array<{ id: string; sha256: string }> };
    const work = manifest.works.find((item) => item.id === "learning-l-lesson");
    assert.ok(work);
    work.sha256 = sha256Buffer(edited);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await writeFile(join(target, "speculo/commands/status.md"), "previous static override\n");
    const before = await fingerprintTree(join(target, "speculo"));
    const program = `import {initSpeculo} from ${JSON.stringify(pathToFileURL(resolve("dist/src/index.js")).href)}; await initSpeculo(${JSON.stringify(target)}, {packageRoot:${JSON.stringify(packageRoot)},selection:{workflowIds:["learning"]},agentSkills:{mode:"keep"},transactionHook:async phase=>{if(phase==="skills-projected")process.kill(process.pid,"SIGKILL")}});`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8", timeout: 30000 });
    assert.equal(child.signal, "SIGKILL", child.stderr);
    const j = await readTransaction(target);
    assert.equal(j.phase, "skills-projected");
    assert.equal(j.schema_version, 2);
    const outcome = await recoverInstall(target, j.id);
    assert.equal(outcome.outcome, "rolled-back");
    assert.equal(await fingerprintTree(join(target, "speculo")), before);
    assert.equal(await readFile(skillPath, "utf8"), edited);
    assert.equal(await readFile(join(target, ".agents", "skills", "custom-skill", "SKILL.md"), "utf8"), "user owned\n");
    assert.deepEqual((await readdir(target)).filter((name) => name.startsWith(".speculo-init-")), []);
  }));
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


describe("review R1/R2: metadata snapshots and configuration persistence", () => {
  it("fingerprints directory existence, root mode, node type and symlink targets without following links", async () => fixture(async (target) => {
    const root = join(target, "tree"); await mkdir(root);
    const empty = await fingerprintTree(root);
    assert.match(empty, /^tree-v2-(posix|windows):[a-f0-9]{64}$/);
    await mkdir(join(root, "empty")); assert.notEqual(await fingerprintTree(root), empty);
    await rm(join(root, "empty"), { recursive: true }); assert.equal(await fingerprintTree(root), empty);
    await writeFile(join(root, "node"), ""); const file = await fingerprintTree(root);
    await rm(join(root, "node")); await mkdir(join(root, "node")); assert.notEqual(await fingerprintTree(root), file);
    if (process.platform !== "win32") {
      const before = await fingerprintTree(root); await chmod(root, 0o700); assert.notEqual(await fingerprintTree(root), before);
      await symlink("missing-a", join(root, "link")); const link = await fingerprintTree(root);
      await rm(join(root, "link")); await symlink("missing-b", join(root, "link")); assert.notEqual(await fingerprintTree(root), link);
    }
  }));
  for (const change of ["mode", "directory"] as const) {
    it(`refuses staging-time ${change} drift and preserves the active runtime`, { skip: change === "mode" && process.platform === "win32" }, async () => fixture(async (target) => {
      await initSpeculo(target, opts);
      const root = join(target, "speculo"), file = join(root, ".speculo/dummy.txt"), dir = join(root, ".speculo/new-empty");
      await writeFile(file, "SYNTHETIC NON-SECRET\n", { mode: 0o644 });
      await assert.rejects(initSpeculo(target, { ...opts, beforeCommit: async () => {
        if (change === "mode") await chmod(file, 0o600); else await mkdir(dir);
      } }), /blocked|drift/);
      if (change === "mode") assert.equal((await lstat(file)).mode & 0o777, 0o600); else assert.ok((await lstat(dir)).isDirectory());
      assert.deepEqual((await readdir(target)).filter((name) => name.startsWith(".speculo-init-")), []);
    }));
    for (const phase of ["prepared", "old-renamed", "installed", "external-finalized", "committed"] as const) {
      it(`preserves ${change} drift at ${phase} during failure and explicit recovery`, { skip: change === "mode" && process.platform === "win32" }, async () => fixture(async (target) => {
        await initSpeculo(target, opts);
        await writeFile(join(target, "speculo/.speculo/dummy.txt"), "SYNTHETIC NON-SECRET\n", { mode: 0o644 });
        let changed = "";
        await assert.rejects(initSpeculo(target, { ...opts, transactionHook: async (at) => {
          if (at !== phase) return;
          const j = await readTransaction(target);
          const root = join(target, at === "old-renamed" ? j.backup : "speculo");
          changed = join(root, change === "mode" ? ".speculo/dummy.txt" : ".speculo/new-empty");
          if (change === "mode") await chmod(changed, 0o600); else await mkdir(changed);
          throw new Error("injected interruption after metadata drift");
        } }), /recovery-required|committed-cleanup-pending/);
        const path = join(target, ".speculo-init.lock/transaction.json");
        const j = await readTransaction(target); assert.equal(j.schema_version, 2); assert.equal(j.phase, phase);
        // Disposable journal only: emulate a stopped owner for explicit recovery.
        const stopped = spawnSync(process.execPath, ["-e", ""], { timeout: 10000 });
        assert.equal(stopped.status, 0); j.pid = stopped.pid;
        await writeFile(path, JSON.stringify(j));
        const before = await fingerprintTree(target);
        await assert.rejects(recoverInstall(target, j.id), /recovery-drift/);
        assert.equal(await fingerprintTree(target), before);
        if (change === "mode") assert.equal((await lstat(changed)).mode & 0o777, 0o600); else assert.ok((await lstat(changed)).isDirectory());
      }));
    }
  }
  it("recognizes every v1 phase but refuses recovery without modifying evidence", async () => fixture(async (target) => {
    await mkdir(join(target, ".speculo-init.lock"));
    await mkdir(join(target, ".speculo-init-stage-legacy"));
    await mkdir(join(target, ".speculo-init-stage-legacy-backup"));
    const path = join(target, ".speculo-init.lock/transaction.json");
    for (const phase of ["prepared", "old-renamed", "installed", "external-finalized", "committed", "rolled-back"]) {
      const journal = { schema_version: 1, id: "12345678-1234-1234-1234-123456789abc", host: hostname(), pid: process.pid, target,
        stage: ".speculo-init-stage-legacy", backup: ".speculo-init-stage-legacy-backup", before: "a".repeat(64), after: "b".repeat(64), phase,
        external: [".gitignore", "AGENTS.md", "CLAUDE.md"].map((name) => ({ name, before: null, after: null })) };
      await writeFile(path, JSON.stringify(journal)); const before = await fingerprintTree(target);
      assert.equal((await readTransaction(target)).schema_version, 1);
      await assert.rejects(recoverInstall(target, journal.id), /legacy-transaction-snapshot/);
      assert.equal(await fingerprintTree(target), before);
      assert.match(JSON.stringify(await doctorSpeculo(target)), /legacy-transaction-snapshot/);
    }
    const j = JSON.parse(await readFile(path, "utf8")); j.schema_version = 99;
    await writeFile(path, JSON.stringify(j)); const before = await fingerprintTree(target);
    await assert.rejects(readTransaction(target), /invalid-transaction-journal/);
    assert.equal(await fingerprintTree(target), before);
  }));
  it("refuses foreign-platform snapshots before acquiring a recovery guard", async () => fixture(async (target) => {
    await mkdir(join(target, ".speculo-init.lock"));
    const prefix = process.platform === "win32" ? "tree-v2-posix:" : "tree-v2-windows:";
    const j = { schema_version: 2, id: "12345678-1234-1234-1234-123456789abc", host: hostname(), pid: process.pid, target,
      stage: ".speculo-init-stage-test", backup: ".speculo-init-stage-test-backup", before: "absent", after: prefix + "b".repeat(64), phase: "prepared",
      external: [".gitignore", "AGENTS.md", "CLAUDE.md"].map((name) => ({ name, before: null, after: null })) };
    await writeFile(join(target, ".speculo-init.lock/transaction.json"), JSON.stringify(j)); const before = await fingerprintTree(target);
    await assert.rejects(recoverInstall(target, j.id), /snapshot-platform-mismatch/);
    assert.equal(await fingerprintTree(target), before);
  }));
  it("persists JSON own special keys through a real refresh without a spurious backup", async () => fixture(async (target) => {
    await initSpeculo(target, opts); const path = join(target, "speculo/config.json");
    const value = JSON.parse(await readFile(path, "utf8"));
    const keys = JSON.parse('{"__proto__":{"safe_marker":true},"constructor":"local","toString":"local","nested":{"__proto__":{"value":1}}}');
    for (const key of Object.keys(keys)) Object.defineProperty(value, key, { value: keys[key], enumerable: true });
    await writeFile(path, JSON.stringify(value));
    const result = await initSpeculo(target, opts);
    assert.equal(result.refresh.backupPath, null);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), value);
    assert.equal(Object.hasOwn(Object.prototype, "safe_marker"), false);
  }));
});
