#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CHANGE_NAME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST = /^[a-f0-9]{64}$/;
const IMMUTABLE_DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/;
const PLAN_LOCATOR = /^plan\/plan-[0-9]{3}\.json$/;
const APPROVAL_LOCATOR = /^plan\/approval-[0-9]{3}\.json$/;
const ATTEMPT_ID = /^ATTEMPT-[0-9]{3}$/;
const TARGET_PROFILE_LOCATOR = /^deployment\/target-profile\.json$/;
const VERIFICATION_STATE_LOCATOR = /^execution\/attempts\/ATTEMPT-[0-9]{3}\/verification-state\.json$/;
const HANDOFF_LOCATOR = /^execution\/attempts\/ATTEMPT-[0-9]{3}\/HANDOFF\.md$/;
const BATCH_ID = /^B[0-9]{2}$/;
const OPERATION_ID = /^OP[0-9]{3}$/;
const GATE_ID = /^G[0-9]{2}$/;
const VERIFICATION_ID = /^VR[0-9]{3}$/;
const CHANGE_STATUS = new Set(["active", "blocked", "completed", "archived"]);
const PHASE = new Set(["intake", "assessment", "planning", "awaiting_approval", "approved", "executing", "diagnosing", "stabilizing", "ready_to_archive", "archived"]);
const APPROVAL_STATUS = new Set(["not_requested", "pending", "approved", "invalidated"]);
const OUTCOME = new Set(["pending", "succeeded", "rolled_back", "abandoned"]);
const EXPECTED_WORKS = new Set(["A-archive-and-learn", "E-execute-and-stabilize", "I-intake-and-assess", "P-plan-and-approve"]);
const EXPECTED_WORK_IDS = new Set(["ops/archive-and-learn", "ops/execute-and-stabilize", "ops/intake-and-assess", "ops/plan-and-approve"]);
const RETROSPECTIVE_HEADINGS = [
  "## Attempt Timeline", "## Errors and Failure Signatures", "## Confirmed Root Causes",
  "## Rejected Hypotheses and Why", "## Final Effective Deployment or Recovery Sequence",
  "## Lessons and Cautions", "## SOP and Troubleshooting Candidates", "## Remaining Risks and Unknowns",
];

function parseArgs(argv) {
  const options = { workflowRoot: null, stateRoot: null, stage: null, scope: null, project: null, change: null, selfCheck: false, digest: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workflow-root") options.workflowRoot = resolve(argv[++index] ?? "");
    else if (arg === "--state-root") options.stateRoot = resolve(argv[++index] ?? "");
    else if (arg === "--stage") options.stage = argv[++index] ?? null;
    else if (arg === "--scope") options.scope = argv[++index] ?? null;
    else if (arg === "--project") options.project = argv[++index] ?? null;
    else if (arg === "--change") options.change = argv[++index] ?? null;
    else if (arg === "--self-check") options.selfCheck = true;
    else if (arg === "--digest") options.digest = resolve(argv[++index] ?? "");
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!options.workflowRoot && !options.stateRoot && !options.selfCheck && !options.digest) throw new Error("use --workflow-root, --state-root, --self-check, or --digest");
  if (options.stage && !new Set(["pre-execute", "pre-close", "pre-archive", "complete"]).has(options.stage)) throw new Error("--stage must be pre-execute, pre-close, pre-archive, or complete");
  if (options.stage && (!options.scope || !options.change)) throw new Error("--stage requires --scope and --change");
  if (options.scope && !["global", "project"].includes(options.scope)) throw new Error("--scope must be global or project");
  if (options.scope === "project" && !PROJECT_ID.test(options.project ?? "")) throw new Error("project scope requires a valid --project");
  if (options.scope === "global" && options.project) throw new Error("global scope cannot use --project");
  if (options.change && !CHANGE_NAME.test(options.change)) throw new Error("--change has an invalid name");
  return options;
}

function isFile(path) { return existsSync(path) && statSync(path).isFile(); }
function isDirectory(path) { return existsSync(path) && statSync(path).isDirectory(); }
function validDateTime(value) { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}
function canonicalDigest(value) { return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex"); }
function fileDigest(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function duplicates(values) { const seen = new Set(); return values.filter((value) => seen.has(value) || !seen.add(value)); }
function sameMembers(left, right) { return left.size === right.size && [...left].every((item) => right.has(item)); }
function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function nonEmptyString(value) { return typeof value === "string" && Boolean(value.trim()); }
function validStringList(value, { minimum = 0 } = {}) { return Array.isArray(value) && value.length >= minimum && value.every(nonEmptyString) && duplicates(value).length === 0; }
function sameOrderedValues(left, right) { return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]); }
function normalizedDigest(value) { return typeof value === "string" ? value.replace(/^sha256:/, "") : value; }
function pathInsideOrEqual(root, candidate) { if (!isAbsolute(root ?? "") || !isAbsolute(candidate ?? "")) return false; const rel = relative(resolve(root), resolve(candidate)); return rel === "" || !(rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)); }
function pathsOverlap(left, right) { return pathInsideOrEqual(left, right) || pathInsideOrEqual(right, left); }
function unsafeAbsolutePath(value) { return !nonEmptyString(value) || !isAbsolute(value) || ["/", "/root", "/home", "/Users"].includes(resolve(value)) || value.includes("$") || value.split(/[\\/]/).includes(".."); }
function containsSecretMaterial(text) {
  if (typeof text !== "string") return false;
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(text) || /\b[a-z][a-z0-9+.-]*:\/\/[^/\s@]+@/i.test(text)) return true;
  const credentialAssignment = /(?:^|[\s"'`])(?:[A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*|AUTHORIZATION)\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([^\s,;]+))/gim;
  for (const match of text.matchAll(credentialAssignment)) {
    const assigned = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (assigned && !/^(?:<|\[)?(?:redacted|secret[-_ ]?ref|credential[-_ ]?ref|managed[-_ ]?externally)(?:>|\])?$/i.test(assigned) && !/^\$\{[A-Z0-9_]+\}$/i.test(assigned)) return true;
  }
  return false;
}

function readJson(path, label, errors) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { errors.push(`${label}: invalid JSON (${error.message})`); return null; }
}

function exactKeys(value, keys, label, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push(`${label}: must be an object`); return false; }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join("\n") !== expected.join("\n")) { errors.push(`${label}: expected fields ${expected.join(", ")}; found ${actual.join(", ")}`); return false; }
  return true;
}

function walkIncludingDirectories(root) {
  const paths = [];
  if (!isDirectory(root)) return paths;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    paths.push(path);
    if (entry.isDirectory() && !lstatSync(path).isSymbolicLink()) paths.push(...walkIncludingDirectories(path));
  }
  return paths;
}

function validateNoSymlinks(root, errors) {
  for (const path of walkIncludingDirectories(root)) if (lstatSync(path).isSymbolicLink()) errors.push(`${relative(root, path)}: Ops state must not contain symlinks`);
}

function entryKey(entry) { return `${entry.scope}:${entry.project_id ?? "-"}:${entry.change}`; }
function projectRoot(stateRoot, project) { return join(stateRoot, "projects", project); }
function activeRoot(stateRoot, entry) { return entry.scope === "global" ? join(stateRoot, "changes", entry.change) : join(projectRoot(stateRoot, entry.project_id), "changes", entry.change); }
function archivedRoot(stateRoot, entry) { return entry.scope === "global" ? join(stateRoot, "archive", entry.change.slice(0, 7), entry.change) : join(projectRoot(stateRoot, entry.project_id), "archive", entry.change.slice(0, 7), entry.change); }
function stateRelativeActive(entry) { return entry.scope === "global" ? `changes/${entry.change}` : `projects/${entry.project_id}/changes/${entry.change}`; }
function stateRelativeArchive(entry) { return entry.scope === "global" ? `archive/${entry.change.slice(0, 7)}/${entry.change}` : `projects/${entry.project_id}/archive/${entry.change.slice(0, 7)}/${entry.change}`; }
function archivePathTag(entry) { return `<Path>{roots.state}/ops/${stateRelativeArchive(entry)}</Path>`; }

function validateEntry(value, label, errors) {
  if (!exactKeys(value, ["scope", "project_id", "change"], label, errors)) return null;
  if (!["global", "project"].includes(value.scope) || !CHANGE_NAME.test(value.change ?? "")) { errors.push(`${label}: invalid scope or change`); return null; }
  if ((value.scope === "global" && value.project_id !== null) || (value.scope === "project" && !PROJECT_ID.test(value.project_id ?? ""))) { errors.push(`${label}: project_id disagrees with scope`); return null; }
  return { scope: value.scope, project_id: value.project_id, change: value.change };
}

function validateWorkflowRoot(root, errors) {
  const required = [
    "INDEX.md", "README.md", "runtime-contract.json", "_state/status.json",
    "common/rules/artifact-contract.md", "common/rules/project-and-change-scope.md", "common/rules/path-and-scope-contract.md",
    "common/rules/evidence-and-redaction.md", "common/rules/plan-and-approval.md", "common/rules/execution-loop.md", "common/rules/closure-and-learning.md",
    "common/rules/target-profile-and-release-gates.md",
    "common/schemas/status.schema.json", "common/schemas/change-status.schema.json", "common/schemas/project.schema.json",
    "common/schemas/inventory-snapshot.schema.json", "common/schemas/deployment-model.schema.json", "common/schemas/implementation-plan.schema.json",
    "common/schemas/approval.schema.json", "common/schemas/attempt.schema.json", "common/schemas/target-profile.schema.json",
    "common/schemas/journal-event.schema.json", "common/schemas/verification-state.schema.json", "common/schemas/promotion-manifest.schema.json",
    "common/schemas/promotion-approval.schema.json", "common/tools/close-change.mjs",
    "I-intake-and-assess/target-profile-template.json", "E-execute-and-stabilize/verification-state-template.json",
    "E-execute-and-stabilize/handoff-template.md",
  ];
  for (const item of required) if (!isFile(join(root, item))) errors.push(`${item}: required Ops workflow file is missing`);
  if (errors.length) return;
  const index = readFileSync(join(root, "INDEX.md"), "utf8");
  const readme = readFileSync(join(root, "README.md"), "utf8");
  if (!/^id: ops$/m.test(index) || !/^type: workflow$/m.test(index) || !/^workflow: ops$/m.test(index)) errors.push("INDEX.md: identity must be ops/type workflow");
  if (!index.includes("## 永久知识") || !index.includes("## Work 激活") || !index.includes("<Path>{roots.workflows}/ops/README.md</Path>")) errors.push("INDEX.md: passive discovery contract is incomplete");
  if (index.includes("AUTO-INDEX-START") || index.includes("## 状态字段")) errors.push("INDEX.md: passive index contains activation contracts");
  if ((readme.match(/AUTO-INDEX-START/g) ?? []).length !== 1 || (readme.match(/AUTO-INDEX-END/g) ?? []).length !== 1) errors.push("README.md: requires one AUTO-INDEX marker pair");
  for (const heading of ["## Work 条目", "## 运行时根", "## 路径分配", "## 持久化约定", "## 启动协议", "## 状态字段", "## 副作用边界"]) if (!readme.includes(heading)) errors.push(`README.md: missing ${heading}`);
  const workDirs = new Set(readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^[A-Z]-/.test(entry.name)).map((entry) => entry.name));
  if (!sameMembers(workDirs, EXPECTED_WORKS)) errors.push(`workflow works mismatch: expected ${[...EXPECTED_WORKS].sort().join(", ")}; found ${[...workDirs].sort().join(", ")}`);
  for (const work of workDirs) {
    const entryPath = join(root, work, `${work}.md`);
    if (!isFile(entryPath)) { errors.push(`${work}: missing same-named entry`); continue; }
    const text = readFileSync(entryPath, "utf8");
    if (!/^type: workflow-entry$/m.test(text) || !/^workflow: ops$/m.test(text) || !text.includes("<Path>{roots.workflows}/ops/README.md</Path>")) errors.push(`${work}: invalid identity or activation pointer`);
  }
  const seed = readJson(join(root, "_state/status.json"), "_state/status.json", errors);
  if (seed && (seed.schema_version !== 2 || seed.workflow !== "ops" || JSON.stringify(seed.active) !== "[]" || JSON.stringify(seed.archived) !== "[]")) errors.push("_state/status.json: expected empty Ops schema v2 status");
  const runtime = readJson(join(root, "runtime-contract.json"), "runtime-contract.json", errors);
  const structured = [".speculo/ops/status.json", ".speculo/ops/changes/*/.status.json", ".speculo/ops/archive/*/*/.status.json", ".speculo/ops/projects/*/project.json", ".speculo/ops/projects/*/changes/*/.status.json", ".speculo/ops/projects/*/archive/*/*/.status.json"];
  if (runtime && (runtime.schema_version !== 1 || runtime.workflow !== "ops" || runtime.config !== null || runtime.opaque_default !== "preserve-byte-for-byte" || JSON.stringify(runtime.structured_state) !== JSON.stringify(structured))) errors.push("runtime-contract.json: invalid Ops v2 contract");
  for (const schema of required.filter((item) => item.endsWith(".json"))) readJson(join(root, schema), schema, errors);
}

