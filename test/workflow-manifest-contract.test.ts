import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { readAssetCatalog } from "../src/assets.js";
import { discoverWorkflowCatalog } from "../src/workflows.js";
import { validateCapabilityProfile, validateWorkflowManifest } from "../src/contracts.js";

const manifests = await Promise.all(["specdev", "learning", "ops", "person", "media"].map(async id => JSON.parse(await readFile(`template/workflows/${id}/manifest.json`, "utf8"))));

test("all current domain manifests pass the shared discovery contract", () => {
  for (const manifest of manifests) assert.doesNotThrow(() => validateWorkflowManifest(manifest, manifest.id));
});

test("manifest validation rejects unsupported shape, foreign ownership, missing stages and cycles", () => {
  const original = manifests[0];
  const invalid = [
    { ...original, schema_version: 1 },
    { ...original, entry: "README.md" },
    { ...original, version: "latest" },
    { ...original, lifecycle: ["active", "completed"] },
    { ...original, works: [...original.works, original.works[0]] },
    { ...original, work_stages: {} },
    { ...original, work_stages: { ...original.work_stages, "specdev-z-unknown/SKILL.md": [] } },
    { ...original, work_stages: { ...original.work_stages, [original.works[0]]: ["run", "run"] } },
    { ...original, persistent_knowledge: ["<Path>{roots.state}/person/context/</Path>"] },
    { ...original, persistent_knowledge: ["<Path>{roots.state}/specdev/../outside/</Path>"] },
    { ...original, persistent_knowledge: ["<Path>{roots.state}/specdev/changes/x</Path>"] },
    { ...original, stages: [{ ...original.stages[0], after: ["missing"] }] },
    { ...original, stages: [{ ...original.stages[0], after: [original.stages[0].id] }] },
    { ...original, stages: [original.stages[0], original.stages[0]] },
    { ...original, stages: [{ ...original.stages[0], context_budget: 1.5 }] },
    { ...original, stages: [{ ...original.stages[0], risk: "approved" }] },
    { ...original, stages: [{ ...original.stages[0], unknown: true }] },
    { ...original, stages: [{ ...original.stages[0], id: "a", after: ["b"] }, { ...original.stages[0], id: "b", after: ["a"] }] },
  ];
  for (const value of invalid) assert.throws(() => validateWorkflowManifest(value), /invalid-domain-manifest/, JSON.stringify(value));
  assert.throws(() => validateWorkflowManifest(original, "learning"), /id does not match/);
});

test("catalog and workflow discovery use the same manifest validation before exposing a Work", async t => {
  const root = await mkdtemp(join(tmpdir(), "speculo-manifest-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const template = join(root, "template"), domain = join(template, "workflows/specdev");
  const manifest = structuredClone(manifests[0]), work = manifest.works[0];
  manifest.works = [work]; manifest.work_stages = { [work]: [] };
  await mkdir(join(domain, work.split("/")[0]), { recursive: true });
  await mkdir(join(template, "commands"));
  for (const entry of ["SKILL.md", work]) await writeFile(join(domain, entry), await readFile(join("template/workflows/specdev", entry)));
  await writeFile(join(template, "commands/manifest.json"), JSON.stringify({ schema_version: 1, commands: [] }));
  const file = join(domain, "manifest.json");
  await writeFile(file, JSON.stringify(manifest));
  assert.equal((await readAssetCatalog(template)).assets.length, 2);
  assert.equal((await discoverWorkflowCatalog(root)).size, 1);
  const malformed = JSON.stringify({ ...manifest, stages: [{ ...manifest.stages[0], after: ["missing"] }] });
  await writeFile(file, malformed);
  await assert.rejects(readAssetCatalog(template), /missing stage dependency/);
  await assert.rejects(discoverWorkflowCatalog(root), /missing stage dependency/);
  assert.equal(await readFile(file, "utf8"), malformed);
});

test("declared capabilities retain unknown facts without pretending that tools were probed", async () => {
  const profile = JSON.parse(await readFile("template/.speculo/capabilities.json", "utf8"));
  assert.doesNotThrow(() => validateCapabilityProfile(profile));
  for (const candidate of [
    { ...profile, model: { ...profile.model, id: "observed-model", context_window: 0 } },
    { ...profile, tools: { ...profile.tools, parallel: "yes" } },
    { ...profile, memory: { ...profile.memory, cache: undefined } },
    { ...profile, execution: { ...profile.execution, data_retention: "forever" } },
  ]) assert.throws(() => validateCapabilityProfile(candidate), /invalid-capability-profile/);
  assert.equal(profile.model.id, "unknown");
  assert.equal(profile.tools.parallel, false);
});
