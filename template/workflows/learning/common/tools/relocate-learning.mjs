#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { lstat, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLearningState } from "./validate-learning.mjs";

const CHANGE_ID = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRANSACTION_ID = /^[a-f0-9-]{36}$/;
const TERMINAL = new Set(["applied", "rolled-back", "aborted"]);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const encode = (value) => JSON.stringify(value, null, 2) + "\n";
const posix = (value) => value.split(sep).join("/");

function parseArgs(argv) {
  const result = { stateRoot: null, parent: null, sources: [], apply: false, expectDigest: null, resume: null, rollback: null };
  const fields = new Map([["--state-root", "stateRoot"], ["--parent", "parent"], ["--expect-digest", "expectDigest"], ["--resume", "resume"], ["--rollback", "rollback"]]);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") return { help: true };
    if (arg === "--apply") { result.apply = true; continue; }
    if (arg !== "--source" && !fields.has(arg)) throw new Error("unknown option: " + arg);
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error(arg + " requires a value");
    if (arg === "--source") result.sources.push(value);
    else result[fields.get(arg)] = value;
  }
  if (!result.stateRoot) throw new Error("--state-root is required");
  result.stateRoot = resolve(result.stateRoot);
  if (result.resume || result.rollback) {
    if (result.resume && result.rollback || result.apply || result.parent || result.sources.length || result.expectDigest) throw new Error("recovery cannot be combined with planning options");
    return result;
  }
  if (!CHANGE_ID.test(result.parent ?? "") || !result.sources.length || result.sources.some((id) => !CHANGE_ID.test(id))) throw new Error("valid --parent and at least one --source are required");
  if (new Set(result.sources).size !== result.sources.length || result.sources.includes(result.parent)) throw new Error("source IDs must be unique and distinct from parent");
  if (result.apply && !/^[a-f0-9]{64}$/.test(result.expectDigest ?? "")) throw new Error("--apply requires the reviewed --expect-digest from dry-run");
  return result;
}

