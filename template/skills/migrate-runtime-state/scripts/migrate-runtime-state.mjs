#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const STAGE_PREFIX = ".speculo-runtime-migrate-stage-";
const CONFIG_SCHEMA_VERSION = 5;
const GOAL_PLAN_SCHEMA_VERSION = 6;
const CHANGE_STATUS_SCHEMA_VERSION = 6;
const ROLLBACK_NAME = ".speculo-runtime-migrate-rollback";
const VALID_ACTIONS = new Set(["copy", "replace-json", "keep-current", "remove-current"]);
const VALID_DECISIONS = new Set(["restore", "merge-json", "replace-json", "keep-current", "remove-current"]);

function usage() {
  process.stderr.write([
    "Usage:",
    "  node migrate-runtime-state.mjs inspect --project-root <path>",
    "  node migrate-runtime-state.mjs fingerprint --project-root <path> --target <relative-path>",
    "  node migrate-runtime-state.mjs apply --project-root <path> --plan <plan.json> --confirmed",
    "",
    "inspect and fingerprint are read-only. apply requires an explicit confirmed schema-v2 plan.",
    "",
  ].join("\n"));
  return 2;
}

function parseArgs(argv) {
  const [operation, ...rest] = argv;
  const options = { operation, confirmed: false };
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (item === "--confirmed") {
      options.confirmed = true;
    } else if (item === "--project-root" || item === "--plan" || item === "--target") {
      options[item.slice(2).replaceAll("-", "_")] = rest[index + 1];
      index += 1;
    } else if (item === "--help" || item === "-h") {
      options.help = true;
    } else {
      throw new Error("Unknown argument: " + item);
    }
  }
  return options;
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function safeRelative(value, label) {
  if (typeof value !== "string" || !value || value.includes("\\")) {
    throw new Error(label + " must be a non-empty POSIX relative path");
  }
  const parts = value.split("/");
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value) || parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error(label + " escapes its allowed root: " + value);
  }
  return value;
}

function inside(root, relativePath) {
  const target = resolve(root, safeRelative(relativePath, "path"));
  const prefix = root.endsWith(sep) ? root : root + sep;
  if (target !== root && !target.startsWith(prefix)) throw new Error("Path escapes root: " + relativePath);
  return target;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function walk(root, current = root, options = {}) {
  if (!(await exists(current))) return [];
  const values = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    const item = toPosix(relative(root, path));
    if (options.exclude?.(item)) continue;
    if (entry.isDirectory()) {
      values.push({ path: item, type: "directory" });
      values.push(...await walk(root, path, options));
    } else if (entry.isSymbolicLink()) {
      values.push({ path: item, type: "symlink", target: await readlink(path) });
    } else if (entry.isFile()) {
      const stat = await lstat(path);
      values.push({ path: item, type: "file", bytes: stat.size, sha256: await sha256(path) });
    }
  }
  return values.sort((left, right) => left.path.localeCompare(right.path));
}

async function fingerprint(path) {
  if (!(await exists(path))) return "absent";
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error("Target is a symbolic link: " + path);
  if (stat.isFile()) return "file:" + await sha256(path);
  if (!stat.isDirectory()) throw new Error("Unsupported target type: " + path);
  const entries = await walk(path);
  const digest = createHash("sha256");
  for (const entry of entries) digest.update(JSON.stringify(entry) + "\n");
  return "directory:" + digest.digest("hex");
}

async function assertNoSymlinkPath(root, relativePath) {
  let current = root;
  for (const part of safeRelative(relativePath, "target").split("/")) {
    current = join(current, part);
    if (!(await exists(current))) continue;
    if ((await lstat(current)).isSymbolicLink()) throw new Error("Target path traverses a symbolic link: " + relativePath);
  }
}

async function context(projectRootArg) {
  if (!projectRootArg) throw new Error("--project-root is required");
  const projectRoot = resolve(projectRootArg);
  const speculoRoot = join(projectRoot, "speculo");
  const stateRoot = join(speculoRoot, ".speculo");
  const backupRoot = join(stateRoot, "back");
  const markerPath = join(stateRoot, "migration.json");
  const manifestPath = join(backupRoot, "manifest.json");
  for (const [label, path] of [["Speculo installation", speculoRoot], ["pending marker", markerPath], ["backup manifest", manifestPath]]) {
    if (!(await exists(path))) throw new Error(label + " does not exist: " + path);
  }
  for (const [label, path] of [["Speculo installation", speculoRoot], ["runtime state", stateRoot], ["backup root", backupRoot]]) {
    if ((await lstat(path)).isSymbolicLink()) throw new Error(label + " must not be a symbolic link: " + path);
  }
  const marker = await readJson(markerPath);
  if (marker.schema_version !== 1 || marker.status !== "pending") throw new Error("migration.json is not a pending schema-v1 marker");
  const manifest = await readJson(manifestPath);
  if (manifest.schema_version !== 1 || !Array.isArray(manifest.files)) throw new Error("back/manifest.json is not a schema-v1 manifest");
  return { projectRoot, speculoRoot, stateRoot, backupRoot, markerPath, manifestPath, marker, manifest };
}

