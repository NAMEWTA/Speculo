import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const toolsRoot = join(process.cwd(), "template/workflows/learning/common/tools");
const { validateLearningState } = await import(pathToFileURL(join(toolsRoot, "validate-learning.mjs")).href);
const { homeworkSubmissionDigest } = await import(pathToFileURL(join(toolsRoot, "learning-evidence.mjs")).href);
const ID = "2026-10-19-learning", LESSON = "lessons/L-001-topic.md", HW = "homework/HW-001-topic-attempt-01.md", REVIEW = "review/RV-001.md";
const PREVIOUS = "2026-10-16T00:00:00.000Z", DUE = "2026-10-17T00:00:00.000Z", OCCURRED = "2026-10-18T00:00:00.000Z";
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const md = (meta: unknown, body: string) => "---\n" + JSON.stringify(meta) + "\n---\n\n" + body;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const lessonMeta = () => ({ lesson_id: "L-001", delivered_at: PREVIOUS, objective_ids: ["OBJ-01"], source_ids: ["S-001"], estimated_minutes: 35, time_budget: [{ segment: "orientation", minutes: 5 }, { segment: "explanation", minutes: 20 }, { segment: "practice", minutes: 10 }], expression_level: "eli5", coverage_depth: "standard" });
const lessonBody = "# Lesson\n\n## 宏观地图\n背景与目标。\n\n## 核心概念与机制\n精确定义 English term。文字等价物，正例、反例、迁移、误区、总结、来源。\n";
function homework(reviewed = true, marker = "Submission: ready") {
  const prefix = md({ homework_id: "HW-001", attempt: 1, previous_attempt: null, lesson_ids: ["L-001"], objective_ids: ["OBJ-01"], source_ids: ["S-001"], question_count: 1, created_at: PREVIOUS }, "# Homework\n\n## Questions\n### Q1 — 解释\n原题。\n\n## Learner Answers\n### A1\n用户原始回答。\n\n" + marker + "\n\n");
  return reviewed ? prefix + "## Review\nSubmitted content sha256: " + hash(prefix) + "\nReviewed at: " + DUE + "\nImmediate result: passed\nImmediate rationale: Q1 demonstrates the declared OBJ-01 mechanism.\n\n### Review Q1\nverdict: correct\nExplain (English): Evidence-backed explanation.\n" : prefix;
}
function review(overrides: Record<string, unknown> = {}, answers = "我在未看课程的情境中解释机制并给出新迁移例子。") {
  return md({ artifact: "learning-retention-review", owner_work: "learning/review", review_id: "RV-001", change_id: ID, lesson_ids: ["L-001"], objective_ids: ["OBJ-01"], source_ids: ["S-001"], previous_evidence: LESSON, previous_at: PREVIOUS, due_at: DUE, occurred_at: OCCURRED, retention: "passed", ...overrides }, "# 延迟复习\n\n## 新回忆与迁移题\n在新的场景中解释机制、反例和迁移。\n\n## 学习者原始回答\n" + answers + "\n\n## 评审与证据\n回答展示了对应 OBJ 的条件、反例和迁移过程。\n");
}
async function fixture(t: { after: (fn: () => Promise<unknown>) => void }) {
  const root = await mkdtemp(join(tmpdir(), "speculo-learning-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const change = join(root, "changes", ID);
  await mkdir(change, { recursive: true });
  const seed = JSON.parse(await readFile(join(process.cwd(), "template/workflows/learning/learning-a-assess-and-plan/assets/change-status-template.json"), "utf8"));
  const state = { ...seed, change_id: ID, domain: "programming", topic_id: "topic", root_change: ID, locator: "changes/" + ID, current_work: null, created_at: PREVIOUS, updated_at: OCCURRED };
  const entry = Object.fromEntries(["change_id", "kind", "domain", "topic_id", "locator", "parent_change", "root_change", "current_work", "works_run", "updated_at"].map((key) => [key, state[key]]));
  await writeFile(join(root, "status.json"), json({ schema_version: 2, workflow: "learning", active: [entry], archived: [] }));
  await writeFile(join(root, "locations.json"), json({ schema_version: 2, workflow: "learning", entries: [entry] }));
  const write = async (path: string, text: string) => { await mkdir(dirname(join(change, path)), { recursive: true }); await writeFile(join(change, path), text); };
  const save = () => writeFile(join(change, ".status.json"), json(state));
  await save();
  await write("course.md", "| ID | 目标 |\n| --- | --- |\n| OBJ-01 | 解释核心机制 |\n| OBJ-02 | 另一独立目标 |\n");
  await write("sources.md", "| Source ID | 来源 |\n| --- | --- |\n| S-001 | 当前仓库的具体章节 |\n");
  await write(LESSON, md(lessonMeta(), lessonBody));
  return { root, change, state, write, save, errors: () => validateLearningState(root) as string[] };
}

test("Learning validates numeric budgets and actual OBJ/source/Lesson declarations", async (t) => {
  const f = await fixture(t);
  assert.deepEqual(f.errors(), []);
  const cases = [
    { ...lessonMeta(), time_budget: [{ segment: "too-long", minutes: 80 }] },
    { ...lessonMeta(), time_budget: [{ segment: "negative", minutes: -1 }, { segment: "rest", minutes: 36 }] },
    { ...lessonMeta(), time_budget: [{ segment: "string", minutes: "35" }] },
    { ...lessonMeta(), objective_ids: ["OBJ-missing"] },
    { ...lessonMeta(), source_ids: ["S-missing"] },
  ];
  for (const meta of cases) {
    await f.write(LESSON, md(meta, lessonBody));
    assert.ok(f.errors().length, JSON.stringify(meta));
  }
  await f.write(LESSON, md(lessonMeta(), lessonBody));
  await f.write(HW, homework(false).replace('"L-001"', '"L-404"'));
  assert.match(f.errors().join("\n"), /unresolved ID L-404/);
});

test("Homework accepts one exact explicit marker and verifies frozen submitted bytes", async (t) => {
  const f = await fixture(t);
  for (const marker of ["submission: ready", " Submission: ready", "Submission: READY", "Submission: ready\nSubmission: ready"]) {
    await f.write(HW, homework(false, marker));
    assert.match(f.errors().join("\n"), /literal Submission/);
  }
  await f.write(HW, homework(false, "Submission: pending"));
  assert.deepEqual(f.errors(), []);
  await f.write(HW, homework());
  assert.deepEqual(f.errors(), []);
  assert.equal(homeworkSubmissionDigest(homework()), /^Submitted content sha256: (.+)$/m.exec(homework())?.[1]);
  await f.write(HW, homework().replace("用户原始回答", "助手偷偷改过的回答"));
  assert.match(f.errors().join("\n"), /fingerprint/);
  await f.write(HW, homework(false, "Submission: pending") + "## Review\ncorrect\nExplain (English)\n");
  assert.match(f.errors().join("\n"), /before Submission: ready/);
});

test("Homework attempts and immediate evidence are real without making R mandatory", async (t) => {
  const f = await fixture(t);
  f.state.mastery.overall = "immediate";
  f.state.mastery.immediate = "passed";
  f.state.mastery.evidence = [HW + "#review"];
  f.state.homework = { status: "reviewed", latest_id: "HW-001", submitted_at: DUE };
  await f.save();
  assert.ok(f.errors().length);
  await f.write(HW, homework());
  assert.deepEqual(f.errors(), []);
  await f.write("homework/HW-001-topic-attempt-02.md", homework(false).replace('"attempt":1', '"attempt":2').replace('"previous_attempt":null', '"previous_attempt":"' + HW + '"'));
  f.state.homework.status = "pending";
  await f.save();
  assert.deepEqual(f.errors(), []);
  await f.write("homework/HW-001-topic-attempt-02.md", homework(false).replace('"attempt":1', '"attempt":2'));
  assert.match(f.errors().join("\n"), /artifact reference/);
});

test("a valid incorrect or partial Homework Review does not itself certify immediate passing", async (t) => {
  const f = await fixture(t);
  f.state.mastery.immediate = "needs_review";
  f.state.mastery.evidence = [HW + "#review"];
  f.state.homework = { status: "needs_revision", latest_id: "HW-001", submitted_at: DUE };
  for (const verdict of ["incorrect", "partial", "uncertain"]) {
    const record = homework().replace("verdict: correct", "verdict: " + verdict).replace("Immediate result: passed", "Immediate result: needs_review");
    await f.write(HW, record);
    await f.save();
    assert.deepEqual(f.errors(), [], verdict + " is a valid completed Review");
    assert.equal(homeworkSubmissionDigest(record), homeworkSubmissionDigest(homework()));
    f.state.mastery.overall = "immediate"; f.state.mastery.immediate = "passed";
    f.state.homework.status = "reviewed";
    await f.save();
    assert.match(f.errors().join("\n"), /actual passed Homework Review/);
    assert.equal(await readFile(join(f.change, HW), "utf8"), record);
    f.state.mastery.overall = "unverified"; f.state.mastery.immediate = "needs_review";
    f.state.homework.status = "needs_revision";
  }
});

test("Homework passing needs an explicit supported judgment without imposing an all-correct score", async (t) => {
  const f = await fixture(t);
  f.state.mastery.overall = "immediate"; f.state.mastery.immediate = "passed";
  f.state.mastery.evidence = [HW + "#review"];
  f.state.homework = { status: "reviewed", latest_id: "HW-001", submitted_at: DUE };
  await f.save();
  for (const verdict of ["incorrect", "uncertain"]) {
    await f.write(HW, homework().replace("verdict: correct", "verdict: " + verdict));
    assert.match(f.errors().join("\n"), /positive resolved Q\/A evidence/);
  }
  await f.write(HW, homework().replace("verdict: correct", "verdict: partial").replace("Q1 demonstrates the declared OBJ-01 mechanism.", "Q1 demonstrates OBJ-01; the missing optional example does not block that objective."));
  assert.deepEqual(f.errors(), []);
  await f.write(HW, homework().replace("Immediate result: passed\n", ""));
  assert.match(f.errors().join("\n"), /one explicit Immediate result/);
  await f.write(HW, homework().replace("verdict: correct", "verdict: incorrect\nverdict: correct"));
  assert.match(f.errors().join("\n"), /one explicit verdict/);
  await f.write(HW, homework().replace("### Review Q1", "### Review Q2"));
  assert.match(f.errors().join("\n"), /every submitted question once/);
});

test("immediate passing cannot coexist with blocking misconceptions or needs_revision", async (t) => {
  const f = await fixture(t);
  await f.write(HW, homework());
  f.state.mastery.overall = "immediate"; f.state.mastery.immediate = "passed";
  f.state.mastery.evidence = [HW + "#review"];
  f.state.homework = { status: "reviewed", latest_id: "HW-001", submitted_at: DUE };
  await f.save();
  assert.deepEqual(f.errors(), []);
  f.state.mastery.blocking_misconceptions = ["The learner still reverses the core causal direction."];
  await f.save();
  assert.match(f.errors().join("\n"), /contradicts unresolved blocking misconceptions/);
  f.state.mastery.blocking_misconceptions = [];
  f.state.homework.status = "needs_revision";
  await f.save();
  assert.match(f.errors().join("\n"), /immediate passed contradicts homework needs_revision/);
  assert.equal(await readFile(join(f.change, HW), "utf8"), homework());
});

test("retention projection requires actual delayed R answers, times and matching scope", async (t) => {
  const f = await fixture(t);
  f.state.mastery.overall = "retention_verified";
  f.state.mastery.retention = "passed";
  f.state.mastery.evidence = [REVIEW];
  await f.save();
  assert.match(f.errors().join("\n"), /real passed R Review/);
  await f.write(REVIEW, review());
  assert.deepEqual(f.errors(), []);
  for (const overrides of [
    { occurred_at: "2026-10-16T12:00:00.000Z" },
    { occurred_at: "2099-01-01T00:00:00.000Z" },
    { previous_at: "2026-10-15T00:00:00.000Z" },
    { objective_ids: ["OBJ-02"] },
    { previous_evidence: REVIEW },
  ]) {
    await f.write(REVIEW, review(overrides));
    assert.ok(f.errors().length, JSON.stringify(overrides));
  }
  await f.write(REVIEW, review({}, ""));
  assert.match(f.errors().join("\n"), /学习者原始回答/);
  f.state.mastery.overall = "unverified"; f.state.mastery.retention = "due";
  await f.save();
  await f.write(REVIEW, review({ retention: "due", occurred_at: null }, ""));
  assert.deepEqual(f.errors(), []);
});

test("permanent claims resolve their actual source manifest and corresponding R objectives", async (t) => {
  const f = await fixture(t);
  await f.write(REVIEW, review());
  const manifest = { schema_version: 1, artifact: "learning-synthesis-manifest", claims: [{ claim_id: "CLM-001", evidence_status: "supported", mastery: "mastered", sources: [{ change_id: ID, artifact: LESSON + "#核心概念与机制", source_id: "S-001", objective_ids: ["OBJ-01"] }], unknowns: [], verified_at: OCCURRED, retention_evidence: [{ change_id: ID, artifact: REVIEW }] }] };
  await f.write("synthesis/source-manifest.json", json(manifest));
  const topic = join(f.root, "context/domains/programming/topics/topic");
  await mkdir(topic, { recursive: true });
  await writeFile(join(f.root, "context/INDEX.md"), "# Index\n");
  await writeFile(join(f.root, "context/REVIEW.md"), "# Review\n");
  await writeFile(join(topic, "INDEX.md"), "# Topic\nsource_change_id: " + ID + "\nclaim_id: CLM-001\n");
  await writeFile(join(topic, "provenance.json"), json({ schema_version: 1, source_change_id: ID, source_manifest: "synthesis/source-manifest.json" }));
  assert.deepEqual(f.errors(), []);
  manifest.claims[0].sources[0].objective_ids = ["OBJ-02"];
  await f.write("synthesis/source-manifest.json", json(manifest));
  assert.match(f.errors().join("\n"), /does not cover the claim/);
  manifest.claims[0].sources[0].objective_ids = ["OBJ-01"];
  manifest.claims[0].sources[0].artifact = LESSON + "#missing";
  await f.write("synthesis/source-manifest.json", json(manifest));
  assert.match(f.errors().join("\n"), /anchor is missing/);
  await rm(join(topic, "provenance.json"));
  assert.match(f.errors().join("\n"), /requires provenance.json/);
});

test("cold archive precondition remains closed lifecycle, independent of Homework or mastery", async (t) => {
  const f = await fixture(t);
  f.state.lifecycle = "closed"; f.state.phase = "closed"; f.state.closed_at = OCCURRED; f.state.closure_reason = "用户明确结束本次学习";
  await f.save();
  assert.deepEqual(validateLearningState(f.root, { stage: "pre-archive", change: ID }), []);
});