function validateGlobalStatus(status, errors) {
  if (!exactKeys(status, ["schema_version", "workflow", "active", "archived"], "status.json", errors)) return null;
  if (status.schema_version !== 2 || status.workflow !== "ops" || !Array.isArray(status.active) || !Array.isArray(status.archived)) { errors.push("status.json: expected Ops schema v2"); return null; }
  const active = status.active.map((entry, index) => validateEntry(entry, `status.json active[${index}]`, errors)).filter(Boolean);
  const archived = status.archived.map((entry, index) => validateEntry(entry, `status.json archived[${index}]`, errors)).filter(Boolean);
  const activeKeys = active.map(entryKey); const archivedKeys = archived.map(entryKey);
  if (duplicates(activeKeys).length || duplicates(archivedKeys).length || archivedKeys.some((key) => activeKeys.includes(key))) errors.push("status.json: duplicate or overlapping scope/project/change tuple");
  return { active, archived };
}

function validateProject(value, project, errors) {
  const label = `projects/${project}/project.json`;
  if (!exactKeys(value, ["schema_version", "artifact", "project_id", "display_name", "aliases", "identities", "source_hints", "created_at", "updated_at"], label, errors)) return;
  if (value.schema_version !== 1 || value.artifact !== "ops-project" || value.project_id !== project || !PROJECT_ID.test(project)) errors.push(`${label}: invalid identity`);
  if (typeof value.display_name !== "string" || !value.display_name.trim() || !Array.isArray(value.aliases) || duplicates(value.aliases ?? []).length || !Array.isArray(value.identities) || !value.identities.length || !Array.isArray(value.source_hints)) errors.push(`${label}: project metadata is incomplete`);
  if (!validDateTime(value.created_at) || !validDateTime(value.updated_at)) errors.push(`${label}: invalid timestamps`);
  for (const identity of value.identities ?? []) {
    if (!exactKeys(identity, ["kind", "value", "source"], `${label} identity`, errors)) continue;
    if (!identity.value || /:\/\/[^/]*@/.test(identity.value) || /(?:token|password|secret)=/i.test(identity.value)) errors.push(`${label}: identity is empty or may contain credentials`);
  }
}

function validateChangeStatus(value, entry, archived, errors) {
  const label = `${entryKey(entry)}/.status.json`;
  const keys = ["schema_version", "artifact", "scope", "project_id", "change", "change_status", "phase", "current_work", "works_run", "created_at", "updated_at", "completed_at", "archived_at", "archive_path", "source_revision", "target_fingerprint", "plan_path", "plan_digest", "approval_path", "approval_status", "approved_batches", "latest_attempt_id", "outcome", "blockers"];
  if (!exactKeys(value, keys, label, errors)) return;
  if (value.schema_version !== 2 || value.artifact !== "ops-change-status" || value.scope !== entry.scope || value.project_id !== entry.project_id || value.change !== entry.change) errors.push(`${label}: identity/location mismatch`);
  if (!CHANGE_STATUS.has(value.change_status) || !PHASE.has(value.phase)) errors.push(`${label}: invalid lifecycle`);
  if (!(value.current_work === null || EXPECTED_WORK_IDS.has(value.current_work))) errors.push(`${label}: invalid current_work`);
  if (!Array.isArray(value.works_run) || value.works_run.some((id) => !EXPECTED_WORK_IDS.has(id)) || duplicates(value.works_run ?? []).length) errors.push(`${label}: invalid works_run`);
  if (!validDateTime(value.created_at) || !validDateTime(value.updated_at) || !(value.completed_at === null || validDateTime(value.completed_at)) || !(value.archived_at === null || validDateTime(value.archived_at))) errors.push(`${label}: invalid timestamps`);
  if (!(value.source_revision === null || (typeof value.source_revision === "string" && value.source_revision)) || !(value.target_fingerprint === null || DIGEST.test(value.target_fingerprint))) errors.push(`${label}: invalid source/target projection`);
  if (!(value.plan_path === null || PLAN_LOCATOR.test(value.plan_path)) || !(value.plan_digest === null || DIGEST.test(value.plan_digest)) || ((value.plan_path === null) !== (value.plan_digest === null))) errors.push(`${label}: invalid plan projection`);
  if (!(value.approval_path === null || APPROVAL_LOCATOR.test(value.approval_path)) || !APPROVAL_STATUS.has(value.approval_status)) errors.push(`${label}: invalid approval projection`);
  if (!Array.isArray(value.approved_batches) || value.approved_batches.some((id) => !/^B[0-9]{2}$/.test(id)) || duplicates(value.approved_batches ?? []).length) errors.push(`${label}: invalid approved_batches`);
  if (!(value.latest_attempt_id === null || ATTEMPT_ID.test(value.latest_attempt_id)) || !OUTCOME.has(value.outcome) || !Array.isArray(value.blockers) || value.blockers.some((item) => typeof item !== "string" || !item.trim()) || duplicates(value.blockers ?? []).length) errors.push(`${label}: invalid attempt/outcome/blockers`);
  if (["not_requested", "pending"].includes(value.approval_status) && (value.approval_path !== null || value.approved_batches.length)) errors.push(`${label}: unapproved state cannot point to approval evidence`);
  if (value.approval_status === "pending" && value.plan_path === null) errors.push(`${label}: pending approval requires a plan`);
  if (value.approval_status === "approved" && (value.plan_path === null || value.approval_path === null || !value.approved_batches.length)) errors.push(`${label}: approved state requires plan, approval and batches`);
  if (["completed", "archived"].includes(value.change_status)) {
    const allowedTerminalWork = archived ? value.current_work === null : value.current_work === null || value.current_work === "ops/archive-and-learn";
    if (!validDateTime(value.completed_at) || value.outcome === "pending" || value.blockers.length || !allowedTerminalWork) errors.push(`${label}: terminal change lacks completion evidence`);
  } else if (value.completed_at !== null) errors.push(`${label}: incomplete change must keep completed_at null`);
  if (archived) {
    if (value.change_status !== "archived" || value.phase !== "archived" || value.archive_path !== archivePathTag(entry) || !validDateTime(value.archived_at)) errors.push(`${label}: archive fields do not match indexed location`);
  } else if (value.change_status === "archived" || value.archive_path !== null || value.archived_at !== null || (value.change_status === "completed" && value.phase !== "ready_to_archive")) errors.push(`${label}: active location has invalid terminal fields`);
}

function resolveChangeRelative(changeRoot, locator, label, errors) {
  if (typeof locator !== "string" || !locator || locator.startsWith("/") || locator.includes("\\") || locator.split("/").includes("..")) { errors.push(`${label}: invalid change-relative locator`); return null; }
  const target = resolve(changeRoot, ...locator.split("/"));
  const rel = relative(resolve(changeRoot), target);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) { errors.push(`${label}: locator escapes change root`); return null; }
  return target;
}

function resolveStateRelative(stateRoot, locator, label, errors) {
  if (typeof locator !== "string" || !locator || locator.startsWith("/") || locator.includes("\\") || locator.split("/").includes("..")) { errors.push(`${label}: invalid state-relative locator`); return null; }
  const target = resolve(stateRoot, ...locator.split("/"));
  const rel = relative(resolve(stateRoot), target);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) { errors.push(`${label}: locator escapes state root`); return null; }
  return target;
}

function validateTargetProfile(changeRoot, entry, errors) {
  const locator = "deployment/target-profile.json";
  const path = join(changeRoot, "deployment", "target-profile.json");
  if (!isFile(path)) return null;
  const value = readJson(path, locator, errors);
  if (!value) return null;
  const keys = ["schema_version", "artifact", "scope", "project_id", "change", "created_at", "operation_mode", "environment_class", "deployment_root", "existing_state", "identity_confirmed", "identity_confirmation_evidence", "identity_assertions", "ownership", "differences", "secret_requirements", "readiness", "blockers"];
  if (!exactKeys(value, keys, locator, errors)) return null;
  if (value.schema_version !== 1 || value.artifact !== "ops-target-profile" || value.scope !== entry.scope || value.project_id !== entry.project_id || value.change !== entry.change || !validDateTime(value.created_at)) errors.push(`${locator}: invalid identity or timestamp`);
  if (!["audit", "takeover", "fresh", "release", "upgrade", "rollback"].includes(value.operation_mode) || !["local", "shared-nonprod", "production"].includes(value.environment_class) || !["absent", "present", "unknown"].includes(value.existing_state) || !["blocked", "ready"].includes(value.readiness)) errors.push(`${locator}: invalid mode, environment, existing state or readiness`);
  if (unsafeAbsolutePath(value.deployment_root)) errors.push(`${locator}: deployment_root must be a safe absolute path`);
  if (typeof value.identity_confirmed !== "boolean" || !(value.identity_confirmation_evidence === null || nonEmptyString(value.identity_confirmation_evidence))) errors.push(`${locator}: invalid identity confirmation`);
  if (value.identity_confirmed && !nonEmptyString(value.identity_confirmation_evidence)) errors.push(`${locator}: confirmed identity requires evidence`);
  if (!value.identity_confirmed && value.identity_confirmation_evidence !== null) errors.push(`${locator}: unconfirmed identity cannot claim confirmation evidence`);

  const assertionMap = new Map();
  if (!Array.isArray(value.identity_assertions) || value.identity_assertions.length === 0) errors.push(`${locator}: identity_assertions must not be empty`);
  for (const assertion of value.identity_assertions ?? []) {
    const label = `${locator} identity ${assertion?.id ?? "unknown"}`;
    if (!exactKeys(assertion, ["id", "provider", "key", "comparison", "expected", "evidence"], label, errors)) continue;
    if (!/^ID[0-9]{3}$/.test(assertion.id ?? "") || assertionMap.has(assertion.id) || !nonEmptyString(assertion.provider) || !nonEmptyString(assertion.key) || !["exact", "ordered-list", "set", "digest"].includes(assertion.comparison) || !validStringList(assertion.evidence, { minimum: 1 })) errors.push(`${label}: invalid or duplicate assertion`);
    const expectedIsString = nonEmptyString(assertion.expected);
    const expectedIsList = validStringList(assertion.expected, { minimum: 1 });
    if (!expectedIsString && !expectedIsList) errors.push(`${label}: expected must be a non-empty string or unique string list`);
    if (assertion.comparison === "exact" && !expectedIsString) errors.push(`${label}: exact comparison requires a string`);
    if (["ordered-list", "set"].includes(assertion.comparison) && !expectedIsList) errors.push(`${label}: ${assertion.comparison} comparison requires a list`);
    if (assertion.comparison === "digest" && (!expectedIsString || !IMMUTABLE_DIGEST.test(assertion.expected))) errors.push(`${label}: digest comparison requires an immutable digest`);
    assertionMap.set(assertion.id, assertion);
  }

  const ownership = value.ownership;
  if (!exactKeys(ownership, ["owned_targets", "protected_targets", "unknown_targets"], `${locator} ownership`, errors)) return null;
  for (const field of ["owned_targets", "protected_targets", "unknown_targets"]) if (!validStringList(ownership[field])) errors.push(`${locator}: ownership.${field} must contain unique non-empty strings`);
  const differenceIds = [];
  if (!Array.isArray(value.differences)) errors.push(`${locator}: differences must be an array`);
  for (const difference of value.differences ?? []) {
    const label = `${locator} difference ${difference?.id ?? "unknown"}`;
    if (!exactKeys(difference, ["id", "target", "classification", "evidence"], label, errors)) continue;
    differenceIds.push(difference.id);
    if (!/^DF[0-9]{3}$/.test(difference.id ?? "") || !nonEmptyString(difference.target) || !["expected", "safe-reconcile", "requires-backup", "ownership-conflict", "unknown"].includes(difference.classification) || !validStringList(difference.evidence, { minimum: 1 })) errors.push(`${label}: invalid difference`);
  }
  if (duplicates(differenceIds).length) errors.push(`${locator}: duplicate difference ids`);
  const secretKeys = [];
  if (!Array.isArray(value.secret_requirements)) errors.push(`${locator}: secret_requirements must be an array`);
  for (const requirement of value.secret_requirements ?? []) {
    const label = `${locator} secret requirement ${requirement?.key ?? "unknown"}`;
    if (!exactKeys(requirement, ["key", "source_ref", "presence_required", "version_ref"], label, errors)) continue;
    secretKeys.push(requirement.key);
    if (!nonEmptyString(requirement.key) || !nonEmptyString(requirement.source_ref) || typeof requirement.presence_required !== "boolean" || !(requirement.version_ref === null || nonEmptyString(requirement.version_ref))) errors.push(`${label}: invalid secret metadata`);
  }
  if (duplicates(secretKeys).length) errors.push(`${locator}: duplicate secret requirement keys`);
  if (!validStringList(value.blockers)) errors.push(`${locator}: blockers must contain unique non-empty strings`);

  const conflict = (value.differences ?? []).some((item) => ["ownership-conflict", "unknown"].includes(item.classification));
  const hasUnknownTargets = (ownership.unknown_targets ?? []).length > 0;
  if (value.operation_mode === "fresh" && (value.existing_state !== "absent" || (ownership.protected_targets ?? []).length || hasUnknownTargets)) errors.push(`${locator}: fresh mode requires absent state and no protected or unknown targets`);
  if (["takeover", "upgrade", "rollback"].includes(value.operation_mode) && value.existing_state !== "present") errors.push(`${locator}: takeover, upgrade and rollback require present existing state`);
  if ((conflict || hasUnknownTargets) && value.readiness !== "blocked") errors.push(`${locator}: ownership conflict or unknown target must block readiness`);
  if (value.existing_state === "unknown" && value.readiness !== "blocked") errors.push(`${locator}: unknown existing state must block readiness`);
  if (value.readiness === "blocked" && !value.blockers.length) errors.push(`${locator}: blocked profile requires blockers`);
  if (value.readiness === "ready" && value.blockers.length) errors.push(`${locator}: Ready profile cannot contain blockers`);
  if (value.readiness === "ready" && value.operation_mode !== "audit" && (!value.identity_confirmed || !value.identity_confirmation_evidence)) errors.push(`${locator}: Ready mutation mode requires confirmed identity`);
  return { value, path, locator, digest: canonicalDigest(value), assertionMap };
}