async function validateBackup(ctx, checkMigrationWorkspace = true) {
  const issues = [];
  const expected = new Map();
  for (const entry of ctx.manifest.files) {
    try {
      const item = safeRelative(entry.path, "manifest path");
      if (item === "manifest.json") throw new Error("manifest cannot include itself");
      if (expected.has(item)) throw new Error("duplicate manifest entry: " + item);
      if (entry.type !== "file" && entry.type !== "symlink") throw new Error("invalid manifest entry type: " + item);
      if (entry.type === "file" && (typeof entry.sha256 !== "string" || typeof entry.bytes !== "number")) {
        throw new Error("file manifest entry has no hash or size: " + item);
      }
      if (entry.type === "symlink" && typeof entry.target !== "string") {
        throw new Error("symlink manifest entry has no target: " + item);
      }
      expected.set(item, entry);
    } catch (error) {
      issues.push(String(error));
    }
  }
  const actual = await walk(ctx.backupRoot, ctx.backupRoot, { exclude: (item) => item === "manifest.json" });
  const actualFiles = actual.filter((entry) => entry.type !== "directory");
  for (const entry of actualFiles) {
    const declared = expected.get(entry.path);
    if (!declared) {
      issues.push("undeclared backup entry: " + entry.path);
      continue;
    }
    if (entry.type !== declared.type) {
      issues.push("backup entry type mismatch: " + entry.path);
    } else if (entry.type === "symlink") {
      if (entry.target !== declared.target) issues.push("backup symlink target mismatch: " + entry.path);
    } else if (entry.sha256 !== declared.sha256 || entry.bytes !== declared.bytes) {
      issues.push("backup hash or size mismatch: " + entry.path);
    }
    expected.delete(entry.path);
  }
  for (const path of expected.keys()) issues.push("missing backup entry: " + path);
  if (checkMigrationWorkspace) {
    const projectEntries = await readdir(ctx.projectRoot);
    for (const name of projectEntries) {
      if (name.startsWith(STAGE_PREFIX) || name === ROLLBACK_NAME) issues.push("unfinished migration workspace: " + name);
    }
  }
  return issues;
}

async function inspect(projectRoot) {
  const ctx = await context(projectRoot);
  const issues = await validateBackup(ctx);
  return {
    ok: issues.length === 0,
    pending: ctx.marker,
    backup: {
      source_version: ctx.manifest.source_version,
      target_version: ctx.manifest.target_version,
      entries: ctx.manifest.files.length,
      manifest_sha256: await sha256(ctx.manifestPath),
      files: ctx.manifest.files,
    },
    issues,
  };
}

function allowedTarget(target, installedWorkflows) {
  safeRelative(target, "target");
  if (target === "config.json") return true;
  if (!target.startsWith(".speculo/")) return false;
  for (const protectedPath of [
    ".speculo/back",
    ".speculo/workspace.json",
    ".speculo/install.json",
    ".speculo/migration.json",
    ".speculo/README.md",
  ]) {
    if (target === protectedPath || target.startsWith(protectedPath + "/")) return false;
  }
  if (target.startsWith(".speculo/commands/")) return true;
  return installedWorkflows.some((workflow) => target === `.speculo/${workflow}` || target.startsWith(`.speculo/${workflow}/`));
}

function allowedDecisionTarget(target, disposition, installedWorkflows) {
  safeRelative(target, "decision target");
  if (allowedTarget(target, installedWorkflows)) return true;
  if (disposition !== "keep-current") return false;
  return new Set([
    ".speculo/README.md",
    ".speculo/workspace.json",
    ".speculo/install.json",
  ]).has(target);
}

function pathsOverlap(left, right) {
  return left === right || left.startsWith(right + "/") || right.startsWith(left + "/");
}

