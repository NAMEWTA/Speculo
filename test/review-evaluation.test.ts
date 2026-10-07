import { generateKeyPairSync, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
const load = (path: string): Promise<any> => import(pathToFileURL(join(process.cwd(), path)).href);

describe("review: standard Skill metadata and honest behavioral evaluation", () => {
  it("validates all emitted Skills and rejects nonstandard or duplicate fields", async () => {
    const { validateSkills, validateSkill } = await load("scripts/validate-skills.mjs");
    assert.deepEqual((await validateSkills(process.cwd())).errors, []);
    for (const header of ["name: Docs Sync\ndescription: sync", "name: docs-sync\nid: docs-sync\ndescription: sync", "name: docs-sync\nname: docs-sync\ndescription: sync", 'name: docs-sync\ndescription: sync\nmetadata: {"version": 1}']) {
      assert.ok(validateSkill(`---\n${header}\n---\n`, "docs-sync").length > 0);
    }
  });
  it("never scores one unrelated event as a successful scenario", async () => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const fixture = Array.from({ length: 20 }, (_, i) => ({ id: `case-${i}`, workflow: "test", trigger: "request", expected: "actual artifact" }));
    const result = await evaluateScenarios(fixture, [{ schema_version: 1, sequence: 1, kind: "unrelated-event", payload: {} }]);
    assert.equal(result.score, null); assert.equal(result.exit_code, 2); assert.equal(result.behavior, "not-evaluated");
  });
  it("requires artifacts and ordered case-bound events; detects fake evidence and forbidden effects", async () => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const root = await mkdtemp(join(tmpdir(), "speculo-eval-"));
    const fixture = [{ id: "case-a", workflow: "test", trigger: "write receipt", expected: "verified receipt", assertions: {
      artifacts: [{ path: "receipt.txt", equals: "verified\n" }], forbidden_effects: ["external-mutation"],
      events: [{ kind: "tool", payload: { name: "verify", exit_code: 0 } }],
    } }];
    const trace = [{ schema_version: 1, sequence: 1, scenario_id: "case-a", kind: "tool", payload: { name: "verify", exit_code: 0, effect: "read-only" } }];
    try {
      assert.equal((await evaluateScenarios(fixture, trace, root)).exit_code, 2);
      await mkdir(join(root, "case-a")); await writeFile(join(root, "case-a", "receipt.txt"), "verified\n");
      const passed = await evaluateScenarios(fixture, trace, root);
      assert.equal(passed.exit_code, 0, JSON.stringify(passed));
      trace[0].payload.effect = "external-mutation";
      assert.equal((await evaluateScenarios(fixture, trace, root)).exit_code, 2);
      trace[0].payload.effect = "read-only";
      await writeFile(join(root, "case-a", "receipt.txt"), "I claim success\n");
      assert.equal((await evaluateScenarios(fixture, trace, root)).exit_code, 2);
      fixture[0].assertions.artifacts[0].path = "../escape";
      assert.match(JSON.stringify(await evaluateScenarios(fixture, trace, root)), /unsafe artifact path/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("accepts native temporary roots but rejects symlink or junction ancestors", async () => {
    const { evidencePath } = await load("scripts/lib/evaluation-evidence.mjs");
    const root = await mkdtemp(join(tmpdir(), "speculo-eval-path-"));
    try {
      const target = join(root, "target"), child = join(target, "child"), link = join(root, "linked");
      await mkdir(child, { recursive: true });
      await writeFile(join(child, "receipt.txt"), "verified\n");
      // Windows TEMP can use an 8.3 name. Case-only spellings are also ordinary
      // directories, not grounds to weaken the no-symlink/junction policy.
      const roots = process.platform === "win32" ? [child, child.toUpperCase()] : [child];
      for (const spelling of roots) {
        assert.equal(await readFile(await evidencePath(spelling, "receipt.txt"), "utf8"), "verified\n");
        assert.equal(await evidencePath(spelling, "missing/nested.txt"), join(spelling, "missing", "nested.txt"));
      }
      await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
      await assert.rejects(evidencePath(join(link, "child"), "receipt.txt"), /symlink|junction/);
      await assert.rejects(evidencePath(child, "../receipt.txt"), /unsafe artifact path/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});


describe("review R3: closed instruction coverage and committed sources", () => {
  async function observation(run: (f: any) => Promise<void>) {
    const dir = await mkdtemp(join(tmpdir(), "speculo-input-coverage-"));
    const repoRoot = join(dir, "repo"), bundleRoot = join(dir, "bundle"), artifactRoot = join(bundleRoot, "artifacts"), trustPath = join(dir, "trust.json");
    const lib = await load("scripts/lib/evaluation-evidence.mjs");
    try {
      await mkdir(repoRoot); await mkdir(join(artifactRoot, "case-a"), { recursive: true });
      await writeFile(join(repoRoot, "SKILL.md"), "Read branch.md for the selected branch.\n");
      await writeFile(join(repoRoot, "branch.md"), "Original conditional instruction.\n");
      await writeFile(join(repoRoot, "unused.md"), "Unselected reference: do not require a read.\n");
      const git = (...args: string[]) => execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      git("init"); git("add", "."); git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "synthetic input fixture");
      const scenarios = [{ id: "case-a", workflow: "test", trigger: "synthetic input test", expected: "receipt", instruction_paths: ["SKILL.md"], assertions: { artifacts: [{ path: "receipt.txt", equals: "ok\n" }] } }];
      await writeFile(join(artifactRoot, "case-a/receipt.txt"), "ok\n");
      const instructions = await Promise.all(["SKILL.md", "branch.md"].map(async (path) => ({ path, sha256: lib.sha256(await readFile(join(repoRoot, path))) })));
      const trace: any[] = instructions.map((input, i) => ({ schema_version: 1, sequence: i + 1, scenario_id: "case-a", kind: "context", payload: { ...input, role: "instruction" } }));
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      await writeFile(trustPath, JSON.stringify({ schema_version: 1, observers: [{ id: "test-only", hosts: ["synthetic-host"], public_key: publicKey.export({ type: "spki", format: "pem" }) }] }));
      const payload: any = { schema_version: 2, kind: "speculo-host-observation", run_id: "synthetic-no-model", repetition: 1,
        host: { name: "synthetic-host", version: "1" }, model: { name: "no-model", version: "1" }, collector: { name: "fixture", version: "1" },
        started_at: "2026-10-07T00:00:00Z", finished_at: "2026-10-07T00:00:01Z", exit_code: 0,
        coverage: { reads: "complete", effects: "complete", artifacts: "complete" }, repository_commit: git("rev-parse", "HEAD"),
        fixture_sha256: lib.sha256(lib.canonicalJSON(scenarios)), instructions, artifacts: await lib.fileInventory(artifactRoot) };
      const attest = async () => {
        const raw = JSON.stringify({ synthetic: true, trace }) + "\n";
        await writeFile(join(bundleRoot, "raw.jsonl"), raw);
        payload.raw_log = { path: "raw.jsonl", sha256: lib.sha256(raw) };
        payload.trace_sha256 = lib.sha256(lib.canonicalJSON(trace));
        await writeFile(join(bundleRoot, "observation.json"), JSON.stringify({ key_id: "test-only", payload, signature: sign(null, Buffer.from(lib.canonicalJSON(payload)), privateKey).toString("base64") }));
      };
      const verify = async () => { await attest(); return lib.verifyObservation({ repoRoot, bundleRoot, artifactRoot, trustPath, scenarios, trace }); };
      await run({ dir, repoRoot, bundleRoot, artifactRoot, trustPath, scenarios, trace, payload, verify, attest, lib, git });
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  it("accepts complete v2 coverage without requiring unrelated references, and accepts conservative v1", async () => observation(async (f) => {
    assert.equal((await f.verify()).model.name, "no-model");
    f.payload.schema_version = 1; for (const e of f.trace) delete e.payload.role;
    assert.equal((await f.verify()).model.name, "no-model");
  }));
  it("rejects missing conditional instruction coverage for both legacy and v2 observations", async () => observation(async (f) => {
    f.payload.instructions = f.payload.instructions.slice(0, 1);
    await assert.rejects(f.verify(), /missing consumed instruction coverage/);
    f.payload.schema_version = 1; for (const e of f.trace) delete e.payload.role;
    await assert.rejects(f.verify(), /missing consumed instruction coverage/);
  }));
  it("rejects a consumed byte digest that differs from the instruction inventory", async () => observation(async (f) => {
    f.trace[1].payload.sha256 = "a".repeat(64);
    await assert.rejects(f.verify(), /consumed instruction digest differs/);
  }));
  it("rejects worktree drift and re-signed dirty or staged instructions under unchanged HEAD", async () => observation(async (f) => {
    await writeFile(join(f.repoRoot, "branch.md"), "Modified conditional instruction.\n");
    await assert.rejects(f.verify(), /instruction source drift/);
    const sha = f.lib.sha256(await readFile(join(f.repoRoot, "branch.md")));
    f.payload.instructions[1].sha256 = sha; f.trace[1].payload.sha256 = sha;
    await assert.rejects(f.verify(), /differs from repository commit/);
    f.git("add", "branch.md");
    await assert.rejects(f.verify(), /differs from repository commit/);
  }));
  it("rejects an untracked instruction even when its working bytes are signed", async () => observation(async (f) => {
    await writeFile(join(f.repoRoot, "untracked.md"), "not committed\n");
    f.payload.instructions.push({ path: "untracked.md", sha256: f.lib.sha256("not committed\n") });
    await assert.rejects(f.verify(), /not a regular committed file/);
  }));
  it("binds explicit v2 business data without promoting it to instructions", async () => observation(async (f) => {
    await writeFile(join(f.repoRoot, "input.json"), '{"test":true}');
    f.trace.push({ schema_version: 1, sequence: 3, scenario_id: "case-a", kind: "context", payload: { path: "input.json", role: "data", sha256: f.lib.sha256('{"test":true}') } });
    assert.equal((await f.verify()).model.name, "no-model");
    await writeFile(join(f.repoRoot, "input.json"), '{"test":false}');
    await assert.rejects(f.verify(), /context data source drift/);
  }));
  it("does not allow a declared instruction to be downgraded to data", async () => observation(async (f) => {
    f.trace[1].payload.role = "data";
    await assert.rejects(f.verify(), /cannot be classified as data/);
    f.payload.schema_version = 1;
    await assert.rejects(f.verify(), /requires observation v2/);
  }));
  it("fails closed on absent roles, byte digests, and noncanonical context paths", async () => observation(async (f) => {
    const input = { ...f.trace[1].payload };
    for (const patch of [{ role: undefined }, { sha256: undefined }, { path: "./branch.md" }, { path: "BRANCH.md" }]) {
      f.trace[1].payload = JSON.parse(JSON.stringify({ ...input, ...patch }));
      await assert.rejects(f.verify(), /role|source|coverage|digest/);
    }
  }));
});