function validatePlan(plan, file, entry, profileMeta, errors) {
  const label = `plan/${basename(file)}`;
  const version = plan?.schema_version;
  const baseKeys = ["schema_version", "artifact", "scope", "project_id", "plan_id", "change", "created_at", "supersedes_plan_path", "triggered_by_attempt", "depth", "status", "input_bindings", "scope_definition", "batches", "external_mutations", "global_environment_changes", "operations", "verification", "rollback_strategy", "blockers"];
  const keys = version === 3 ? [...baseKeys, "artifact_requirements", "gates", "data_protection", "retention_policy"] : baseKeys;
  if (![2, 3].includes(version) || !exactKeys(plan, keys, label, errors)) return null;
  const number = /plan-([0-9]{3})\.json$/.exec(file)?.[1];
  if (plan.artifact !== "ops-implementation-plan" || plan.scope !== entry.scope || plan.project_id !== entry.project_id || plan.change !== entry.change || plan.plan_id !== `PLAN-${number}`) errors.push(`${label}: invalid identity`);
  if (!validDateTime(plan.created_at) || !["lite", "standard", "deep"].includes(plan.depth) || !["blocked", "ready"].includes(plan.status)) errors.push(`${label}: invalid metadata`);
  if (!(plan.supersedes_plan_path === null || PLAN_LOCATOR.test(plan.supersedes_plan_path)) || !(plan.triggered_by_attempt === null || ATTEMPT_ID.test(plan.triggered_by_attempt))) errors.push(`${label}: invalid revision lineage`);
  if (plan.triggered_by_attempt !== null && plan.supersedes_plan_path === null) errors.push(`${label}: an attempt-triggered revision must bind the superseded plan`);

  const bindings = plan.input_bindings;
  const bindingKeys = version === 3
    ? ["request_path", "snapshot_path", "snapshot_digest", "deployment_model_path", "deployment_model_digest", "target_profile_path", "target_profile_digest", "source_revision", "target_fingerprint"]
    : ["request_path", "snapshot_path", "snapshot_digest", "deployment_model_path", "deployment_model_digest", "source_revision", "target_fingerprint"];
  if (!exactKeys(bindings, bindingKeys, `${label} input_bindings`, errors)) return null;
  if (!nonEmptyString(bindings.request_path) || !nonEmptyString(bindings.snapshot_path) || !DIGEST.test(bindings.snapshot_digest ?? "") || !nonEmptyString(bindings.deployment_model_path) || !DIGEST.test(bindings.deployment_model_digest ?? "") || !DIGEST.test(bindings.target_fingerprint ?? "") || !nonEmptyString(bindings.source_revision)) errors.push(`${label}: invalid bindings`);
  if (version === 3 && (!TARGET_PROFILE_LOCATOR.test(bindings.target_profile_path ?? "") || !DIGEST.test(bindings.target_profile_digest ?? ""))) errors.push(`${label}: invalid target profile binding`);

  const scope = plan.scope_definition;
  if (!exactKeys(scope, ["source_root", "deployment_root", "read_roots", "write_roots", "forbidden_roots"], `${label} scope_definition`, errors)) return null;
  if (!nonEmptyString(scope.source_root) || !isAbsolute(scope.source_root) || scope.source_root.includes("$") || scope.source_root.split(/[\\/]/).includes("..")) errors.push(`${label}: source_root must be a resolved absolute path`);
  if (unsafeAbsolutePath(scope.deployment_root)) errors.push(`${label}: deployment_root must be a safe absolute path`);
  for (const field of ["read_roots", "write_roots", "forbidden_roots"]) if (!Array.isArray(scope[field]) || scope[field].some((path) => !nonEmptyString(path) || !isAbsolute(path) || path.includes("$") || path.split(/[\\/]/).includes("..")) || duplicates(scope[field] ?? []).length) errors.push(`${label}: ${field} must contain unique resolved absolute paths`);
  if (!Array.isArray(scope.write_roots) || !scope.write_roots.length) errors.push(`${label}: write_roots must not be empty`);
  for (const path of scope.write_roots ?? []) {
    if (!pathInsideOrEqual(scope.deployment_root, path)) errors.push(`${label}: write root escapes deployment root`);
    if ((scope.forbidden_roots ?? []).some((forbidden) => pathsOverlap(path, forbidden))) errors.push(`${label}: write root overlaps forbidden root ${forbidden}`);
  }

  const collectionNames = ["batches", "operations", "external_mutations", "global_environment_changes", "verification", "blockers"];
  if (version === 3) collectionNames.push("artifact_requirements", "gates", "data_protection");
  if (collectionNames.some((name) => !Array.isArray(plan[name]))) { errors.push(`${label}: plan collections are incomplete`); return null; }
  if (!validStringList(plan.blockers)) errors.push(`${label}: blockers must contain unique non-empty strings`);
  const batchIds = plan.batches.map((item) => item?.id); const operationIds = plan.operations.map((item) => item?.id); const externalIds = plan.external_mutations.map((item) => item?.id);
  if (duplicates(batchIds).length || batchIds.some((id) => !BATCH_ID.test(id ?? "")) || duplicates(operationIds).length || operationIds.some((id) => !OPERATION_ID.test(id ?? "")) || duplicates(externalIds).length || externalIds.some((id) => !/^EM[0-9]{3}$/.test(id ?? ""))) errors.push(`${label}: invalid or duplicate ids`);
  const batchSet = new Set(batchIds); const operationSet = new Set(operationIds); const externalSet = new Set(externalIds); const dependencies = new Map(); const batchMap = new Map(); const projected = [];
  for (const batch of plan.batches) {
    const batchKeys = version === 3 ? ["id", "title", "risk", "requires_confirmation", "depends_on", "operation_ids", "gate_ids"] : ["id", "title", "risk", "requires_confirmation", "depends_on", "operation_ids"];
    if (!exactKeys(batch, batchKeys, `${label} batch ${batch?.id ?? "unknown"}`, errors)) continue;
    if (batch.requires_confirmation !== true || !nonEmptyString(batch.title) || !["low", "medium", "high", "critical"].includes(batch.risk) || !Array.isArray(batch.depends_on) || duplicates(batch.depends_on).length || !Array.isArray(batch.operation_ids) || !batch.operation_ids.length || duplicates(batch.operation_ids).length || (version === 3 && (!Array.isArray(batch.gate_ids) || duplicates(batch.gate_ids).length))) errors.push(`${label}: incomplete batch ${batch.id}`);
    dependencies.set(batch.id, batch.depends_on ?? []); batchMap.set(batch.id, batch);
    for (const dep of batch.depends_on ?? []) if (!batchSet.has(dep) || dep === batch.id) errors.push(`${label}: invalid batch dependency ${dep}`);
    for (const id of batch.operation_ids ?? []) { projected.push(id); if (!operationSet.has(id)) errors.push(`${label}: missing operation ${id}`); }
  }
  if (duplicates(projected).length || !sameMembers(new Set(projected), operationSet)) errors.push(`${label}: batches must project each operation once`);

  const operationMap = new Map();
  for (const operation of plan.operations) {
    const operationLabel = `${label} operation ${operation?.id ?? "unknown"}`;
    const operationKeys = ["id", "batch_id", "kind", "target", "working_directory", "preconditions", "write_set", "external_mutation_id", "preview", "apply", "postconditions", "rollback", "risk", "required_privilege", "evidence_path"];
    if (!exactKeys(operation, operationKeys, operationLabel, errors)) continue;
    operationMap.set(operation.id, operation);
    if (!batchSet.has(operation.batch_id) || !batchMap.get(operation.batch_id)?.operation_ids?.includes(operation.id)) errors.push(`${label}: operation ${operation.id} batch mismatch`);
    if (!(operation.external_mutation_id === null || externalSet.has(operation.external_mutation_id))) errors.push(`${label}: operation ${operation.id} missing external mutation`);
    if (!validStringList(operation.preconditions, { minimum: 1 }) || !validStringList(operation.postconditions, { minimum: 1 }) || !validStringList(operation.write_set) || !isObject(operation.apply) || !nonEmptyString(operation.apply.command) || !nonEmptyString(operation.apply.shell)) errors.push(`${label}: operation ${operation.id} is incomplete`);
    const cwd = operation.working_directory;
    if (!nonEmptyString(cwd) || !isAbsolute(cwd) || cwd.includes("$") || cwd.split(/[\\/]/).includes("..") || ![...(scope.read_roots ?? []), ...(scope.write_roots ?? [])].some((root) => pathInsideOrEqual(root, cwd)) || (scope.forbidden_roots ?? []).some((root) => pathInsideOrEqual(root, cwd))) errors.push(`${label}: operation ${operation.id} cwd must be a resolved path inside read/write roots and outside forbidden roots`);
    for (const path of operation.write_set ?? []) if (!nonEmptyString(path) || !isAbsolute(path) || path.includes("$") || path.split(/[\\/]/).includes("..") || !(scope.write_roots ?? []).some((root) => pathInsideOrEqual(root, path)) || (scope.forbidden_roots ?? []).some((root) => pathsOverlap(root, path))) errors.push(`${label}: operation ${operation.id} write escapes roots or overlaps a forbidden root`);
  }

  for (const mutation of plan.external_mutations) {
    const mutationLabel = `${label} external mutation ${mutation?.id ?? "unknown"}`;
    if (!exactKeys(mutation, ["id", "provider", "target", "current_state", "desired_state", "privilege", "blast_radius", "preview", "rollback", "batch_id"], mutationLabel, errors)) continue;
    if (!batchSet.has(mutation.batch_id) || !nonEmptyString(mutation.provider) || !nonEmptyString(mutation.target)) errors.push(`${mutationLabel}: invalid mutation`);
  }
  const environmentKeys = [];
  for (const environment of plan.global_environment_changes) {
    const environmentLabel = `${label} global environment ${environment?.key ?? "unknown"}`;
    if (!exactKeys(environment, ["key", "target_scope", "value_source_ref", "impact", "rollback", "batch_id"], environmentLabel, errors)) continue;
    environmentKeys.push(`${environment.key}\0${environment.target_scope}`);
    if (!batchSet.has(environment.batch_id) || !nonEmptyString(environment.key) || !nonEmptyString(environment.target_scope) || !nonEmptyString(environment.value_source_ref) || !nonEmptyString(environment.impact) || !nonEmptyString(environment.rollback)) errors.push(`${environmentLabel}: invalid global environment change`);
  }
  if (duplicates(environmentKeys).length) errors.push(`${label}: duplicate global environment target/key`);

  const verificationMap = new Map();
  for (const verification of plan.verification) {
    const verificationLabel = `${label} verification ${verification?.id ?? "unknown"}`;
    if (version === 2) {
      if (!exactKeys(verification, ["id", "kind", "target", "success", "required"], verificationLabel, errors)) continue;
      if (!nonEmptyString(verification.id) || verificationMap.has(verification.id) || !nonEmptyString(verification.kind) || !nonEmptyString(verification.target) || !nonEmptyString(verification.success) || typeof verification.required !== "boolean") errors.push(`${verificationLabel}: invalid verification`);
    } else {
      if (!exactKeys(verification, ["id", "kind", "target", "required", "expected", "stability", "convergence_group"], verificationLabel, errors)) continue;
      if (!VERIFICATION_ID.test(verification.id ?? "") || verificationMap.has(verification.id) || !["http", "tcp", "command", "service", "artifact", "data", "custom"].includes(verification.kind) || !nonEmptyString(verification.target) || typeof verification.required !== "boolean") errors.push(`${verificationLabel}: invalid verification`);
      const expected = verification.expected;
      if (!exactKeys(expected, ["description", "http_statuses", "business_codes", "authenticated"], `${verificationLabel} expected`, errors)) continue;
      if (!nonEmptyString(expected.description) || !Array.isArray(expected.http_statuses) || duplicates(expected.http_statuses).length || expected.http_statuses.some((status) => !Number.isInteger(status) || status < 100 || status > 599) || !Array.isArray(expected.business_codes) || duplicates(expected.business_codes).length || !(expected.authenticated === null || typeof expected.authenticated === "boolean")) errors.push(`${verificationLabel}: invalid expected result`);
      if (verification.kind === "http" && (!expected.http_statuses.length || typeof expected.authenticated !== "boolean")) errors.push(`${verificationLabel}: HTTP verification requires statuses and explicit authentication expectation`);
      if (verification.stability !== null) {
        if (!exactKeys(verification.stability, ["interval_seconds", "timeout_seconds", "required_consecutive_successes"], `${verificationLabel} stability`, errors) || !(verification.stability.interval_seconds > 0) || !(verification.stability.timeout_seconds > 0) || !Number.isInteger(verification.stability.required_consecutive_successes) || verification.stability.required_consecutive_successes < 1 || verification.stability.timeout_seconds < verification.stability.interval_seconds * verification.stability.required_consecutive_successes) errors.push(`${verificationLabel}: invalid stability window`);
      }
      if (!(verification.convergence_group === null || nonEmptyString(verification.convergence_group))) errors.push(`${verificationLabel}: invalid convergence group`);
    }
    verificationMap.set(verification.id, verification);
  }

  const gateMap = new Map(); const artifactMap = new Map(); const protectionMap = new Map();
  if (version === 3) {
    for (const artifact of plan.artifact_requirements) {
      const artifactLabel = `${label} artifact ${artifact?.id ?? "unknown"}`;
      if (!exactKeys(artifact, ["id", "kind", "source_ref", "immutable_digest", "staging_ref", "activation_target", "previous_ref", "required"], artifactLabel, errors)) continue;
      if (!/^AR[0-9]{3}$/.test(artifact.id ?? "") || artifactMap.has(artifact.id) || !["file", "archive", "container-image", "static-bundle", "other"].includes(artifact.kind) || !nonEmptyString(artifact.source_ref) || !IMMUTABLE_DIGEST.test(artifact.immutable_digest ?? "") || !(artifact.staging_ref === null || nonEmptyString(artifact.staging_ref)) || !nonEmptyString(artifact.activation_target) || !(artifact.previous_ref === null || nonEmptyString(artifact.previous_ref)) || typeof artifact.required !== "boolean") errors.push(`${artifactLabel}: invalid artifact requirement`);
      if (["file", "archive", "static-bundle"].includes(artifact.kind)) for (const [field, locator] of [["staging_ref", artifact.staging_ref], ["activation_target", artifact.activation_target], ["previous_ref", artifact.previous_ref]]) if (locator !== null && (!isAbsolute(locator) || locator.includes("$") || locator.split(/[\\/]/).includes("..") || !pathInsideOrEqual(scope.deployment_root, locator))) errors.push(`${artifactLabel}: ${field} must be a resolved absolute path under deployment_root`);
      artifactMap.set(artifact.id, artifact);
    }
    for (const gate of plan.gates) {
      const gateLabel = `${label} gate ${gate?.id ?? "unknown"}`;
      if (!exactKeys(gate, ["id", "title", "depends_on", "after_batches", "verification_ids", "required"], gateLabel, errors)) continue;
      if (!GATE_ID.test(gate.id ?? "") || gateMap.has(gate.id) || !nonEmptyString(gate.title) || !Array.isArray(gate.depends_on) || duplicates(gate.depends_on).length || !Array.isArray(gate.after_batches) || !gate.after_batches.length || duplicates(gate.after_batches).length || !Array.isArray(gate.verification_ids) || !gate.verification_ids.length || duplicates(gate.verification_ids).length || typeof gate.required !== "boolean") errors.push(`${gateLabel}: invalid gate`);
      gateMap.set(gate.id, gate);
    }
    for (const batch of plan.batches) for (const gateId of batch.gate_ids ?? []) if (!gateMap.has(gateId)) errors.push(`${label}: batch ${batch.id} references missing gate ${gateId}`);
    const verificationReferences = [];
    for (const gate of plan.gates) {
      for (const dependency of gate.depends_on ?? []) if (!gateMap.has(dependency) || dependency === gate.id) errors.push(`${label}: gate ${gate.id} has invalid dependency ${dependency}`);
      for (const batchId of gate.after_batches ?? []) if (!batchSet.has(batchId)) errors.push(`${label}: gate ${gate.id} references missing prior batch ${batchId}`);
      for (const verificationId of gate.verification_ids ?? []) { verificationReferences.push(verificationId); if (!verificationMap.has(verificationId)) errors.push(`${label}: gate ${gate.id} references missing verification ${verificationId}`); }
    }
    for (const verification of plan.verification) if (verification.required && verificationReferences.filter((id) => id === verification.id).length !== 1) errors.push(`${label}: required verification ${verification.id} must be referenced by exactly one gate`);

    const graph = new Map();
    for (const id of batchSet) graph.set(`B:${id}`, []);
    for (const id of gateMap.keys()) graph.set(`G:${id}`, []);
    for (const batch of plan.batches) graph.get(`B:${batch.id}`)?.push(...(batch.depends_on ?? []).map((id) => `B:${id}`), ...(batch.gate_ids ?? []).map((id) => `G:${id}`));
    for (const gate of plan.gates) graph.get(`G:${gate.id}`)?.push(...(gate.depends_on ?? []).map((id) => `G:${id}`), ...(gate.after_batches ?? []).map((id) => `B:${id}`));
    const visiting = new Set(); const visited = new Set();
    function visit(node) { if (visited.has(node)) return; if (visiting.has(node)) { errors.push(`${label}: combined batch/gate dependency cycle includes ${node}`); return; } visiting.add(node); for (const dependency of graph.get(node) ?? []) visit(dependency); visiting.delete(node); visited.add(node); }
    for (const node of graph.keys()) visit(node);

    for (const protection of plan.data_protection) {
      const protectionLabel = `${label} data protection ${protection?.id ?? "unknown"}`;
      if (!exactKeys(protection, ["id", "resource", "operation_ids", "strategy", "backup", "waiver"], protectionLabel, errors)) continue;
      if (!/^DP[0-9]{3}$/.test(protection.id ?? "") || protectionMap.has(protection.id) || !nonEmptyString(protection.resource) || !Array.isArray(protection.operation_ids) || duplicates(protection.operation_ids).length || protection.operation_ids.some((id) => !operationSet.has(id)) || !["verified-backup", "waiver", "not-required"].includes(protection.strategy)) errors.push(`${protectionLabel}: invalid protection entry`);
      if (protection.strategy === "verified-backup") {
        if (!exactKeys(protection.backup, ["evidence_path", "digest", "readability_verified", "restore_ref", "restore_verified"], `${protectionLabel} backup`, errors) || !nonEmptyString(protection.backup?.evidence_path) || !DIGEST.test(protection.backup?.digest ?? "") || protection.backup?.readability_verified !== true || !nonEmptyString(protection.backup?.restore_ref) || typeof protection.backup?.restore_verified !== "boolean" || protection.waiver !== null) errors.push(`${protectionLabel}: verified backup evidence is incomplete`);
      } else if (protection.strategy === "waiver") {
        if (!exactKeys(protection.waiver, ["decision_ref", "exact_scope", "object_identity_verified", "conflicts_absent", "recovery_mode"], `${protectionLabel} waiver`, errors) || protection.backup !== null || !nonEmptyString(protection.waiver?.decision_ref) || !nonEmptyString(protection.waiver?.exact_scope) || protection.waiver?.object_identity_verified !== true || protection.waiver?.conflicts_absent !== true || protection.waiver?.recovery_mode !== "forward-only") errors.push(`${protectionLabel}: waiver preflight is incomplete`);
        if (profileMeta?.value.environment_class !== "local") errors.push(`${protectionLabel}: waiver is allowed only for local environments`);
      } else if (protection.backup !== null || protection.waiver !== null) errors.push(`${protectionLabel}: not-required cannot carry backup or waiver`);
      protectionMap.set(protection.id, protection);
    }
    for (const operation of plan.operations.filter((item) => item.kind === "database")) {
      const matches = plan.data_protection.filter((item) => item.operation_ids?.includes(operation.id));
      if (matches.length !== 1 || matches[0]?.strategy === "not-required") errors.push(`${label}: database operation ${operation.id} requires exactly one backup or waiver policy`);
    }
    if (!exactKeys(plan.retention_policy, ["retain_failed_candidates", "retain_previous_release", "cleanup_requires_separate_approval"], `${label} retention_policy`, errors) || plan.retention_policy?.retain_failed_candidates !== true || plan.retention_policy?.retain_previous_release !== true || plan.retention_policy?.cleanup_requires_separate_approval !== true) errors.push(`${label}: retention policy must preserve failure and rollback assets`);
    if (profileMeta?.value.environment_class === "production" && plan.data_protection.some((item) => item.strategy === "waiver")) errors.push(`${label}: production data protection cannot use waiver`);
    if (["release", "upgrade"].includes(profileMeta?.value.operation_mode) && ![...artifactMap.values()].some((item) => item.required)) errors.push(`${label}: release and upgrade require at least one immutable artifact`);
    if (profileMeta?.value.operation_mode === "audit" && plan.operations.length) errors.push(`${label}: audit mode cannot contain mutation operations`);
  }

  if (plan.status === "ready" && (plan.blockers.length || !plan.batches.length || !plan.operations.length || (version === 3 && !plan.gates.length))) errors.push(`${label}: ready plan requires operations, gates and no blockers`);
  if (plan.status === "blocked" && !plan.blockers.length) errors.push(`${label}: blocked plan requires blockers`);
  return { version, digest: canonicalDigest(plan), batchSet, batchMap, dependencies, operationMap, bindings, globalEnvironment: plan.global_environment_changes, verificationMap, gateMap, artifactMap, protectionMap };
}