async function validatePlan(ctx, plan) {
  if (plan.schema_version !== 2 || !Array.isArray(plan.source_decisions) || !Array.isArray(plan.actions)) {
    throw new Error("Plan must use schema_version 2 and contain source_decisions and actions");
  }
  if (plan.backup_manifest_sha256 !== await sha256(ctx.manifestPath)) throw new Error("Plan backup manifest fingerprint does not match");
  const install = await readJson(join(ctx.stateRoot, "install.json"));
  const workflows = Array.isArray(install.workflows) ? install.workflows.filter((item) => typeof item === "string") : [];
  const expectedSources = new Set(ctx.manifest.files.map((entry) => entry.path));
  const decisions = new Map();
  for (const [index, decision] of plan.source_decisions.entries()) {
    if (!decision || typeof decision !== "object" || !VALID_DECISIONS.has(decision.disposition)) {
      throw new Error(`source_decisions[${index}] has an invalid disposition`);
    }
    const source = safeRelative(decision.path, `source_decisions[${index}] path`);
    if (!expectedSources.has(source)) throw new Error(`source_decisions[${index}] is not in the backup manifest: ${source}`);
    if (decisions.has(source)) throw new Error(`source_decisions[${index}] repeats ${source}`);
    if (typeof decision.target !== "string" || !allowedDecisionTarget(decision.target, decision.disposition, workflows)) {
      throw new Error(`source_decisions[${index}] target is outside runtime ownership: ${decision.target}`);
    }
    decisions.set(source, decision);
  }
  for (const source of expectedSources) {
    if (!decisions.has(source)) throw new Error("Plan has no decision for backup entry: " + source);
  }

  const actionSources = new Set();
  const seenTargets = new Set();
  for (const [index, action] of plan.actions.entries()) {
    if (!action || typeof action !== "object" || !VALID_ACTIONS.has(action.kind)) throw new Error(`actions[${index}] has an invalid kind`);
    if (typeof action.source_decision !== "string") throw new Error(`actions[${index}] must explicitly name source_decision`);
    const actionSource = safeRelative(action.source_decision, `actions[${index}] source_decision`);
    const decision = decisions.get(actionSource);
    if (!decision) throw new Error(`actions[${index}] source_decision is not in source_decisions: ${actionSource}`);
    if (actionSources.has(actionSource)) throw new Error(`actions[${index}] duplicates source action: ${actionSource}`);
    actionSources.add(actionSource);
    if (typeof action.to !== "string" || !allowedTarget(action.to, workflows)) {
      throw new Error(`actions[${index}] target is outside runtime ownership: ${action.to}`);
    }
    if (decision.target !== action.to) throw new Error(`actions[${index}] target must match source decision target`);
    for (const target of seenTargets) {
      if (pathsOverlap(target, action.to)) throw new Error(`actions[${index}] overlaps target ${target}`);
    }
    seenTargets.add(action.to);
    if (action.kind === "copy") {
      if (decision.disposition !== "restore") throw new Error(`actions[${index}] copy must implement a restore decision`);
      if (action.from !== actionSource) throw new Error(`actions[${index}] copy source must match source_decision`);
      const source = inside(ctx.backupRoot, actionSource);
      if (!(await exists(source))) throw new Error(`actions[${index}] source does not exist: ${actionSource}`);
    } else if (action.kind === "replace-json") {
      if (!new Set(["merge-json", "replace-json"]).has(decision.disposition)) {
        throw new Error(`actions[${index}] replace-json must implement a merge-json or replace-json decision`);
      }
      if (!action.to.endsWith(".json") || action.value === undefined) throw new Error(`actions[${index}] replace-json needs a JSON target and value`);
      JSON.stringify(action.value);
    } else if (action.kind === "keep-current") {
      if (decision.disposition !== "keep-current") throw new Error(`actions[${index}] keep-current must implement a keep-current decision`);
    } else if (decision.disposition !== "remove-current") {
      throw new Error(`actions[${index}] remove-current must implement a remove-current decision`);
    }
    if (typeof action.expected_target !== "string") throw new Error(`actions[${index}] must contain expected_target`);
    const currentFingerprint = await fingerprint(inside(ctx.speculoRoot, action.to));
    if (currentFingerprint !== action.expected_target) throw new Error(`actions[${index}] target drifted: ${action.to}`);
  }

  for (const [source, decision] of decisions) {
    if (decision.disposition !== "keep-current" && !actionSources.has(source)) {
      throw new Error(`source_decisions entry requires an action: ${source}`);
    }
  }
  return workflows;
}

