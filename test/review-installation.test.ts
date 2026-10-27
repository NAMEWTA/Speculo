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
  for (const existingHandbook of [false, true]) it(`installs shared change-scope and research policies without a workflow (${existingHandbook ? "legacy handbook" : "fresh handbook"})`, async () => fixture(async (target) => {
    const prefix = "# Project rules\r\n\r\nKeep this policy and whitespace.  \r\n";
    const suffix = "\r\nUser appendix.  \r\n";
    const legacy = `${prefix}<!-- SPECULO-BOOTSTRAP:START -->\r\nPrevious discovery instructions.\r\n<!-- SPECULO-BOOTSTRAP:END -->${suffix}`;
    if (existingHandbook) await writeFile(join(target, "AGENTS.md"), legacy);
    await initSpeculo(target, opts);
    const handbook = await readFile(join(target, "AGENTS.md"), "utf8");
    if (existingHandbook) {
      assert.ok(handbook.startsWith(prefix));
      assert.ok(handbook.endsWith(suffix));
      assert.doesNotMatch(handbook, /(?<!\r)\n/);
    } else assert.ok(handbook.startsWith("# AGENTS.md\n"));
    const contracts = ["references/research-and-reuse/research-contract.md", "references/change-scope/change-contract.md"];
    const links = [...handbook.matchAll(/\]\((\.\/\.agents\/speculo\/references\/[^)]+)\)/g)].map(match => match[1]);
    const guide = await readFile(join(target, ".agents/speculo/.speculo/AGENTS.md"), "utf8");
    const guideReferences = [...guide.matchAll(/<Path>\{roots\.references\}\/[^<]+<\/Path>/g)].map(match => match[0]);
    for (const link of links) assert.ok((await readFile(join(target, link), "utf8")).length > 0);
    for (const contract of contracts) {
      assert.equal(links.filter(link => link === `./.agents/speculo/${contract}`).length, 1);
      const reference = `<Path>{roots.references}/${contract.slice("references/".length)}</Path>`;
      assert.equal(guideReferences.filter(value => value === reference).length, 1);
      assert.equal(await resolvePathReference(target, reference), join(target, ".agents/speculo", contract));
      assert.equal(await readFile(join(target, ".agents/speculo", contract), "utf8"), await readFile(join(packageRoot, "template", contract), "utf8"));
    }
    const install = JSON.parse(await readFile(join(target, ".agents/speculo/.speculo/install.json"), "utf8"));
    assert.deepEqual(install.workflows, []);
    await initSpeculo(target, opts);
    assert.equal(await readFile(join(target, "AGENTS.md"), "utf8"), handbook);
  }));
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
    const before = await fingerprintTree(join(target, ".agents/speculo"));
    await assert.rejects(initSpeculo(target, { ...opts, beforeCommit: async () => { await writeFile(join(target, "AGENTS.md"), "concurrent user text\n"); } }), /external-drift/);
    assert.equal(await readFile(join(target, "AGENTS.md"), "utf8"), "concurrent user text\n");
    assert.equal(await fingerprintTree(join(target, ".agents/speculo")), before);
    assert.ok(!(await readdir(target)).includes(".agents/.speculo-install.lock"));
  }));
  it("detects a link swap during staging without following it", { skip: process.platform === "win32" }, async () => fixture(async (target) => {
    await initSpeculo(target, opts); const source = join(target, "separate-handbook.md"); await writeFile(source, "separate\n");
    await assert.rejects(initSpeculo(target, { ...opts, beforeCommit: async () => { await rm(join(target, "AGENTS.md")); await symlink(source, join(target, "AGENTS.md")); } }), /unsafe-external-file/);
    assert.equal(await readFile(source, "utf8"), "separate\n");
    assert.ok((await lstat(join(target, "AGENTS.md"))).isSymbolicLink());
  }));
  it("non-interactive fresh init is core-only; refresh retains installed supported workflows", async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot });
    assert.deepEqual(JSON.parse(await readFile(join(target, ".agents/speculo/.speculo/install.json"), "utf8")).workflows, []);
    assert.match(await readFile(join(target, "AGENTS.md"), "utf8"), /workspace\.json/);
    assert.match(await readFile(join(target, ".agents/speculo/catalog.json"), "utf8"), /project-maintenance/);
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
    await initSpeculo(target, { packageRoot });
    const install = JSON.parse(await readFile(join(target, ".agents/speculo/.speculo/install.json"), "utf8"));
    assert.deepEqual(install.workflows, ["learning"]);
    const catalog = await readFile(join(target, ".agents/speculo/catalog.json"), "utf8");
    assert.match(catalog, /workflows\/learning\/SKILL\.md/); assert.doesNotMatch(catalog, /workflows\/ops/);
  }));
  it("resolves explicit pointers without shell execution and rejects traversal/placeholders", async () => fixture(async (target) => {
    await initSpeculo(target, opts);
    assert.equal(await resolvePathReference(target, "<Path>{roots.commands}/project-maintenance/references/operation-contract.md</Path>"), join(target, ".agents/speculo/commands/project-maintenance/references/operation-contract.md"));
    for (const value of ["../outside", "<Path>{roots.state}/../outside</Path>", "<Path>{roots.state}/changes/{change}</Path>", "<Path>{roots.unknown}/x</Path>", "C:\\escape", "<Path>bad"]) await assert.rejects(resolvePathReference(target, value));
  }));
  it("preserves optional coordination preferences and third-party Herdr/Orca skills in both project targets across refresh and retry", async () => fixture(async (target) => {
    const skills = new Map<string, string>();
    for (const host of ["agents", "claude"]) for (const mode of ["herdr", "orca"]) {
      const directory = join(target, `.${host}/skills/${mode}`);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "SKILL.md"), `---\nname: ${mode}\ndescription: Synthetic third-party fixture\nlicense: MIT\n---\n# ${mode}\n[Resource](resource.txt)\n`);
      await writeFile(join(directory, "resource.txt"), `User-owned ${host}/${mode}\n`);
      skills.set(directory, await fingerprintTree(directory));
    }
    const setup = { packageRoot, selection: { workflowIds: ["specdev"] }, skillTargets: ["agents", "claude"] as const, skills: { mode: "set" as const, assetIds: ["specdev/init-setup"] } };
    await initSpeculo(target, { ...setup, skillTargets: [...setup.skillTargets] });
    const stateRoot = join(target, ".agents/speculo/.speculo");
    await mkdir(join(stateRoot, "coordination"));
    const choices = JSON.stringify({ schema_version: 2, defaults: { mode: "orca", selection: "preferred", guide: ".claude/skills/orca/SKILL.md", fallback: ["host"] }, rules: [{ work_id: "specdev/code-review", choice: { mode: "host" } }] }, null, 2) + "\n";
    await writeFile(join(stateRoot, "coordination/project.json"), choices);
    const refresh = { ...setup, skillTargets: ["agents"] as Array<"agents" | "claude"> };
    await assert.rejects(initSpeculo(target, { ...refresh, beforeCommit: async () => { throw new Error("injected coordination refresh interruption"); } }), /injected coordination refresh interruption/);
    assert.equal(await readFile(join(stateRoot, "coordination/project.json"), "utf8"), choices);
    for (const [directory, fingerprint] of skills) assert.equal(await fingerprintTree(directory), fingerprint);
    await initSpeculo(target, refresh);
    assert.equal(await readFile(join(stateRoot, "coordination/project.json"), "utf8"), choices);
    for (const [directory, fingerprint] of skills) assert.equal(await fingerprintTree(directory), fingerprint);
    const projections = JSON.parse(await readFile(join(stateRoot, "projections.json"), "utf8")) as { files: Array<{ path: string }> };
    assert.ok(projections.files.every(item => !/\/skills\/(herdr|orca)\//.test(item.path)));
    const beforeDoctor = await fingerprintTree(target);
    assert.equal((await doctorSpeculo(target)).healthy, true);
    assert.equal(await fingerprintTree(target), beforeDoctor);
  }));
});

