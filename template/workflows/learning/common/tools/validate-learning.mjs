#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CHANGE_NAME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORK_ID = /^learning\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHANGE_STATUS = new Set(["active", "blocked", "awaiting_retention", "completed", "archived"]);
const PHASE = new Set(["intake", "assessment", "teaching", "practice", "immediate_quiz", "retention", "ready_to_archive", "archived"]);
const DOMAIN_TYPE = new Set(["project", "product", "subject", "language", "skill"]);
const RESULT = new Set(["not_attempted", "failed", "passed", "needs_review"]);
const KNOWLEDGE_STATUS = new Set(["mastered", "review_due", "needs_refresh", "superseded"]);
const EXPECTED_WORKS = new Set([
  "A-archive-and-consolidate",
  "A-assess-and-plan",
  "E-eli5",
  "I-init-setup",
  "P-practice",
  "Q-quiz",
  "R-review",
]);

function parseArgs(argv) {
  const result = { workflowRoot: null, stateRoot: null, stage: null, change: null, selfCheck: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workflow-root") result.workflowRoot = resolve(argv[++index] ?? "");
    else if (arg === "--state-root") result.stateRoot = resolve(argv[++index] ?? "");
    else if (arg === "--stage") result.stage = argv[++index] ?? null;
    else if (arg === "--change") result.change = argv[++index] ?? null;
    else if (arg === "--self-check") result.selfCheck = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!result.workflowRoot && !result.stateRoot && !result.selfCheck) {
    throw new Error("use --workflow-root <path>, --state-root <path>, or --self-check");
  }
  if (result.stage && !new Set(["pre-archive", "complete"]).has(result.stage)) {
    throw new Error("--stage must be pre-archive or complete");
  }
  if (result.stage && !result.change) throw new Error("--stage requires --change");
  if (result.change && !CHANGE_NAME.test(result.change)) throw new Error("--change has an invalid name");
  return result;
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function readJson(path, label, errors) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`);
    return null;
  }
}

function walk(root) {
  if (!isDirectory(root)) return [];
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function sameMembers(actual, expected) {
  return actual.size === expected.size && [...actual].every((item) => expected.has(item));
}

function duplicates(values) {
  const seen = new Set();
  return values.filter((value) => seen.has(value) || !seen.add(value));
}

function validDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateWorkflowRoot(root, errors) {
  const indexPath = join(root, "INDEX.md");
  const readmePath = join(root, "README.md");
  const seedPath = join(root, "_state", "status.json");
  const runtimePath = join(root, "runtime-contract.json");
  for (const path of [indexPath, readmePath, seedPath, runtimePath]) {
    if (!isFile(path)) errors.push(`${path}: required workflow file is missing`);
  }
  if (errors.length) return;

  const index = readFileSync(indexPath, "utf8");
  const readme = readFileSync(readmePath, "utf8");
  if (!/^id: learning$/m.test(index) || !/^type: workflow$/m.test(index) || !/^workflow: learning$/m.test(index)) {
    errors.push("INDEX.md: identity must be learning/type workflow");
  }
  for (const heading of ["## 永久知识", "## Work 激活"]) {
    if (!index.includes(heading)) errors.push(`INDEX.md: missing ${heading}`);
  }
  if (!index.includes("<Path>{roots.workflows}/learning/README.md</Path>")) errors.push("INDEX.md: missing activation pointer");
  if ((readme.match(/AUTO-INDEX-START/g) ?? []).length !== 1 || (readme.match(/AUTO-INDEX-END/g) ?? []).length !== 1) {
    errors.push("README.md: requires one AUTO-INDEX marker pair");
  }

  const works = new Set(readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[A-Z]-/.test(entry.name))
    .map((entry) => entry.name));
  if (!sameMembers(works, EXPECTED_WORKS)) {
    errors.push(`workflow works mismatch: expected ${[...EXPECTED_WORKS].sort().join(", ")}; found ${[...works].sort().join(", ")}`);
  }
  for (const work of works) {
    const path = join(root, work, `${work}.md`);
    if (!isFile(path)) {
      errors.push(`${work}: missing same-named entry`);
      continue;
    }
    const text = readFileSync(path, "utf8");
    if (!text.includes("<Path>{roots.workflows}/learning/README.md</Path>")) errors.push(`${work}: missing activation contract reference`);
    if (!/^workflow: learning$/m.test(text) || !/^type: workflow-entry$/m.test(text)) errors.push(`${work}: invalid frontmatter identity`);
  }

  const seed = readJson(seedPath, "_state/status.json", errors);
  if (seed && (seed.schema_version !== 1 || seed.workflow !== "learning" || !Array.isArray(seed.active) || !Array.isArray(seed.archived))) {
    errors.push("_state/status.json: expected empty learning schema v1 status");
  }
  const runtime = readJson(runtimePath, "runtime-contract.json", errors);
  if (runtime && (runtime.schema_version !== 1 || runtime.workflow !== "learning" || runtime.config !== null || runtime.opaque_default !== "preserve-byte-for-byte")) {
    errors.push("runtime-contract.json: invalid learning contract");
  }
  for (const schema of ["status.schema.json", "change-status.schema.json"]) {
    readJson(join(root, "common", "schemas", schema), `common/schemas/${schema}`, errors);
  }

  for (const path of walk(root).filter((candidate) => candidate.toLowerCase().endsWith(".md"))) {
    if (/```mermaid\b/i.test(readFileSync(path, "utf8"))) {
      errors.push(`${relative(root, path)}: Learning diagrams must use fenced ASCII text, not Mermaid`);
    }
  }

  const teachingContracts = [
    [join(root, "E-eli5", "E-eli5.md"), ["5 岁的小孩", "大一新生", "ASCII", "不得生成 Mermaid"]],
    [join(root, "E-eli5", "lesson-template.md"), ["## 教学表达基线", "5 岁的小孩", "大一新生", "```text"]],
    [join(root, "common", "rules", "teaching-policy.md"), ["5 岁的小孩", "大一新生", "默认使用", "纯文本 ASCII"]],
    [join(root, "I-init-setup", "learner-profile-template.md"), ["教学表达基线", "5 岁的小孩", "仅纯文本 ASCII"]],
  ];
  for (const [path, requiredMarkers] of teachingContracts) {
    if (!isFile(path)) {
      errors.push(`${relative(root, path)}: required teaching contract is missing`);
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const marker of requiredMarkers) {
      if (!text.includes(marker)) errors.push(`${relative(root, path)}: missing '${marker}'`);
    }
  }
}