async function validateJsonTree(root) {
  const failures = [];
  for (const entry of await walk(root, root, { exclude: (item) => item === ".speculo/back" || item.startsWith(".speculo/back/") })) {
    if (entry.type !== "file" || !entry.path.endsWith(".json")) continue;
    try {
      await readJson(join(root, entry.path));
    } catch (error) {
      failures.push(entry.path + ": " + String(error));
    }
  }
  return failures;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function stringOrNull(value) {
  return value === null || typeof value === "string";
}

function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const CHANGE_NAME_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARCHIVE_PATH_PATTERN = /^<Path>\{roots\.state\}\/specdev\/archive\/[^<]+<\/Path>$/;
const EVIDENCE_PATH_PATTERN = /^<Path>\{roots\.state\}\/specdev\/changes\/[^<]+\/evidence\/T-[0-9]{2,}\.md<\/Path>$/;

function validIntegrationV4(integration, worktreeStatus, sourceCheckpoint, change, ticketId) {
  const required = [
    "status", "parent_before_sha", "source_sha", "candidate_sha", "candidate_branch",
    "candidate_workspace_ref", "result_sha", "method", "conflict_paths", "verification",
    "e2e", "evidence", "attempts",
  ];
  if (!isObject(integration) || !hasExactKeys(integration, required)) return false;
  if (!new Set(["pending", "candidate", "passed", "failed", "stale"]).has(integration.status)) return false;
  if (!new Set([null, "fast-forward", "merge-commit"]).has(integration.method)) return false;
  if (!new Set(["pending", "passed", "failed"]).has(integration.verification)) return false;
  for (const key of ["parent_before_sha", "source_sha", "candidate_sha", "candidate_branch", "result_sha"]) {
    if (!stringOrNull(integration[key])) return false;
  }
  if (
    integration.candidate_workspace_ref !== null &&
    (typeof integration.candidate_workspace_ref !== "string" ||
      !/^specdev-worktree\/\.integration\/T-[0-9]{2,}$/.test(integration.candidate_workspace_ref))
  ) return false;
  if (!stringArray(integration.conflict_paths)) return false;
  if (!Number.isInteger(integration.attempts) || integration.attempts < 0) return false;
  if (
    typeof integration.evidence !== "string" ||
    !EVIDENCE_PATH_PATTERN.test(integration.evidence) ||
    integration.evidence !== `<Path>{roots.state}/specdev/changes/${change}/evidence/${ticketId}.md</Path>`
  ) return false;

  const e2e = integration.e2e;
  if (!isObject(e2e) || !hasExactKeys(e2e, ["required", "status", "evidence"])) return false;
  if (typeof e2e.required !== "boolean" || !new Set(["not-required", "pending", "passed", "failed"]).has(e2e.status)) return false;
  if (!stringOrNull(e2e.evidence)) return false;
  if (e2e.required === false && e2e.status !== "not-required") return false;
  if (e2e.required === true && e2e.status === "not-required") return false;
  if (e2e.required === true && e2e.status === "passed" && !nonEmptyString(e2e.evidence)) return false;

  if (new Set(["integrating", "integrated", "removed"]).has(worktreeStatus)) {
    if (
      !nonEmptyString(integration.parent_before_sha) ||
      !nonEmptyString(integration.source_sha) ||
      integration.source_sha !== sourceCheckpoint ||
      !nonEmptyString(integration.candidate_sha) ||
      integration.candidate_branch !== `speculo/integration/${change}/${ticketId}` ||
      integration.candidate_workspace_ref !== `specdev-worktree/.integration/${ticketId}` ||
      !new Set(["fast-forward", "merge-commit"]).has(integration.method) ||
      !Number.isInteger(integration.attempts) ||
      integration.attempts < 1
    ) return false;
  }
  if (worktreeStatus === "integrating" && integration.status !== "candidate") return false;
  if (new Set(["integrated", "removed"]).has(worktreeStatus)) {
    if (
      integration.status !== "passed" ||
      integration.verification !== "passed" ||
      !nonEmptyString(integration.result_sha) ||
      integration.result_sha !== integration.candidate_sha ||
      !new Set(["not-required", "passed"]).has(e2e.status)
    ) return false;
    if (integration.method === "fast-forward" && (integration.candidate_sha !== sourceCheckpoint || integration.conflict_paths.length > 0)) return false;
    if (integration.method === "merge-commit" && (integration.candidate_sha === sourceCheckpoint || integration.candidate_sha === integration.parent_before_sha)) return false;
  }
  return true;
}

function validChangeStatusV4(status, expectedChange, expectedStatus) {
  const required = [
    "schema_version", "artifact", "change", "change_status", "current_work", "created_at",
    "updated_at", "completed_at", "archived", "archive_path", "blockers", "deviations", "worktrees",
  ];
  if (
    !isObject(status) ||
    !hasExactKeys(status, required) ||
    status.schema_version !== 4 ||
    status.artifact !== "change-status" ||
    status.change !== expectedChange ||
    !CHANGE_NAME_PATTERN.test(String(status.change)) ||
    !expectedStatus.has(status.change_status) ||
    !(status.current_work === null || typeof status.current_work === "string") ||
    !nonEmptyString(status.created_at) ||
    !nonEmptyString(status.updated_at) ||
    !(status.completed_at === null || nonEmptyString(status.completed_at)) ||
    typeof status.archived !== "boolean" ||
    !(status.archive_path === null || (typeof status.archive_path === "string" && ARCHIVE_PATH_PATTERN.test(status.archive_path))) ||
    !stringArray(status.blockers) ||
    !stringArray(status.deviations) ||
    !Array.isArray(status.worktrees)
  ) return false;
  if (status.change_status === "archived") {
    if (status.archived !== true || typeof status.archive_path !== "string" || !ARCHIVE_PATH_PATTERN.test(status.archive_path)) return false;
  } else if (status.archived !== false) {
    return false;
  }

  const seenTickets = new Set();
  return status.worktrees.every((worktree) => {
    const requiredWorktree = [
      "ticket_id", "owner", "implementation_owner", "integration_owner", "provider", "base_sha",
      "parent_branch", "branch", "workspace_ref", "source_checkpoint", "integration", "status", "updated_at",
    ];
    if (!isObject(worktree) || !hasExactKeys(worktree, requiredWorktree) || worktree.provider !== "git") return false;
    if (typeof worktree.ticket_id !== "string" || !/^T-[0-9]{2,}$/.test(worktree.ticket_id)) return false;
    if (seenTickets.has(worktree.ticket_id)) return false;
    seenTickets.add(worktree.ticket_id);
    for (const key of ["owner", "implementation_owner", "integration_owner", "base_sha", "parent_branch", "branch", "updated_at"]) {
      if (!nonEmptyString(worktree[key])) return false;
    }
    if (worktree.parent_branch === worktree.branch) return false;
    if (worktree.workspace_ref !== `specdev-worktree/${worktree.ticket_id}`) return false;
    if (!new Set(["planned", "active", "review", "integrating", "integrated", "removed", "blocked"]).has(worktree.status)) return false;
    const sourceRequired = new Set(["review", "integrating", "integrated", "removed"]).has(worktree.status);
    if (sourceRequired ? !nonEmptyString(worktree.source_checkpoint) : !stringOrNull(worktree.source_checkpoint)) return false;
    return validIntegrationV4(worktree.integration, worktree.status, worktree.source_checkpoint, expectedChange, worktree.ticket_id);
  });
}

function validateChangeStatusV6(status, expectedChange, expectedStatus) {
  const failures = [];
  if (!isObject(status) || status.schema_version !== CHANGE_STATUS_SCHEMA_VERSION || status.artifact !== "change-status" || status.change !== expectedChange || !expectedStatus.has(status.change_status)) {
    return ["invalid or incomplete change-status v6 contract: " + expectedChange];
  }
  if (!Array.isArray(status.worktrees)) return ["change-status v6 worktrees must be an array: " + expectedChange];
  const previous = { ...status, schema_version: 5 };
  if (!isObject(previous.execution_authorization) || !isObject(previous.leadership) || !Array.isArray(previous.works_run) || !Array.isArray(previous.claimed_investigations)) {
    failures.push("change-status v6 is missing execution authority or leadership state: " + expectedChange);
  }
  const worktreeKeys = [
    "ticket_id", "owner", "implementation_owner", "integration_owner", "provider", "base_sha",
    "parent_branch", "branch", "workspace_ref", "source_checkpoint", "integration", "status", "updated_at",
  ];
  const integrationKeys = [
    "status", "parent_ref", "parent_before_sha", "source_sha", "candidate_sha", "candidate_tree_sha",
    "candidate_branch", "candidate_workspace_ref", "result_sha", "method", "conflict_paths", "verification",
    "full_suite", "e2e", "evidence", "attempts", "promotion_status",
  ];
  for (const worktree of status.worktrees) {
    if (!isObject(worktree)) { failures.push("change-status v6 contains an invalid worktree"); continue; }
    if (!hasExactKeys(worktree, worktreeKeys) || worktree.provider !== "git" || !/^T-[0-9]{2,}$/.test(String(worktree.ticket_id))) {
      failures.push("change-status v6 contains an incomplete worktree: " + String(worktree.ticket_id));
      continue;
    }
    const current = worktree.workspace_ref === "current";
    if (current && worktree.parent_branch !== worktree.branch) failures.push(`${worktree.ticket_id}: current branch must equal parent_branch`);
    if (!current && worktree.parent_branch === worktree.branch) failures.push(`${worktree.ticket_id}: required branch must differ from parent_branch`);
    const integration = isObject(worktree.integration) ? worktree.integration : {};
    if (!hasExactKeys(integration, integrationKeys) || !Number.isInteger(integration.attempts) || integration.attempts < 0 || !Array.isArray(integration.conflict_paths)) {
      failures.push(`${worktree.ticket_id}: integration contract is incomplete`);
      continue;
    }
    for (const key of ["full_suite", "e2e"]) {
      const suite = integration[key];
      if (!isObject(suite) || !hasExactKeys(suite, ["required", "status", "reason", "evidence"]) || typeof suite.required !== "boolean") {
        failures.push(`${worktree.ticket_id}: ${key} contract is incomplete`);
      }
    }
    if (current && ["candidate_sha", "candidate_tree_sha", "candidate_branch", "candidate_workspace_ref"].some((key) => integration[key] !== null)) failures.push(`${worktree.ticket_id}: current workspace cannot contain candidate fields`);
    if (current && integration.method !== null && integration.method !== "direct-parent") failures.push(`${worktree.ticket_id}: current workspace requires direct-parent`);
    if (!current && integration.method === "direct-parent") failures.push(`${worktree.ticket_id}: required workspace cannot use direct-parent`);
  }
  return failures;
}

function validateChangeStatusV4(status, expectedChange, expectedStatus) {
  return validChangeStatusV4(status, expectedChange, expectedStatus)
    ? []
    : ["invalid or incomplete change-status v4 contract: " + expectedChange];
}

function parseGoalPlanScalar(raw) {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner ? inner.split(",").map((item) => parseGoalPlanScalar(item)) : [];
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function parseGoalPlanFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) return null;
  const meta = {};
  let currentListKey = null;
  for (const line of lines.slice(1, end)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (currentListKey && /^\s+-\s+/.test(line)) {
      meta[currentListKey].push(parseGoalPlanScalar(line.replace(/^\s+-\s+/, "")));
      continue;
    }
    currentListKey = null;
    const colon = line.indexOf(":");
    if (colon < 1) return null;
    const key = line.slice(0, colon).trim();
    if (key in meta) return null;
    const raw = line.slice(colon + 1).trim();
    if (!raw) {
      meta[key] = [];
      currentListKey = key;
    } else {
      meta[key] = parseGoalPlanScalar(raw);
    }
  }
  return meta;
}

