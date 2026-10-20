#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstatSync, readFileSync } from "node:fs";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const WORK_ID = "person/mao-zedong-cognitive-os";
const PHASES = ["activating", "diagnosing", "strategizing", "mobilizing", "delivering", "completed"];
const ARTIFACTS = ["problem-statement.md", "analysis.md", "strategy.md", "action-plan.md", "consultation-output.md"];
const TYPES = ["战略方向不清", "面对强大对手", "实力悬殊、长期战", "起步弱小、缺信心", "资源/兵力分配", "团队/组织问题", "决策方法", "路线/两难"];
const SCALARS = ["problem_type", "primary_framework", "models_applied", "frameworks_applied", "methods_applied", "quotes_cited", "consultation_status"];
const CHANGE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const encode = (value) => JSON.stringify(value, null, 2) + "\n";
const filled = (value) => typeof value === "string" && Boolean(value.trim()) && !/\[TODO|^<[^>]+>$/.test(value.trim());
const date = (value) => {
  if (typeof value !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  return Boolean(parts && Number(parts[2]) >= 1 && Number(parts[2]) <= 12 && Number(parts[3]) >= 1 && Number(parts[3]) <= new Date(Date.UTC(Number(parts[1]), Number(parts[2]), 0)).getUTCDate() && Number(parts[4]) < 24 && Number(parts[5]) < 60 && Number(parts[6]) < 60 && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now());
};
const workRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// lstat sees dangling links. A missing target never makes an existing link an
// unowned empty slot that publication may replace.
function exists(path) {
  try { lstatSync(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

function safe(root, locator) {
  if (typeof locator !== "string" || !locator || locator.includes("\\") || locator.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("invalid relative Person path: " + locator);
  const path = resolve(root, ...locator.split("/"));
  if (!path.startsWith(resolve(root) + sep)) throw new Error("Person path escapes root");
  let current = resolve(root);
  if (exists(current) && lstatSync(current).isSymbolicLink()) throw new Error("linked Person root");
  for (const part of locator.split("/")) {
    current = join(current, part);
    if (exists(current) && lstatSync(current).isSymbolicLink()) throw new Error("linked Person path: " + locator);
  }
  return path;
}
function object(value) { return value && typeof value === "object" && !Array.isArray(value); }
function strings(value, pattern) { return Array.isArray(value) && value.every((item) => typeof item === "string" && (!pattern || pattern.test(item))) && new Set(value).size === value.length; }
function readText(path) {
  if (!exists(path) || !lstatSync(path).isFile()) throw new Error("required regular file missing: " + path);
  return readFileSync(path, "utf8");
}
function section(text, heading) {
  const match = new RegExp("^##\\s+" + heading + "\\s*\\r?$", "m").exec(text);
  if (!match) return "";
  return text.slice(match.index + match[0].length).split(/\n##\s/)[0].replace(/<!--[\s\S]*?-->/g, "").trim();
}
function requiredSections(text, headings, label, errors) {
  for (const heading of headings) if (!filled(section(text, heading))) errors.push(label + ": missing actual section " + heading);
}

/** Field/identity checks only. The installer may call this without reading any
 * consultation artifact, original book, or executing a publication action. */
export function validateConsultationStructure(state, { change }) {
  const errors = [];
  if (!object(state) || state.schema_version !== 1 || state.artifact !== "person-work-status" || state.workflow !== "person" || state.work_id !== WORK_ID || state.change !== change || !CHANGE.test(change)) return ["invalid Person consultation identity/schema/owner"];
  const schema = JSON.parse(readText(safe(workRoot, "schemas/consultation-status.schema.json")));
  for (const key of schema.required) if (!(key in state)) errors.push("consultation state is missing " + key);
  if ("consultation_status" in state) errors.push("phase is the sole consultation progress field");
  const phaseIndex = PHASES.indexOf(state.phase);
  if (phaseIndex < 0 || !["active", "completed"].includes(state.status) || (state.phase === "completed") !== (state.status === "completed")) errors.push("invalid consultation phase/status");
  if (!date(state.created_at) || !date(state.updated_at) || Date.parse(state.updated_at) < Date.parse(state.created_at) || !(state.completed_at === null || date(state.completed_at))) errors.push("invalid consultation timestamps");
  if ((state.phase === "completed") !== (state.completed_at !== null)) errors.push("completed_at must match completion");
  if (state.completed_at !== null && (Date.parse(state.completed_at) < Date.parse(state.created_at) || Date.parse(state.completed_at) > Date.parse(state.updated_at))) errors.push("completion time must lie between creation and the current update");
  if (!strings(state.blockers) || !(state.problem_type === null || TYPES.includes(state.problem_type)) || !(state.primary_framework === null || filled(state.primary_framework))) errors.push("invalid consultation problem/framework/blockers");
  if (!strings(state.models_applied, /^A[1-8]$/) || !strings(state.frameworks_applied, /^B[1-8]$/) || !strings(state.methods_applied, /^C[1-8]$/)) return [...errors, "invalid model/framework/method IDs"];
  if (!object(state.phase_evidence) || !Array.isArray(state.quotes_cited) || !object(state.activation)) return [...errors, "phase_evidence, quotes_cited and activation are required"];
  if (typeof state.activation.statement_delivered !== "boolean" || !(state.activation.statement_evidence === null || filled(state.activation.statement_evidence)) || !Array.isArray(state.activation.opening_questions) || state.activation.opening_questions.some((item) => !object(item) || !filled(item.question) || !filled(item.answer))) errors.push("invalid activation evidence shape");
  for (const name of ["analysis_conditions", "action_conditions", "delivery_checks"]) if (!object(state[name]) || schema.properties[name].required.some((key) => typeof state[name][key] !== "boolean")) errors.push("invalid " + name);
  if (!Number.isInteger(state.strategy_stages) || state.strategy_stages < 0 || !strings(state.action_disciplines, /^(?:[1-9]|1[0-2])$/) || !(state.revision_reason === null || filled(state.revision_reason))) errors.push("invalid strategy/action/revision metadata");
  for (const [phase, record] of Object.entries(state.phase_evidence)) {
    if (!PHASES.slice(0, -1).includes(phase) || !object(record) || record.artifact !== ARTIFACTS[PHASES.indexOf(phase)] || !/^[a-f0-9]{64}$/.test(record.sha256 ?? "")) errors.push("invalid phase evidence identity/digest: " + phase);
  }
  for (const quote of state.quotes_cited) {
    if (!object(quote) || !["direct", "paraphrase"].includes(quote.kind) || !filled(quote.text) || !/^\d{3}$/.test(quote.article_id ?? "") || !ARTIFACTS.includes(quote.artifact) || typeof quote.source !== "string" || !quote.source.startsWith("books/src/" + quote.article_id + "-") || !quote.source.endsWith(".md") || quote.source.includes("\\") || quote.source.split("/").some(part => !part || part === "." || part === "..")) errors.push("invalid quote source/type/artifact");
  }
  return errors;
}

/** Publication additionally verifies real artifact bytes and the original
 * method gates. Structural validity alone never grants publication authority. */
export function validateConsultationState(state, options) {
  const errors = validateConsultationStructure(state, options);
  if (errors.length) return errors;
  const { changeRoot } = options, phaseIndex = PHASES.indexOf(state.phase);
  if (!Object.keys(state.phase_evidence).every((phase) => PHASES.slice(0, Math.max(0, phaseIndex)).includes(phase))) errors.push("phase evidence must belong to completed predecessors; revising a phase invalidates its later records");
  const texts = new Map();
  for (let i = 0; i < phaseIndex; i += 1) {
    const record = state.phase_evidence[PHASES[i]], artifact = ARTIFACTS[i];
    try {
      if (!object(record) || record.artifact !== artifact || !/^[a-f0-9]{64}$/.test(record.sha256 ?? "")) throw new Error("missing artifact hash");
      const text = readText(safe(changeRoot, artifact));
      if (hash(text) !== record.sha256) throw new Error("artifact hash does not match current bytes");
      if (/\[TODO(?::|\])|<正文>|<金句原文>/.test(text)) throw new Error("unfilled phase artifact");
      texts.set(artifact, text);
    } catch (error) { errors.push(PHASES[i] + ": " + error.message); }
  }
  if (phaseIndex >= 1) {
    const text = texts.get(ARTIFACTS[0]) ?? "";
    requiredSections(text, ["背景", "敌我友格局", "主要矛盾", "强弱对比", "问题类型", "主框架"], ARTIFACTS[0], errors);
    if (!TYPES.includes(state.problem_type) || !filled(state.primary_framework)) errors.push("activation must determine problem_type and primary_framework");
    if (!section(text, "问题类型").includes(state.problem_type ?? "\u0000") || !section(text, "主框架").includes(state.primary_framework ?? "\u0000")) errors.push("activation problem/framework projection differs from problem-statement");
    const declaration = /^> "(.+)"$/m.exec(readText(safe(workRoot, "references/activate.md")))?.[1];
    if (state.activation.statement_delivered !== true || !declaration || state.activation.statement_evidence !== declaration || !text.includes(declaration)) errors.push("activation requires the original first statement evidence");
    const questions = state.activation.opening_questions;
    if (!Array.isArray(questions) || questions.length < 2 || new Set(questions.map((item) => item?.question)).size < 2 || questions.some((item) => !object(item) || !filled(item.question) || !filled(item.answer) || !text.includes(item.question) || !text.includes(item.answer))) errors.push("activation requires at least two actual opening questions and user responses in problem-statement");
  }
  if (phaseIndex >= 2) {
    const text = texts.get(ARTIFACTS[1]) ?? "";
    requiredSections(text, ["应用的模型", "综合定性"], ARTIFACTS[1], errors);
    if (!Array.isArray(state.models_applied) || state.models_applied.length < 2 || !state.models_applied.includes("A1")) errors.push("diagnosis requires at least two Module A models including A1");
    const conditions = state.analysis_conditions;
    const required = [["second_hand", ["A3"]], ["multiple_interests", ["A6"]], ["trend_forecast", ["A5", "A7"]], ["standard_practice", ["A8"]]];
    if (!object(conditions) || required.some(([key]) => typeof conditions[key] !== "boolean")) errors.push("analysis condition flags are required");
    else for (const [condition, models] of required) if (conditions[condition]) for (const model of models) if (!state.models_applied.includes(model)) errors.push("diagnosis condition " + condition + " requires " + model);
    for (const model of Array.isArray(state.models_applied) ? state.models_applied : []) if (!text.includes(model) || !/条件/.test(text) || !/局限/.test(text)) errors.push("diagnosis requires recorded model, conditions and limits: " + model);
  }
  if (phaseIndex >= 3) {
    const text = texts.get(ARTIFACTS[2]) ?? "";
    for (const marker of ["定性", "定向", "站位", "时间", "投放", "运用", "阶段", "关键战役", "风险"]) if (!text.includes(marker)) errors.push("strategy missing " + marker);
    if (!Number.isInteger(state.strategy_stages) || state.strategy_stages < 2) errors.push("strategy requires at least two stages");
  }
  if (phaseIndex >= 4) {
    const text = texts.get(ARTIFACTS[3]) ?? "";
    if (!Array.isArray(state.methods_applied) || state.methods_applied.length < 2 || state.methods_applied.length > 3 || !strings(state.action_disciplines, /^(?:[1-9]|1[0-2])$/) || state.action_disciplines.length < 3 || state.action_disciplines.length > 5) errors.push("mobilization requires 2–3 Module C methods and 3–5 selected disciplines");
    const conditions = state.action_conditions;
    const required = [["coordination", "C1"], ["team_management", "C5"], ["ambiguous_task", "C7"], ["staffing", "C6"], ["retrospective", "C2"]];
    if (!object(conditions) || required.some(([key]) => typeof conditions[key] !== "boolean")) errors.push("action condition flags are required");
    else for (const [condition, method] of required) if (conditions[condition] && !state.methods_applied.includes(method)) errors.push("action condition " + condition + " requires " + method);
    for (const marker of ["任务", "执行者", "方法", "检验", "期限", "完成条件", "失败", "反馈", "底线"]) if (!text.includes(marker)) errors.push("action plan missing " + marker);
  }
  if (phaseIndex === 5) {
    requiredSections(texts.get(ARTIFACTS[4]) ?? "", ["答复", "内在张力", "引用索引"], ARTIFACTS[4], errors);
    if (!object(state.delivery_checks) || ["five_beats", "four_closing_actions", "anti_patterns", "tensions", "source_attribution"].some((key) => state.delivery_checks[key] !== true)) errors.push("delivery requires the existing five method review checks");
  }
  for (const quote of state.quotes_cited) {
    try {
      if (!object(quote) || !["direct", "paraphrase"].includes(quote.kind) || !filled(quote.text) || !/^\d{3}$/.test(quote.article_id ?? "") || !ARTIFACTS.includes(quote.artifact) || !quote.source?.startsWith("books/src/" + quote.article_id + "-") || !quote.source.endsWith(".md")) throw new Error("invalid quote source/type/artifact");
      const source = readText(safe(workRoot, quote.source));
      const artifact = texts.get(quote.artifact) ?? readText(safe(changeRoot, quote.artifact));
      if (!artifact.includes(quote.text) || !artifact.includes(quote.article_id)) throw new Error("quote and article ID must occur in the cited artifact");
      if (quote.kind === "direct" && !source.replace(/\s+/g, "").includes(quote.text.replace(/\s+/g, ""))) throw new Error("direct quote not found in cited original");
      if (quote.kind === "paraphrase" && !/转述|大意/.test(artifact)) throw new Error("paraphrase must be labeled");
    } catch (error) { errors.push("quote: " + error.message); }
  }
  if (phaseIndex >= 3 && !state.quotes_cited.some((quote) => quote?.artifact === "strategy.md")) errors.push("strategy requires its original attributed quotation evidence");
  return errors;
}

function readGlobal(root) {
  const bytes = readText(safe(root, "status.json")), value = JSON.parse(bytes);
  if (value.schema_version !== 1 || value.workflow !== "person" || !Array.isArray(value.active)) throw new Error("Person global status requires schema v1 and active array");
  if (SCALARS.some((key) => key in value)) throw new Error("consultation fields belong to a Person Change, not global status");
  const seen = new Set();
  for (const entry of value.active) {
    if (!object(entry) || !CHANGE.test(entry.change ?? "") || typeof entry.work_id !== "string" || !entry.work_id.startsWith("person/") || !filled(entry.phase) || !date(entry.updated_at) || seen.has(entry.change)) throw new Error("invalid/duplicate Person active entry");
    seen.add(entry.change);
  }
  return { bytes, value };
}
async function atomic(path, bytes, token) {
  const temporary = join(dirname(path), ".person-state-" + token + ".tmp");
  if (exists(path) && !lstatSync(path).isFile()) throw new Error("publication target must be a regular file: " + path);
  const mode = exists(path) ? lstatSync(path).mode & 0o777 : 0o600;
  const handle = await open(temporary, "wx", mode);
  try { await handle.writeFile(bytes); await handle.sync(); }
  finally { await handle.close(); }
  await rename(temporary, path);
}
export async function publishConsultation(options) {
  const root = resolve(options.stateRoot), change = options.change;
  if (!CHANGE.test(change ?? "")) throw new Error("invalid Person Change ID");
  const changeRoot = safe(root, "changes/" + change), statePath = safe(changeRoot, ".status.json");
  const candidatePath = resolve(options.candidate ?? statePath);
  if (!candidatePath.startsWith(changeRoot + sep)) throw new Error("candidate must belong to this Person Change");
  if (options.publish && candidatePath === statePath) throw new Error("publication requires a separate candidate; do not overwrite authoritative state before validation");
  safe(changeRoot, relative(changeRoot, candidatePath).split(sep).join("/"));
  const candidateBytes = readText(candidatePath), candidate = JSON.parse(candidateBytes);
  const errors = validateConsultationState(candidate, { changeRoot, change });
  if (errors.length) throw new Error(errors.join("\n"));
  const global = readGlobal(root);
  const oldBytes = exists(statePath) ? readText(statePath) : null, previous = oldBytes ? JSON.parse(oldBytes) : null;
  if (previous && (previous.work_id !== WORK_ID || previous.change !== change || previous.schema_version !== 1 || previous.artifact !== "person-work-status")) throw new Error("cannot overwrite a different Person Change owner or format");
  if (!previous && candidate.phase !== "activating") throw new Error("new consultation must start with activating");
  if (previous) {
    const before = PHASES.indexOf(previous.phase), after = PHASES.indexOf(candidate.phase);
    if (after > before + 1 || after < before && !filled(candidate.revision_reason)) throw new Error("phase transition requires ordered completion or an explicit revision_reason");
    if (candidate.created_at !== previous.created_at || Date.parse(candidate.updated_at) < Date.parse(previous.updated_at)) throw new Error("cannot change creation time or rewind update time");
  }
  if (global.value.active.some((entry) => entry.change === change && entry.work_id !== WORK_ID)) throw new Error("global Change belongs to another Person Work");
  const digest = hash(candidateBytes);
  if (!options.publish) return { status: "valid", candidate_sha256: digest, phase: candidate.phase };
  if (options.expectDigest !== digest) throw new Error("candidate differs from reviewed digest");
  const token = randomUUID(), lockPath = safe(root, ".person-status.lock");
  if (exists(lockPath)) {
    const identity = lstatSync(lockPath), bytes = readText(lockPath);
    let owner;
    try { owner = JSON.parse(bytes); } catch { throw new Error("unrecognized Person lock; preserve it for its owner"); }
    let alive = true;
    if (owner.host === hostname() && Number.isInteger(owner.pid) && owner.pid > 0) {
      try { process.kill(owner.pid, 0); } catch (error) { alive = error.code !== "ESRCH"; }
    }
    if (alive || owner.work_id !== WORK_ID || owner.change !== change || owner.candidate_sha256 !== digest) throw new Error("Person index lock belongs to another/live publication");
    const current = lstatSync(lockPath);
    if (current.ino !== identity.ino || current.dev !== identity.dev || readText(lockPath) !== bytes) throw new Error("Person index lock changed during recovery");
    await rm(lockPath);
  }
  const lock = await open(lockPath, "wx", 0o600);
  let lockIdentity, lockBytes = encode({ token, work_id: WORK_ID, change, candidate_sha256: digest, host: hostname(), pid: process.pid });
  try {
    await lock.writeFile(lockBytes); await lock.sync(); lockIdentity = await lock.stat();
    // Keep the scope narrow: validate after acquiring the cooperative index lock.
    if (readText(candidatePath) !== candidateBytes || (exists(statePath) ? readText(statePath) : null) !== oldBytes) throw new Error("Person candidate or Change state changed while acquiring lock");
    const current = readGlobal(root);
    if (current.value.active.some((entry) => entry.change === change && entry.work_id !== WORK_ID)) throw new Error("current global owner changed");
    const freshErrors = validateConsultationState(candidate, { changeRoot, change });
    if (freshErrors.length) throw new Error(freshErrors.join("\n"));
    // Preserve unknown fields and every other Work/Change entry.
    const merged = previous ? { ...previous, ...candidate } : candidate;
    await atomic(statePath, encode(merged), token + "-change");
    const index = current.value.active.findIndex((entry) => entry.change === change && entry.work_id === WORK_ID);
    if (candidate.phase === "completed") {
      if (index >= 0) current.value.active.splice(index, 1);
    } else {
      const entry = { ...(index >= 0 ? current.value.active[index] : {}), change, work_id: WORK_ID, phase: candidate.phase, updated_at: candidate.updated_at };
      if (index >= 0) current.value.active[index] = entry;
      else current.value.active.push(entry);
    }
    if (readText(safe(root, "status.json")) !== current.bytes) throw new Error("Person index changed outside the shared lock; Change state is valid, retry publication to repair its projection");
    await atomic(safe(root, "status.json"), encode(current.value), token + "-index");
    return { status: "published", candidate_sha256: digest, phase: candidate.phase };
  } finally {
    await lock.close();
    if (exists(lockPath)) {
      const actual = lstatSync(lockPath);
      if (lockIdentity && actual.ino === lockIdentity.ino && actual.dev === lockIdentity.dev && await readFile(lockPath, "utf8") === lockBytes) await rm(lockPath);
    }
  }
}
function options(argv) {
  const result = { stateRoot: null, change: null, candidate: null, publish: false, expectDigest: null, digestArtifacts: false };
  const keys = new Map([["--state-root", "stateRoot"], ["--change", "change"], ["--candidate", "candidate"], ["--expect-digest", "expectDigest"]]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--publish") { result.publish = true; continue; }
    if (argv[i] === "--digest-artifacts") { result.digestArtifacts = true; continue; }
    const key = keys.get(argv[i]), value = argv[++i];
    if (!key || !value || value.startsWith("--")) throw new Error("invalid consultation option");
    result[key] = value;
  }
  if (!result.stateRoot || !result.change) throw new Error("--state-root and --change are required");
  if (result.digestArtifacts && (result.candidate || result.publish || result.expectDigest)) throw new Error("--digest-artifacts is read-only and separate from publication");
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const opts = options(process.argv.slice(2));
    if (opts.digestArtifacts) {
      if (!CHANGE.test(opts.change)) throw new Error("invalid Person Change ID");
      const root = safe(resolve(opts.stateRoot), "changes/" + opts.change), evidence = {};
      for (let i = 0; i < ARTIFACTS.length; i += 1) {
        const path = safe(root, ARTIFACTS[i]);
        if (exists(path)) evidence[PHASES[i]] = { artifact: ARTIFACTS[i], sha256: hash(readText(path)) };
      }
      console.log(JSON.stringify(evidence, null, 2));
    } else console.log(JSON.stringify(await publishConsultation(opts), null, 2));
  }
  catch (error) { console.error("Person consultation validation failed: " + error.message); process.exitCode = 1; }
}
