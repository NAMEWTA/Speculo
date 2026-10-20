/** Deterministic disposable inputs, never an Agent transcript or user approval.
 * Operations are invoked by the runner through installed CLI entrypoints. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const STAMP = "2026-10-18T00:00:00.000Z";
export const PARENT = "2026-10-19-parent", SOURCE = "2026-10-19-source", CHILD = "2026-10-19-child";
export const LEARNING = "2026-10-19-learning", MEDIA = "2026-10-19-media";
export const LESSON = "lessons/L-001-topic.md", HOMEWORK = "homework/HW-001-topic-attempt-01.md", REVIEW = "review/RV-001.md";
export const ORIGINAL = "# Original fixture text\r\n用户原始内容：保持字节。\r\n";
export const BINARY = Buffer.from([0, 1, 255, 13, 10]);
export const json = value => JSON.stringify(value, null, 2) + "\n";
export const sha = value => createHash("sha256").update(value).digest("hex");
export const readJson = async path => JSON.parse(await readFile(path, "utf8"));
export async function put(path, value) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, value); }
export const putJson = (path, value) => put(path, json(value));
export const markdown = (meta, body) => "---\n" + JSON.stringify(meta) + "\n---\n\n" + body;

async function learningSeed(assets) {
  return readJson(join(assets, "workflows/learning/learning-a-assess-and-plan/assets/change-status-template.json"));
}
function learningEntry(state) {
  return Object.fromEntries(["change_id", "kind", "domain", "topic_id", "locator", "parent_change", "root_change", "current_work", "works_run", "updated_at"].map(key => [key, state[key]]));
}
export async function relocationFixture(assets, nested = false) {
  const root = join(assets, ".speculo/learning"), seed = await learningSeed(assets), entries = [];
  for (const id of nested ? [PARENT, SOURCE, CHILD] : [PARENT, SOURCE]) {
    const locator = "changes/" + (id === CHILD ? SOURCE + "/children/" : "") + id;
    const state = { ...structuredClone(seed), change_id: id, kind: id === PARENT || id === SOURCE && nested ? "consolidation" : "learning", domain: "programming", topic_id: "fixture", parent_change: id === CHILD ? SOURCE : null, root_change: id === CHILD ? SOURCE : id, locator, current_work: null, created_at: STAMP, updated_at: STAMP };
    if (id === SOURCE && nested) state.children = [{ change_id: CHILD, locator: "changes/" + SOURCE + "/children/" + CHILD, content_hash: "0".repeat(64), effective_at: STAMP, lifecycle: "active" }];
    await putJson(join(root, locator, ".status.json"), state);
    await put(join(root, locator, "original.md"), ORIGINAL);
    await put(join(root, locator, "unknown.bin"), BINARY);
    entries.push({ ...learningEntry(state), extension: "retained" });
  }
  await putJson(join(root, "status.json"), { schema_version: 2, workflow: "learning", active: entries, archived: [] });
  await putJson(join(root, "locations.json"), { schema_version: 2, workflow: "learning", entries: structuredClone(entries), extension: "retained" });
  return root;
}
export const lessonMetadata = () => ({ lesson_id: "L-001", delivered_at: "2026-10-16T00:00:00.000Z", objective_ids: ["OBJ-01"], source_ids: ["S-001"], estimated_minutes: 35, time_budget: [{ segment: "orientation", minutes: 5 }, { segment: "explanation", minutes: 20 }, { segment: "practice", minutes: 10 }], expression_level: "eli5", coverage_depth: "standard" });
export const lessonBody = "# Fixture Lesson\n\n## 宏观地图\n背景与目标。\n\n## 核心概念与机制\n精确定义 English term。文字等价物，正例、反例、迁移、误区、总结、来源。\n";
export function homeworkFixture(marker = "Submission: ready") {
  const prefix = markdown({ homework_id: "HW-001", attempt: 1, previous_attempt: null, lesson_ids: ["L-001"], objective_ids: ["OBJ-01"], source_ids: ["S-001"], question_count: 1, created_at: "2026-10-16T00:00:00.000Z" }, "# Homework fixture\n\n## Questions\n### Q1 — 解释\n原题。\n\n## Learner Answers\n### A1\n用户原始回答。\n\n" + marker + "\n\n");
  return prefix + "## Review\nSubmitted content sha256: " + sha(prefix) + "\nReviewed at: 2026-10-17T00:00:00.000Z\nImmediate result: passed\nImmediate rationale: OBJ-01 的回答提供机制、适用条件和反例；仅为结构回归样本。\n\n### Review Q1\nverdict: correct\nExplain (English): Synthetic review fixture; no actual learner evaluation.\n";
}
export function retentionFixture(occurredAt = STAMP) {
  return markdown({ artifact: "learning-retention-review", owner_work: "learning/review", review_id: "RV-001", change_id: LEARNING, lesson_ids: ["L-001"], objective_ids: ["OBJ-01"], source_ids: ["S-001"], previous_evidence: LESSON, previous_at: "2026-10-16T00:00:00.000Z", due_at: "2026-10-17T00:00:00.000Z", occurred_at: occurredAt, retention: "passed" }, "# 延迟复习夹具\n\n## 新回忆与迁移题\n用新的情境解释机制。\n\n## 学习者原始回答\n此为结构回归样本，不是实际学习者的掌握证明。\n\n## 评审与证据\n模拟回答与声明 OBJ 对齐，用于校验时间和引用合同。\n");
}
export async function learningEvidenceFixture(assets) {
  const root = join(assets, ".speculo/learning"), change = join(root, "changes", LEARNING);
  const state = { ...await learningSeed(assets), change_id: LEARNING, domain: "programming", topic_id: "topic", root_change: LEARNING, locator: "changes/" + LEARNING, current_work: null, created_at: "2026-10-16T00:00:00.000Z", updated_at: STAMP };
  const entry = learningEntry(state);
  await putJson(join(root, "status.json"), { schema_version: 2, workflow: "learning", active: [entry], archived: [] });
  await putJson(join(root, "locations.json"), { schema_version: 2, workflow: "learning", entries: [entry] });
  await putJson(join(change, ".status.json"), state);
  await put(join(change, "course.md"), "| ID | 目标 |\n| --- | --- |\n| OBJ-01 | 解释机制 |\n");
  await put(join(change, "sources.md"), "| Source ID | 来源 |\n| --- | --- |\n| S-001 | 本地测试材料 |\n");
  await put(join(change, LESSON), markdown(lessonMetadata(), lessonBody));
  return { root, change, state };
}
export async function consultationFixture(assets, suffix = "consultation") {
  const root = join(assets, ".speculo/person"), change = "2026-10-19-" + suffix;
  const state = { ...await readJson(join(assets, "workflows/person/person-m-mao-zedong-cognitive-os/assets/templates/consultation-status-template.json")), change, created_at: STAMP, updated_at: STAMP };
  const candidate = join(root, "changes", change, "candidate.json");
  await putJson(candidate, state);
  return { root, change, candidate, state, save: () => putJson(candidate, state) };
}
export async function mediaFixture(assets) {
  const root = join(assets, ".speculo/media"), change = join(root, "changes", MEDIA);
  const state = { schema_version: 1, change: MEDIA, status: "completed", current_work: null, works_run: ["media/brief"], revision: 1, blockers: [], updated_at: STAMP };
  const manifest = { schema_version: 1, change: MEDIA, artifacts: [{ id: "article", owner: "media/brief", kind: "document", root: "change", path: "master.md", version: 1, sha256: sha(ORIGINAL), evidence_kind: "executed", depends_on: [] }] };
  await put(join(change, "master.md"), ORIGINAL);
  await putJson(join(change, ".status.json"), state);
  await putJson(join(change, "artifacts.json"), manifest);
  await putJson(join(root, "status.json"), { schema_version: 1, workflow: "media", active: [], completed: [MEDIA] });
  return { root, change, state, manifest };
}
export async function expiredPlanFixture(assets) {
  const root = join(assets, ".speculo/ops"), run = "expired-fixture", state = await readJson(join(root, "status.json"));
  const plan = {
    schema_version: 1, artifact: "ops-resource-plan", run_id: run, worker: "D", operation: "negative-fixture",
    reason: "Schema-valid expired empty-operation fixture; no deployment or real authorization", created_at: "2026-10-15T00:00:00Z", expires_at: "2026-10-16T00:00:00Z",
    controller_id: "fixture", registry_digest: sha(json(state)), registry_slice_digest: "fixture-unconsumed", registry_scope: { hosts: [], projects: [], deployments: [], allocations: [], bindings: [], policies: false, public_ingress: false }, registry_revision: state.revision,
    hosts: {}, transport_digests: {}, inventories: {}, engine_digest: "fixture-unconsumed", document_preconditions: {}, operations: [], registry_after: state,
    credential_versions: {}, document_targets: [], allow_adopt_roots: [], external_files: {}, affected_consumers: [], rollback_note: "No operation may run", risk: "negative fixture", source_digests: {},
  };
  const path = join(root, "releases", run, "plan.json"); await putJson(path, plan);
  return { root, run, path, plan };
}