async function info(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function safePath(root, locator) {
  if (typeof locator !== "string" || !locator || locator.includes("\\") || locator.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("invalid relative locator: " + locator);
  const path = resolve(root, ...locator.split("/"));
  if (!path.startsWith(root + sep)) throw new Error("path escapes Learning root: " + locator);
  const rootInfo = await info(root);
  if (!rootInfo?.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("state root must be a real directory");
  let current = root;
  for (const part of locator.split("/")) {
    current = join(current, part);
    const value = await info(current);
    if (value?.isSymbolicLink()) throw new Error("linked path is not allowed: " + locator);
  }
  return path;
}

async function readBytes(root, locator) {
  const path = await safePath(root, locator);
  if (!(await info(path))?.isFile()) throw new Error("required file is missing: " + locator);
  return readFile(path);
}
async function readJson(root, locator) { return JSON.parse((await readBytes(root, locator)).toString("utf8")); }

async function syncDirectory(path) {
  const handle = await open(path, "r").catch((error) => {
    if (["EISDIR", "EPERM", "EACCES"].includes(error.code)) return null;
    throw error;
  });
  if (!handle) return;
  try { await handle.sync(); }
  catch (error) { if (!["EINVAL", "ENOTSUP", "EBADF", "EPERM"].includes(error.code)) throw error; }
  finally { await handle.close(); }
}

async function atomicBytes(root, locator, bytes, token, mode = 0o600, recoverable = [bytes]) {
  const path = await safePath(root, locator);
  const temporary = await safePath(root, posix(relative(root, join(dirname(path), ".relocation-" + token + (token.endsWith("-journal") ? "-" + randomUUID() : "") + ".tmp"))));
  await mkdir(dirname(path), { recursive: true });
  const oldTemporary = await info(temporary);
  if (oldTemporary) {
    const staged = oldTemporary.isFile() ? await readFile(temporary) : null;
    if (!staged || !recoverable.some((candidate) => candidate.subarray(0, staged.length).equals(staged))) throw new Error("unexpected staged bytes: " + temporary);
    // This transaction's interrupted write may contain either direction's full
    // image or a prefix of it. Originals were checked before touching staging.
    await rm(temporary);
  }
  {
    const handle = await open(temporary, "wx", mode);
    try { await handle.chmod(mode); await handle.writeFile(bytes); await handle.sync(); }
    finally { await handle.close(); }
  }
  await rename(temporary, path);
  await syncDirectory(dirname(path));
}

async function treeSnapshot(root, locator, ignored = new Set()) {
  const base = await safePath(root, locator);
  if (!(await info(base))?.isDirectory()) throw new Error("Change directory is missing: " + locator);
  const result = [];
  async function visit(path) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(path, entry.name), name = posix(relative(base, file));
      if (ignored.has(name)) continue;
      const value = await lstat(file);
      if (value.isSymbolicLink() || !value.isFile() && !value.isDirectory()) throw new Error("unsupported entry in Change: " + name);
      if (value.isDirectory()) { result.push({ path: name, kind: "directory", mode: value.mode & 0o777 }); await visit(file); }
      else result.push({ path: name, kind: "file", sha256: digest(await readFile(file)), mode: value.mode & 0o777 });
    }
  }
  await visit(base);
  return result;
}

function assertValidState(root) {
  const errors = validateLearningState(root);
  if (errors.length) throw new Error("Learning state validation failed:\n" + errors.join("\n"));
}

function inputDigest(plan) {
  return digest(JSON.stringify({
    parent_change: plan.parent_change, sources: plan.sources,
    moves: plan.moves.map(({ id, from, to, tree }) => ({ id, from, to, tree })),
    files: plan.files.map(({ before_path, before }) => ({ before_path, sha256: digest(Buffer.from(before, "base64")) })),
  }));
}
function journalDigest(plan) { return digest(JSON.stringify({ moves: plan.moves, files: plan.files, lock_roots: plan.lock_roots })); }

async function buildPlan(options, transactionId) {
  const root = options.stateRoot;
  assertValidState(root);
  const status = await readJson(root, "status.json");
  const locations = await readJson(root, "locations.json");
  if (locations.schema_version !== 2 || locations.workflow !== "learning" || !Array.isArray(locations.entries)) throw new Error("locations.json must use Learning schema v2");
  const entries = new Map([...status.active, ...status.archived].map((entry) => [entry.change_id, entry]));
  const parent = entries.get(options.parent);
  if (!parent || !parent.locator.startsWith("changes/")) throw new Error("parent must be an unarchived Change");
  const parentState = await readJson(root, parent.locator + "/.status.json");
  if (parentState.kind !== "consolidation") throw new Error("parent must be a consolidation Change");
  const now = new Date().toISOString();
  const plan = { schema_version: 2, artifact: "learning-relocation-manifest", transaction_id: transactionId, parent_change: options.parent, sources: [...options.sources].sort(), created_at: now, status: "prepared", moves: [], files: [], lock_roots: [], completed_steps: [] };
  const nodes = new Map();
  for (const id of plan.sources) {
    const source = entries.get(id);
    if (!source || !source.locator.startsWith("changes/") || source.parent_change !== null) throw new Error("select an entire unarchived root subtree: " + id);
    if (parent.locator === source.locator || parent.locator.startsWith(source.locator + "/")) throw new Error("source/parent cycle: " + id);
    const to = parent.locator + "/children/" + id;
    if (await info(await safePath(root, to))) throw new Error("target already exists: " + to);
    const tree = await treeSnapshot(root, source.locator);
    plan.moves.push({ id, from: source.locator, to, tree, content_hash: digest(JSON.stringify(tree)) });
    for (const entry of entries.values()) {
      if (entry.locator !== source.locator && !entry.locator.startsWith(source.locator + "/")) continue;
      if (nodes.has(entry.change_id)) throw new Error("overlapping source subtrees");
      const value = await readJson(root, entry.locator + "/.status.json");
      const prefix = entry.locator.slice(source.locator.length + 1);
      const subtree = prefix ? tree.filter((item) => item.path.startsWith(prefix + "/")).map((item) => ({ ...item, path: item.path.slice(prefix.length + 1) })) : tree;
      nodes.set(entry.change_id, { entry: { ...entry }, value, to: to + entry.locator.slice(source.locator.length), selected: entry.change_id === id, contentHash: digest(JSON.stringify(subtree)) });
    }
  }
  const lockRoots = new Set([parent.root_change, ...plan.sources]);
  for (const id of lockRoots) if (!CHANGE_ID.test(id)) throw new Error("invalid root Change identity");
  plan.lock_roots = [...lockRoots].sort();
  async function record(beforePath, afterPath, afterValue) {
    const before = await readBytes(root, beforePath);
    plan.files.push({ before_path: beforePath, after_path: afterPath, before: before.toString("base64"), after: Buffer.from(encode(afterValue)).toString("base64"), mode: (await info(await safePath(root, beforePath))).mode & 0o777 });
  }
  for (const [id, node] of nodes) {
    const newParent = node.selected ? parent.change_id : node.entry.parent_change;
    const after = structuredClone(node.value);
    Object.assign(after, { locator: node.to, parent_change: newParent, root_change: parent.root_change, updated_at: now });
    after.children = after.children.map((child) => {
      const moved = nodes.get(child.change_id);
      return moved ? { ...child, locator: moved.to } : child;
    });
    await record(node.entry.locator + "/.status.json", node.to + "/.status.json", after);
    const location = locations.entries.find((entry) => entry.change_id === id);
    if (!location || location.locator !== node.entry.locator) throw new Error("location registration does not match " + id);
    location.previous = [...(location.previous ?? []), { locator: location.locator, moved_at: now, reason: "consolidate", content_hash: node.contentHash }];
    Object.assign(location, { locator: node.to, parent_change: newParent, root_change: parent.root_change, content_hash: node.contentHash, updated_at: now });
    const movedEntry = status.active.find((entry) => entry.change_id === id);
    if (!movedEntry) throw new Error("source descendant is not in active index: " + id);
    Object.assign(movedEntry, { locator: node.to, parent_change: newParent, root_change: parent.root_change, updated_at: now });
  }
  parentState.children = [...parentState.children];
  for (const move of plan.moves) {
    const node = nodes.get(move.id);
    if (parentState.children.some((child) => child.change_id === move.id)) throw new Error("duplicate child identity");
    const dates = [...nodes.values()].filter((child) => child.entry.locator === move.from || child.entry.locator.startsWith(move.from + "/")).map((child) => child.value.updated_at);
    parentState.children.push({ change_id: move.id, locator: move.to, content_hash: move.content_hash, effective_at: dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0], lifecycle: node.value.lifecycle });
  }
  parentState.updated_at = now;
  status.active.find((entry) => entry.change_id === parent.change_id).updated_at = now;
  await record(parent.locator + "/.status.json", parent.locator + "/.status.json", parentState);
  await record("locations.json", "locations.json", locations);
  await record("status.json", "status.json", status);
  plan.plan_digest = inputDigest(plan);
  plan.journal_digest = journalDigest(plan);
  return plan;
}

