#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CHANGE_NAME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORK_ID = /^learning\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCATOR = /^(?:changes\/.+|archive\/[0-9]{4}-[0-9]{2}\/.+)$/;
const EXPECTED_WORKS = new Set(["A-archive", "A-assess-and-plan", "C-consolidate", "H-homework", "I-init-setup", "L-lesson", "R-review"]);
const OLD_WORKS = new Set(["A-archive-and-consolidate", "E-eli5", "P-practice", "Q-quiz"]);
const PHASE = new Set(["planning", "teaching", "homework", "review", "consolidating", "closed", "archived"]);
const LIFECYCLE = new Set(["active", "blocked", "closed", "archived"]);
const EVIDENCE = new Set(["not_attempted", "passed", "needs_review"]);

function options(argv) {
  const result = { workflowRoot: null, stateRoot: null, stage: null, change: null, selfCheck: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workflow-root") result.workflowRoot = resolve(argv[++i] ?? "");
    else if (arg === "--state-root") result.stateRoot = resolve(argv[++i] ?? "");
    else if (arg === "--stage") result.stage = argv[++i] ?? null;
    else if (arg === "--change") result.change = argv[++i] ?? null;
    else if (arg === "--self-check") result.selfCheck = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!result.workflowRoot && !result.stateRoot && !result.selfCheck) throw new Error("use --workflow-root, --state-root, or --self-check");
  if (result.stage && !new Set(["pre-archive", "complete"]).has(result.stage)) throw new Error("--stage must be pre-archive or complete");
  if (result.stage && !result.change) throw new Error("--stage requires --change");
  if (result.change && !CHANGE_NAME.test(result.change)) throw new Error("--change has an invalid name");
  return result;
}

