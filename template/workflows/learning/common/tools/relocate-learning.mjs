#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const CHANGE_ID = /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function args(argv) {
  const result = { stateRoot: null, parent: null, sources: [], apply: false, rollback: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--state-root") result.stateRoot = resolve(argv[++index] ?? "");
    else if (arg === "--parent") result.parent = argv[++index] ?? null;
    else if (arg === "--source") result.sources.push(argv[++index] ?? "");
    else if (arg === "--apply") result.apply = true;
    else if (arg === "--rollback") result.rollback = resolve(argv[++index] ?? "");
    else throw new Error(`unknown option: ${arg}`);
  }
  if (!result.stateRoot) throw new Error("--state-root is required");
  if (result.rollback) return result;
  if (!result.parent || !CHANGE_ID.test(result.parent) || result.sources.length === 0) {
    throw new Error("--parent and at least one --source are required");
  }
  if (result.sources.some((source) => !CHANGE_ID.test(source)) || new Set(result.sources).size !== result.sources.length) {
    throw new Error("source ids must be unique valid Change IDs");
  }
  if (result.sources.includes(result.parent)) throw new Error("a parent cannot be one of its own sources");
  return result;
}

async function json(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(await readFile(path, "utf8"));
}

async function files(root) {
  const result = [];
  async function visit(current) {
    const entries = await (await import("node:fs/promises")).readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) result.push(path);
    }
  }
  await visit(root);
  return result.sort();
}

async function contentHash(root) {
  const hash = createHash("sha256");
  for (const path of await files(root)) {
    const rel = relative(root, path).split(sep).join("/");
    if (rel === ".status.json") continue;
    hash.update(rel);
    hash.update(await readFile(path));
  }
  return hash.digest("hex");
}

async function loadLocations(stateRoot) {
  const path = join(stateRoot, "locations.json");
  const value = await json(path, { schema_version: 2, workflow: "learning", entries: [] });
  if (value.schema_version !== 2 || value.workflow !== "learning" || !Array.isArray(value.entries)) {
    throw new Error("locations.json must use Learning schema v2");
  }
  return { path, value };
}

function locatorFor(entry, stateRoot) {
  const locator = entry?.locator;
  if (typeof locator === "string" && (locator.startsWith("changes/") || locator.startsWith("archive/"))) return locator;
  return `changes/${entry.change_id}`;
}

function updateLocation(value, id, from, to, hash, now, parent) {
  const existing = value.entries.find((entry) => entry.change_id === id);
  if (existing) {
    existing.previous = Array.isArray(existing.previous) ? existing.previous : [];
    existing.previous.push({ locator: from, moved_at: now, reason: "consolidate", content_hash: hash });
    existing.locator = to;
    existing.parent_change = parent;
    existing.root_change = value.entries.find((entry) => entry.change_id === parent)?.root_change ?? parent;
    existing.content_hash = hash;
    existing.updated_at = now;
    return;
  }
  value.entries.push({
    change_id: id,
    locator: to,
    parent_change: parent,
    root_change: parent,
    content_hash: hash,
    previous: [{ locator: from, moved_at: now, reason: "consolidate", content_hash: hash }],
    updated_at: now,
  });
}

