#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const CHANGE_NAME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST = /^[a-f0-9]{64}$/;

function parseArgs(argv) {
  const options = { stateRoot: null, scope: null, project: null, change: null, apply: false, expectedDigest: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--state-root") options.stateRoot = resolve(argv[++index] ?? "");
    else if (arg === "--scope") options.scope = argv[++index] ?? null;
    else if (arg === "--project") options.project = argv[++index] ?? null;
    else if (arg === "--change") options.change = argv[++index] ?? null;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--expected-digest") options.expectedDigest = argv[++index] ?? null;
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!options.stateRoot || !["global", "project"].includes(options.scope) || !CHANGE_NAME.test(options.change ?? "")) throw new Error("--state-root, --scope and a valid --change are required");
  if (options.scope === "project" && !PROJECT_ID.test(options.project ?? "")) throw new Error("project scope requires a valid --project");
  if (options.scope === "global" && options.project) throw new Error("global scope cannot use --project");
  if (options.apply && !DIGEST.test(options.expectedDigest ?? "")) throw new Error("--apply requires --expected-digest");
  return options;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}
function digestJson(value) { return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex"); }
function digestBytes(value) { return createHash("sha256").update(value).digest("hex"); }
function readJson(path, label) { try { return JSON.parse(readFileSync(path, "utf8")); } catch (error) { throw new Error(`${label}: invalid JSON (${error.message})`); } }
function entryKey(entry) { return `${entry.scope}:${entry.project_id ?? "-"}:${entry.change}`; }
function sameEntry(left, right) { return left?.scope === right.scope && left?.project_id === right.project_id && left?.change === right.change; }

function roots(options) {
  const entry = { scope: options.scope, project_id: options.scope === "project" ? options.project : null, change: options.change };
  const prefix = entry.scope === "global" ? "" : `projects/${entry.project_id}/`;
  const sourcePath = `${prefix}changes/${entry.change}`;
  const archivePath = `${prefix}archive/${entry.change.slice(0, 7)}/${entry.change}`;
  return { entry, sourcePath, archivePath, source: resolveState(options.stateRoot, sourcePath), archive: resolveState(options.stateRoot, archivePath) };
}

function resolveState(stateRoot, locator) {
  if (typeof locator !== "string" || !locator || locator.startsWith("/") || locator.includes("\\") || locator.split("/").includes("..")) throw new Error(`invalid state-relative path: ${String(locator)}`);
  const target = resolve(stateRoot, ...locator.split("/"));
  const rel = relative(resolve(stateRoot), target);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) throw new Error(`state-relative path escapes Ops root: ${locator}`);
  return target;
}

function resolveChange(changeRoot, locator) {
  if (typeof locator !== "string" || !locator || locator.startsWith("/") || locator.includes("\\") || locator.split("/").includes("..")) throw new Error(`invalid change-relative path: ${String(locator)}`);
  const target = resolve(changeRoot, ...locator.split("/"));
  const rel = relative(resolve(changeRoot), target);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) throw new Error(`change-relative path escapes change root: ${locator}`);
  return target;
}

function allowedTarget(entry, locator) {
  const allowed = entry.scope === "project"
    ? [`projects/${entry.project_id}/context/`, `projects/${entry.project_id}/adr/`, `projects/${entry.project_id}/runbooks/`, "context/", "adr/", "runbooks/"]
    : ["context/", "adr/", "runbooks/"];
  return allowed.some((root) => locator.startsWith(root));
}

function assertNoSymlinks(root) {
  if (!existsSync(root)) return;
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (lstatSync(child).isSymbolicLink()) throw new Error(`Ops state contains symlink: ${relative(root, child)}`);
      if (entry.isDirectory()) visit(child);
    }
  }
  visit(root);
}