function lockOwnerIsAlive(owner) {
  if (owner.host !== hostname() || !Number.isInteger(owner.pid) || owner.pid <= 0) return true;
  try { process.kill(owner.pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
}

async function releaseLock(root, lock) {
  if (!lock) return;
  const path = await safePath(root, lock.locator), current = await info(path);
  if (!current || current.ino !== lock.ino || current.dev !== lock.dev) return;
  if ((await readFile(path, "utf8")) !== lock.bytes) return;
  await rm(path);
  await syncDirectory(dirname(path));
}

async function acquireLock(root, locator, transactionId, token, recovering) {
  const path = await safePath(root, locator);
  await mkdir(dirname(path), { recursive: true });
  const existing = await info(path);
  if (existing) {
    if (!recovering || !existing.isFile()) throw new Error("lock is owned by another invocation: " + locator);
    const bytes = await readFile(path, "utf8");
    let owner;
    try { owner = JSON.parse(bytes); } catch { throw new Error("unrecognized lock: " + locator); }
    if (owner.transaction_id !== transactionId || owner.token !== token || lockOwnerIsAlive(owner)) throw new Error("lock cannot be reclaimed: " + locator);
    await releaseLock(root, { locator, ino: existing.ino, dev: existing.dev, bytes });
  }
  const owner = { transaction_id: transactionId, token, host: hostname(), pid: process.pid };
  const bytes = encode(owner), handle = await open(path, "wx", 0o600);
  let value;
  try { await handle.writeFile(bytes); await handle.sync(); value = await handle.stat(); }
  finally { await handle.close(); }
  await syncDirectory(dirname(path));
  return { locator, bytes, ino: value.ino, dev: value.dev, owner };
}

function validateManifest(plan, manifestLocator) {
  if (plan.schema_version !== 2 || plan.artifact !== "learning-relocation-manifest" || !TRANSACTION_ID.test(plan.transaction_id ?? "") || manifestLocator !== "transactions/relocation/" + plan.transaction_id + "/manifest.json") throw new Error("invalid relocation manifest identity or location");
  if (!TRANSACTION_ID.test(plan.owner_token ?? "") || !Array.isArray(plan.completed_steps) || !Array.isArray(plan.moves) || !plan.moves.length || !Array.isArray(plan.files) || !Array.isArray(plan.lock_roots) || plan.lock_roots.some((id) => !CHANGE_ID.test(id))) throw new Error("invalid relocation manifest structure");
  if (inputDigest(plan) !== plan.plan_digest || journalDigest(plan) !== plan.journal_digest) throw new Error("relocation manifest digest mismatch");
  for (const move of plan.moves) {
    if (!CHANGE_ID.test(move.id) || move.from !== "changes/" + move.id || !move.to.startsWith("changes/") || !move.to.endsWith("/children/" + move.id) || !Array.isArray(move.tree)) throw new Error("invalid relocation move");
  }
  for (const file of plan.files) {
    if (!["status.json", "locations.json"].includes(file.before_path) && (!file.before_path.startsWith("changes/") || !file.before_path.endsWith("/.status.json"))) throw new Error("invalid metadata write target");
    const move = plan.moves.find((item) => file.before_path.startsWith(item.from + "/"));
    const expected = move ? move.to + file.before_path.slice(move.from.length) : file.before_path;
    if (file.after_path !== expected || typeof file.before !== "string" || typeof file.after !== "string") throw new Error("invalid metadata recovery mapping");
  }
}

async function verifyCurrent(root, plan) {
  const filePaths = new Map();
  for (const file of plan.files) {
    const beforeExists = await info(await safePath(root, file.before_path)), afterExists = await info(await safePath(root, file.after_path));
    if (file.before_path !== file.after_path && beforeExists && afterExists) throw new Error("both metadata locations exist: " + file.before_path);
    const path = afterExists ? file.after_path : file.before_path;
    const currentInfo = afterExists || beforeExists;
    if (!currentInfo?.isFile() || (currentInfo.mode & 0o777) !== file.mode) throw new Error("external metadata type/mode drift: " + path);
    const actual = digest(await readBytes(root, path)), before = digest(Buffer.from(file.before, "base64")), after = digest(Buffer.from(file.after, "base64"));
    if (actual !== before && actual !== after) throw new Error("external metadata drift: " + path);
    filePaths.set(file.before_path, { path, actual, before, after });
  }
  for (const move of plan.moves) {
    const beforeExists = await info(await safePath(root, move.from)), afterExists = await info(await safePath(root, move.to));
    if (Boolean(beforeExists) === Boolean(afterExists)) throw new Error("ambiguous relocation directory: " + move.id);
    const locator = afterExists ? move.to : move.from, ignored = new Set();
    for (let i = 0; i < plan.files.length; i += 1) {
      const file = plan.files[i];
      if (!file.before_path.startsWith(move.from + "/")) continue;
      const name = posix(join(dirname(file.before_path.slice(move.from.length + 1)), ".relocation-" + plan.transaction_id + "-" + i + ".tmp"));
      const staged = await info(await safePath(root, locator + "/" + name));
      if (staged) {
        if (!staged.isFile()) throw new Error("invalid recovery staging entry");
        const stagedBytes = await readBytes(root, locator + "/" + name);
        if (![file.before, file.after].some((bytes) => Buffer.from(bytes, "base64").subarray(0, stagedBytes.length).equals(stagedBytes))) throw new Error("external staging drift");
        ignored.add(name);
      }
    }
    const actual = await treeSnapshot(root, locator, ignored);
    if (actual.length !== move.tree.length) throw new Error("external tree membership drift: " + move.id);
    const expected = new Map(move.tree.map((entry) => [entry.path, entry]));
    for (const entry of actual) {
      const original = expected.get(entry.path);
      if (!original || original.kind !== entry.kind || original.mode !== entry.mode) throw new Error("external tree shape or mode drift: " + move.id + "/" + entry.path);
      if (entry.kind !== "file") continue;
      const managed = filePaths.get(move.from + "/" + entry.path);
      if (managed ? ![managed.before, managed.after].includes(entry.sha256) : entry.sha256 !== original.sha256) throw new Error("external content drift: " + move.id + "/" + entry.path);
    }
  }
  return filePaths;
}

async function verifyTerminal(root, plan, direction) {
  const files = await verifyCurrent(root, plan);
  for (let i = 0; i < plan.files.length; i += 1) {
    const file = plan.files[i], current = files.get(file.before_path);
    const expectedPath = direction === "forward" ? file.after_path : file.before_path;
    const expectedDigest = direction === "forward" ? current.after : current.before;
    if (current.path !== expectedPath || current.actual !== expectedDigest) throw new Error("terminal relocation image/location mismatch: " + expectedPath);
    const staged = posix(join(dirname(expectedPath), ".relocation-" + plan.transaction_id + "-" + i + ".tmp"));
    if (await info(await safePath(root, staged))) throw new Error("terminal relocation has unfinished metadata staging: " + staged);
  }
  for (const move of plan.moves) {
    const expected = direction === "forward" ? move.to : move.from;
    if (!(await info(await safePath(root, expected)))?.isDirectory()) throw new Error("terminal relocation directory mismatch: " + expected);
  }
}

async function execute(root, plan, manifestLocator, direction, checkpoint) {
  await verifyCurrent(root, plan);
  const save = async (step) => {
    if (step && !plan.completed_steps.includes(step)) plan.completed_steps.push(step);
    await atomicBytes(root, manifestLocator, Buffer.from(encode(plan)), plan.transaction_id + "-journal");
    if (checkpoint) await checkpoint(step, plan);
  };
  plan.status = direction === "forward" ? "applying" : "rolling-back";
  await save(direction + ":begin");
  async function moveDirectories() {
    const moves = direction === "forward" ? plan.moves : [...plan.moves].reverse();
    for (const move of moves) {
      await verifyCurrent(root, plan);
      const from = direction === "forward" ? move.from : move.to, to = direction === "forward" ? move.to : move.from;
      if (await info(await safePath(root, from))) {
        const target = await safePath(root, to);
        await mkdir(dirname(target), { recursive: true });
        await rename(await safePath(root, from), target);
        await syncDirectory(dirname(target));
        await syncDirectory(dirname(await safePath(root, from)));
      }
      await save(direction + ":move:" + move.id);
    }
  }
  if (direction === "forward") await moveDirectories();
  const indices = plan.files.map((_, index) => index);
  if (direction === "backward") indices.reverse();
  for (const i of indices) {
    const file = plan.files[i], current = (await verifyCurrent(root, plan)).get(file.before_path);
    const bytes = Buffer.from(direction === "forward" ? file.after : file.before, "base64");
    const staging = await safePath(root, posix(join(dirname(current.path), ".relocation-" + plan.transaction_id + "-" + i + ".tmp")));
    if (current.actual !== digest(bytes) || await info(staging)) await atomicBytes(root, current.path, bytes, plan.transaction_id + "-" + i, file.mode, [Buffer.from(file.before, "base64"), Buffer.from(file.after, "base64")]);
    await save(direction + ":file:" + i);
  }
  if (direction === "backward") await moveDirectories();
  await verifyTerminal(root, plan, direction);
  assertValidState(root);
  plan.status = direction === "forward" ? "applied" : "rolled-back";
  await save(plan.status);
  return { status: plan.status, manifest: await safePath(root, manifestLocator), plan_digest: plan.plan_digest, moves: plan.moves.map(({ id, from, to }) => ({ id, from, to })) };
}

async function unfinished(root, except) {
  const directory = await safePath(root, "transactions/relocation");
  if (!(await info(directory))?.isDirectory()) return;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === except) continue;
    const locator = "transactions/relocation/" + entry.name + "/manifest.json", plan = await readJson(root, locator);
    if (!TERMINAL.has(plan.status) && !(plan.status === "prepared" && plan.created_by && lockOwnerIsAlive(plan.created_by))) throw new Error("pending relocation requires recovery: " + locator);
  }
}