function isFile(path) { return existsSync(path) && statSync(path).isFile(); }
function isDir(path) { return existsSync(path) && statSync(path).isDirectory(); }
function readJson(path, label, errors) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { errors.push(`${label}: invalid JSON (${error.message})`); return null; }
}
function files(root) {
  if (!isDir(root)) return [];
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
function duplicates(values) {
  const seen = new Set();
  return values.filter((value) => seen.has(value) || !seen.add(value));
}
function validDate(value) { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
function frontmatter(text) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*/.exec(text);
  const result = {};
  if (!match) return result;
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!field) continue;
    const value = field[2].trim();
    if (/^\[.*\]$/.test(value)) result[field[1]] = value.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    else if (/^\d+$/.test(value)) result[field[1]] = Number(value);
    else result[field[1]] = value.replace(/^['"]|['"]$/g, "");
  }
  return result;
}

function validateWorkflowRoot(root, errors) {
  const required = ["INDEX.md", "README.md", "_state/status.json", "runtime-contract.json"];
  for (const file of required) if (!isFile(join(root, file))) errors.push(`${file}: required workflow file is missing`);
  if (!isFile(join(root, "README.md"))) return;
  const index = readFileSync(join(root, "INDEX.md"), "utf8");
  const readme = readFileSync(join(root, "README.md"), "utf8");
  if (!/^id: learning$/m.test(index) || !/^type: workflow$/m.test(index) || !/^workflow: learning$/m.test(index)) errors.push("INDEX.md: invalid identity");
  if (!(index.includes("## 主题知识") || index.includes("## 永久知识")) || !index.includes("## Work 激活") || !index.includes("<Path>{roots.workflows}/learning/README.md</Path>")) errors.push("INDEX.md: missing passive/activation sections");
  if ((readme.match(/AUTO-INDEX-START/g) ?? []).length !== 1 || (readme.match(/AUTO-INDEX-END/g) ?? []).length !== 1) errors.push("README.md: requires one AUTO-INDEX marker pair");
  const works = new Set(readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^[A-Z]-/.test(entry.name) && isFile(join(root, entry.name, `${entry.name}.md`))).map((entry) => entry.name));
  if (works.size !== EXPECTED_WORKS.size || [...EXPECTED_WORKS].some((work) => !works.has(work))) errors.push(`workflow works mismatch: expected ${[...EXPECTED_WORKS].sort().join(", ")}; found ${[...works].sort().join(", ")}`);
  for (const old of OLD_WORKS) if (isDir(join(root, old)) && files(join(root, old)).length) errors.push(`${old}: obsolete v1 work is still shipped`);
  for (const work of works) {
    const text = readFileSync(join(root, work, `${work}.md`), "utf8");
    if (!text.includes("<Path>{roots.workflows}/learning/README.md</Path>")) errors.push(`${work}: missing activation contract reference`);
    if (!/^workflow: learning$/m.test(text) || !/^type: workflow-entry$/m.test(text)) errors.push(`${work}: invalid frontmatter identity`);
  }
  const seed = readJson(join(root, "_state/status.json"), "_state/status.json", errors);
  if (seed && (seed.schema_version !== 2 || seed.workflow !== "learning" || !Array.isArray(seed.active) || !Array.isArray(seed.archived))) errors.push("_state/status.json: expected empty learning schema v2 status");
  const runtime = readJson(join(root, "runtime-contract.json"), "runtime-contract.json", errors);
  if (runtime && (runtime.schema_version !== 1 || runtime.workflow !== "learning" || runtime.config !== null || runtime.opaque_default !== "preserve-byte-for-byte" || !runtime.structured_state.includes(".speculo/learning/changes/**/.status.json"))) errors.push("runtime-contract.json: missing recursive v2 paths");
  for (const schema of ["status.schema.json", "change-status.schema.json"]) readJson(join(root, "common", "schemas", schema), `common/schemas/${schema}`, errors);
  const contracts = [
    ["L-lesson/L-lesson.md", ["30–40", "estimated_minutes", "time_budget", "ELI5"]],
    ["L-lesson/lesson-template.md", ["lesson_id", "source_ids", "反例与边界", "文字等价物"]],
    ["H-homework/H-homework.md", ["Submission: ready", "Explain (English)"]],
    ["H-homework/homework-template.md", ["Q1", "A1", "Submission: pending"]],
    ["common/rules/teaching-policy.md", ["coverage_depth", "不以字符数"]],
  ];
  for (const [file, markers] of contracts) {
    const path = join(root, file);
    if (!isFile(path)) { errors.push(`${file}: required contract is missing`); continue; }
    const text = readFileSync(path, "utf8");
    for (const marker of markers) if (!text.includes(marker)) errors.push(`${file}: missing '${marker}'`);
  }
}

function validateEntry(entry, label, errors, archived) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) { errors.push(`${label}: must be an object`); return null; }
  for (const key of ["change_id", "kind", "domain", "topic_id", "locator", "parent_change", "root_change", "current_work", "works_run"]) if (!(key in entry)) errors.push(`${label}: missing ${key}`);
  if (!CHANGE_NAME.test(entry.change_id ?? "") || !["learning", "consolidation"].includes(entry.kind) || !DOMAIN.test(entry.domain ?? "") || !DOMAIN.test(entry.topic_id ?? "")) errors.push(`${label}: invalid identity`);
  if (!LOCATOR.test(entry.locator ?? "") || String(entry.locator).split("/").includes("..")) errors.push(`${label}: invalid locator`);
  if (!(entry.parent_change === null || CHANGE_NAME.test(entry.parent_change ?? "")) || !CHANGE_NAME.test(entry.root_change ?? "")) errors.push(`${label}: invalid parent/root`);
  if (!(entry.current_work === null || WORK_ID.test(entry.current_work ?? ""))) errors.push(`${label}: invalid current_work`);
  if (!Array.isArray(entry.works_run) || entry.works_run.some((item) => !WORK_ID.test(item)) || duplicates(entry.works_run).length) errors.push(`${label}: invalid works_run`);
  if (entry.updated_at !== undefined && !validDate(entry.updated_at)) errors.push(`${label}: invalid updated_at`);
  if (archived && !String(entry.locator).startsWith("archive/")) errors.push(`${label}: archived entry must use archive locator`);
  if (!archived && String(entry.locator).startsWith("archive/")) errors.push(`${label}: active entry cannot use archive locator`);
  return entry;
}