function validGoalPlanV4(meta, change) {
  const required = [
    "schema_version", "artifact", "change", "status", "modes", "orchestration", "lead",
    "implementation_agent_limit", "ticket_workspace_policy", "integration_gate", "ready_for_execution",
  ];
  if (!isObject(meta) || !hasExactKeys(meta, required)) return false;
  if (
    meta.schema_version !== 4 ||
    meta.artifact !== "goal-plan" ||
    meta.change !== change ||
    !new Set(["draft", "ready", "in_progress", "completed", "blocked"]).has(meta.status) ||
    meta.orchestration !== "lead-directed" ||
    !nonEmptyString(meta.lead) ||
    !Number.isInteger(meta.implementation_agent_limit) ||
    meta.implementation_agent_limit < 1 ||
    !new Set(["current", "required"]).has(meta.ticket_workspace_policy) ||
    !new Set(["direct-parent", "candidate-merge"]).has(meta.integration_gate) ||
    (meta.ticket_workspace_policy === "current" && meta.integration_gate !== "direct-parent") ||
    (meta.ticket_workspace_policy === "required" && meta.integration_gate !== "candidate-merge") ||
    typeof meta.ready_for_execution !== "boolean" ||
    !Array.isArray(meta.modes)
  ) return false;
  return meta.modes.every((mode) => new Set(["migration", "high-assurance", "reference-conformance", "release-coordination"]).has(mode)) &&
    new Set(meta.modes).size === meta.modes.length;
}

