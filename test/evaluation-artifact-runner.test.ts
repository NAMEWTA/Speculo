import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";

const load = (path: string): Promise<any> => import(pathToFileURL(join(process.cwd(), path)).href);
const { evaluateScenarios } = await load("scripts/evaluate-scenarios.mjs");
const { runArtifactScenarios, parseArtifactRunnerArgs, fixtureInventory } = await load("scripts/run-artifact-scenarios.mjs");
const readJson = async (path: string) => JSON.parse(await readFile(path, "utf8"));
async function temporary(t: { after: (fn: () => Promise<unknown>) => void }) {
  const root = await mkdtemp(join(await realpath(tmpdir()), "speculo-artifact-evaluation-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const trace = () => [{ schema_version: 1, sequence: 1, scenario_id: "case-a", kind: "tool", payload: { name: "actual-fixture-tool", effect: "read-only", exit_code: 0 } }];
const scenario = (artifacts: any[]) => [{ id: "case-a", workflow: "fixture", trigger: "explicit regression input", expected: "actual file assertions", assertions: { events: [{ kind: "tool", payload: { name: "actual-fixture-tool", exit_code: 0 } }], artifacts, forbidden_effects: ["undeclared-local-write"], forbidden_reads: ["private"] } }];

test("default registry separates executable artifact contracts from unobserved host behavior", async () => {
  const registry = await readJson(join(process.cwd(), "test/fixtures/scenarios.json"));
  const artifactCases = registry.filter((s: any) => s.execution?.kind === "artifact-harness");
  assert.deepEqual([...new Set(artifactCases.map((s: any) => s.workflow))].sort(), ["learning", "media", "ops", "person", "shared", "specdev"]);
  assert.ok(artifactCases.every((s: any) => s.assertions.artifacts.length && s.assertions.events.length >= 2 && s.assertions.forbidden_effects.includes("undeclared-local-write")));
  assert.ok(registry.some((s: any) => s.id === "artifact-learning-relocation-recovery"));
  assert.ok(registry.some((s: any) => s.id === "artifact-ops-expired-approval"));
  assert.equal(registry.filter((s: any) => s.workflow === "media" && s.execution.kind === "host-observation").length, 7);
  assert.equal(registry.some((s: any) => s.workflow === "kernel"), false);
  const result = await evaluateScenarios(registry);
  assert.equal(result.status, "fixture-ready"); assert.equal(result.behavior, "not-evaluated");
  assert.equal(result.artifact_gates_passed, false); assert.equal(result.observed_gates_passed, false);
  assert.equal(result.publication_authorized, false); assert.equal(result.score, null);
  assert.equal((await evaluateScenarios(registry, null, null, { require: "artifacts" })).exit_code, 2);
});

test("artifact JSON assertions compare actual typed values and reject absent or aliased pointers", async t => {
  const root = await temporary(t), dir = join(root, "case-a"); await mkdir(dir);
  await writeFile(join(dir, "state.json"), '{"status":"active","minutes":35,"published":false,"a/b":{"~key":[2]}}\n');
  const valid = scenario([{ path: "state.json", json: { "/status": "active", "/minutes": 35, "/published": false, "/a~1b/~0key/0": 2 }, contains: ['"published":false'] }]);
  assert.equal((await evaluateScenarios(valid, trace(), root)).exit_code, 0);
  const partial = await evaluateScenarios([...valid, { ...valid[0], id: "case-b" }], trace(), root);
  assert.equal(partial.cases.find((item: any) => item.id === "case-b").status, "not-evaluated");
  assert.equal(partial.exit_code, 2);
  for (const values of [{ "/minutes": "35" }, { "/missing": null }, { "minutes": 35 }, { "/a~2b": 2 }, {}]) {
    const result = await evaluateScenarios(scenario([{ path: "state.json", json: values }]), trace(), root);
    assert.equal(result.exit_code, 2, JSON.stringify(values));
  }
});

test("before/after equality and exact content assertions detect wrong artifacts independently of a success event", async t => {
  const root = await temporary(t), dir = join(root, "case-a"); await mkdir(dir);
  await writeFile(join(dir, "before.json"), '{"file":"original-sha"}\n');
  await writeFile(join(dir, "after.json"), '{"file":"original-sha"}\n');
  const fixture = scenario([{ path: "after.json", same_as: "before.json" }, { path: "upload-receipt.json", absent: true }]);
  assert.equal((await evaluateScenarios(fixture, trace(), root)).exit_code, 0);
  await writeFile(join(dir, "after.json"), '{"file":"changed-sha"}\n');
  assert.match(JSON.stringify(await evaluateScenarios(fixture, trace(), root)), /artifact differs/);
  for (const invalid of [{ path: "after.json", same_as: "after.json" }, { path: "after.json", same_as: "../before.json" }, { path: "after.json", contains: [] }, { path: "after.json", absent: true, json: { "": null } }]) {
    assert.equal((await evaluateScenarios(scenario([invalid]), trace(), root)).exit_code, 2);
  }
});

test("ordered actual exit events and forbidden effects/reads remain gates even with correct JSON", async t => {
  const root = await temporary(t), dir = join(root, "case-a"); await mkdir(dir);
  await writeFile(join(dir, "state.json"), '{"valid":true}\n');
  const fixture = scenario([{ path: "state.json", json: { "/valid": true } }]);
  const wrongExit = trace(); wrongExit[0].payload.exit_code = 1;
  assert.match(JSON.stringify(await evaluateScenarios(fixture, wrongExit, root)), /missing\/out-of-order/);
  const effect = trace(); effect[0].payload.effect = "undeclared-local-write";
  assert.match(JSON.stringify(await evaluateScenarios(fixture, effect, root)), /forbidden effect/);
  const read: any[] = trace(); read.push({ schema_version: 1, sequence: 2, scenario_id: "case-a", kind: "context", payload: { path: "private/credentials.json" } });
  assert.match(JSON.stringify(await evaluateScenarios(fixture, read, root)), /forbidden read/);
  const incomplete: any[] = trace(); delete incomplete[0].payload.exit_code;
  assert.equal((await evaluateScenarios(fixture, incomplete, root)).status, "blocked-trace");
});

test("artifact runner rejects non-executable selection and never clears an existing output directory", async t => {
  const root = await temporary(t), output = join(root, "existing"); await mkdir(output);
  await writeFile(join(output, "original.txt"), "keep\n");
  for (const args of [["--unknown", "x"], ["--output"], ["--output", "one", "--output", "two"]]) assert.throws(() => parseArtifactRunnerArgs(args));
  await assert.rejects(runArtifactScenarios({ outputRoot: join(root, "not-created"), scenarioIds: ["person-mao"] }), /non-executable/);
  assert.deepEqual((await readdir(root)).sort(), ["existing"]);
  await assert.rejects(runArtifactScenarios({ outputRoot: output, scenarioIds: ["artifact-media-article"] }), /EEXIST/);
  assert.equal(await readFile(join(output, "original.txt"), "utf8"), "keep\n");
  assert.deepEqual(await readdir(output), ["original.txt"]);
});

test("fixture inventory detects modes and link identities without following external targets", { skip: process.platform === "win32" }, async t => {
  const root = await temporary(t), tree = join(root, "tree"); await mkdir(tree);
  const external = join(root, "external.txt"); await writeFile(external, "not in fixture tree\n");
  await symlink(external, join(tree, "link.txt"));
  await symlink(join(root, "absent"), join(tree, "dangling.txt"));
  const state = await fixtureInventory(tree);
  assert.equal(state["link.txt"].kind, "symlink"); assert.equal(state["link.txt"].target, external);
  assert.equal(state["dangling.txt"].kind, "symlink");
  assert.equal(Object.values(state).some((entry: any) => entry.sha256), false);
});

test("installed CLI artifact run is reproducible, scope-bound and cannot promote itself to observation", async t => {
  const root = await temporary(t), output = join(root, "run");
  const result = await runArtifactScenarios({ outputRoot: output, scenarioIds: ["artifact-learning-relocation-recovery", "artifact-media-drift", "artifact-ops-expired-approval"] });
  assert.equal(result.exit_code, 0, JSON.stringify({ cases: result.cases, errors: result.runner_errors }));
  assert.equal(result.passed, 3); assert.equal(result.evaluation_level, "artifacts");
  assert.equal(result.model_executed, false); assert.equal(result.observer_authenticated, false);
  assert.equal(result.gate_eligible, false); assert.equal(result.publication_authorized, false);
  assert.equal(result.coverage.not_run.length, result.coverage.registry_cases - 3);
  assert.ok(result.coverage.not_run.every((item: any) => item.status === "not-evaluated"));
  const fixtures = await readJson(join(output, "fixtures.json")), artifactRoot = join(output, "artifacts");
  const events = (await readFile(join(output, "trace.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
  for (const event of events.filter((event: any) => event.kind === "tool")) {
    const record = await readJson(join(artifactRoot, event.scenario_id, event.payload.process));
    assert.equal(record.exit_code, event.payload.exit_code); assert.equal(record.spawn_error, null);
    assert.equal(record.source, "disposable-artifact-harness"); assert.ok(record.script_sha256);
  }
  const rerun = await evaluateScenarios(fixtures, events, artifactRoot, { require: "artifacts" });
  assert.equal(rerun.exit_code, 0); assert.equal(rerun.observed_gates_passed, false);
  const observed = await evaluateScenarios(fixtures, events, artifactRoot, { require: "observed", authenticated: true });
  assert.equal(observed.status, "blocked-observer-evidence"); assert.equal(observed.exit_code, 2); assert.equal(observed.publication_authorized, false);
  const wholeRegistry = await readJson(join(process.cwd(), "test/fixtures/scenarios.json"));
  const incomplete = await evaluateScenarios(wholeRegistry, events, artifactRoot, { require: "artifacts" });
  assert.equal(incomplete.exit_code, 2); assert.ok(incomplete.not_evaluated > 0);
  assert.equal((await readdir(output)).includes("observation.json"), false);
  await writeFile(join(artifactRoot, "artifact-media-drift/project/.agents/speculo/.speculo/media/changes/2026-10-19-media/master.md"), "different bytes\n");
  assert.equal((await evaluateScenarios(fixtures, events, artifactRoot, { require: "artifacts" })).exit_code, 2);
});
