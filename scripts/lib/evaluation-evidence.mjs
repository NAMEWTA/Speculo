import { createHash, createPublicKey, verify } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
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

/** Check every existing component, including the supplied root. No symlink traversal. */
export async function evidencePath(root, file) {
  if (!safeRelative(file)) throw new Error("unsafe artifact path");
  let current = resolve(root);
  if ((await lstat(current)).isSymbolicLink()) throw new Error("artifact root symlink is not permitted");
  if (await realpath(current) !== current) throw new Error("artifact root contains a symlink");
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
 * Authenticate an independently exported observer bundle. This module does not
 * sign observations or trust a model's self-report. The evaluator operator owns
 * the out-of-workspace trust file and the observer's private key.
 */
export async function verifyObservation({ bundleRoot, trustPath, repoRoot, scenarios, trace, artifactRoot }) {
  if (!bundleRoot || !trustPath || !repoRoot) throw new Error("observed evaluation requires --bundle, --trust and --repo");
  const trustReal = await realpath(trustPath);
  if (trustReal !== resolve(trustPath) || [bundleRoot, artifactRoot, repoRoot].some((root) => within(root, trustReal))) {
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
  if (p.schema_version !== 1 || p.kind !== "speculo-host-observation" || !nonempty(p.run_id) || !versioned(p.host) || !versioned(p.model) || !versioned(p.collector)) throw new Error("missing host/model/collector versions or run identity");
  if (!Array.isArray(keys[0].hosts) || !keys[0].hosts.includes(p.host.name)) throw new Error("observer is not trusted for this host");
  if (!Number.isInteger(p.repetition) || p.repetition < 1 || !Number.isFinite(Date.parse(p.started_at)) || !Number.isFinite(Date.parse(p.finished_at)) || Date.parse(p.finished_at) < Date.parse(p.started_at)) throw new Error("invalid observation timing or repetition");
  if (p.exit_code !== 0 || p.coverage?.reads !== "complete" || p.coverage?.effects !== "complete" || p.coverage?.artifacts !== "complete") throw new Error("incomplete or failed observer run");
  if (p.fixture_sha256 !== sha256(canonicalJSON(scenarios)) || p.trace_sha256 !== sha256(canonicalJSON(trace))) throw new Error("fixture or normalized trace digest differs");
  if (!isObject(p.raw_log) || p.raw_log.sha256 !== sha256(await readFile(await evidencePath(bundleRoot, p.raw_log.path)))) throw new Error("raw observer log digest differs");
  const commit = execFileSync("git", ["-C", resolve(repoRoot), "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (!/^[a-f0-9]{40,64}$/.test(p.repository_commit) || p.repository_commit !== commit) throw new Error("observation belongs to a different repository commit");
  if (!Array.isArray(p.instructions) || !p.instructions.length) throw new Error("instruction digests are required");
  const seen = new Set();
  for (const instruction of p.instructions) {
    if (!isObject(instruction) || seen.has(instruction.path)) throw new Error("invalid or duplicate instruction source");
    seen.add(instruction.path);
    if (instruction.sha256 !== sha256(await readFile(await evidencePath(repoRoot, instruction.path)))) throw new Error(`instruction source drift: ${instruction.path}`);
  }
  for (const scenario of scenarios) {
    if (!Array.isArray(scenario.instruction_paths) || !scenario.instruction_paths.length || scenario.instruction_paths.some((path) => !seen.has(path))) throw new Error(`missing required instruction coverage: ${scenario.id}`);
  }
  if (canonicalJSON(p.artifacts) !== canonicalJSON(await fileInventory(artifactRoot))) throw new Error("observed artifact inventory differs");
  return { run_id: p.run_id, repetition: p.repetition, host: p.host, model: p.model, collector: p.collector, repository_commit: commit, started_at: p.started_at, finished_at: p.finished_at, observer_key: envelope.key_id };
}