function validGoalPlanV6(meta, change) {
  const required = [
    "schema_version", "artifact", "change", "status", "modes", "orchestration", "lead",
    "implementation_agent_limit", "integration_attempt_limit", "ticket_workspace_policy", "integration_gate", "ready_for_execution",
  ];
  if (!isObject(meta) || !hasExactKeys(meta, required) || meta.schema_version !== GOAL_PLAN_SCHEMA_VERSION) return false;
  const { integration_attempt_limit: integrationAttemptLimit, ...previous } = meta;
  return validGoalPlanV4({ ...previous, schema_version: 4 }, change) &&
    Number.isInteger(integrationAttemptLimit) && integrationAttemptLimit >= 1;
}

async function validateGoalPlanV4(changeRoot, change) {
  const path = join(changeRoot, "goal-plan.md");
  if (!(await exists(path))) return [];
  const text = await readFile(path, "utf8");
  return validGoalPlanV4(parseGoalPlanFrontmatter(text), change)
    ? []
    : ["Goal Plan is not the complete fixed Lead/candidate-integration v4 contract: " + change];
}

async function validateGoalPlanV6(changeRoot, change) {
  const path = join(changeRoot, "goal-plan.md");
  if (!(await exists(path))) return [];
  return validGoalPlanV6(parseGoalPlanFrontmatter(await readFile(path, "utf8")), change)
    ? []
    : ["Goal Plan is not the complete Lead/workspace v6 contract: " + change];
}

function validSpecdevConfigV4(config) {
  const rootKeys = ["schema_version", "interaction_language", "artifact_language", "git", "execution", "verification", "planning"];
  if (
    !isObject(config) ||
    !hasExactKeys(config, rootKeys) ||
    config.schema_version !== 4 ||
    !nonEmptyString(config.interaction_language) ||
    !nonEmptyString(config.artifact_language) ||
    !isObject(config.git) ||
    !isObject(config.execution) ||
    !isObject(config.verification) ||
    !isObject(config.planning)
  ) return false;
  if (!hasExactKeys(config.git, ["default_branch"]) || !(config.git.default_branch === null || typeof config.git.default_branch === "string")) return false;
  if (!hasExactKeys(config.execution, ["max_implementation_agents", "deep_ticket_human_approval", "shared_path_owner"])) return false;
  if (
    !Number.isInteger(config.execution.max_implementation_agents) ||
    config.execution.max_implementation_agents < 1 ||
    typeof config.execution.deep_ticket_human_approval !== "boolean" ||
    !nonEmptyString(config.execution.shared_path_owner)
  ) return false;
  for (const key of ["test", "typecheck", "lint", "build"]) {
    if (!(key in config.verification) || !stringOrNull(config.verification[key])) return false;
  }
  return new Set(["lite", "standard", "deep"]).has(config.planning.default_depth) &&
    typeof config.planning.require_ready_gate === "boolean" &&
    typeof config.planning.require_evidence === "boolean";
}

function validSpecdevConfigV5(config) {
  const rootKeys = ["schema_version", "interaction_language", "artifact_language", "git", "execution", "verification", "planning"];
  if (!isObject(config) || !hasExactKeys(config, rootKeys) || config.schema_version !== CONFIG_SCHEMA_VERSION || !isObject(config.git) || !isObject(config.execution) || !isObject(config.verification) || !isObject(config.planning)) return false;
  if (!hasExactKeys(config.git, ["default_branch"]) || !(config.git.default_branch === null || typeof config.git.default_branch === "string")) return false;
  if (!hasExactKeys(config.execution, ["max_implementation_agents", "max_integration_attempts", "deep_ticket_human_approval", "shared_path_owner"])) return false;
  if (!Number.isInteger(config.execution.max_implementation_agents) || config.execution.max_implementation_agents < 1 || !Number.isInteger(config.execution.max_integration_attempts) || config.execution.max_integration_attempts < 1 || typeof config.execution.deep_ticket_human_approval !== "boolean" || !nonEmptyString(config.execution.shared_path_owner)) return false;
  for (const key of ["test", "typecheck", "lint", "build"]) if (!(key in config.verification) || !stringOrNull(config.verification[key])) return false;
  return new Set(["lite", "standard", "deep"]).has(config.planning.default_depth) && typeof config.planning.require_ready_gate === "boolean" && typeof config.planning.require_evidence === "boolean" && Number.isInteger(config.planning.ui_prototype_default_variants) && config.planning.ui_prototype_default_variants >= 1 && Number.isInteger(config.planning.ui_prototype_max_variants) && config.planning.ui_prototype_max_variants >= config.planning.ui_prototype_default_variants;
}

