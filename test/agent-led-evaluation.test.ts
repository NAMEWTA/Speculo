import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const { evaluateScenarios } = await import(pathToFileURL(join(process.cwd(), "scripts/evaluate-scenarios.mjs")).href);
const scenarios = JSON.parse(await readFile(join(process.cwd(), "test/fixtures/agent-led-scenarios.json"), "utf8"));

// Synthetic unit-test data checks the evaluator contract, NOT a host/model run.
async function declaredFixture(t: { after: (fn: () => Promise<unknown>) => void }, scenario: any) {
  // Canonicalize the fixture root: macOS temp paths may traverse /var aliases.
  // The production evaluator must continue rejecting aliased artifact paths.
  const root = await realpath(await mkdtemp(join(tmpdir(), "speculo-agent-led-evaluation-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, scenario.id));
  const values = Object.fromEntries(Object.entries(scenario.assertions.artifacts[0].json).map(([key, value]) => [key.slice(1), value]));
  const artifact = join(root, scenario.id, "decision.json");
  await writeFile(artifact, JSON.stringify(values));
  const trace = scenario.assertions.events.map((event: any, i: number) => ({ schema_version: 1, sequence: i + 1, scenario_id: scenario.id, ...event }));
  return { root, values, artifact, trace };
}

test("agent-led matrix remains explicitly unobserved without host evidence", async () => {
  assert.equal(scenarios.length, 19);
  assert.equal(new Set(scenarios.map((s: any) => s.id)).size, scenarios.length);
  for (const scenario of scenarios) {
    assert.equal(scenario.execution.kind, "host-observation");
    assert.equal(scenario.execution.runner, null);
    assert.equal(scenario.evaluation_status, "not-evaluated");
    assert.ok(scenario.assertions.events.length);
    assert.ok(Object.keys(scenario.assertions.artifacts[0].json).length >= 3);
  }
  const result = await evaluateScenarios(scenarios, null, null, { require: "observed" });
  assert.equal(result.behavior, "not-evaluated");
  assert.equal(result.score, null);
  assert.equal(result.observed_gates_passed, false);
  assert.equal(result.exit_code, 2);
});

for (const scenario of scenarios) {
  test(`${scenario.id}: declared assertions reject drift, forbidden effects and missing observation`, async (t) => {
    const { root, values, artifact, trace } = await declaredFixture(t, scenario);
    const passing = await evaluateScenarios([scenario], trace, root);
    assert.equal(passing.exit_code, 0);
    assert.equal(passing.evaluation_level, "artifacts");
    assert.equal(passing.observed_gates_passed, false);
    assert.equal(passing.gate_eligible, false);
    assert.equal(passing.publication_authorized, false);

    // Every declared decision field is binding, not just prose or one happy path.
    for (const key of Object.keys(values)) {
      await writeFile(artifact, JSON.stringify({ ...values, [key]: "deliberately-invalid-unit-test-value" }));
      const failed = await evaluateScenarios([scenario], trace, root);
      assert.equal(failed.exit_code, 2, key);
      assert.ok(failed.cases[0].failures.some((message: string) => message.includes(`JSON value differs: /${key}`)));
    }
    await writeFile(artifact, JSON.stringify(values));
    for (const effect of scenario.assertions.forbidden_effects) {
      const forbiddenTrace = [...trace, { schema_version: 1, sequence: trace.length + 1, scenario_id: scenario.id, kind: "tool", payload: { name: "synthetic-forbidden-tool", effect, exit_code: 0 } }];
      const forbidden = await evaluateScenarios([scenario], forbiddenTrace, root);
      assert.equal(forbidden.exit_code, 2);
      assert.ok(forbidden.cases[0].failures.includes(`forbidden effect: ${effect}`));
    }
    const noTrace = await evaluateScenarios([scenario], [], root);
    assert.equal(noTrace.exit_code, 2);
    assert.equal(noTrace.behavior, "not-evaluated");
    const noObserver = await evaluateScenarios([scenario], trace, root, { require: "observed" });
    assert.equal(noObserver.exit_code, 2);
    assert.equal(noObserver.observed_gates_passed, false);
    assert.equal(noObserver.gate_eligible, false);
  });
}