async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  const temp = join(dirname(path), `.${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
  await writeFile(temp, bytes);
  await rename(temp, path);
}

function validate(options) {
  assertNoSymlinks(options.stateRoot);
  const located = roots(options);
  if (!existsSync(located.source)) throw new Error(`active change is missing: ${located.sourcePath}`);
  if (existsSync(located.archive)) throw new Error(`archive target already exists: ${located.archivePath}`);
  const statusPath = join(options.stateRoot, "status.json");
  const globalStatus = readJson(statusPath, "status.json");
  if (globalStatus.schema_version !== 2 || globalStatus.workflow !== "ops" || !Array.isArray(globalStatus.active) || !Array.isArray(globalStatus.archived)) throw new Error("status.json must use Ops schema v2");
  if (globalStatus.active.filter((item) => sameEntry(item, located.entry)).length !== 1 || globalStatus.archived.some((item) => sameEntry(item, located.entry))) throw new Error("global status does not identify exactly one active tuple");
  const changeStatusPath = join(located.source, ".status.json");
  const changeStatus = readJson(changeStatusPath, ".status.json");
  if (changeStatus.schema_version !== 2 || changeStatus.scope !== located.entry.scope || changeStatus.project_id !== located.entry.project_id || changeStatus.change !== located.entry.change || changeStatus.change_status !== "completed" || changeStatus.phase !== "ready_to_archive" || changeStatus.outcome === "pending" || changeStatus.blockers?.length) throw new Error("change is not ready to archive");
  if (!existsSync(join(located.source, "RETROSPECTIVE.md"))) throw new Error("RETROSPECTIVE.md is required");
  const manifestPath = join(located.source, "promotion", "manifest.json");
  const manifest = readJson(manifestPath, "promotion/manifest.json");
  const manifestDigest = digestJson(manifest);
  if (manifest.schema_version !== 1 || manifest.artifact !== "ops-promotion-manifest" || manifest.scope !== located.entry.scope || manifest.project_id !== located.entry.project_id || manifest.change !== located.entry.change || manifest.source_path !== located.sourcePath || manifest.archive_path !== located.archivePath || manifest.retrospective_path !== "RETROSPECTIVE.md" || !Array.isArray(manifest.writes)) throw new Error("promotion manifest identity/path mismatch");
  const targetSet = new Set();
  const writes = manifest.writes.map((item, index) => {
    if (!item || typeof item !== "object" || !item.staging_path?.startsWith("promotion/staging/") || !allowedTarget(located.entry, item.target_path) || !DIGEST.test(item.content_digest ?? "") || !(item.expected_target_digest === null || DIGEST.test(item.expected_target_digest))) throw new Error(`promotion write ${index} is invalid`);
    if (targetSet.has(item.target_path)) throw new Error(`duplicate promotion target: ${item.target_path}`);
    targetSet.add(item.target_path);
    const staging = resolveChange(located.source, item.staging_path);
    const target = resolveState(options.stateRoot, item.target_path);
    if (!existsSync(staging) || digestBytes(readFileSync(staging)) !== item.content_digest) throw new Error(`staging digest mismatch: ${item.staging_path}`);
    if (item.expected_target_digest === null ? existsSync(target) : !existsSync(target) || digestBytes(readFileSync(target)) !== item.expected_target_digest) throw new Error(`promotion target drift: ${item.target_path}`);
    if ((item.action === "create") !== (item.expected_target_digest === null)) throw new Error(`promotion action/target expectation mismatch: ${item.target_path}`);
    return { item, staging, target };
  });
  return { ...located, statusPath, globalStatus, changeStatusPath, changeStatus, manifest, manifestDigest, writes };
}

async function apply(options, context) {
  if (context.manifestDigest !== options.expectedDigest) throw new Error("expected digest does not match promotion manifest");
  const approval = readJson(join(context.source, "promotion", "approval.json"), "promotion/approval.json");
  if (approval.schema_version !== 1 || approval.artifact !== "ops-promotion-approval" || approval.scope !== context.entry.scope || approval.project_id !== context.entry.project_id || approval.change !== context.entry.change || approval.manifest_path !== "promotion/manifest.json" || approval.manifest_digest !== context.manifestDigest || approval.decision !== "approved" || !approval.decision_summary || Number.isNaN(Date.parse(approval.decided_at))) throw new Error("promotion approval does not bind the current manifest");

  const originalGlobal = readFileSync(context.statusPath);
  const originalChange = readFileSync(context.changeStatusPath);
  const originals = context.writes.map(({ target }) => existsSync(target) ? readFileSync(target) : null);
  const rollbackRoot = join(context.source, "promotion", "rollback");
  if (existsSync(rollbackRoot)) throw new Error("promotion rollback directory already exists");
  await mkdir(rollbackRoot, { recursive: true });
  const rollbackManifest = context.writes.map(({ item }, index) => ({ target_path: item.target_path, existed: originals[index] !== null, backup_path: originals[index] === null ? null : `promotion/rollback/${String(index + 1).padStart(3, "0")}.bak` }));
  for (const [index, bytes] of originals.entries()) if (bytes !== null) await writeFile(join(rollbackRoot, `${String(index + 1).padStart(3, "0")}.bak`), bytes);
  await writeFile(join(rollbackRoot, "manifest.json"), JSON.stringify({ schema_version: 1, writes: rollbackManifest }, null, 2) + "\n", "utf8");

  let moved = false;
  try {
    for (const { item, staging, target } of context.writes) await atomicWrite(target, readFileSync(staging));
    const archivedAt = new Date().toISOString();
    const nextChange = { ...context.changeStatus, change_status: "archived", phase: "archived", current_work: null, works_run: [...new Set([...(context.changeStatus.works_run ?? []), "ops/archive-and-learn"])], updated_at: archivedAt, archived_at: archivedAt, archive_path: `<Path>{roots.state}/ops/${context.archivePath}</Path>` };
    const nextGlobal = { ...context.globalStatus, active: context.globalStatus.active.filter((item) => !sameEntry(item, context.entry)), archived: [...context.globalStatus.archived, context.entry] };
    await atomicWrite(context.changeStatusPath, JSON.stringify(nextChange, null, 2) + "\n");
    await atomicWrite(context.statusPath, JSON.stringify(nextGlobal, null, 2) + "\n");
    await mkdir(dirname(context.archive), { recursive: true });
    await rename(context.source, context.archive);
    moved = true;
  } catch (error) {
    if (moved && existsSync(context.archive) && !existsSync(context.source)) await rename(context.archive, context.source);
    await atomicWrite(context.statusPath, originalGlobal);
    await atomicWrite(join(context.source, ".status.json"), originalChange);
    for (const [index, { target }] of context.writes.entries()) {
      if (originals[index] === null) await rm(target, { force: true });
      else await atomicWrite(target, originals[index]);
    }
    throw error;
  }
  if (!moved || existsSync(context.source) || !existsSync(context.archive)) throw new Error("archive move did not complete");
  console.log(`Ops close applied: ${entryKey(context.entry)} -> ${context.archivePath}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = validate(options);
  if (!options.apply) {
    console.log(`Ops close dry-run: ${entryKey(context.entry)}`);
    console.log(`Manifest digest: ${context.manifestDigest}`);
    console.log(`Knowledge writes: ${context.writes.length}`);
    console.log(`Archive target: ${context.archivePath}`);
    return;
  }
  await apply(options, context);
}

main().catch((error) => { console.error(`Ops close failed: ${error.message}`); process.exitCode = 1; });