async function validateSpecdev(speculoRoot) {
  const statusPath = join(speculoRoot, ".speculo", "specdev", "status.json");
  if (!(await exists(statusPath))) return [];
  const failures = [];
  const status = await readJson(statusPath);
  if (status.schema_version !== 5 || status.workflow !== "specdev" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    return [".speculo/specdev/status.json is not SpecDev global status v5"];
  }
  const active = new Set();
  for (const entry of status.active) {
    if (!entry || typeof entry.change !== "string") {
      failures.push("SpecDev active entry has no change name");
      continue;
    }
    if (active.has(entry.change)) failures.push("duplicate SpecDev active entry: " + entry.change);
    active.add(entry.change);
    const path = join(speculoRoot, ".speculo", "specdev", "changes", entry.change, ".status.json");
    if (!(await exists(path))) {
      failures.push("missing active change state: " + entry.change);
    } else {
      const changeStatus = await readJson(path);
      if (changeStatus.schema_version === CHANGE_STATUS_SCHEMA_VERSION) {
        failures.push(...validateChangeStatusV6(changeStatus, entry.change, new Set(["active", "blocked", "completed"])));
      } else {
        failures.push(...validateChangeStatusV4(changeStatus, entry.change, new Set(["active", "blocked", "completed"])));
      }
      failures.push(...(await exists(join(dirname(path), "goal-plan.md")) && (await readFile(join(dirname(path), "goal-plan.md"), "utf8")).startsWith("---\nschema_version: 6")
        ? await validateGoalPlanV6(dirname(path), entry.change)
        : await validateGoalPlanV4(dirname(path), entry.change)));
    }
  }
  const archived = new Set();
  for (const name of status.archived) {
    if (typeof name !== "string") {
      failures.push("SpecDev archived entry is not a string");
      continue;
    }
    if (archived.has(name)) failures.push("duplicate SpecDev archived entry: " + name);
    archived.add(name);
    if (active.has(name)) failures.push("SpecDev active/archive overlap: " + name);
    const path = join(speculoRoot, ".speculo", "specdev", "archive", name.slice(0, 7), name, ".status.json");
    if (!(await exists(path))) {
      failures.push("missing archived change state: " + name);
    } else {
      const archivedStatus = await readJson(path);
      failures.push(...(archivedStatus.schema_version === CHANGE_STATUS_SCHEMA_VERSION
        ? validateChangeStatusV6(archivedStatus, name, new Set(["archived"]))
        : validateChangeStatusV4(archivedStatus, name, new Set(["archived"]))));
    }
  }
  const changesRoot = join(speculoRoot, ".speculo", "specdev", "changes");
  if (await exists(changesRoot)) {
    for (const entry of await readdir(changesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!(await exists(join(changesRoot, entry.name, ".status.json")))) failures.push("change directory has no state: " + entry.name);
      else if (!active.has(entry.name)) failures.push("unindexed active change: " + entry.name);
    }
  }
  const archiveRoot = join(speculoRoot, ".speculo", "specdev", "archive");
  if (await exists(archiveRoot)) {
    for (const monthEntry of await readdir(archiveRoot, { withFileTypes: true })) {
      if (!monthEntry.isDirectory()) continue;
      const monthRoot = join(archiveRoot, monthEntry.name);
      for (const changeEntry of await readdir(monthRoot, { withFileTypes: true })) {
        if (!changeEntry.isDirectory()) continue;
        if (!(await exists(join(monthRoot, changeEntry.name, ".status.json")))) failures.push("archived change directory has no state: " + changeEntry.name);
        else if (!archived.has(changeEntry.name)) failures.push("unindexed archived change: " + changeEntry.name);
      }
    }
  }
  const configPath = join(speculoRoot, ".speculo", "specdev", "config.json");
  if (await exists(configPath)) {
    const config = await readJson(configPath);
    if (!validSpecdevConfigV5(config)) failures.push(".speculo/specdev/config.json is not the complete schema-v5 execution contract");
  }
  return failures;
}

async function validatePerson(speculoRoot) {
  const path = join(speculoRoot, ".speculo", "person", "status.json");
  if (!(await exists(path))) return [];
  const status = await readJson(path);
  return status.schema_version === 1 && status.workflow === "person" && Array.isArray(status.active)
    ? []
    : [".speculo/person/status.json is not person status schema v1"];
}

async function validateActive(speculoRoot, allowPending = false) {
  const failures = [];
  let config;
  let workspace;
  let install;
  try {
    config = await readJson(join(speculoRoot, "config.json"));
    if (config.schema_version !== 1) failures.push("config.json is not schema v1");
  } catch (error) {
    failures.push("config.json: " + String(error));
  }
  try {
    workspace = await readJson(join(speculoRoot, ".speculo", "workspace.json"));
    const roots = workspace.roots;
    if (
      workspace.schema_version !== 1 || workspace.path_base !== "project-root" ||
      !roots || ["config", "speculo", "state", "commands", "skills", "workflows"].some((key) => typeof roots[key] !== "string")
    ) failures.push(".speculo/workspace.json is not a project-root schema-v1 workspace");
  } catch (error) {
    failures.push(".speculo/workspace.json: " + String(error));
  }
  try {
    install = await readJson(join(speculoRoot, ".speculo", "install.json"));
    if (
      install.schema_version !== 1 || typeof install.package_version !== "string" ||
      !Array.isArray(install.workflows) || install.workflows.some((item) => typeof item !== "string") ||
      new Set(install.workflows).size !== install.workflows.length
    ) {
      failures.push(".speculo/install.json is not a valid schema-v1 install manifest");
    } else {
      for (const workflow of install.workflows) {
        if (!(await exists(join(speculoRoot, "workflows", workflow, "INDEX.md")))) failures.push("missing installed workflow INDEX: " + workflow);
        if (!(await exists(join(speculoRoot, ".speculo", workflow, "status.json")))) failures.push("missing installed workflow state: " + workflow);
      }
    }
  } catch (error) {
    failures.push(".speculo/install.json: " + String(error));
  }
  if (!allowPending && await exists(join(speculoRoot, ".speculo", "migration.json"))) failures.push("pending migration marker still exists");
  failures.push(...await validateJsonTree(speculoRoot));
  failures.push(...await validateSpecdev(speculoRoot));
  failures.push(...await validatePerson(speculoRoot));
  if (failures.length) throw new Error("Migrated runtime validation failed:\n- " + failures.join("\n- "));
}