describe("review: trustworthy read-only doctor", () => {
  for (const [label, mutate] of [
    ["invalid config", async (root: string) => writeFile(join(root, "config.json"), "not json")],
    ["empty roots", async (root: string) => writeFile(join(root, ".speculo/workspace.json"), JSON.stringify({ schema_version: 1, path_base: "project-root", roots: {} }))],
    ["missing managed asset", async (root: string) => rm(join(root, "commands/project-maintenance/references/operation-contract.md"))],
    ["missing installed workflow", async (root: string) => { const p = join(root, ".speculo/install.json"), data = JSON.parse(await readFile(p, "utf8")); data.workflows = ["missing"]; await writeFile(p, JSON.stringify(data)); }],
    ["empty managed manifest", async (root: string) => { const p = join(root, ".speculo/managed.json"), data = JSON.parse(await readFile(p, "utf8")); data.files = []; await writeFile(p, JSON.stringify(data)); }],
  ] as const) {
    it(`does not report healthy: ${label}`, async () => fixture(async (target) => {
      await initSpeculo(target, opts); const root = join(target, ".agents/speculo");
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
      await writeFile(join(target, ".agents/speculo/commands/status/COMMAND.md"), "previous static override\n");
      await writeFile(join(target, "AGENTS.md"), "# Previous handbook\n");
      await mkdir(join(target, ".agents/speculo/.speculo/custom"), { recursive: true });
      await writeFile(join(target, ".agents/speculo/.speculo/custom/evidence.bin"), Buffer.from([0, 255, 1]));
      const before = await fingerprintTree(join(target, ".agents/speculo"));
      const program = `import {initSpeculo} from ${JSON.stringify(pathToFileURL(resolve("dist/src/index.js")).href)}; await initSpeculo(${JSON.stringify(target)}, {packageRoot:${JSON.stringify(packageRoot)},selection:{workflowIds:[]},transactionHook:async phase=>{if(phase===${JSON.stringify(phase)})process.kill(process.pid,'SIGKILL')}});`;
      const child = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8", timeout: 30000 });
      assert.equal(child.signal, "SIGKILL", child.stderr);
      const j = await readTransaction(target);
      assert.equal(j.phase, phase);
      assert.equal((await doctorSpeculo(target)).healthy, false);
      await assert.rejects(recoverInstall(target, "wrong-id"), /recovery-transaction-mismatch/);
      const outcome = await recoverInstall(target, j.id);
      await assert.rejects(readdir(join(target, ".agents/.speculo-transactions")), /ENOENT/);
      if (phase === "committed") {
        assert.equal(outcome.outcome, "completed-cleanup"); assert.equal((await doctorSpeculo(target)).healthy, true);
      } else {
        assert.equal(outcome.outcome, "rolled-back"); assert.equal(await fingerprintTree(join(target, ".agents/speculo")), before);
        assert.equal(await readFile(join(target, "AGENTS.md"), "utf8"), "# Previous handbook\n");
      }
      assert.deepEqual(await readFile(join(target, ".agents/speculo/.speculo/custom/evidence.bin")), Buffer.from([0, 255, 1]));
      assert.deepEqual((await readdir(target)).filter((name) => name.startsWith(".speculo-init-")), []);
    }));
  }
  it("recovers unified selection and both targets after interrupted removal, preserving unmanaged skills", { skip: process.platform === "win32", timeout: 60000 }, async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, skillTargets: ["agents", "claude"], skills: { mode: "set", assetIds: ["learning/archive","learning/assess-and-plan","learning/consolidate","learning/goal","learning/homework","learning/init-setup","learning/lesson","learning/question","learning/review"] } });
    await mkdir(join(target, ".agents", "skills", "custom-skill"), { recursive: true });
    await writeFile(join(target, ".agents", "skills", "custom-skill", "SKILL.md"), "user owned\n");
    const claudeBefore = await fingerprintTree(join(target, ".claude/skills"));
    const skillPath = join(target, ".agents", "skills", "learning-l-lesson", "SKILL.md");
    const manifestPath = join(target, ".agents", "speculo", ".speculo", "projections.json");
    const edited = (await readFile(skillPath, "utf8")).replace("事实源", "事实来源");
    await writeFile(skillPath, edited);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { files: Array<{ path: string; sha256: string }> };
    const work = manifest.files.find((item) => item.path === ".agents/skills/learning-l-lesson/SKILL.md");
    assert.ok(work);
    work.sha256 = sha256Buffer(edited);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await writeFile(join(target, ".agents/speculo/commands/status/COMMAND.md"), "previous static override\n");
    const before = await fingerprintTree(join(target, ".agents/speculo"));
    const program = `import {initSpeculo} from ${JSON.stringify(pathToFileURL(resolve("dist/src/index.js")).href)}; await initSpeculo(${JSON.stringify(target)}, {packageRoot:${JSON.stringify(packageRoot)},selection:{workflowIds:["learning"]},skillTargets:["agents"],skills:{mode:"keep"},transactionHook:async phase=>{if(phase==="skills-projected")process.kill(process.pid,"SIGKILL")}});`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", program], { encoding: "utf8", timeout: 30000 });
    assert.equal(child.signal, "SIGKILL", child.stderr);
    const j = await readTransaction(target);
    assert.equal(j.phase, "skills-projected");
    assert.equal(j.schema_version, 4);
    await assert.rejects(readFile(join(target, ".claude/skills/learning-l-lesson/SKILL.md")), /ENOENT/);
    const outcome = await recoverInstall(target, j.id);
    await assert.rejects(readdir(join(target, ".agents/.speculo-transactions")), /ENOENT/);
    assert.equal(outcome.outcome, "rolled-back");
    assert.equal(await fingerprintTree(join(target, ".agents/speculo")), before);
    assert.equal(await readFile(skillPath, "utf8"), edited);
    assert.equal(await fingerprintTree(join(target, ".claude/skills")), claudeBefore);
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
      const root = join(target, ".agents/speculo"), file = join(root, ".speculo/dummy.txt"), dir = join(root, ".speculo/new-empty");
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
        await writeFile(join(target, ".agents/speculo/.speculo/dummy.txt"), "SYNTHETIC NON-SECRET\n", { mode: 0o644 });
        let changed = "";
        await assert.rejects(initSpeculo(target, { ...opts, transactionHook: async (at) => {
          if (at !== phase) return;
          const j = await readTransaction(target);
          const root = join(target, at === "old-renamed" ? j.backup : ".agents/speculo");
          changed = join(root, change === "mode" ? ".speculo/dummy.txt" : ".speculo/new-empty");
          if (change === "mode") await chmod(changed, 0o600); else await mkdir(changed);
          throw new Error("injected interruption after metadata drift");
        } }), /recovery-required|committed-cleanup-pending/);
        const path = join(target, ".agents/.speculo-install.lock/transaction.json");
        const j = await readTransaction(target); assert.equal(j.schema_version, 4); assert.equal(j.phase, phase);
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
    await mkdir(join(target, ".agents/.speculo-install.lock"),{recursive:true});
    await mkdir(join(target, ".speculo-init-stage-legacy"));
    await mkdir(join(target, ".speculo-init-stage-legacy-backup"));
    const path = join(target, ".agents/.speculo-install.lock/transaction.json");
    for (const phase of ["prepared", "old-renamed", "installed", "external-finalized", "committed", "rolled-back"]) {
      const journal = { schema_version: 1, id: "12345678-1234-1234-1234-123456789abc", host: hostname(), pid: process.pid, target,
        stage: ".speculo-init-stage-legacy", backup: ".speculo-init-stage-legacy-backup", before: "a".repeat(64), after: "b".repeat(64), phase,
        external: [".gitignore", "AGENTS.md", "CLAUDE.md"].map((name) => ({ name, before: null, after: null })) };
      await writeFile(path, JSON.stringify(journal)); const before = await fingerprintTree(target);
      await assert.rejects(readTransaction(target),/invalid-transaction-journal/);
      await assert.rejects(recoverInstall(target, journal.id), /invalid-transaction-journal/);
      assert.equal(await fingerprintTree(target), before);
      assert.match(JSON.stringify(await doctorSpeculo(target)), /invalid-transaction-journal/);
    }
    const j = JSON.parse(await readFile(path, "utf8")); j.schema_version = 99;
    await writeFile(path, JSON.stringify(j)); const before = await fingerprintTree(target);
    await assert.rejects(readTransaction(target), /invalid-transaction-journal/);
    assert.equal(await fingerprintTree(target), before);
  }));
  it("refuses foreign-platform snapshots before acquiring a recovery guard", async () => fixture(async (target) => {
    await mkdir(join(target, ".agents/.speculo-install.lock"), { recursive: true });
    const prefix = process.platform === "win32" ? "tree-v2-posix:" : "tree-v2-windows:";
    const j = { schema_version: 3, id: "12345678-1234-1234-1234-123456789abc", host: hostname(), pid: process.pid, target,
      stage: ".agents/.speculo-transactions/stage-test", backup: ".agents/.speculo-transactions/stage-test-backup", before: "absent", after: prefix + "b".repeat(64), phase: "prepared",
      external: [".gitignore", "AGENTS.md", "CLAUDE.md"].map((name) => ({ name, before: null, after: null })) };
    await writeFile(join(target, ".agents/.speculo-install.lock/transaction.json"), JSON.stringify(j)); const before = await fingerprintTree(target);
    await assert.rejects(recoverInstall(target, j.id), /snapshot-platform-mismatch/);
    assert.equal(await fingerprintTree(target), before);
  }));
  it("persists JSON own special keys through a real refresh without a spurious backup", async () => fixture(async (target) => {
    await initSpeculo(target, opts); const path = join(target, ".agents/speculo/config.json");
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