function validateMastery(value, label, errors) {
  const mastery = value.mastery;
  if (!mastery || typeof mastery !== "object") { errors.push(`${label}: mastery is required`); return; }
  if (!["unverified", "immediate", "retention_verified"].includes(mastery.overall) || !EVIDENCE.has(mastery.immediate) || !["not_scheduled", "due", "passed", "needs_review"].includes(mastery.retention) || !EVIDENCE.has(mastery.critical_objectives) || !EVIDENCE.has(mastery.transfer)) errors.push(`${label}: invalid mastery projection`);
  if (mastery.overall === "retention_verified" && mastery.retention !== "passed") errors.push(`${label}: retention_verified requires retention passed`);
  if (!Array.isArray(mastery.blocking_misconceptions) || !Array.isArray(mastery.evidence)) errors.push(`${label}: mastery arrays are required`);
  if (!(mastery.next_review_at === null || validDate(mastery.next_review_at))) errors.push(`${label}: invalid next_review_at`);
}

function validateChange(value, expectedId, expectedLocator, errors) {
  const label = `${expectedId}/.status.json`;
  if (!value || typeof value !== "object") return;
  if (value.schema_version === 1) { errors.push(`${label}: learning-reset-required; v1 is not auto-migrated`); return; }
  if (value.schema_version !== 2 || value.artifact !== "learning-change-status" || value.change_id !== expectedId || value.locator !== expectedLocator) errors.push(`${label}: invalid identity/schema/locator`);
  if (!CHANGE_NAME.test(value.change_id ?? "") || !["learning", "consolidation"].includes(value.kind) || !DOMAIN.test(value.domain ?? "") || !DOMAIN.test(value.topic_id ?? "")) errors.push(`${label}: invalid domain/kind/topic`);
  if (!LIFECYCLE.has(value.lifecycle) || !PHASE.has(value.phase)) errors.push(`${label}: invalid lifecycle/phase`);
  if (!(value.current_work === null || WORK_ID.test(value.current_work ?? "")) || !Array.isArray(value.works_run) || duplicates(value.works_run).length) errors.push(`${label}: invalid work projection`);
  if (!validDate(value.created_at) || !validDate(value.updated_at)) errors.push(`${label}: invalid timestamps`);
  if (!(value.closed_at === null || validDate(value.closed_at)) || !(value.archived_at === null || validDate(value.archived_at))) errors.push(`${label}: invalid close/archive timestamp`);
  if (value.lifecycle === "archived" && (value.phase !== "archived" || value.current_work !== null || !String(value.locator).startsWith("archive/"))) errors.push(`${label}: archive state does not match locator`);
  if (value.lifecycle !== "archived" && (value.archived_at !== null || value.archive_path !== null || String(value.locator).startsWith("archive/"))) errors.push(`${label}: active state contains archive fields`);
  if (!value.homework || !["none", "pending", "reviewed", "needs_revision"].includes(value.homework.status) || !(value.homework.latest_id === null || typeof value.homework.latest_id === "string")) errors.push(`${label}: invalid homework projection`);
  if (!Array.isArray(value.children) || !Array.isArray(value.blockers)) errors.push(`${label}: children/blockers must be arrays`);
  validateMastery(value, label, errors);
}