function validateApproval(approval, file, entry, planMeta, status, preExecute, errors) {
  const label = `plan/${basename(file)}`;
  const keys = ["schema_version", "artifact", "scope", "project_id", "approval_id", "change", "plan_path", "plan_digest", "source_revision", "target_fingerprint", "approved_batches", "excluded_batches", "confirmed_global_environment_keys", "conditions", "decision", "decision_summary", "decided_at", "expires_at"];
  if (!exactKeys(approval, keys, label, errors)) return;
  const number = /approval-([0-9]{3})\.json$/.exec(file)?.[1];
  if (approval.schema_version !== 2 || approval.artifact !== "ops-plan-approval" || approval.scope !== entry.scope || approval.project_id !== entry.project_id || approval.change !== entry.change || approval.approval_id !== `APPROVAL-${number}` || approval.decision !== "approved") errors.push(`${label}: invalid identity`);
  if (approval.plan_path !== status.plan_path || approval.plan_digest !== planMeta.digest || approval.plan_digest !== status.plan_digest || approval.source_revision !== planMeta.bindings.source_revision || approval.source_revision !== status.source_revision || approval.target_fingerprint !== planMeta.bindings.target_fingerprint || approval.target_fingerprint !== status.target_fingerprint) errors.push(`${label}: plan/source/target binding mismatch`);
  if (!Array.isArray(approval.approved_batches) || !approval.approved_batches.length || duplicates(approval.approved_batches).length || approval.approved_batches.some((id) => !planMeta.batchSet.has(id))) errors.push(`${label}: invalid approved batches`);
  if (!Array.isArray(approval.excluded_batches) || duplicates(approval.excluded_batches ?? []).length || approval.excluded_batches.some((id) => !planMeta.batchSet.has(id) || approval.approved_batches.includes(id)) || !sameMembers(new Set([...(approval.approved_batches ?? []), ...(approval.excluded_batches ?? [])]), planMeta.batchSet) || !sameMembers(new Set(status.approved_batches), new Set(approval.approved_batches))) errors.push(`${label}: excluded/status batches mismatch`);
  for (const id of approval.approved_batches ?? []) for (const dep of planMeta.dependencies.get(id) ?? []) if (!approval.approved_batches.includes(dep)) errors.push(`${label}: approved batch ${id} lacks dependency ${dep}`);
  const expectedEnv = new Set(planMeta.globalEnvironment.filter((item) => approval.approved_batches?.includes(item.batch_id)).map((item) => item.key));
  if (!validStringList(approval.confirmed_global_environment_keys ?? []) || !sameMembers(expectedEnv, new Set(approval.confirmed_global_environment_keys ?? []))) errors.push(`${label}: confirmed global environment keys mismatch`);
  if (!validStringList(approval.conditions) || !nonEmptyString(approval.decision_summary) || !validDateTime(approval.decided_at) || !validDateTime(approval.expires_at) || Date.parse(approval.expires_at) <= Date.parse(approval.decided_at) || (preExecute && Date.parse(approval.expires_at) <= Date.now())) errors.push(`${label}: invalid or expired approval window`);
}

function validatePlanAndApproval(changeRoot, entry, status, profileMeta, preExecute, errors) {
  if (!status.plan_path) { if (preExecute) errors.push(`${entryKey(entry)}: pre-execute requires a plan`); return null; }
  const planFile = resolveChangeRelative(changeRoot, status.plan_path, "plan_path", errors);
  if (!planFile || !isFile(planFile)) { errors.push(`${entryKey(entry)}: indexed plan is missing`); return null; }
  const plan = readJson(planFile, status.plan_path, errors); if (!plan) return null;
  const meta = validatePlan(plan, planFile, entry, profileMeta, errors); if (!meta) return null;
  if (!isFile(planFile.replace(/\.json$/, ".md"))) errors.push(`${entryKey(entry)}: plan Markdown projection is missing`);
  if (plan.supersedes_plan_path && !isFile(resolveChangeRelative(changeRoot, plan.supersedes_plan_path, "superseded plan", errors))) errors.push(`${entryKey(entry)}: superseded plan is missing`);
  if (plan.triggered_by_attempt && !isDirectory(join(changeRoot, "execution", "attempts", plan.triggered_by_attempt))) errors.push(`${entryKey(entry)}: triggering attempt is missing`);
  for (const [pathKey, digestKey] of [["snapshot_path", "snapshot_digest"], ["deployment_model_path", "deployment_model_digest"], ...(meta.version === 3 ? [["target_profile_path", "target_profile_digest"]] : [])]) {
    const file = resolveChangeRelative(changeRoot, meta.bindings[pathKey], pathKey, errors);
    const value = file && isFile(file) ? readJson(file, meta.bindings[pathKey], errors) : null;
    if (!value) errors.push(`${entryKey(entry)}: ${pathKey} binding is missing`); else if (canonicalDigest(value) !== meta.bindings[digestKey]) errors.push(`${entryKey(entry)}: ${pathKey} binding is stale`);
  }
  const requestFile = resolveChangeRelative(changeRoot, meta.bindings.request_path, "request_path", errors);
  if (!requestFile || !isFile(requestFile)) errors.push(`${entryKey(entry)}: request_path binding is missing`);
  if (meta.version === 3) {
    if (!profileMeta || profileMeta.locator !== meta.bindings.target_profile_path || profileMeta.digest !== meta.bindings.target_profile_digest) errors.push(`${entryKey(entry)}: plan target profile binding mismatch`);
    if (profileMeta && plan.scope_definition.deployment_root !== profileMeta.value.deployment_root) errors.push(`${entryKey(entry)}: plan deployment root differs from target profile`);
    if (preExecute && profileMeta?.value.readiness !== "ready") errors.push(`${entryKey(entry)}: pre-execute requires a Ready target profile`);
  } else if (preExecute) errors.push(`${entryKey(entry)}: pre-execute rejects legacy plan schema v2; create a v3 plan`);
  if (meta.digest !== status.plan_digest || status.source_revision !== meta.bindings.source_revision || status.target_fingerprint !== meta.bindings.target_fingerprint) errors.push(`${entryKey(entry)}: status plan/source/target projection mismatch`);
  if (status.approval_status !== "approved") { if (preExecute) errors.push(`${entryKey(entry)}: pre-execute requires approval`); return { plan, meta, approval: null }; }
  if (plan.status !== "ready") errors.push(`${entryKey(entry)}: approved state requires Ready plan`);
  const approvalFile = resolveChangeRelative(changeRoot, status.approval_path, "approval_path", errors);
  if (!approvalFile || !isFile(approvalFile)) { errors.push(`${entryKey(entry)}: indexed approval is missing`); return { plan, meta, approval: null }; }
  const approval = readJson(approvalFile, status.approval_path, errors);
  if (approval) validateApproval(approval, approvalFile, entry, meta, status, preExecute, errors);
  return { plan, meta, approval };
}