function validateGlobalStatus(status, errors) {
  if (!status) return;
  if (status.schema_version !== 1 || status.workflow !== "learning" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    errors.push("status.json: expected learning schema v1 with active and archived arrays");
    return;
  }
  const activeNames = [];
  for (const [index, entry] of status.active.entries()) {
    const label = `status.json active[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${label}: must be an object`);
      continue;
    }
    if (!CHANGE_NAME.test(entry.change ?? "")) errors.push(`${label}: invalid change`);
    if (!DOMAIN.test(entry.domain ?? "")) errors.push(`${label}: invalid domain`);
    if (typeof entry.topic !== "string" || !entry.topic.trim()) errors.push(`${label}: topic is required`);
    if (!(entry.current_work === null || WORK_ID.test(entry.current_work ?? ""))) errors.push(`${label}: invalid current_work`);
    if (!Array.isArray(entry.works_run) || entry.works_run.some((item) => !WORK_ID.test(item)) || duplicates(entry.works_run ?? []).length) {
      errors.push(`${label}: works_run must contain unique learning work ids`);
    }
    activeNames.push(entry.change);
  }
  if (duplicates(activeNames).length || duplicates(status.archived).length) errors.push("status.json: duplicate change names");
  for (const name of status.archived) {
    if (!CHANGE_NAME.test(name)) errors.push(`status.json: invalid archived change ${name}`);
    if (activeNames.includes(name)) errors.push(`status.json: ${name} is both active and archived`);
  }
}

