import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
      assert.equal((await evaluateScenarios(fixture, trace, root)).exit_code, 0);
      trace[0].payload.effect = "external-mutation";
      assert.equal((await evaluateScenarios(fixture, trace, root)).exit_code, 2);
      trace[0].payload.effect = "read-only";
      await writeFile(join(root, "case-a", "receipt.txt"), "I claim success\n");
      assert.equal((await evaluateScenarios(fixture, trace, root)).exit_code, 2);
      fixture[0].assertions.artifacts[0].path = "../escape";
      assert.match(JSON.stringify(await evaluateScenarios(fixture, trace, root)), /unsafe artifact path/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