async function updateStatus(path, id, to, parent, now) {
  const statusPath = join(path, ".status.json");
  if (!existsSync(statusPath)) return;
  const value = await json(statusPath, null);
  if (!value || value.schema_version !== 2 || value.change_id !== id) return;
  value.parent_change = parent;
  value.root_change = value.root_change === id ? parent : value.root_change;
  value.locator = to;
  value.updated_at = now;
  await writeFile(statusPath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function updateGlobalStatus(stateRoot, ids, parent, now) {
  const path = join(stateRoot, "status.json");
  const value = await json(path, null);
  if (!value || value.schema_version !== 2) return;
  const root = value.active.find((entry) => entry.change_id === parent)?.root_change ?? parent;
  for (const entry of [...value.active, ...value.archived]) {
    if (!ids.includes(entry.change_id)) continue;
    entry.parent_change = parent;
    entry.root_change = root;
    entry.locator = entry.locator;
    entry.updated_at = now;
  }
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function rollbackManifest(manifestPath) {
  const manifest = await json(manifestPath, null);
  if (!manifest || !Array.isArray(manifest.moves)) throw new Error("invalid relocation manifest");
  for (const move of [...manifest.moves].reverse()) {
    if (existsSync(move.to) && !existsSync(move.from)) await rename(move.to, move.from);
  }
  await writeFile(manifestPath, JSON.stringify({ ...manifest, rolled_back_at: new Date().toISOString() }, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ status: "rolled-back", manifest: manifestPath }));
}

async function main() {
  const options = args(process.argv.slice(2));
  if (options.rollback) {
    await rollbackManifest(options.rollback);
    return;
  }
  const changesRoot = join(options.stateRoot, "changes");
  const parentPath = join(changesRoot, options.parent);
  if (!existsSync(parentPath)) throw new Error(`parent Change does not exist: ${options.parent}`);
  const { path: locationsPath, value: locations } = await loadLocations(options.stateRoot);
  const moves = [];
  for (const id of options.sources) {
    const entry = locations.entries.find((candidate) => candidate.change_id === id);
    const fromLocator = locatorFor(entry, options.stateRoot);
    if (!fromLocator.startsWith("changes/")) throw new Error(`source is not an active/closed Change: ${id}`);
    const from = join(options.stateRoot, ...fromLocator.split("/"));
    if (!existsSync(from)) throw new Error(`source Change is missing: ${fromLocator}`);
    const relativeFrom = fromLocator.split("/");
    if (relativeFrom.slice(0, 2).join("/") === `changes/${options.parent}` || from === parentPath || parentPath.startsWith(from + sep)) {
      throw new Error(`source/parent cycle detected for ${id}`);
    }
    const to = join(parentPath, "children", id);
    if (existsSync(to)) throw new Error(`target child already exists: ${id}`);
    moves.push({ id, from, to, from_locator: fromLocator, to_locator: `changes/${options.parent}/children/${id}` });
  }
  const hashes = [];
  for (const move of moves) hashes.push({ id: move.id, content_hash: await contentHash(move.from) });
  const now = new Date().toISOString();
  const manifest = {
    schema_version: 1,
    artifact: "learning-relocation-manifest",
    parent_change: options.parent,
    created_at: now,
    moves: moves.map((move) => ({ ...move, content_hash: hashes.find((item) => item.id === move.id).content_hash })),
  };
  if (!options.apply) {
    console.log(JSON.stringify({ status: "dry-run", ...manifest }, null, 2));
    return;
  }

  await mkdir(join(parentPath, "children"), { recursive: true });
  const lockPath = join(options.stateRoot, ".consolidate.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx");
    for (const move of moves) await rename(move.from, move.to);
    for (const move of manifest.moves) {
      updateLocation(locations, move.id, move.from_locator, move.to_locator, move.content_hash, now, options.parent);
      await updateStatus(join(options.stateRoot, ...move.to_locator.split("/")), move.id, move.to_locator, options.parent, now);
    }
    await writeFile(locationsPath, JSON.stringify(locations, null, 2) + "\n", "utf8");
    await updateGlobalStatus(options.stateRoot, options.sources, options.parent, now);
    const manifestPath = join(parentPath, "synthesis", `relocation-${now.replaceAll(/[^0-9]/g, "").slice(0, 14)}.json`);
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    console.log(JSON.stringify({ status: "applied", manifest: manifestPath, moves: manifest.moves }, null, 2));
  } catch (error) {
    for (const move of [...moves].reverse()) {
      if (existsSync(move.to) && !existsSync(move.from)) await rename(move.to, move.from);
    }
    throw error;
  } finally {
    if (lock) await lock.close();
    await rm(lockPath, { force: true });
  }
}

main().catch((error) => {
  console.error(`Learning relocation failed: ${error.message}`);
  process.exitCode = 1;
});