function validateMasteryGate(changeStatus, label, errors) {
  const mastery = changeStatus.mastery;
  if (!mastery || typeof mastery !== "object" || Array.isArray(mastery)) {
    errors.push(`${label}: mastery is required`);
    return;
  }
  if (!RESULT.has(mastery.immediate) || !RESULT.has(mastery.retention)) errors.push(`${label}: invalid mastery result`);
  if (mastery.score !== null && (typeof mastery.score !== "number" || mastery.score < 0 || mastery.score > 100)) errors.push(`${label}: invalid mastery score`);
  if (typeof mastery.critical_objectives_passed !== "boolean" || typeof mastery.transfer_passed !== "boolean") errors.push(`${label}: mastery booleans are required`);
  if (!Array.isArray(mastery.blocking_misconceptions) || !Array.isArray(mastery.evidence)) errors.push(`${label}: mastery arrays are required`);
  if (!(mastery.next_review_at === null || validDateTime(mastery.next_review_at))) errors.push(`${label}: invalid next_review_at`);

  if (changeStatus.change_status === "awaiting_retention" && mastery.immediate !== "passed") {
    errors.push(`${label}: awaiting_retention requires immediate passed`);
  }
  if (["completed", "archived"].includes(changeStatus.change_status)) {
    if (mastery.immediate !== "passed" || mastery.retention !== "passed") errors.push(`${label}: completed knowledge requires both mastery gates passed`);
    if (typeof mastery.score !== "number" || mastery.score < 80) errors.push(`${label}: completed knowledge requires score >= 80`);
    if (!mastery.critical_objectives_passed) errors.push(`${label}: completed knowledge requires all critical objectives`);
    if (!mastery.transfer_passed) errors.push(`${label}: completed knowledge requires transfer evidence`);
    if (mastery.blocking_misconceptions.length) errors.push(`${label}: completed knowledge has blocking misconceptions`);
    if (mastery.evidence.length < 2 || !mastery.evidence.some((item) => /\/quiz\/immediate-/.test(item)) || !mastery.evidence.some((item) => /\/quiz\/retention-/.test(item))) {
      errors.push(`${label}: completed knowledge requires immediate and retention result evidence`);
    }
  }
}

function validateChangeStatus(value, expectedName, expectedArchived, errors) {
  const label = `${expectedName}/.status.json`;
  if (!value) return;
  if (value.schema_version !== 1 || value.artifact !== "learning-change-status") errors.push(`${label}: invalid identity/schema`);
  if (value.change !== expectedName) errors.push(`${label}: change must match directory`);
  if (!DOMAIN.test(value.domain ?? "") || !DOMAIN_TYPE.has(value.domain_type)) errors.push(`${label}: invalid domain or domain_type`);
  if (typeof value.topic !== "string" || !value.topic.trim()) errors.push(`${label}: topic is required`);
  if (!CHANGE_STATUS.has(value.change_status) || !PHASE.has(value.phase)) errors.push(`${label}: invalid status or phase`);
  if (!(value.current_work === null || WORK_ID.test(value.current_work ?? ""))) errors.push(`${label}: invalid current_work`);
  if (!Array.isArray(value.works_run) || value.works_run.some((item) => !WORK_ID.test(item)) || duplicates(value.works_run ?? []).length) errors.push(`${label}: invalid works_run`);
  if (!validDateTime(value.created_at) || !validDateTime(value.updated_at)) errors.push(`${label}: created_at and updated_at must be date-times`);
  if (!Array.isArray(value.blockers)) errors.push(`${label}: blockers must be an array`);
  if (expectedArchived && (value.change_status !== "archived" || value.phase !== "archived" || !validDateTime(value.archived_at) || typeof value.archive_path !== "string")) {
    errors.push(`${label}: archived index requires archived status, phase, time, and path`);
  }
  if (expectedArchived && value.archive_path !== `<Path>{roots.state}/learning/archive/${expectedName.slice(0, 7)}/${expectedName}</Path>`) {
    errors.push(`${label}: archive_path does not match the indexed archive location`);
  }
  if (!expectedArchived && value.change_status === "archived") errors.push(`${label}: active index cannot point to archived change`);
  if (value.change_status === "completed" && (!validDateTime(value.completed_at) || value.phase !== "ready_to_archive")) errors.push(`${label}: completed requires completed_at and ready_to_archive phase`);
  validateMasteryGate(value, label, errors);
}

function statePathFromTag(stateRoot, taggedPath) {
  const match = /^<Path>\{roots\.state\}\/learning\/(.+)<\/Path>$/.exec(taggedPath);
  return match ? join(stateRoot, ...match[1].split("/")) : null;
}