export async function relocateLearning(options, hooks = {}) {
  const root = resolve(options.stateRoot), recovering = options.resume || options.rollback;
  let plan, manifestLocator;
  if (recovering) {
    manifestLocator = posix(relative(root, resolve(root, recovering)));
    plan = await readJson(root, manifestLocator);
    validateManifest(plan, manifestLocator);
    if (plan.status === "aborted") throw new Error("aborted preparation requires a new reviewed plan");
    if (plan.status === "prepared" && plan.created_by && lockOwnerIsAlive(plan.created_by)) throw new Error("preparing invocation is still active");
  } else {
    plan = await buildPlan({ ...options, stateRoot: root }, randomUUID());
    if (!options.apply) {
      await unfinished(root);
      return { status: "dry-run", plan_digest: plan.plan_digest, parent_change: plan.parent_change, moves: plan.moves.map(({ id, from, to, content_hash }) => ({ id, from, to, content_hash })), affected_changes: plan.files.filter((file) => file.before_path.endsWith("/.status.json")).map((file) => JSON.parse(Buffer.from(file.before, "base64")).change_id) };
    }
    if (options.expectDigest !== plan.plan_digest) throw new Error("reviewed relocation plan has drifted; generate and confirm a new dry-run");
    manifestLocator = "transactions/relocation/" + plan.transaction_id + "/manifest.json";
    plan.owner_token = randomUUID();
    plan.created_by = { host: hostname(), pid: process.pid };
    await unfinished(root);
    await atomicBytes(root, manifestLocator, Buffer.from(encode(plan)), plan.transaction_id + "-journal");
  }
  const locks = [];
  let executionStarted = false;
  try {
    locks.push(await acquireLock(root, ".consolidate.lock", plan.transaction_id, plan.owner_token, Boolean(recovering)));
    await unfinished(root, plan.transaction_id);
    for (const id of plan.lock_roots) {
      const locator = "locks/" + id + ".lock";
      locks.push(await acquireLock(root, locator, plan.transaction_id, plan.owner_token, Boolean(recovering)));
    }
    if (!recovering) {
      const previous = plan;
      plan = await buildPlan({ ...options, stateRoot: root }, plan.transaction_id);
      plan.owner_token = previous.owner_token;
      plan.created_by = previous.created_by;
      if (options.expectDigest !== plan.plan_digest) throw new Error("relocation input changed while acquiring locks");
    }
    await verifyCurrent(root, plan);
    const desired = options.rollback ? "rolled-back" : "applied";
    if (plan.status === desired) {
      await verifyTerminal(root, plan, options.rollback ? "backward" : "forward");
      assertValidState(root);
      return { status: desired, manifest: await safePath(root, manifestLocator), unchanged: true };
    }
    if (plan.status === "rolled-back" && !options.rollback) throw new Error("rolled-back transaction cannot be resumed; review a new plan");
    plan.lock_owners = Object.fromEntries(locks.map((lock) => [lock.locator, lock.owner]));
    await atomicBytes(root, manifestLocator, Buffer.from(encode(plan)), plan.transaction_id + "-journal");
    executionStarted = true;
    try {
      if (hooks.checkpoint) await hooks.checkpoint("prepared", plan);
      return await execute(root, plan, manifestLocator, options.rollback ? "backward" : "forward", hooks.checkpoint);
    } catch (error) {
      if (!options.rollback) {
        try { await execute(root, plan, manifestLocator, "backward"); }
        catch (recoveryError) {
          plan.status = "blocked";
          plan.recovery_error = recoveryError.message;
          await atomicBytes(root, manifestLocator, Buffer.from(encode(plan)), plan.transaction_id + "-journal");
          throw new Error(error.message + "; recovery blocked: " + recoveryError.message + "; manifest: " + manifestLocator);
        }
      }
      throw error;
    }
  } catch (error) {
    if (!recovering && !executionStarted) {
      plan.status = "aborted";
      await atomicBytes(root, manifestLocator, Buffer.from(encode(plan)), plan.transaction_id + "-journal");
    }
    throw error;
  } finally {
    for (const lock of [...locks].reverse()) await releaseLock(root, lock);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log("relocate-learning --state-root <learning-root> --parent <id> --source <id> [--source <id>] [--apply --expect-digest <dry-run-digest>]\nrelocate-learning --state-root <learning-root> --resume <manifest> | --rollback <manifest>");
    else console.log(JSON.stringify(await relocateLearning(options), null, 2));
  } catch (error) {
    console.error("Learning relocation failed: " + error.message);
    process.exitCode = 1;
  }
}
