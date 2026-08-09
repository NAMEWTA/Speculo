#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const STAGE_PREFIX = ".speculo-runtime-migrate-stage-";
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
    "inspect and fingerprint are read-only. apply requires an explicit confirmed schema-v1 plan.",
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
      values.push({ path: item, type: "symlink" });
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
    if (entry.type === "symlink" || declared.type === "symlink") {
      issues.push("backup symlink requires manual recovery outside this command: " + entry.path);
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
  if (plan.schema_version !== 1 || !Array.isArray(plan.source_decisions) || !Array.isArray(plan.actions)) {
    throw new Error("Plan must use schema_version 1 and contain source_decisions and actions");
  }
  if (plan.backup_manifest_sha256 !== await sha256(ctx.manifestPath)) throw new Error("Plan backup manifest fingerprint does not match");
  const install = await readJson(join(ctx.stateRoot, "install.json"));
  const workflows = Array.isArray(install.workflows) ? install.workflows.filter((item) => typeof item === "string") : [];
  const expectedSources = new Set(ctx.manifest.files.map((entry) => entry.path));
  const seenSources = new Set();
  for (const [index, decision] of plan.source_decisions.entries()) {
    if (!decision || typeof decision !== "object" || !VALID_DECISIONS.has(decision.disposition)) {
      throw new Error(`source_decisions[${index}] has an invalid disposition`);
    }
    const source = safeRelative(decision.path, `source_decisions[${index}] path`);
    if (!expectedSources.has(source)) throw new Error(`source_decisions[${index}] is not in the backup manifest: ${source}`);
    if (seenSources.has(source)) throw new Error(`source_decisions[${index}] repeats ${source}`);
    if (typeof decision.target !== "string" || !allowedDecisionTarget(decision.target, decision.disposition, workflows)) {
      throw new Error(`source_decisions[${index}] target is outside runtime ownership: ${decision.target}`);
    }
    seenSources.add(source);
  }
  for (const source of expectedSources) {
    if (!seenSources.has(source)) throw new Error("Plan has no decision for backup entry: " + source);
  }
  const seenTargets = new Set();
  for (const [index, action] of plan.actions.entries()) {
    if (!action || typeof action !== "object" || !VALID_ACTIONS.has(action.kind)) throw new Error(`actions[${index}] has an invalid kind`);
    if (!allowedTarget(action.to, workflows)) throw new Error(`actions[${index}] target is outside runtime ownership: ${action.to}`);
    for (const target of seenTargets) {
      if (pathsOverlap(target, action.to)) throw new Error(`actions[${index}] overlaps target ${target}`);
    }
    seenTargets.add(action.to);
    if (action.kind === "copy") {
      const sourcePath = safeRelative(action.from, `actions[${index}] source`);
      if (sourcePath !== "config.json" && !sourcePath.startsWith("state/")) throw new Error(`actions[${index}] source is outside backup data: ${action.from}`);
      const source = inside(ctx.backupRoot, action.from);
      if (!(await exists(source))) throw new Error(`actions[${index}] source does not exist: ${action.from}`);
    }
    if (action.kind === "replace-json") {
      if (!action.to.endsWith(".json") || action.value === undefined) throw new Error(`actions[${index}] replace-json needs a JSON target and value`);
      JSON.stringify(action.value);
    }
    if (typeof action.expected_target !== "string") throw new Error(`actions[${index}] must contain expected_target`);
    const currentFingerprint = await fingerprint(inside(ctx.speculoRoot, action.to));
    if (currentFingerprint !== action.expected_target) throw new Error(`actions[${index}] target drifted: ${action.to}`);
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

async function validateSpecdev(speculoRoot) {
  const statusPath = join(speculoRoot, ".speculo", "specdev", "status.json");
  if (!(await exists(statusPath))) return [];
  const failures = [];
  const status = await readJson(statusPath);
  if (status.schema_version !== 4 || status.workflow !== "specdev" || !Array.isArray(status.active) || !Array.isArray(status.archived)) {
    return [".speculo/specdev/status.json is not SpecDev global status v4"];
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
      if (
        changeStatus.schema_version !== 3 ||
        changeStatus.artifact !== "change-status" ||
        changeStatus.change !== entry.change ||
        !new Set(["active", "blocked", "completed"]).has(changeStatus.change_status)
      ) failures.push("invalid active change state: " + entry.change);
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
      if (
        archivedStatus.schema_version !== 3 ||
        archivedStatus.artifact !== "change-status" ||
        archivedStatus.change !== name ||
        archivedStatus.change_status !== "archived"
      ) failures.push("invalid archived change state: " + name);
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
    if (config.schema_version !== 3) failures.push(".speculo/specdev/config.json is not schema v3");
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
    await cp(source, destination, { recursive: stat.isDirectory(), force: true });
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
    await validateActive(stagedSpeculo, true);
    await rm(join(stagedSpeculo, ".speculo", "migration.json"), { force: true });
    await rename(ctx.speculoRoot, rollbackRoot);
    oldMoved = true;
    await rename(stagedSpeculo, ctx.speculoRoot);
    newInstalled = true;
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