function validateLessons(changeRoot, errors) {
  const lessonRoot = join(changeRoot, "lessons");
  if (!isDir(lessonRoot)) return;
  for (const path of files(lessonRoot).filter((candidate) => /\.md$/.test(candidate) && !candidate.endsWith("INDEX.md"))) {
    const text = readFileSync(path, "utf8");
    const label = relative(changeRoot, path).split(sep).join("/");
    const meta = frontmatter(text);
    if (!/^L-[0-9]{3}(?:-[a-z0-9-]+)?$/.test(String(meta.lesson_id ?? ""))) errors.push(`${label}: lesson_id is required`);
    if (!Number.isInteger(meta.estimated_minutes) || meta.estimated_minutes < 30 || meta.estimated_minutes > 40) errors.push(`${label}: estimated_minutes must be 30–40`);
    if (!Array.isArray(meta.time_budget) && !text.includes("time_budget:")) errors.push(`${label}: time_budget is required`);
    for (const heading of ["宏观", "机制", "精确定义", "English", "正例", "反例", "迁移", "误区", "总结", "来源"]) if (!text.includes(heading)) errors.push(`${label}: missing teaching coverage '${heading}'`);
    if (!/(文字等价物|完整的文字|文字替代)/.test(text)) errors.push(`${label}: visual representation needs a text equivalent`);
    if (!/source_ids:|\| Source ID \|/.test(text)) errors.push(`${label}: source_ids/source table is required`);
    if (/\bverdict\b|\bmastered\b|^##\s*(?:Answers|Review)/mi.test(text)) errors.push(`${label}: lesson must not contain homework review/mastery fields`);
  }
}

function validateHomework(changeRoot, errors) {
  const homeworkRoot = join(changeRoot, "homework");
  if (!isDir(homeworkRoot)) return;
  for (const path of files(homeworkRoot).filter((candidate) => /^HW-.*\.md$/.test(candidate.split(sep).pop() ?? ""))) {
    const text = readFileSync(path, "utf8");
    const label = relative(changeRoot, path).split(sep).join("/");
    const ready = /(^|\n)Submission:\s*ready\s*(?:\n|$)/i.test(text);
    const reviewed = /^##\s+Review\s*$/mi.test(text);
    if (!/(^|\n)Submission:\s*(?:pending|ready)\s*(?:\n|$)/i.test(text)) errors.push(`${label}: Submission marker is required`);
    const questions = [...text.matchAll(/^###\s+Q(\d+)\b/gm)].map((match) => Number(match[1]));
    const answers = [...text.matchAll(/^###\s+A(\d+)\b/gm)].map((match) => Number(match[1]));
    if (!questions.length || questions.length !== answers.length || questions.some((number, index) => number !== index + 1) || answers.some((number, index) => number !== index + 1)) errors.push(`${label}: Q/A numbering must be contiguous and paired`);
    if (reviewed && !ready) errors.push(`${label}: review cannot exist before Submission: ready`);
    if (reviewed && !/correct|partial|incorrect|uncertain/i.test(text) || reviewed && !/Explain \(English\)/.test(text)) errors.push(`${label}: review needs verdict and Explain (English)`);
  }
}

function validateContext(stateRoot, errors) {
  const context = join(stateRoot, "context");
  if (!isDir(context)) return;
  for (const required of ["INDEX.md", "REVIEW.md"]) if (!isFile(join(context, required))) errors.push(`context/${required}: missing`);
  const ids = new Set();
  for (const path of files(context).filter((candidate) => candidate.endsWith(".md"))) {
    const text = readFileSync(path, "utf8");
    const id = /^\|\s*topic_id\s*\|\s*([^|]+)\s*\|/mi.exec(text)?.[1]?.trim();
    if (id) { if (ids.has(id)) errors.push(`${relative(context, path)}: duplicate topic_id ${id}`); ids.add(id); }
    if (path.includes(`${sep}topics${sep}`) && !/provenance|source_change_id|claim_id/i.test(text)) errors.push(`${relative(context, path)}: topic view needs provenance`);
  }
}

function validateStateRoot(root, opts, errors) {
  const statusPath = join(root, "status.json");
  if (!isFile(statusPath)) { errors.push("status.json: missing"); return; }
  const status = readJson(statusPath, "status.json", errors);
  if (!status) return;
  if (status.schema_version === 1) { errors.push("status.json: learning-reset-required; v1 is not auto-migrated"); return; }
  if (status.schema_version !== 2 || status.workflow !== "learning" || !Array.isArray(status.active) || !Array.isArray(status.archived)) { errors.push("status.json: expected learning schema v2"); return; }
  const active = status.active.map((entry, index) => validateEntry(entry, `status.active[${index}]`, errors, false)).filter(Boolean);
  const archived = status.archived.map((entry, index) => validateEntry(entry, `status.archived[${index}]`, errors, true)).filter(Boolean);
  const all = [...active, ...archived];
  const ids = all.map((entry) => entry.change_id);
  if (duplicates(ids).length) errors.push("status.json: duplicate or overlapping change ids");
  const byId = new Map(all.map((entry) => [entry.change_id, entry]));
  for (const entry of all) {
    const path = join(root, ...String(entry.locator).split("/"), ".status.json");
    if (!isFile(path)) { errors.push(`${entry.change_id}: indexed Change is missing ${path}`); continue; }
    const value = readJson(path, `${entry.change_id}/.status.json`, errors);
    validateChange(value, entry.change_id, entry.locator, errors);
    if (value && (value.domain !== entry.domain || value.topic_id !== entry.topic_id || value.parent_change !== entry.parent_change || value.current_work !== entry.current_work || JSON.stringify(value.works_run) !== JSON.stringify(entry.works_run))) errors.push(`${entry.change_id}: global and change projections differ`);
    const seen = new Set();
    let parent = entry.parent_change;
    while (parent !== null) {
      if (seen.has(parent)) { errors.push(`${entry.change_id}: parent cycle detected`); break; }
      seen.add(parent);
      if (!byId.has(parent)) { errors.push(`${entry.change_id}: parent_change ${parent} is not indexed`); break; }
      parent = byId.get(parent).parent_change;
    }
    const changeRoot = join(root, ...String(entry.locator).split("/"));
    validateLessons(changeRoot, errors);
    validateHomework(changeRoot, errors);
    if (opts.stage === "pre-archive" && (!opts.change || opts.change === entry.change_id) && value?.lifecycle !== "closed") errors.push(`${entry.change_id}: pre-archive requires lifecycle closed`);
    if (opts.stage === "complete" && (!opts.change || opts.change === entry.change_id) && !String(entry.locator).startsWith("archive/")) errors.push(`${entry.change_id}: complete stage requires archived locator`);
  }
  const locationsPath = join(root, "locations.json");
  if (all.length && !isFile(locationsPath)) errors.push("locations.json: required when Changes exist");
  if (isFile(locationsPath)) {
    const locations = readJson(locationsPath, "locations.json", errors);
    if (locations && (locations.schema_version !== 2 || locations.workflow !== "learning" || !Array.isArray(locations.entries))) errors.push("locations.json: expected schema v2");
    else if (locations) {
      const locationIds = locations.entries.map((entry) => entry.change_id);
      if (duplicates(locationIds).length) errors.push("locations.json: duplicate change ids");
      for (const entry of all) if (!locations.entries.some((candidate) => candidate.change_id === entry.change_id && candidate.locator === entry.locator)) errors.push(`${entry.change_id}: locations.json does not match current locator`);
    }
  }
  if (opts.change && !all.some((entry) => entry.change_id === opts.change)) errors.push(`${opts.change}: Change is not indexed`);
  validateContext(root, errors);
}

function main() {
  const opts = options(process.argv.slice(2));
  const errors = [];
  if (opts.selfCheck) validateWorkflowRoot(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."), errors);
  if (opts.workflowRoot) validateWorkflowRoot(opts.workflowRoot, errors);
  if (opts.stateRoot) validateStateRoot(opts.stateRoot, opts, errors);
  if (errors.length) { console.error(`Learning validation failed (${errors.length})`); for (const error of errors) console.error(`  - ${error}`); process.exitCode = 1; return; }
  console.log("Learning validation: OK");
}

try { main(); } catch (error) { console.error(`Learning validation failed: ${error.message}`); process.exitCode = 1; }
