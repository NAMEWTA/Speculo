import { createHash, createPublicKey, verify } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
export function canonicalJSON(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(",")}}`;
  if (value === undefined || (typeof value === "number" && !Number.isFinite(value))) throw new Error("non-JSON evidence value");
  return JSON.stringify(value);
}
export function safeRelative(value) {
  return typeof value === "string" && value.length > 0 && !/[\\:\x00-\x1f]/.test(value) &&
    !isAbsolute(value) && value.split("/").every((part) => part && part !== "." && part !== "..");
}
const within = (root, file) => { const rel = relative(resolve(root), resolve(file)); return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel)); };

/**
 * Inspect ancestors rather than comparing realpath strings. Windows may expand
 * an ordinary 8.3 name or normalize casing without traversing a symlink.
 */
async function assertNoSymlinkPath(file) {
  const absolute = resolve(file), root = parse(absolute).root;
  let current = root;
  const check = async () => {
    if ((await lstat(current)).isSymbolicLink()) throw new Error("evidence path contains a symlink or junction");
  };
  await check();
  for (const part of relative(root, absolute).split(sep).filter(Boolean)) {
    current = join(current, part);
    await check();
  }
  return absolute;
}

/** Check the root and every ancestor; absent artifact tails remain legal. */
export async function evidencePath(root, file) {
  if (!safeRelative(file)) throw new Error("unsafe artifact path");
  let current = await assertNoSymlinkPath(root);
  for (const part of file.split("/")) {
    current = join(current, part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error("artifact symlink is not permitted"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return current;
}
export async function fileInventory(root) {
  const files = [];
  async function visit(dir = "") {
    for (const entry of (await readdir(join(root, dir), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const name = dir ? `${dir}/${entry.name}` : entry.name;
      const file = await evidencePath(root, name);
      if (entry.isDirectory()) await visit(name);
      else if (entry.isFile()) files.push({ path: name, sha256: sha256(await readFile(file)) });
      else throw new Error(`non-regular evidence: ${name}`);
    }
  }
  await visit();
  return files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const versioned = (value) => isObject(value) && nonempty(value.name) && nonempty(value.version);

/**
 * Bind the actual instruction inputs, not just the HEAD label. v1 reads without
 * roles are conservatively instructions. v2 lets the independent collector
 * distinguish data, but never downgrade a declared instruction to data.
 * Only byte-identical, regular Git blobs are supported as instruction sources;
 * dirty/untracked instructions need a new committed source and observation.
 */
async function verifyInstructionSources(p, repoRoot, scenarios, trace, commit) {
  const git = (args, encoding = "utf8") => execFileSync("git", ["--no-replace-objects", "-C", resolve(repoRoot), ...args], {
    encoding, maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
  });
  const top = await realpath(git(["rev-parse", "--show-toplevel"]).trim());
  if (top !== await realpath(repoRoot)) throw new Error("instruction repository must be the Git worktree root");
  const tree = new Map();
  for (const record of git(["ls-tree", "-rz", "--full-tree", commit]).split("\0").filter(Boolean)) {
    const tab = record.indexOf("\t"), [mode, type, oid] = record.slice(0, tab).split(" ");
    if (tab < 0 || !/^[a-f0-9]{40,64}$/.test(oid)) throw new Error("invalid committed source tree");
    tree.set(record.slice(tab + 1), { mode, type, oid });
  }
  const readDigest = async (path) => {
    const file = await evidencePath(repoRoot, path);
    if (!(await lstat(file)).isFile()) throw new Error(`non-regular observation source: ${path}`);
    return sha256(await readFile(file));
  };
  if (!Array.isArray(p.instructions) || !p.instructions.length) throw new Error("instruction digests are required");
  const instructions = new Map();
  for (const instruction of p.instructions) {
    if (!isObject(instruction) || !safeRelative(instruction.path) || instructions.has(instruction.path) ||
        typeof instruction.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(instruction.sha256)) throw new Error("invalid or duplicate instruction source");
    const { path, sha256: expected } = instruction;
    if (expected !== await readDigest(path)) throw new Error(`instruction source drift: ${path}`);
    const entry = tree.get(path);
    if (!entry || entry.type !== "blob" || !["100644", "100755"].includes(entry.mode)) throw new Error(`instruction source is not a regular committed file: ${path}`);
    if (expected !== sha256(git(["cat-file", "blob", entry.oid], "buffer"))) throw new Error(`instruction source differs from repository commit: ${path}`);
    instructions.set(path, expected);
  }
  if (!Array.isArray(scenarios) || !scenarios.length || !Array.isArray(trace)) throw new Error("invalid observation source coverage inputs");
  for (const scenario of scenarios) {
    if (!Array.isArray(scenario.instruction_paths) || !scenario.instruction_paths.length ||
        scenario.instruction_paths.some((path) => !safeRelative(path) || !instructions.has(path))) throw new Error(`missing required instruction coverage: ${scenario.id}`);
  }
  for (const event of trace) {
    if (!isObject(event)) throw new Error("invalid observation trace event");
    if (event.kind !== "context") continue;
    const input = event.payload;
    if (!isObject(input) || !safeRelative(input.path) || typeof input.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(input.sha256)) {
      throw new Error("context source requires canonical path and observed byte digest; re-export incomplete legacy evidence");
    }
    const role = p.schema_version === 1 && input.role === undefined ? "instruction" : input.role;
    if (!["instruction", "data"].includes(role) || (p.schema_version === 1 && role !== "instruction")) {
      throw new Error("invalid context source role; explicit instruction/data classification requires observation v2");
    }
    if (role === "data") {
      if (instructions.has(input.path)) throw new Error(`instruction source cannot be classified as data: ${input.path}`);
      if (input.sha256 !== await readDigest(input.path)) throw new Error(`context data source drift: ${input.path}`);
    } else if (!instructions.has(input.path)) {
      throw new Error(`missing consumed instruction coverage: ${input.path}`);
    } else if (input.sha256 !== instructions.get(input.path)) {
      throw new Error(`consumed instruction digest differs: ${input.path}`);
    }
  }
  // Detect a checkout/ref change during verification as well.
  if (git(["rev-parse", "HEAD"]).trim() !== commit) throw new Error("repository commit changed during observation verification");
}

/**
 * Authenticate an independently exported observer bundle. This module does not
 * sign observations or trust a model's self-report. The evaluator operator owns
 * the out-of-workspace trust file and the observer's private key.
 */
export async function verifyObservation({ bundleRoot, trustPath, repoRoot, scenarios, trace, artifactRoot }) {
  if (!bundleRoot || !trustPath || !repoRoot) throw new Error("observed evaluation requires --bundle, --trust and --repo");
  await assertNoSymlinkPath(trustPath);
  const trustReal = await realpath(trustPath);
  const evidenceRoots = await Promise.all([bundleRoot, artifactRoot, repoRoot].map((root) => realpath(root)));
  if (evidenceRoots.some((root) => within(root, trustReal))) {
    throw new Error("observer trust must be outside the repository and evidence roots, without symlinks");
  }
  const trust = JSON.parse(await readFile(trustReal, "utf8"));
  const envelope = JSON.parse(await readFile(await evidencePath(bundleRoot, "observation.json"), "utf8"));
  if (trust.schema_version !== 1 || !Array.isArray(trust.observers) || !isObject(envelope.payload) || !nonempty(envelope.key_id)) throw new Error("invalid observer envelope or trust configuration");
  const keys = trust.observers.filter((item) => item.id === envelope.key_id);
  if (keys.length !== 1) throw new Error("observer key is untrusted or ambiguous");
  const key = createPublicKey(keys[0].public_key);
  if (key.asymmetricKeyType !== "ed25519" || typeof envelope.signature !== "string" || !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature) ||
      !verify(null, Buffer.from(canonicalJSON(envelope.payload)), key, Buffer.from(envelope.signature, "base64"))) throw new Error("invalid observer signature");
  const p = envelope.payload;
  if (![1, 2].includes(p.schema_version) || p.kind !== "speculo-host-observation" || !nonempty(p.run_id) || !versioned(p.host) || !versioned(p.model) || !versioned(p.collector)) throw new Error("missing host/model/collector versions or run identity");
  if (!Array.isArray(keys[0].hosts) || !keys[0].hosts.includes(p.host.name)) throw new Error("observer is not trusted for this host");
  if (!Number.isInteger(p.repetition) || p.repetition < 1 || !Number.isFinite(Date.parse(p.started_at)) || !Number.isFinite(Date.parse(p.finished_at)) || Date.parse(p.finished_at) < Date.parse(p.started_at)) throw new Error("invalid observation timing or repetition");
  if (p.exit_code !== 0 || p.coverage?.reads !== "complete" || p.coverage?.effects !== "complete" || p.coverage?.artifacts !== "complete") throw new Error("incomplete or failed observer run");
  if (p.fixture_sha256 !== sha256(canonicalJSON(scenarios)) || p.trace_sha256 !== sha256(canonicalJSON(trace))) throw new Error("fixture or normalized trace digest differs");
  if (!isObject(p.raw_log) || p.raw_log.sha256 !== sha256(await readFile(await evidencePath(bundleRoot, p.raw_log.path)))) throw new Error("raw observer log digest differs");
  const commit = execFileSync("git", ["--no-replace-objects", "-C", resolve(repoRoot), "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (!/^[a-f0-9]{40,64}$/.test(p.repository_commit) || p.repository_commit !== commit) throw new Error("observation belongs to a different repository commit");
  await verifyInstructionSources(p, repoRoot, scenarios, trace, commit);
  if (canonicalJSON(p.artifacts) !== canonicalJSON(await fileInventory(artifactRoot))) throw new Error("observed artifact inventory differs");
  return { run_id: p.run_id, repetition: p.repetition, host: p.host, model: p.model, collector: p.collector, repository_commit: commit, started_at: p.started_at, finished_at: p.finished_at, observer_key: envelope.key_id };
}