function validateDomainArtifacts(changeRoot, entry, status, errors) {
  const profileMeta = validateTargetProfile(changeRoot, entry, errors);
  const snapshotsRoot = join(changeRoot, "inventory", "snapshots");
  for (const name of isDirectory(snapshotsRoot) ? readdirSync(snapshotsRoot).filter((item) => item.endsWith(".json")) : []) {
    const value = readJson(join(snapshotsRoot, name), `inventory/snapshots/${name}`, errors);
    if (value && (value.schema_version !== 2 || value.artifact !== "ops-inventory-snapshot" || value.scope !== entry.scope || value.project_id !== entry.project_id || value.change !== entry.change || value.snapshot_id !== name.slice(0, -5) || !DIGEST.test(value.target_fingerprint ?? ""))) errors.push(`inventory/snapshots/${name}: invalid identity`);
  }
  const modelPath = join(changeRoot, "deployment", "deployment-model.json");
  if (isFile(modelPath)) {
    const value = readJson(modelPath, "deployment/deployment-model.json", errors);
    if (value && (value.schema_version !== 2 || value.artifact !== "ops-deployment-model" || value.scope !== entry.scope || value.project_id !== entry.project_id || value.change !== entry.change || !["blocked", "ready"].includes(value.readiness))) errors.push("deployment/deployment-model.json: invalid identity/readiness");
    for (const item of value?.configuration ?? []) if (Object.hasOwn(item, "value")) errors.push("deployment/deployment-model.json: configuration must not persist values");
  }
  void status;
  return { profileMeta };
}

function validateAttemptPlanBinding(changeRoot, entry, attempt, profileMeta, errors) {
  if (!attempt.plan_path) return null;
  const planFile = resolveChangeRelative(changeRoot, attempt.plan_path, `${attempt.attempt_id} plan_path`, errors);
  if (!planFile || !isFile(planFile)) { errors.push(`${attempt.attempt_id}: bound plan is missing`); return null; }
  const plan = readJson(planFile, `${attempt.attempt_id} plan`, errors); if (!plan) return null;
  const meta = validatePlan(plan, planFile, entry, profileMeta, errors); if (!meta) return null;
  if (attempt.plan_digest !== meta.digest) errors.push(`${attempt.attempt_id}: plan digest binding mismatch`);
  const approvalFile = resolveChangeRelative(changeRoot, attempt.approval_path, `${attempt.attempt_id} approval_path`, errors);
  if (!approvalFile || !isFile(approvalFile)) { errors.push(`${attempt.attempt_id}: bound approval is missing`); return { plan, meta, approval: null }; }
  const approval = readJson(approvalFile, `${attempt.attempt_id} approval`, errors);
  if (approval) {
    const projection = { plan_path: attempt.plan_path, plan_digest: meta.digest, source_revision: meta.bindings.source_revision, target_fingerprint: meta.bindings.target_fingerprint, approved_batches: approval.approved_batches };
    validateApproval(approval, approvalFile, entry, meta, projection, false, errors);
    for (const batch of attempt.executed_batches ?? []) if (!approval.approved_batches?.includes(batch)) errors.push(`${attempt.attempt_id}: executed unapproved batch ${batch}`);
  }
  return { plan, meta, approval };
}

function readJournal(path, attempt, planMeta, errors) {
  const label = `${attempt.attempt_id}/journal.jsonl`;
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (error) { errors.push(`${label}: cannot read (${error.message})`); return null; }
  const trimmed = text.replace(/\s+$/u, "");
  if (!trimmed) { errors.push(`${label}: journal is empty`); return null; }
  const lines = trimmed.split(/\r?\n/u); const events = [];
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) { errors.push(`${label}:${index + 1}: blank JSONL record`); continue; }
    let event;
    try { event = JSON.parse(line); }
    catch (error) { errors.push(`${label}:${index + 1}: invalid JSON (${error.message})`); continue; }
    const eventLabel = `${label}:${index + 1}`;
    const keys = ["schema_version", "artifact", "sequence", "at", "event", "batch_id", "gate_id", "operation_id", "result", "summary", "output_digest", "evidence"];
    if (!exactKeys(event, keys, eventLabel, errors)) continue;
    if (event.schema_version !== 1 || event.artifact !== "ops-journal-event" || event.sequence !== index + 1 || !validDateTime(event.at) || !["attempt-start", "gate-result", "operation-intent", "operation-result", "postcondition-result", "attempt-end"].includes(event.event) || !["pending", "passed", "failed", "blocked", "skipped"].includes(event.result) || !nonEmptyString(event.summary) || !(event.output_digest === null || DIGEST.test(event.output_digest)) || !validStringList(event.evidence)) errors.push(`${eventLabel}: invalid journal event`);
    const isAttempt = ["attempt-start", "attempt-end"].includes(event.event);
    const isGate = event.event === "gate-result";
    const isOperation = ["operation-intent", "operation-result", "postcondition-result"].includes(event.event);
    if (isAttempt && (event.batch_id !== null || event.gate_id !== null || event.operation_id !== null)) errors.push(`${eventLabel}: attempt boundary cannot reference batch, gate or operation`);
    if (isGate && (!(event.batch_id === null || BATCH_ID.test(event.batch_id)) || !GATE_ID.test(event.gate_id ?? "") || event.operation_id !== null)) errors.push(`${eventLabel}: gate-result has invalid references`);
    if (isOperation && (!BATCH_ID.test(event.batch_id ?? "") || event.gate_id !== null || !OPERATION_ID.test(event.operation_id ?? ""))) errors.push(`${eventLabel}: operation event has invalid references`);
    if (event.event === "attempt-start" && event.result !== "pending") errors.push(`${eventLabel}: attempt-start must be pending`);
    if (event.event === "operation-intent" && event.result !== "pending") errors.push(`${eventLabel}: operation-intent must be pending`);
    if (["gate-result", "operation-result", "postcondition-result", "attempt-end"].includes(event.event) && event.result === "pending") errors.push(`${eventLabel}: result event cannot remain pending`);
    if (containsSecretMaterial(event.summary) || (event.evidence ?? []).some(containsSecretMaterial)) errors.push(`${eventLabel}: summary/evidence contains secret material`);
    events.push(event);
  }
  if (!events.length) return null;
  if (events[0].event !== "attempt-start") errors.push(`${label}: first event must be attempt-start`);
  const terminal = attempt.result !== "running";
  if (terminal && events.at(-1)?.event !== "attempt-end") errors.push(`${label}: terminal attempt must end with attempt-end`);
  if (!terminal && events.some((event) => event.event === "attempt-end")) errors.push(`${label}: running attempt cannot contain attempt-end`);
  if (events[0]?.at !== attempt.started_at) errors.push(`${label}: attempt-start timestamp does not bind attempt.started_at`);
  if (terminal && events.at(-1)?.at !== attempt.ended_at) errors.push(`${label}: attempt-end timestamp does not bind attempt.ended_at`);
  for (let index = 1; index < events.length; index += 1) if (Date.parse(events[index].at) < Date.parse(events[index - 1].at)) errors.push(`${label}: event timestamps are not monotonic at sequence ${events[index].sequence}`);

  const operationStates = new Map(); const gateResults = new Map(); const passedGates = new Set(); const passedOperations = new Set(); const completedBatches = new Set(); const terminatedBatches = new Set(); const startedBatches = new Set();
  let stopped = false; let stoppedOperation = null; let firstFailedOperation = null; let failureGateRecorded = false;
  function refreshBatch(batchId) {
    const operationIds = planMeta?.batchMap.get(batchId)?.operation_ids ?? [];
    if (operationIds.length && operationIds.every((id) => passedOperations.has(id))) completedBatches.add(batchId);
  }
  for (const event of events) {
    if (["attempt-start", "attempt-end"].includes(event.event)) continue;
    const referencedGate = event.event === "gate-result" ? planMeta?.gateMap.get(event.gate_id) : null;
    const closesFailedBatch = event.event === "gate-result" && !failureGateRecorded && ["failed", "blocked"].includes(event.result) && (referencedGate?.after_batches ?? []).every((batchId) => startedBatches.has(batchId) && terminatedBatches.has(batchId));
    const allowedAfterStop = (event.event === "gate-result" && (event.result === "skipped" || closesFailedBatch)) || (event.event === "postcondition-result" && event.operation_id === stoppedOperation);
    if (stopped && !allowedAfterStop) errors.push(`${label}: sequence ${event.sequence} continues execution after failure`);
    if (event.event === "gate-result") {
      const gate = referencedGate;
      if (!gate) errors.push(`${label}: sequence ${event.sequence} references an unknown gate ${event.gate_id}`);
      if (event.batch_id !== null && !gate?.after_batches?.includes(event.batch_id)) errors.push(`${label}: gate ${event.gate_id} batch_id is not one of its after_batches`);
      if (gateResults.has(event.gate_id)) errors.push(`${label}: gate ${event.gate_id} has more than one result`);
      if (event.result !== "skipped") {
        for (const dependency of gate?.depends_on ?? []) if (gateResults.get(dependency)?.result !== "passed") errors.push(`${label}: gate ${event.gate_id} ran before dependency ${dependency} passed`);
        for (const batchId of gate?.after_batches ?? []) {
          const batchReady = event.result === "passed" ? completedBatches.has(batchId) : completedBatches.has(batchId) || (startedBatches.has(batchId) && terminatedBatches.has(batchId));
          if (!batchReady) errors.push(`${label}: gate ${event.gate_id} ran before batch ${batchId} reached a terminal postcondition`);
        }
      }
      gateResults.set(event.gate_id, event); if (event.result === "passed") passedGates.add(event.gate_id);
      if (["failed", "blocked"].includes(event.result)) { stopped = true; failureGateRecorded = true; }
      continue;
    }
    const operation = planMeta?.operationMap.get(event.operation_id);
    if (!operation || operation.batch_id !== event.batch_id) errors.push(`${label}: sequence ${event.sequence} references an unknown or mismatched operation ${event.operation_id}`);
    const state = operationStates.get(event.operation_id) ?? { intent: null, result: null, postcondition: null };
    if (event.event === "operation-intent") {
      if (state.intent) errors.push(`${label}: duplicate intent for ${event.operation_id}`);
      for (const dependency of planMeta?.dependencies.get(event.batch_id) ?? []) if (!completedBatches.has(dependency)) errors.push(`${label}: batch ${event.batch_id} started before dependency ${dependency} completed`);
      for (const gateId of planMeta?.batchMap.get(event.batch_id)?.gate_ids ?? []) if (!passedGates.has(gateId)) errors.push(`${label}: batch ${event.batch_id} started before gate ${gateId} passed`);
      const ordered = planMeta?.batchMap.get(event.batch_id)?.operation_ids ?? [];
      for (const prior of ordered.slice(0, ordered.indexOf(event.operation_id))) if (!passedOperations.has(prior)) errors.push(`${label}: operation ${event.operation_id} started before ${prior} passed its postcondition`);
      state.intent = event; startedBatches.add(event.batch_id);
    } else if (event.event === "operation-result") {
      if (!state.intent || state.result) errors.push(`${label}: operation-result for ${event.operation_id} lacks one preceding intent`);
      state.result = event;
      if (["failed", "blocked"].includes(event.result)) { stopped = true; stoppedOperation = event.operation_id; firstFailedOperation ??= event.operation_id; }
    } else {
      if (!state.result || state.postcondition) errors.push(`${label}: postcondition-result for ${event.operation_id} lacks one preceding operation-result`);
      state.postcondition = event;
      terminatedBatches.add(event.batch_id);
      if (event.result === "passed") { passedOperations.add(event.operation_id); refreshBatch(event.batch_id); }
      else if (["failed", "blocked"].includes(event.result)) { stopped = true; stoppedOperation = event.operation_id; firstFailedOperation ??= event.operation_id; }
    }
    operationStates.set(event.operation_id, state);
  }
  if (terminal) for (const [operationId, state] of operationStates) if (!state.intent || !state.result || !state.postcondition) errors.push(`${label}: terminal operation ${operationId} lacks intent, result or postcondition`);
  if (!sameMembers(new Set(attempt.executed_batches ?? []), startedBatches)) errors.push(`${label}: executed_batches does not match journal intents`);
  if (attempt.failed_operation !== firstFailedOperation) errors.push(`${label}: failed_operation does not match the first failed operation`);
  const endResult = events.at(-1)?.event === "attempt-end" ? events.at(-1).result : null;
  const expectedEnd = attempt.result === "succeeded" || attempt.result === "rolled_back" ? "passed" : attempt.result === "failed" ? "failed" : attempt.result === "blocked" ? "blocked" : attempt.result === "abandoned" ? "skipped" : null;
  if (terminal && endResult !== expectedEnd) errors.push(`${label}: attempt-end result disagrees with attempt result`);
  if (["succeeded", "rolled_back"].includes(attempt.result) && stopped) errors.push(`${label}: successful attempt contains a failed or blocked execution event`);
  return { events, operationStates, gateResults, completedBatches, startedBatches };
}

