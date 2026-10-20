import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { validateStructuredRuntime } from "../src/structured.js";

const stamp = "2026-10-18T00:00:00.000Z";
const mao = "person/mao-zedong-cognitive-os", steelman = "person/steelman-deliberation";
const source = join(process.cwd(), "template/workflows/person/person-m-mao-zedong-cognitive-os");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const writeJson = (path: string, value: unknown) => writeFile(path, json(value));
const readJson = async (path: string) => JSON.parse(await readFile(path, "utf8"));
async function inventory(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function visit(relative = "") {
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      const name = relative ? relative + "/" + entry.name : entry.name;
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) files[name] = createHash("sha256").update(await readFile(join(root, name))).digest("hex");
    }
  }
  await visit(); return files;
}
async function fixture(t: { after: (fn: () => Promise<unknown>) => void }) {
  const root = await mkdtemp(join(await realpath(tmpdir()), "speculo-structured-person-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const person = join(root, ".speculo/person"), statusPath = join(person, "status.json");
  await mkdir(join(person, "changes"), { recursive: true });
  const index: any = { schema_version: 1, workflow: "person", active: [], extension: { retained: true } };
  await writeJson(statusPath, index);
  const add = async (suffix: string, options: { work?: string; indexed?: boolean; phase?: string } = {}) => {
    const change = "2026-10-19-" + suffix, path = join(person, "changes", change);
    await mkdir(path);
    const state: any = options.work === steelman ? {
      schema_version: 1, artifact: "person-work-status", workflow: "person", change, work_id: steelman,
      status: "active", phase: "awaiting-answer", key_question: "决定性资源是否已经落实？", key_question_asked: true,
      question_disposition: "asked", answer_received: false, user_answer: null, created_at: stamp, updated_at: stamp,
      completed_at: null, blockers: [],
    } : { ...await readJson(join(source, "assets/templates/consultation-status-template.json")), change, created_at: stamp, updated_at: stamp };
    if (options.phase) state.phase = options.phase;
    state.extension = { author: "original", unknown: [1, 2] };
    const save = () => writeJson(join(path, ".status.json"), state);
    await save();
    if (options.indexed !== false) index.active.push({ change, work_id: state.work_id, phase: state.phase, updated_at: stamp, extension: "retained" });
    await writeJson(statusPath, index);
    return { change, path, state, save };
  };
  return { root, person, statusPath, index, add, saveIndex: () => writeJson(statusPath, index) };
}

test("Person installation validates distinct formal Changes and preserves all unknown content", async t => {
  const f = await fixture(t), first = await f.add("first"), second = await f.add("second");
  await f.add("steelman", { work: steelman });
  first.state.problem_type = "决策方法"; second.state.problem_type = "团队/组织问题";
  await first.save(); await second.save();
  await mkdir(join(first.path, ".steelman-stage"));
  await writeFile(join(first.path, ".steelman-stage/.status.json"), "unpublished candidate, intentionally not valid JSON\n");
  await writeFile(join(first.path, "user-notes.md"), "作者的原始内容与未知字段必须保留。\n");
  // A poisoned installed script must never execute during a CLI-owned check.
  const installedScript = join(f.root, "workflows/person/person-m-mao-zedong-cognitive-os/scripts");
  await mkdir(installedScript, { recursive: true });
  await writeFile(join(installedScript, "consultation-state.mjs"), "throw new Error('installed business script was executed');\n");
  const before = await inventory(f.root);
  await validateStructuredRuntime(f.root, ["person"]);
  assert.deepEqual(await inventory(f.root), before);
});

test("Person structural validity does not certify method gates, artifact hashes or publication", async t => {
  const f = await fixture(t), c = await f.add("structure-only", { phase: "diagnosing" });
  c.state.phase_evidence = { activating: { artifact: "problem-statement.md", sha256: "a".repeat(64) } };
  // A syntactically valid source reference is not a verified original quotation.
  c.state.quotes_cited = [{ kind: "direct", text: "未被业务验证的引文", article_id: "016", source: "books/src/016-实践论.md", artifact: "strategy.md" }];
  await c.save();
  const before = await inventory(f.root);
  await validateStructuredRuntime(f.root, ["person"]);
  const { validateConsultationState } = await import(pathToFileURL(join(source, "scripts/consultation-state.mjs")).href);
  assert.ok(validateConsultationState(c.state, { change: c.change, changeRoot: c.path }).length > 0);
  assert.deepEqual(await inventory(f.root), before);
});

test("Steelman early and already-answered states do not acquire a new waiting/asking requirement", async t => {
  const f = await fixture(t), early = await f.add("intake", { work: steelman, phase: "intake", indexed: false });
  Object.assign(early.state, { key_question: null, key_question_asked: false, question_disposition: null });
  await early.save();
  const answered = await f.add("answered", { work: steelman, phase: "judging", indexed: false });
  Object.assign(answered.state, { key_question_asked: false, question_disposition: "already-answered", answer_received: true, user_answer: "用户在原始输入中已给出关键资源事实。" });
  await answered.save();
  const before = await inventory(f.root);
  await validateStructuredRuntime(f.root, ["person"]);
  assert.deepEqual(await inventory(f.root), before);
  assert.deepEqual((await readJson(f.statusPath)).active, []);
});

test("Person rejects global consultation scalars, malformed state and unknown owners without rewriting bytes", async t => {
  const f = await fixture(t), c = await f.add("invalid");
  const valid = structuredClone(c.state);
  for (const patch of [{ schema_version: 0 }, { work_id: "person/unknown" }, { change: "2026-10-19-another" }, { models_applied: ["A9"] }, { activation: { statement_delivered: "true" } }, { quotes_cited: [{ source: "../../outside" }] }, { consultation_status: "completed" }]) {
    Object.assign(c.state, structuredClone(valid), patch); await c.save();
    const before = await inventory(f.root);
    await assert.rejects(validateStructuredRuntime(f.root, ["person"]), /unsupported-person-state/);
    assert.deepEqual(await inventory(f.root), before);
    for (const key of Object.keys(c.state)) if (!(key in valid)) delete c.state[key];
  }
  Object.assign(c.state, valid); await c.save();
  f.index.problem_type = "旧的全局咨询字段"; await f.saveIndex();
  const before = await inventory(f.root);
  await assert.rejects(validateStructuredRuntime(f.root, ["person"]), /fields belong to a Change/);
  assert.deepEqual(await inventory(f.root), before);
});

test("Person rejects missing, duplicate and stale projections but never repairs them during refresh", async t => {
  const f = await fixture(t), c = await f.add("projection");
  const valid = structuredClone(f.index.active);
  for (const entries of [[], [valid[0], valid[0]], [{ ...valid[0], phase: "diagnosing" }], [{ ...valid[0], change: "2026-10-19-missing" }], [{ ...valid[0], work_id: steelman }]]) {
    f.index.active = entries; await f.saveIndex();
    const before = await inventory(f.root);
    await assert.rejects(validateStructuredRuntime(f.root, ["person"]), /unsupported-person-state/);
    assert.deepEqual(await inventory(f.root), before);
  }
  f.index.active = valid; await f.saveIndex();
  c.state.phase = "completed"; c.state.status = "completed"; c.state.completed_at = stamp; await c.save();
  await assert.rejects(validateStructuredRuntime(f.root, ["person"]), /projections disagree/);
  f.index.active = []; await f.saveIndex();
  // Completion remains a business claim; refresh checks its structural identity.
  await validateStructuredRuntime(f.root, ["person"]);
});

test("Person rejects linked formal state paths and leaves external bytes alone", { skip: process.platform === "win32" }, async t => {
  const f = await fixture(t), c = await f.add("linked");
  const outside = join(f.root, "external.json"), bytes = await readFile(join(c.path, ".status.json"));
  await writeFile(outside, bytes); await rm(join(c.path, ".status.json"));
  await symlink(outside, join(c.path, ".status.json"));
  await assert.rejects(validateStructuredRuntime(f.root, ["person"]), /path-unsafe/);
  assert.deepEqual(await readFile(outside), bytes);
  await rm(join(c.path, ".status.json")); await writeFile(join(c.path, ".status.json"), bytes);
  const linked = join(f.person, "changes/2026-10-19-linked-directory");
  await symlink(c.path, linked, "dir");
  await assert.rejects(validateStructuredRuntime(f.root, ["person"]), /path-unsafe/);
  assert.deepEqual(await readFile(outside), bytes);
});