async function assertNoSymlinks(root) {
  for (const entry of await walk(root)) {
    if (entry.type === "symlink") throw new Error("Runtime contains a symbolic link: " + entry.path);
  }
}

async function applyAction(ctx, stagedSpeculo, action) {
  if (action.kind === "keep-current") return;
  const destination = inside(stagedSpeculo, action.to);
  await assertNoSymlinkPath(stagedSpeculo, action.to);
  if (action.kind === "remove-current") {
    await rm(destination, { recursive: true, force: true });
    return;
  }
  await mkdir(dirname(destination), { recursive: true });
  if (action.kind === "copy") {
    const source = inside(ctx.backupRoot, action.from);
    const stat = await lstat(source);
    await rm(destination, { recursive: true, force: true });
    await cp(source, destination, {
      recursive: stat.isDirectory(),
      force: true,
      verbatimSymlinks: true,
    });
    return;
  }
  await writeFile(destination, JSON.stringify(action.value, null, 2) + "\n", "utf8");
}

async function apply(projectRoot, planPath, confirmed) {
  if (!confirmed) throw new Error("apply requires --confirmed");
  if (!planPath) throw new Error("apply requires --plan");
  const ctx = await context(projectRoot);
  const issues = await validateBackup(ctx);
  if (issues.length) throw new Error("Backup validation failed:\n- " + issues.join("\n- "));
  const plan = await readJson(resolve(planPath));
  await validatePlan(ctx, plan);

  const stageContainer = await mkdtemp(join(ctx.projectRoot, STAGE_PREFIX));
  const stagedSpeculo = join(stageContainer, "speculo");
  const rollbackRoot = join(ctx.projectRoot, ROLLBACK_NAME);
  let oldMoved = false;
  let newInstalled = false;
  try {
    await cp(ctx.speculoRoot, stagedSpeculo, { recursive: true, force: true });
    for (const action of plan.actions) await applyAction(ctx, stagedSpeculo, action);
    await assertNoSymlinks(stagedSpeculo);
    await validateActive(stagedSpeculo, true);
    await rm(join(stagedSpeculo, ".speculo", "migration.json"), { force: true });
    await assertNoSymlinks(stagedSpeculo);
    await rename(ctx.speculoRoot, rollbackRoot);
    oldMoved = true;
    await rename(stagedSpeculo, ctx.speculoRoot);
    newInstalled = true;
    await assertNoSymlinks(ctx.speculoRoot);
    await validateActive(ctx.speculoRoot);
    const installedCtx = await contextWithCompletedMigration(ctx.projectRoot);
    const postIssues = await validateBackup(installedCtx, false);
    if (postIssues.length) throw new Error("Backup changed during migration:\n- " + postIssues.join("\n- "));
    await rm(rollbackRoot, { recursive: true, force: true });
    await rm(stageContainer, { recursive: true, force: true });
    return { ok: true, actions: plan.actions.length, rollback: "not-required", backup: "speculo/.speculo/back" };
  } catch (error) {
    if (newInstalled && await exists(ctx.speculoRoot)) await rm(ctx.speculoRoot, { recursive: true, force: true });
    if (oldMoved && await exists(rollbackRoot)) await rename(rollbackRoot, ctx.speculoRoot);
    await rm(stageContainer, { recursive: true, force: true });
    throw error;
  }
}

async function contextWithCompletedMigration(projectRoot) {
  const speculoRoot = join(projectRoot, "speculo");
  const stateRoot = join(speculoRoot, ".speculo");
  const backupRoot = join(stateRoot, "back");
  const manifestPath = join(backupRoot, "manifest.json");
  return {
    projectRoot,
    speculoRoot,
    stateRoot,
    backupRoot,
    manifestPath,
    manifest: await readJson(manifestPath),
  };
}

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    return usage();
  }
  if (args.help || !args.operation) return usage();
  try {
    if (args.operation === "inspect") {
      process.stdout.write(JSON.stringify(await inspect(args.project_root), null, 2) + "\n");
      return 0;
    }
    if (args.operation === "fingerprint") {
      if (!args.target) throw new Error("fingerprint requires --target");
      const ctx = await context(args.project_root);
      if (!allowedTarget(args.target, (await readJson(join(ctx.stateRoot, "install.json"))).workflows ?? [])) throw new Error("target is outside runtime ownership");
      process.stdout.write(await fingerprint(inside(ctx.speculoRoot, args.target)) + "\n");
      return 0;
    }
    if (args.operation === "apply") {
      process.stdout.write(JSON.stringify(await apply(args.project_root, args.plan, args.confirmed), null, 2) + "\n");
      return 0;
    }
    return usage();
  } catch (error) {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