function identityMatches(assertion, result) {
  if (assertion.comparison !== result.comparison) return false;
  if (assertion.comparison === "ordered-list") return sameOrderedValues(assertion.expected, result.actual);
  if (assertion.comparison === "set") return Array.isArray(assertion.expected) && Array.isArray(result.actual) && sameMembers(new Set(assertion.expected), new Set(result.actual));
  if (assertion.comparison === "digest") return IMMUTABLE_DIGEST.test(assertion.expected ?? "") && IMMUTABLE_DIGEST.test(result.actual ?? "") && normalizedDigest(assertion.expected) === normalizedDigest(result.actual);
  return JSON.stringify(assertion.expected) === JSON.stringify(result.actual);
}

function validateRetainedArtifacts(items, label, errors) {
  if (!Array.isArray(items)) { errors.push(`${label}: retained_artifacts must be an array`); return; }
  const ids = [];
  for (const item of items) {
    if (!exactKeys(item, ["id", "kind", "locator", "reason"], `${label} ${item?.id ?? "unknown"}`, errors)) continue;
    ids.push(item.id);
    if (!nonEmptyString(item.id) || !nonEmptyString(item.kind) || !nonEmptyString(item.locator) || !nonEmptyString(item.reason)) errors.push(`${label} ${item.id}: invalid retained artifact`);
  }
  if (duplicates(ids).length) errors.push(`${label}: duplicate retained artifact ids`);
}

function validateVerificationState(path, attempt, entry, profileMeta, planMeta, journalMeta, requirePassed, errors) {
  const label = `${attempt.attempt_id}/verification-state.json`;
  const value = readJson(path, label, errors); if (!value) return null;
  const keys = ["schema_version", "artifact", "scope", "project_id", "change", "attempt_id", "captured_at", "target_profile_path", "target_profile_digest", "identity_results", "gates", "artifacts", "services", "probes", "convergence", "data_protection", "recovery", "retained_artifacts", "risks", "verdict"];
  if (!exactKeys(value, keys, label, errors)) return null;
  if (value.schema_version !== 1 || value.artifact !== "ops-verification-state" || value.scope !== entry.scope || value.project_id !== entry.project_id || value.change !== entry.change || value.attempt_id !== attempt.attempt_id || !validDateTime(value.captured_at) || !["passed", "failed", "blocked"].includes(value.verdict)) errors.push(`${label}: invalid identity, timestamp or verdict`);
  if ((value.target_profile_path === null) !== (value.target_profile_digest === null) || !(value.target_profile_path === null || TARGET_PROFILE_LOCATOR.test(value.target_profile_path)) || !(value.target_profile_digest === null || DIGEST.test(value.target_profile_digest))) errors.push(`${label}: invalid target profile binding`);
  if (value.target_profile_path !== attempt.target_profile_path || value.target_profile_digest !== attempt.target_profile_digest) errors.push(`${label}: target profile binding disagrees with attempt`);
  if (profileMeta && value.target_profile_path !== null) {
    if (value.target_profile_path !== profileMeta.locator || value.target_profile_digest !== profileMeta.digest) errors.push(`${label}: target profile digest binding mismatch`);
  } else if (!profileMeta && (value.target_profile_path !== null || value.target_profile_digest !== null)) errors.push(`${label}: target profile binding points to a missing profile`);
  if (requirePassed && (!profileMeta || value.target_profile_path !== profileMeta.locator || value.target_profile_digest !== profileMeta.digest)) errors.push(`${label}: terminal completion requires the current target profile binding`);

  const identityIds = [];
  if (!Array.isArray(value.identity_results)) errors.push(`${label}: identity_results must be an array`);
  for (const result of value.identity_results ?? []) {
    const resultLabel = `${label} identity ${result?.assertion_id ?? "unknown"}`;
    if (!exactKeys(result, ["assertion_id", "comparison", "actual", "matched", "evidence"], resultLabel, errors)) continue;
    identityIds.push(result.assertion_id);
    const assertion = profileMeta?.assertionMap.get(result.assertion_id);
    const actualShape = ["exact", "digest"].includes(result.comparison) ? nonEmptyString(result.actual) : validStringList(result.actual, { minimum: 1 });
    const digestShape = result.comparison !== "digest" || IMMUTABLE_DIGEST.test(result.actual ?? "");
    if (!assertion || !["exact", "ordered-list", "set", "digest"].includes(result.comparison) || !actualShape || !digestShape || typeof result.matched !== "boolean" || !validStringList(result.evidence, { minimum: 1 })) errors.push(`${resultLabel}: invalid or unknown identity result`);
    else if (result.matched !== identityMatches(assertion, result)) errors.push(`${resultLabel}: matched flag disagrees with expected/actual comparison`);
  }
  if (duplicates(identityIds).length) errors.push(`${label}: duplicate identity results`);
  if (profileMeta && !sameMembers(new Set(identityIds), new Set(profileMeta.assertionMap.keys()))) errors.push(`${label}: identity results do not cover the target profile exactly`);
  if (requirePassed && (value.identity_results ?? []).some((result) => result.matched !== true)) errors.push(`${label}: passed verdict requires all identity assertions to match`);

  const gateMap = new Map(); let gateStopped = false;
  if (!Array.isArray(value.gates)) errors.push(`${label}: gates must be an array`);
  for (const [index, gateResult] of (value.gates ?? []).entries()) {
    const gateLabel = `${label} gate ${gateResult?.id ?? "unknown"}`;
    if (!exactKeys(gateResult, ["id", "sequence", "status", "started_at", "ended_at", "evidence"], gateLabel, errors)) continue;
    const gate = planMeta?.gateMap.get(gateResult.id);
    if (!gate || gateMap.has(gateResult.id) || gateResult.sequence !== index + 1 || !["passed", "failed", "blocked", "skipped"].includes(gateResult.status) || !validDateTime(gateResult.started_at) || !validDateTime(gateResult.ended_at) || Date.parse(gateResult.ended_at) < Date.parse(gateResult.started_at) || !validStringList(gateResult.evidence)) errors.push(`${gateLabel}: invalid, duplicate or out-of-sequence gate result`);
    if (gateStopped && gateResult.status !== "skipped") errors.push(`${gateLabel}: only skipped gates may follow a failed or blocked gate`);
    if (gateResult.status !== "skipped") for (const dependency of gate?.depends_on ?? []) if (gateMap.get(dependency)?.status !== "passed") errors.push(`${gateLabel}: dependency ${dependency} did not pass first`);
    if (["failed", "blocked"].includes(gateResult.status)) gateStopped = true;
    gateMap.set(gateResult.id, gateResult);
    const journalGate = journalMeta?.gateResults.get(gateResult.id);
    if (!journalGate || journalGate.result !== gateResult.status) errors.push(`${gateLabel}: journal gate result is missing or disagrees`);
  }
  if (journalMeta && !sameMembers(new Set(gateMap.keys()), new Set(journalMeta.gateResults.keys()))) errors.push(`${label}: verification gates and journal gate results differ`);
  if (requirePassed) for (const gate of planMeta?.gateMap.values() ?? []) if (gate.required && gateMap.get(gate.id)?.status !== "passed") errors.push(`${label}: required gate ${gate.id} did not pass`);

  const artifactMap = new Map();
  if (!Array.isArray(value.artifacts)) errors.push(`${label}: artifacts must be an array`);
  for (const result of value.artifacts ?? []) {
    const artifactLabel = `${label} artifact ${result?.requirement_id ?? "unknown"}`;
    if (!exactKeys(result, ["requirement_id", "immutable_digest", "target_ref", "server_verified", "matched", "evidence"], artifactLabel, errors)) continue;
    const requirement = planMeta?.artifactMap.get(result.requirement_id);
    const computedMatch = Boolean(requirement) && normalizedDigest(requirement.immutable_digest) === normalizedDigest(result.immutable_digest);
    if (!requirement || artifactMap.has(result.requirement_id) || !IMMUTABLE_DIGEST.test(result.immutable_digest ?? "") || !nonEmptyString(result.target_ref) || typeof result.server_verified !== "boolean" || typeof result.matched !== "boolean" || !validStringList(result.evidence) || result.matched !== computedMatch) errors.push(`${artifactLabel}: invalid artifact evidence or digest comparison`);
    artifactMap.set(result.requirement_id, result);
  }
  if (requirePassed) for (const requirement of planMeta?.artifactMap.values() ?? []) if (requirement.required && (artifactMap.get(requirement.id)?.matched !== true || artifactMap.get(requirement.id)?.server_verified !== true)) errors.push(`${label}: required artifact ${requirement.id} lacks target-side verification`);

  const serviceMap = new Map();
  if (!Array.isArray(value.services)) errors.push(`${label}: services must be an array`);
  for (const service of value.services ?? []) {
    const serviceLabel = `${label} service ${service?.id ?? "unknown"}`;
    if (!exactKeys(service, ["id", "status", "immutable_ref", "restart_count", "runtime_digest", "evidence"], serviceLabel, errors)) continue;
    if (!nonEmptyString(service.id) || serviceMap.has(service.id) || !["healthy", "running", "degraded", "failed", "absent"].includes(service.status) || !(service.immutable_ref === null || nonEmptyString(service.immutable_ref)) || !Number.isInteger(service.restart_count) || service.restart_count < 0 || !(service.runtime_digest === null || nonEmptyString(service.runtime_digest)) || !validStringList(service.evidence)) errors.push(`${serviceLabel}: invalid or duplicate service result`);
    serviceMap.set(service.id, service);
  }
  if (requirePassed && [...serviceMap.values()].some((service) => ["degraded", "failed"].includes(service.status))) errors.push(`${label}: passed verdict cannot contain degraded or failed services`);

  const probeMap = new Map();
  if (!Array.isArray(value.probes)) errors.push(`${label}: probes must be an array`);
  for (const probe of value.probes ?? []) {
    const probeLabel = `${label} probe ${probe?.verification_id ?? "unknown"}`;
    if (!exactKeys(probe, ["verification_id", "ok", "http_status", "business_code", "authenticated", "consecutive_successes", "elapsed_seconds", "transient_failures", "evidence"], probeLabel, errors)) continue;
    const requirement = planMeta?.verificationMap.get(probe.verification_id);
    if (!requirement || probeMap.has(probe.verification_id) || typeof probe.ok !== "boolean" || !(probe.http_status === null || Number.isInteger(probe.http_status)) || !(probe.business_code === null || typeof probe.business_code === "string" || Number.isInteger(probe.business_code)) || !(probe.authenticated === null || typeof probe.authenticated === "boolean") || !Number.isInteger(probe.consecutive_successes) || probe.consecutive_successes < 0 || !(probe.elapsed_seconds >= 0) || !Array.isArray(probe.transient_failures) || !validStringList(probe.evidence)) errors.push(`${probeLabel}: invalid or duplicate probe result`);
    if (requirement) {
      const expected = requirement.expected;
      const httpMatches = !expected.http_statuses.length || expected.http_statuses.includes(probe.http_status);
      const businessMatches = !expected.business_codes.length || expected.business_codes.includes(probe.business_code);
      const authenticationMatches = expected.authenticated === null || expected.authenticated === probe.authenticated;
      const stabilityMatches = requirement.stability === null || (probe.consecutive_successes >= requirement.stability.required_consecutive_successes && probe.elapsed_seconds <= requirement.stability.timeout_seconds);
      const typedMatch = httpMatches && businessMatches && authenticationMatches && stabilityMatches;
      const hasMachineExpectation = requirement.kind === "http" || expected.http_statuses.length || expected.business_codes.length || expected.authenticated !== null || requirement.stability !== null;
      if (hasMachineExpectation && probe.ok !== typedMatch) errors.push(`${probeLabel}: ok flag disagrees with typed expectation or stability window`);
    }
    probeMap.set(probe.verification_id, probe);
  }
  if (requirePassed) for (const requirement of planMeta?.verificationMap.values() ?? []) if (requirement.required && probeMap.get(requirement.id)?.ok !== true) errors.push(`${label}: required verification ${requirement.id} did not pass`);
  for (const [gateId, gateResult] of gateMap) if (gateResult.status === "passed") for (const verificationId of planMeta?.gateMap.get(gateId)?.verification_ids ?? []) if (probeMap.get(verificationId)?.ok !== true) errors.push(`${label}: passed gate ${gateId} has failing or missing verification ${verificationId}`);

  const convergenceGroups = new Map();
  if (!Array.isArray(value.convergence)) errors.push(`${label}: convergence must be an array`);
  for (const convergence of value.convergence ?? []) {
    const convergenceLabel = `${label} convergence ${convergence?.group ?? "unknown"}`;
    if (!exactKeys(convergence, ["group", "member_ids", "digests", "matched", "evidence"], convergenceLabel, errors)) continue;
    const computedMatch = Array.isArray(convergence.digests) && convergence.digests.length >= 2 && new Set(convergence.digests).size === 1;
    if (!nonEmptyString(convergence.group) || convergenceGroups.has(convergence.group) || !validStringList(convergence.member_ids, { minimum: 2 }) || !Array.isArray(convergence.digests) || convergence.digests.length !== convergence.member_ids.length || convergence.digests.some((digest) => !nonEmptyString(digest)) || typeof convergence.matched !== "boolean" || convergence.matched !== computedMatch || !validStringList(convergence.evidence) || convergence.member_ids.some((id) => !serviceMap.has(id))) errors.push(`${convergenceLabel}: invalid convergence result`);
    convergenceGroups.set(convergence.group, convergence);
  }
  if (requirePassed) for (const requirement of planMeta?.verificationMap.values() ?? []) if (requirement.required && requirement.convergence_group && convergenceGroups.get(requirement.convergence_group)?.matched !== true) errors.push(`${label}: convergence group ${requirement.convergence_group} did not match`);

  const protectionMap = new Map();
  if (!Array.isArray(value.data_protection)) errors.push(`${label}: data_protection must be an array`);
  for (const result of value.data_protection ?? []) {
    const protectionLabel = `${label} data protection ${result?.protection_id ?? "unknown"}`;
    if (!exactKeys(result, ["protection_id", "status", "evidence_path", "evidence_digest", "readability_verified", "restore_verified"], protectionLabel, errors)) continue;
    const requirement = planMeta?.protectionMap.get(result.protection_id);
    if (!requirement || protectionMap.has(result.protection_id) || !["verified", "waived", "not-required", "failed"].includes(result.status) || !(result.evidence_path === null || nonEmptyString(result.evidence_path)) || !(result.evidence_digest === null || DIGEST.test(result.evidence_digest)) || typeof result.readability_verified !== "boolean" || typeof result.restore_verified !== "boolean") errors.push(`${protectionLabel}: invalid or duplicate protection result`);
    if (result.status !== "failed" || requirePassed) {
      if (requirement?.strategy === "verified-backup" && (result.status !== "verified" || !result.evidence_path || !result.evidence_digest || !result.readability_verified || !result.restore_verified)) errors.push(`${protectionLabel}: verified backup must be readable and restore-verified`);
      if (requirement?.strategy === "waiver" && result.status !== "waived") errors.push(`${protectionLabel}: waiver result does not match plan`);
      if (requirement?.strategy === "not-required" && result.status !== "not-required") errors.push(`${protectionLabel}: not-required result does not match plan`);
    }
    protectionMap.set(result.protection_id, result);
  }
  if (planMeta && !sameMembers(new Set(protectionMap.keys()), new Set(planMeta.protectionMap.keys()))) errors.push(`${label}: data protection results do not cover the plan exactly`);

  const recovery = value.recovery;
  if (!exactKeys(recovery, ["strategy", "previous_release_ref", "rollback_operation_refs", "material_refs", "compatibility_verified", "data_restore_authorized", "evidence"], `${label} recovery`, errors) || !["restore-previous", "reverse-change", "forward-fix", "not-applicable"].includes(recovery?.strategy) || !(recovery?.previous_release_ref === null || nonEmptyString(recovery.previous_release_ref)) || !validStringList(recovery?.rollback_operation_refs ?? []) || (recovery?.rollback_operation_refs ?? []).some((id) => !OPERATION_ID.test(id) || (planMeta && !planMeta.operationMap.has(id))) || !validStringList(recovery?.material_refs ?? []) || typeof recovery?.compatibility_verified !== "boolean" || !(recovery?.data_restore_authorized === null || typeof recovery.data_restore_authorized === "boolean") || !validStringList(recovery?.evidence ?? [])) errors.push(`${label}: invalid recovery evidence`);
  if (requirePassed && planMeta && (recovery?.strategy === "not-applicable" || recovery?.compatibility_verified !== true || !(recovery?.rollback_operation_refs?.length || recovery?.material_refs?.length))) errors.push(`${label}: completed mutation requires verified recovery strategy and rollback material`);
  if (requirePassed && !planMeta && recovery?.strategy !== "not-applicable" && recovery?.compatibility_verified !== true) errors.push(`${label}: recovery compatibility was not verified`);
  validateRetainedArtifacts(value.retained_artifacts, `${label} retained artifacts`, errors);
  if (!validStringList(value.risks)) errors.push(`${label}: risks must contain unique non-empty strings`);
  if (requirePassed && value.verdict !== "passed") errors.push(`${label}: terminal completion requires a passed verdict`);
  return { value, digest: canonicalDigest(value), gateMap, artifactMap, probeMap, protectionMap };
}

