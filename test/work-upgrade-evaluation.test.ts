import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
const load = (path: string): Promise<any> => import(pathToFileURL(join(process.cwd(), path)).href);

describe("work upgrade: evaluation levels and independent observation trust", () => {
  const scenario = () => [{ id: "case-a", workflow: "test", trigger: "explicit test fixture", expected: "actual receipt", instruction_paths: ["INSTRUCTIONS.md"], assertions: {
    artifacts: [{ path: "receipt.txt", equals: "verified\n" }], forbidden_effects: ["deploy"], forbidden_reads: ["private"],
    events: [{ kind: "tool", payload: { name: "verify", exit_code: 0 } }],
  } }];
  const events = () => [{ schema_version: 1, sequence: 1, scenario_id: "case-a", kind: "tool", payload: { name: "verify", exit_code: 0, effect: "read-only" } }];

  async function fixture(run: (f: any) => Promise<void>) {
    const dir = await mkdtemp(join(tmpdir(), "speculo-observer-test-"));
    const repo = join(dir, "repo"), bundle = join(dir, "bundle"), artifacts = join(bundle, "artifacts"), trust = join(dir, "trust.json");
    const { canonicalJSON, sha256, fileInventory } = await load("scripts/lib/evaluation-evidence.mjs");
    try {
      await mkdir(repo); await mkdir(join(artifacts, "case-a"), { recursive: true });
      await writeFile(join(repo, "INSTRUCTIONS.md"), "test-only instruction\n");
      const git = (args: string[]) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      git(["init"]); git(["add", "."]); git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "synthetic fixture"]);
      await writeFile(join(artifacts, "case-a", "receipt.txt"), "verified\n");
      await writeFile(join(bundle, "raw.jsonl"), "synthetic test observer, NOT an Agent run\n");
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const keyConfig = { schema_version: 1, observers: [{ id: "test-only", hosts: ["fixture-host"], public_key: publicKey.export({ type: "spki", format: "pem" }) }] };
      await writeFile(trust, JSON.stringify(keyConfig));
      const payload = { schema_version: 1, kind: "speculo-host-observation", run_id: "synthetic-test", repetition: 1,
        host: { name: "fixture-host", version: "test" }, model: { name: "no-model", version: "test" }, collector: { name: "test", version: "1" },
        started_at: "2026-10-06T00:00:00Z", finished_at: "2026-10-06T00:00:01Z", exit_code: 0,
        repository_commit: git(["rev-parse", "HEAD"]), fixture_sha256: sha256(canonicalJSON(scenario())), trace_sha256: sha256(canonicalJSON(events())),
        coverage: { reads: "complete", effects: "complete", artifacts: "complete" },
        raw_log: { path: "raw.jsonl", sha256: sha256(await readFile(join(bundle, "raw.jsonl"))) },
        instructions: [{ path: "INSTRUCTIONS.md", sha256: sha256(await readFile(join(repo, "INSTRUCTIONS.md"))) }], artifacts: await fileInventory(artifacts),
      };
      const attest = async () => writeFile(join(bundle, "observation.json"), JSON.stringify({ key_id: "test-only", payload, signature: sign(null, Buffer.from(canonicalJSON(payload)), privateKey).toString("base64") }));
      await attest();
      await run({ dir, repo, bundle, artifacts, trust, payload, attest, keyConfig });
    } finally { await rm(dir, { recursive: true, force: true }); }
  }

  it("keeps fixture-ready honest and makes artifact/observed requirements fail closed", async () => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const normal = await evaluateScenarios(scenario());
    assert.equal(normal.exit_code, 0); assert.equal(normal.evaluation_level, "fixtures"); assert.equal(normal.behavior, "not-evaluated"); assert.equal(normal.release_eligible, false);
    for (const requirement of ["artifacts", "observed"]) assert.equal((await evaluateScenarios(scenario(), null, null, { require: requirement })).exit_code, 2);
  });
  it("does not promote supplied traces or model claims to authenticated behavior", async () => fixture(async (f) => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const result = await evaluateScenarios(scenario(), events(), f.artifacts);
    assert.equal(result.exit_code, 0); assert.equal(result.release_eligible, false); assert.equal(result.evaluation_level, "artifacts");
    const claimed = await evaluateScenarios(scenario(), events(), f.artifacts, { require: "observed", authenticated: true });
    assert.equal(claimed.exit_code, 2); assert.equal(claimed.release_eligible, false);
  }));
  it("accepts an operator-trusted signed test observation only for the exact inputs", async () => fixture(async (f) => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const options = { require: "observed", bundleRoot: f.bundle, trustPath: f.trust, repoRoot: f.repo };
    const result = await evaluateScenarios(scenario(), events(), f.artifacts, options);
    assert.equal(result.exit_code, 0, JSON.stringify(result)); assert.equal(result.evaluation_level, "observed"); assert.equal(result.release_eligible, true);
    assert.equal(result.observation.model.name, "no-model");
    await writeFile(join(f.repo, "INSTRUCTIONS.md"), "changed\n");
    assert.match((await evaluateScenarios(scenario(), events(), f.artifacts, options)).evidence_error, /instruction source drift/);
  }));
  for (const [name, mutate, expected] of [
    ["unobserved effects", (f: any) => { f.payload.coverage.effects = "partial"; }, /incomplete/],
    ["different commit", (f: any) => { f.payload.repository_commit = "a".repeat(40); }, /different repository commit/],
    ["fixture substitution", (f: any) => { f.payload.fixture_sha256 = "a".repeat(64); }, /fixture or normalized trace/],
    ["trace substitution", (f: any) => { f.payload.trace_sha256 = "a".repeat(64); }, /fixture or normalized trace/],
    ["invalid repetition", (f: any) => { f.payload.repetition = 0; }, /timing or repetition/],
    ["missing required instruction", (f: any) => { f.payload.instructions = []; }, /instruction digests/],
    ["host outside trust", (f: any) => { f.payload.host.name = "untrusted-host"; }, /not trusted for this host/],
  ] as const) {
    it(`rejects signed but invalid evidence: ${name}`, async () => fixture(async (f) => {
      const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
      mutate(f); await f.attest();
      const result = await evaluateScenarios(scenario(), events(), f.artifacts, { require: "observed", bundleRoot: f.bundle, trustPath: f.trust, repoRoot: f.repo });
      assert.equal(result.exit_code, 2); assert.equal(result.release_eligible, false); assert.match(result.evidence_error, expected);
    }));
  }
  it("rejects forged signatures, edited observer logs and unexpected extra artifacts", async () => fixture(async (f) => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const options = { require: "observed", bundleRoot: f.bundle, trustPath: f.trust, repoRoot: f.repo };
    const envelope = JSON.parse(await readFile(join(f.bundle, "observation.json"), "utf8"));
    envelope.payload.run_id = "forged";
    await writeFile(join(f.bundle, "observation.json"), JSON.stringify(envelope));
    assert.match((await evaluateScenarios(scenario(), events(), f.artifacts, options)).evidence_error, /signature/);
    await f.attest(); await writeFile(join(f.bundle, "raw.jsonl"), "tampered\n");
    assert.match((await evaluateScenarios(scenario(), events(), f.artifacts, options)).evidence_error, /raw observer log/);
    await writeFile(join(f.bundle, "raw.jsonl"), "synthetic test observer, NOT an Agent run\n");
    await writeFile(join(f.artifacts, "unexpected.txt"), "extra");
    assert.match((await evaluateScenarios(scenario(), events(), f.artifacts, options)).evidence_error, /artifact inventory/);
  }));
  it("does not trust a public key supplied inside the workload or evidence bundle", async () => fixture(async (f) => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    for (const parent of [f.repo, f.bundle, f.artifacts]) {
      const trustPath = join(parent, "self-trust.json"); await writeFile(trustPath, JSON.stringify(f.keyConfig));
      const result = await evaluateScenarios(scenario(), events(), f.artifacts, { require: "observed", bundleRoot: f.bundle, trustPath, repoRoot: f.repo });
      assert.equal(result.exit_code, 2); assert.match(result.evidence_error, /outside the repository/);
    }
  }));
  it("checks negative reads and effects even when a success artifact exists", async () => fixture(async (f) => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const trace: any[] = events();
    trace.push({ schema_version: 1, sequence: 2, scenario_id: "case-a", kind: "context", payload: { path: "private/credentials.json" } });
    const result = await evaluateScenarios(scenario(), trace, f.artifacts);
    assert.equal(result.exit_code, 2); assert.match(JSON.stringify(result), /forbidden read/);
  }));
  it("rejects artifact symlinks and path traversal", { skip: process.platform === "win32" }, async () => fixture(async (f) => {
    const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
    const linkRoot = join(f.dir, "linked-artifacts"); await symlink(f.artifacts, linkRoot);
    assert.match(JSON.stringify(await evaluateScenarios(scenario(), events(), linkRoot)), /symlink/);
    const bad = scenario(); bad[0].assertions.artifacts[0].path = "../receipt.txt";
    assert.match(JSON.stringify(await evaluateScenarios(bad, events(), f.artifacts)), /unsafe artifact path/);
  }));
  it("fails the CLI observed gate with no evidence, and rejects ambiguous options", async () => {
    const result = spawnSync(process.execPath, ["scripts/evaluate-scenarios.mjs", "--require", "observed"], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr); assert.equal(JSON.parse(result.stdout).behavior, "not-evaluated");
    const { parseEvaluationArgs } = await load("scripts/evaluate-scenarios.mjs");
    for (const args of [["--unknown"], ["--require"], ["--require", "fixtures", "--require", "observed"], ["f", "t", "a", "--bundle", "b"]]) assert.throws(() => parseEvaluationArgs(args));
  });
});