function validateContext(stateRoot, errors) {
  const contextRoot = join(stateRoot, "context");
  if (!isDirectory(contextRoot)) return;
  for (const required of ["INDEX.md", "REVIEW.md"]) {
    if (!isFile(join(contextRoot, required))) errors.push(`context/${required}: missing`);
  }
  const ids = new Map();
  for (const file of walk(contextRoot).filter((path) => path.endsWith(".md"))) {
    const text = readFileSync(file, "utf8");
    const fileLabel = relative(stateRoot, file).split(sep).join("/");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split("#")[0].trim();
      if (!target || /^(?:https?:|mailto:|#)/.test(target) || target.includes("<")) continue;
      const resolved = resolve(dirname(file), decodeURIComponent(target));
      if (!resolved.startsWith(resolve(contextRoot) + sep) || !existsSync(resolved)) errors.push(`${fileLabel}: broken or escaping Markdown link ${target}`);
    }
    const id = /^\|\s*Knowledge ID\s*\|\s*([^|]+?)\s*\|\s*$/m.exec(text)?.[1];
    if (!id) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) errors.push(`${fileLabel}: invalid Knowledge ID ${id}`);
    if (ids.has(id)) errors.push(`${fileLabel}: duplicate Knowledge ID ${id} also in ${ids.get(id)}`);
    else ids.set(id, fileLabel);
    const state = /^\|\s*状态\s*\|\s*([^|]+?)\s*\|\s*$/m.exec(text)?.[1];
    if (!KNOWLEDGE_STATUS.has(state)) errors.push(`${fileLabel}: invalid or missing knowledge 状态`);
    for (const heading of ["## 当前理解", "## 心智模型", "## 示例与应用", "## 常见误区", "## 来源与证据"]) {
      if (!text.includes(heading)) errors.push(`${fileLabel}: missing ${heading}`);
    }
  }
}

function validateStateRoot(root, options, errors) {
  const statusPath = join(root, "status.json");
  if (!isFile(statusPath)) {
    errors.push("status.json: missing");
    return;
  }
  const status = readJson(statusPath, "status.json", errors);
  validateGlobalStatus(status, errors);
  if (!status || !Array.isArray(status.active) || !Array.isArray(status.archived)) return;

  for (const entry of status.active) {
    if (!entry || typeof entry.change !== "string") continue;
    const path = join(root, "changes", entry.change, ".status.json");
    if (!isFile(path)) {
      errors.push(`${entry.change}: indexed active change is missing .status.json`);
      continue;
    }
    const changeStatus = readJson(path, `${entry.change}/.status.json`, errors);
    validateChangeStatus(changeStatus, entry.change, false, errors);
    if (changeStatus && (changeStatus.domain !== entry.domain || changeStatus.topic !== entry.topic || changeStatus.current_work !== entry.current_work || JSON.stringify(changeStatus.works_run) !== JSON.stringify(entry.works_run))) {
      errors.push(`${entry.change}: global and change status projections differ`);
    }
    if (options.stage === "pre-archive" && (!options.change || options.change === entry.change) && changeStatus?.change_status !== "completed") {
      errors.push(`${entry.change}: pre-archive requires completed status`);
    }
    if (options.stage === "complete" && (!options.change || options.change === entry.change)) {
      errors.push(`${entry.change}: complete stage cannot leave the change active`);
    }
    for (const evidence of changeStatus?.mastery?.evidence ?? []) {
      const resolved = statePathFromTag(root, evidence);
      if (!resolved || !isFile(resolved)) errors.push(`${entry.change}: mastery evidence does not exist ${evidence}`);
    }
  }

  for (const name of status.archived) {
    const archiveRoot = join(root, "archive", name.slice(0, 7), name);
    const path = join(archiveRoot, ".status.json");
    if (!isFile(path)) {
      errors.push(`${name}: indexed archive is missing .status.json`);
      continue;
    }
    validateChangeStatus(readJson(path, `${name}/.status.json`, errors), name, true, errors);
    if (isDirectory(join(root, "changes", name))) errors.push(`${name}: archived change still exists under changes`);
    if (options.stage === "complete" && (!options.change || options.change === name) && !isFile(join(archiveRoot, "promotion-plan.md"))) {
      errors.push(`${name}: complete stage requires archived promotion-plan.md`);
    }
  }
  if (options.change && !status.active.some((entry) => entry.change === options.change) && !status.archived.includes(options.change)) errors.push(`${options.change}: change is not indexed`);
  validateContext(root, errors);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const errors = [];
  if (options.selfCheck) {
    const ownRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    validateWorkflowRoot(ownRoot, errors);
  }
  if (options.workflowRoot) validateWorkflowRoot(options.workflowRoot, errors);
  if (options.stateRoot) validateStateRoot(options.stateRoot, options, errors);
  if (errors.length) {
    console.error(`Learning validation failed (${errors.length})`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Learning validation: OK");
}

try {
  main();
} catch (error) {
  console.error(`Learning validation failed: ${error.message}`);
  process.exitCode = 1;
}