function validateHandoff(path, attempt, errors) {
  const label = `${attempt.attempt_id}/HANDOFF.md`;
  if (!isFile(path)) { errors.push(`${label}: missing`); return; }
  const text = readFileSync(path, "utf8");
  const headings = ["## Target and Control-plane Identity", "## Source and Immutable Artifacts", "## Gate Results", "## Semantic Probes and Stability Windows", "## Data Protection", "## Recovery and Previous Release", "## Remaining Risks and Operator Follow-up"];
  for (const heading of headings) if (!text.includes(heading)) errors.push(`${label}: missing ${heading}`);
  if (containsSecretMaterial(text)) errors.push(`${label}: contains secret material`);
}

function validateAttempts(changeRoot, entry, status, profileMeta, strictLatest, errors) {
  const attemptsRoot = join(changeRoot, "execution", "attempts");
  const names = isDirectory(attemptsRoot) ? readdirSync(attemptsRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort() : [];
  for (const [index, name] of names.entries()) if (name !== `ATTEMPT-${String(index + 1).padStart(3, "0")}`) errors.push(`${entryKey(entry)}: attempts must be contiguous from ATTEMPT-001; found ${name}`);
  let latest = null; let latestAttempt = null; let latestVersion = null; let latestVerification = null;
  for (const [attemptIndex, name] of names.entries()) {
    if (!ATTEMPT_ID.test(name)) { errors.push(`${entryKey(entry)}: invalid attempt directory ${name}`); continue; }
    latest = name;
    const root = join(attemptsRoot, name); const path = join(root, "attempt.json");
    if (!isFile(path)) { errors.push(`${name}: attempt.json missing`); continue; }
    const value = readJson(path, `${name}/attempt.json`, errors); if (!value) continue;
    latestAttempt = value; latestVersion = value.schema_version;
    const v1Keys = ["schema_version", "artifact", "scope", "project_id", "change", "attempt_id", "kind", "triggered_by_attempt", "plan_path", "plan_digest", "approval_path", "started_at", "ended_at", "result", "executed_batches", "failed_operation", "mutation_performed", "journal_path", "diagnosis_path", "verification_path", "blockers"];
    const v2Keys = ["schema_version", "artifact", "scope", "project_id", "change", "attempt_id", "kind", "triggered_by_attempt", "plan_path", "plan_digest", "approval_path", "target_profile_path", "target_profile_digest", "started_at", "ended_at", "result", "executed_batches", "failed_operation", "mutation_performed", "journal_path", "diagnosis_path", "verification_path", "verification_state_path", "verification_state_digest", "handoff_path", "retained_artifacts", "blockers"];
    const keys = value.schema_version === 1 ? v1Keys : value.schema_version === 2 ? v2Keys : null;
    if (!keys || !exactKeys(value, keys, `${name}/attempt.json`, errors)) { if (!keys) errors.push(`${name}: unsupported attempt schema version`); continue; }
    if (value.artifact !== "ops-execution-attempt" || value.scope !== entry.scope || value.project_id !== entry.project_id || value.change !== entry.change || value.attempt_id !== name || !["deploy", "remediation", "rollback", "verification-only"].includes(value.kind)) errors.push(`${name}: invalid identity/kind`);
    if (!isFile(join(root, "journal.jsonl")) || !isFile(join(root, "summary.md")) || value.journal_path !== `execution/attempts/${name}/journal.jsonl`) errors.push(`${name}: journal/summary contract is incomplete`);
    if (value.kind === "verification-only") { if (value.plan_path !== null || value.plan_digest !== null || value.approval_path !== null || value.mutation_performed !== false) errors.push(`${name}: verification-only cannot bind plan or mutation`); }
    else if (!PLAN_LOCATOR.test(value.plan_path ?? "") || !DIGEST.test(value.plan_digest ?? "") || !APPROVAL_LOCATOR.test(value.approval_path ?? "")) errors.push(`${name}: mutation attempt requires plan/approval binding`);
    if (!(value.triggered_by_attempt === null || ATTEMPT_ID.test(value.triggered_by_attempt)) || (value.triggered_by_attempt !== null && (!names.slice(0, attemptIndex).includes(value.triggered_by_attempt))) || !validDateTime(value.started_at) || !(value.ended_at === null || validDateTime(value.ended_at)) || !["running", "succeeded", "failed", "blocked", "rolled_back", "abandoned"].includes(value.result)) errors.push(`${name}: invalid lineage/time/result`);
    if (value.result === "running" ? value.ended_at !== null : !validDateTime(value.ended_at)) errors.push(`${name}: terminal/time mismatch`);
    if (validDateTime(value.started_at) && validDateTime(value.ended_at) && Date.parse(value.ended_at) < Date.parse(value.started_at)) errors.push(`${name}: ended_at precedes started_at`);
    if (!validStringList(value.executed_batches ?? []) || (value.executed_batches ?? []).some((id) => !BATCH_ID.test(id)) || !(value.failed_operation === null || OPERATION_ID.test(value.failed_operation)) || typeof value.mutation_performed !== "boolean" || !validStringList(value.blockers ?? [])) errors.push(`${name}: invalid batches, operation, mutation or blockers`);
    if (value.kind === "verification-only" && value.executed_batches.length) errors.push(`${name}: verification-only cannot execute mutation batches`);
    const expectedDiagnosis = `execution/attempts/${name}/diagnosis.md`; const expectedVerification = `execution/attempts/${name}/verification.md`;
    if (value.diagnosis_path !== null && (value.diagnosis_path !== expectedDiagnosis || !isFile(join(root, "diagnosis.md")))) errors.push(`${name}: diagnosis locator mismatch`);
    if (["failed", "blocked"].includes(value.result) && value.diagnosis_path !== expectedDiagnosis) errors.push(`${name}: failed/blocked attempt requires diagnosis`);
    if (value.verification_path !== null && (value.verification_path !== expectedVerification || !isFile(join(root, "verification.md")))) errors.push(`${name}: verification locator mismatch`);
    if (value.schema_version === 1) {
      if (["succeeded", "rolled_back"].includes(value.result) && value.verification_path !== expectedVerification) errors.push(`${name}: successful terminal attempt requires verification`);
      continue;
    }

    validateRetainedArtifacts(value.retained_artifacts, `${name}/attempt.json retained artifacts`, errors);
    const hasProfilePath = value.target_profile_path !== null; const hasProfileDigest = value.target_profile_digest !== null;
    if (hasProfilePath !== hasProfileDigest || !(value.target_profile_path === null || TARGET_PROFILE_LOCATOR.test(value.target_profile_path)) || !(value.target_profile_digest === null || DIGEST.test(value.target_profile_digest))) errors.push(`${name}: invalid target profile binding`);
    if (hasProfilePath && (!profileMeta || value.target_profile_path !== profileMeta.locator || value.target_profile_digest !== profileMeta.digest)) errors.push(`${name}: target profile digest binding mismatch`);
    if (value.kind !== "verification-only" && (!profileMeta || value.target_profile_path !== profileMeta.locator || value.target_profile_digest !== profileMeta.digest)) errors.push(`${name}: mutation attempt requires the current target profile binding`);

    const planBinding = value.kind === "verification-only" ? null : validateAttemptPlanBinding(changeRoot, entry, value, profileMeta, errors);
    if (value.kind !== "verification-only" && planBinding?.meta.version !== 3) errors.push(`${name}: a v2 mutation attempt must bind a plan v3`);
    if (planBinding && (planBinding.meta.bindings.target_profile_path !== value.target_profile_path || planBinding.meta.bindings.target_profile_digest !== value.target_profile_digest)) errors.push(`${name}: attempt and plan target profile bindings disagree`);
    const journalMeta = isFile(join(root, "journal.jsonl")) ? readJournal(join(root, "journal.jsonl"), value, planBinding?.meta ?? null, errors) : null;

    const terminal = value.result !== "running";
    const isLatest = attemptIndex === names.length - 1;
    const completionAbandoned = value.result === "abandoned" && isLatest && ["completed", "archived"].includes(status.change_status);
    if (terminal && value.verification_path !== expectedVerification) errors.push(`${name}: terminal v2 attempt requires verification Markdown`);
    const expectedState = `execution/attempts/${name}/verification-state.json`;
    const statePair = value.verification_state_path !== null || value.verification_state_digest !== null;
    if ((value.verification_state_path === null) !== (value.verification_state_digest === null) || !(value.verification_state_path === null || VERIFICATION_STATE_LOCATOR.test(value.verification_state_path)) || !(value.verification_state_digest === null || DIGEST.test(value.verification_state_digest))) errors.push(`${name}: invalid verification state binding`);
    if (terminal && (value.verification_state_path !== expectedState || !DIGEST.test(value.verification_state_digest ?? ""))) errors.push(`${name}: terminal v2 attempt requires verification-state binding`);
    let verificationMeta = null;
    if (statePair) {
      const statePath = resolveChangeRelative(changeRoot, value.verification_state_path, `${name} verification_state_path`, errors);
      if (!statePath || !isFile(statePath)) errors.push(`${name}: verification-state file is missing`);
      else {
        verificationMeta = validateVerificationState(statePath, value, entry, profileMeta, planBinding?.meta ?? null, journalMeta, ["succeeded", "rolled_back"].includes(value.result) || completionAbandoned, errors);
        if (verificationMeta && verificationMeta.digest !== value.verification_state_digest) errors.push(`${name}: verification-state digest binding mismatch`);
        if (verificationMeta && canonicalDigest(verificationMeta.value.retained_artifacts) !== canonicalDigest(value.retained_artifacts)) errors.push(`${name}: retained artifacts disagree with verification state`);
      }
    }

    const handoffRequired = ["succeeded", "rolled_back"].includes(value.result) || completionAbandoned;
    const expectedHandoff = `execution/attempts/${name}/HANDOFF.md`;
    if (!(value.handoff_path === null || HANDOFF_LOCATOR.test(value.handoff_path))) errors.push(`${name}: invalid HANDOFF binding`);
    if (handoffRequired && value.handoff_path !== expectedHandoff) errors.push(`${name}: terminal completion attempt requires HANDOFF`);
    if (value.handoff_path !== null) {
      const handoffPath = resolveChangeRelative(changeRoot, value.handoff_path, `${name} handoff_path`, errors);
      if (handoffPath) validateHandoff(handoffPath, value, errors);
    }
    if (isLatest) latestVerification = verificationMeta;
  }
  if (status.latest_attempt_id !== latest) errors.push(`${entryKey(entry)}: latest_attempt_id does not match latest attempt`);
  if (strictLatest && latest !== null && latestVersion !== 2) errors.push(`${entryKey(entry)}: pre-close/pre-archive requires latest attempt schema v2`);
  return { latest, latestAttempt, latestVersion, latestVerification };
}

function validateRetrospective(changeRoot, errors) {
  const path = join(changeRoot, "RETROSPECTIVE.md");
  if (!isFile(path)) { errors.push("RETROSPECTIVE.md: missing"); return; }
  const text = readFileSync(path, "utf8");
  for (const heading of RETROSPECTIVE_HEADINGS) if (!text.includes(heading)) errors.push(`RETROSPECTIVE.md: missing ${heading}`);
}

function allowedPromotionTarget(entry, targetPath) {
  const roots = entry.scope === "project"
    ? [`projects/${entry.project_id}/context/`, `projects/${entry.project_id}/adr/`, `projects/${entry.project_id}/runbooks/`, "context/", "adr/", "runbooks/"]
    : ["context/", "adr/", "runbooks/"];
  return roots.some((root) => targetPath.startsWith(root) && !targetPath.slice(root.length).split("/").includes(".."));
}

function validatePromotion(stateRoot, changeRoot, entry, complete, errors) {
  validateRetrospective(changeRoot, errors);
  if (!isFile(join(changeRoot, "promotion", "plan.md"))) errors.push("promotion/plan.md: missing");
  const manifestPath = join(changeRoot, "promotion", "manifest.json");
  if (!isFile(manifestPath)) { errors.push("promotion/manifest.json: missing"); return; }
  const manifest = readJson(manifestPath, "promotion/manifest.json", errors); if (!manifest) return;
  const keys = ["schema_version", "artifact", "scope", "project_id", "change", "created_at", "source_path", "archive_path", "retrospective_path", "writes", "archive_only", "summary"];
  if (!exactKeys(manifest, keys, "promotion/manifest.json", errors)) return;
  if (manifest.schema_version !== 1 || manifest.artifact !== "ops-promotion-manifest" || manifest.scope !== entry.scope || manifest.project_id !== entry.project_id || manifest.change !== entry.change || manifest.source_path !== stateRelativeActive(entry) || manifest.archive_path !== stateRelativeArchive(entry) || manifest.retrospective_path !== "RETROSPECTIVE.md" || !validDateTime(manifest.created_at) || !Array.isArray(manifest.writes) || !Array.isArray(manifest.archive_only) || !manifest.summary) errors.push("promotion/manifest.json: invalid identity or paths");
  for (const item of manifest.writes ?? []) {
    if (!exactKeys(item, ["stable_key", "knowledge_scope", "action", "staging_path", "target_path", "content_digest", "expected_target_digest", "evidence"], `promotion write ${item?.stable_key}`, errors)) continue;
    const staging = resolveChangeRelative(changeRoot, item.staging_path, `promotion staging ${item.stable_key}`, errors);
    if (!item.staging_path.startsWith("promotion/staging/") || !staging || !isFile(staging) || fileDigest(staging) !== item.content_digest || !DIGEST.test(item.content_digest ?? "") || !(item.expected_target_digest === null || DIGEST.test(item.expected_target_digest)) || !allowedPromotionTarget(entry, item.target_path)) errors.push(`promotion write ${item.stable_key}: invalid staging, digest or target`);
    const target = resolveStateRelative(stateRoot, item.target_path, `promotion target ${item.stable_key}`, errors);
    if (!target) continue;
    if (!complete) {
      if (item.expected_target_digest === null ? existsSync(target) : !isFile(target) || fileDigest(target) !== item.expected_target_digest) errors.push(`promotion write ${item.stable_key}: target drift before archive`);
    } else if (!isFile(target) || fileDigest(target) !== item.content_digest) errors.push(`promotion write ${item.stable_key}: promoted target content mismatch`);
  }
  const approvalPath = join(changeRoot, "promotion", "approval.json");
  if (complete || isFile(approvalPath)) {
    const approval = isFile(approvalPath) ? readJson(approvalPath, "promotion/approval.json", errors) : null;
    if (!approval) { errors.push("promotion/approval.json: missing"); return; }
    const approvalKeys = ["schema_version", "artifact", "scope", "project_id", "change", "manifest_path", "manifest_digest", "decision", "decision_summary", "decided_at"];
    if (!exactKeys(approval, approvalKeys, "promotion/approval.json", errors) || approval.schema_version !== 1 || approval.artifact !== "ops-promotion-approval" || approval.scope !== entry.scope || approval.project_id !== entry.project_id || approval.change !== entry.change || approval.manifest_path !== "promotion/manifest.json" || approval.manifest_digest !== canonicalDigest(manifest) || approval.decision !== "approved" || !approval.decision_summary || !validDateTime(approval.decided_at)) errors.push("promotion/approval.json: invalid manifest binding");
  }
}

function validateCompletion(entry, status, attemptsMeta, errors) {
  if (!["completed", "archived"].includes(status.change_status)) return;
  if (!status.latest_attempt_id) { errors.push(`${entryKey(entry)}: terminal change requires an attempt`); return; }
  const attempt = attemptsMeta?.latestAttempt;
  if (!attempt || !["succeeded", "rolled_back", "abandoned"].includes(attempt.result) || (status.outcome === "succeeded" && attempt.result !== "succeeded") || (status.outcome === "rolled_back" && attempt.result !== "rolled_back") || (status.outcome === "abandoned" && attempt.result !== "abandoned")) errors.push(`${entryKey(entry)}: outcome disagrees with latest terminal attempt`);
  if (attemptsMeta?.latestVersion === 2 && !attemptsMeta.latestVerification) errors.push(`${entryKey(entry)}: terminal change lacks latest v2 verification state`);
}

function collectFoundEntries(stateRoot) {
  const active = []; const archived = [];
  for (const item of isDirectory(join(stateRoot, "changes")) ? readdirSync(join(stateRoot, "changes"), { withFileTypes: true }) : []) if (item.isDirectory()) active.push({ scope: "global", project_id: null, change: item.name });
  for (const month of isDirectory(join(stateRoot, "archive")) ? readdirSync(join(stateRoot, "archive"), { withFileTypes: true }) : []) if (month.isDirectory()) for (const item of readdirSync(join(stateRoot, "archive", month.name), { withFileTypes: true })) if (item.isDirectory()) archived.push({ scope: "global", project_id: null, change: item.name });
  const projects = isDirectory(join(stateRoot, "projects")) ? readdirSync(join(stateRoot, "projects"), { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name) : [];
  for (const project of projects) {
    for (const item of isDirectory(join(projectRoot(stateRoot, project), "changes")) ? readdirSync(join(projectRoot(stateRoot, project), "changes"), { withFileTypes: true }) : []) if (item.isDirectory()) active.push({ scope: "project", project_id: project, change: item.name });
    const archive = join(projectRoot(stateRoot, project), "archive");
    for (const month of isDirectory(archive) ? readdirSync(archive, { withFileTypes: true }) : []) if (month.isDirectory()) for (const item of readdirSync(join(archive, month.name), { withFileTypes: true })) if (item.isDirectory()) archived.push({ scope: "project", project_id: project, change: item.name });
  }
  return { active, archived, projects };
}

function validateStateRoot(stateRoot, options, errors) {
  validateNoSymlinks(stateRoot, errors);
  const statusPath = join(stateRoot, "status.json");
  if (!isFile(statusPath)) { errors.push("status.json: missing"); return; }
  const status = readJson(statusPath, "status.json", errors); const index = status && validateGlobalStatus(status, errors); if (!index) return;
  const found = collectFoundEntries(stateRoot);
  for (const project of found.projects) {
    if (!PROJECT_ID.test(project)) errors.push(`projects/${project}: invalid project id`);
    const path = join(projectRoot(stateRoot, project), "project.json");
    if (!isFile(path)) errors.push(`projects/${project}/project.json: missing`); else validateProject(readJson(path, `projects/${project}/project.json`, errors), project, errors);
  }
  const activeKeys = new Set(index.active.map(entryKey)); const archivedKeys = new Set(index.archived.map(entryKey));
  for (const entry of found.active) if (!activeKeys.has(entryKey(entry))) errors.push(`${stateRelativeActive(entry)}: directory is not indexed active`);
  for (const entry of found.archived) if (!archivedKeys.has(entryKey(entry))) errors.push(`${stateRelativeArchive(entry)}: directory is not indexed archived`);
  for (const entry of index.active) {
    const root = activeRoot(stateRoot, entry); const path = join(root, ".status.json");
    if (!isFile(path)) { errors.push(`${entryKey(entry)}: active .status.json missing`); continue; }
    const value = readJson(path, `${entryKey(entry)}/.status.json`, errors); if (!value) continue;
    validateChangeStatus(value, entry, false, errors);
    const domain = validateDomainArtifacts(root, entry, value, errors);
    validatePlanAndApproval(root, entry, value, domain.profileMeta, options.stage === "pre-execute" && selected(options, entry), errors);
    const strictLatest = selected(options, entry) && ["pre-close", "pre-archive"].includes(options.stage);
    const attempts = validateAttempts(root, entry, value, domain.profileMeta, strictLatest, errors);
    validateCompletion(entry, value, attempts, errors);
    if (options.stage === "pre-execute" && selected(options, entry) && (value.phase !== "approved" || value.approval_status !== "approved")) errors.push(`${entryKey(entry)}: pre-execute gate failed`);
    if (options.stage === "pre-close" && selected(options, entry) && (value.change_status !== "completed" || value.phase !== "ready_to_archive")) errors.push(`${entryKey(entry)}: pre-close gate failed`);
    if (options.stage === "pre-archive" && selected(options, entry)) { if (value.change_status !== "completed" || value.phase !== "ready_to_archive") errors.push(`${entryKey(entry)}: pre-archive completion gate failed`); validatePromotion(stateRoot, root, entry, false, errors); }
    if (options.stage === "complete" && selected(options, entry)) errors.push(`${entryKey(entry)}: complete stage cannot leave change active`);
  }
  for (const entry of index.archived) {
    const root = archivedRoot(stateRoot, entry); const path = join(root, ".status.json");
    if (!isFile(path)) { errors.push(`${entryKey(entry)}: archived .status.json missing`); continue; }
    const value = readJson(path, `${entryKey(entry)}/.status.json`, errors); if (!value) continue;
    validateChangeStatus(value, entry, true, errors);
    const domain = validateDomainArtifacts(root, entry, value, errors);
    validatePlanAndApproval(root, entry, value, domain.profileMeta, false, errors);
    const attempts = validateAttempts(root, entry, value, domain.profileMeta, false, errors);
    validateCompletion(entry, value, attempts, errors);
    if (isDirectory(activeRoot(stateRoot, entry))) errors.push(`${entryKey(entry)}: archived change still exists active`);
    if (options.stage === "complete" && selected(options, entry)) validatePromotion(stateRoot, root, entry, true, errors);
  }
  if (options.change && ![...index.active, ...index.archived].some((entry) => selected(options, entry))) errors.push(`${options.scope}:${options.project ?? "-"}:${options.change}: change is not indexed`);
}

function selected(options, entry) { return options.scope === entry.scope && (entry.scope === "global" || options.project === entry.project_id) && options.change === entry.change; }

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.digest) { const errors = []; const value = readJson(options.digest, options.digest, errors); if (errors.length || !value) throw new Error(errors.join("; ")); console.log(canonicalDigest(value)); return; }
  const errors = [];
  if (options.selfCheck) validateWorkflowRoot(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."), errors);
  if (options.workflowRoot) validateWorkflowRoot(options.workflowRoot, errors);
  if (options.stateRoot) validateStateRoot(options.stateRoot, options, errors);
  if (errors.length) { console.error(`Ops validation failed (${errors.length})`); for (const error of errors) console.error(`  - ${error}`); process.exitCode = 1; return; }
  console.log("Ops validation: OK");
}

try { main(); }
catch (error) { console.error(`Ops validation failed: ${error.message}`); process.exitCode = 1; }
