/** OPS resource runtime primitives. Node standard library only. */
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync, closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync,
  openSync, readFileSync, renameSync, rmSync, unlinkSync, writeSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname, join, posix, win32 } from "node:path";
import { spawnSync } from "node:child_process";

export const VERSION = "2.2.0";
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SECRET_RE = /\{\{credential:([a-z0-9-]+)@([1-9][0-9]*):([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

export class OpsError extends Error {
  constructor(message) {
    super(message);
    this.name = "OpsError";
  }
}

export class NodeMissing extends OpsError {
  constructor(posix, next = "ops.mjs bootstrap-node --apply") {
    super("node-missing");
    this.name = "NodeMissing";
    this.code = "node-missing";
    this.next = next;
    this.posix = posix;
  }
}

export class UnknownResult extends OpsError {
  constructor(message) {
    super(message);
    this.name = "UnknownResult";
  }
}



export function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  }
  return value;
}

export function assertJsonSafe(value) {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Out of range float values are not JSON compliant");
  }
  if (Array.isArray(value)) value.forEach(assertJsonSafe);
  else if (value && typeof value === "object") Object.values(value).forEach(assertJsonSafe);
}

export function canonical(value) {
  assertJsonSafe(value);
  return Buffer.from(JSON.stringify(sortKeys(value)), "utf8");
}

export function digest(value) {
  const data = Buffer.isBuffer(value) ? value : canonical(value);
  return createHash("sha256").update(data).digest("hex");
}

export function newId(prefix) {
  const d = new Date();
  const ts = [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
    String(d.getUTCHours()).padStart(2, "0"),
    String(d.getUTCMinutes()).padStart(2, "0"),
    String(d.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  return `${prefix}-${ts}-${randomBytes(4).toString("hex")}`;
}

export function identifier(value, label = "id") {
  if (typeof value !== "string" || !ID_RE.test(value) || value.length > 80) {
    throw new OpsError(`${label}: expected lowercase kebab id (1..80 characters)`);
  }
  if (/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(value)) {
    throw new OpsError(`${label}: Windows reserved name`);
  }
  return value;
}

function pyList(items) {
  return `[${items.map((x) => `'${x}'`).join(", ")}]`;
}

export function exact(value, allowed, required, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OpsError(`${label}: expected object`);
  }
  const unknown = Object.keys(value).filter((k) => !allowed.has(k)).sort();
  if (unknown.length) throw new OpsError(`${label}: unknown fields: ${pyList(unknown)}`);
  const missing = [...required].filter((k) => !(k in value)).sort();
  if (missing.length) throw new OpsError(`${label}: missing fields: ${pyList(missing)}`);
}

function pyRepr(value) {
  if (typeof value !== "string") return String(value);
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

export function relative(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes("\x00") || value.includes(":")) {
    throw new OpsError(`unsafe relative path: ${pyRepr(value)}`);
  }
  if (value.startsWith("/") || value.split("/").some((x) => x === "" || x === "." || x === "..")) {
    throw new OpsError(`unsafe relative path: ${pyRepr(value)}`);
  }
  return value;
}

function adapter(platform) {
  return platform === "windows" ? win32 : posix;
}

export function rootPath(value, platform) {
  const p = adapter(platform);
  if (typeof value !== "string" || value.includes("\x00") || !p.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
    throw new OpsError("host root must be an absolute, non-traversing path");
  }
  const n = p.normalize(value);
  if (platform === "windows") {
    if (n.startsWith("\\\\") || p.parse(n).root === n || n.slice(2).includes(":")) {
      throw new OpsError("UNC, drive root and ADS paths are not host roots");
    }
    const parts = n.split(/[\\/]/).filter(Boolean);
    if (parts.length < 2) throw new OpsError("UNC, drive root and ADS paths are not host roots");
    const lower = n.toLowerCase().replace(/\\+$/, "");
    if (["c:\\windows", "c:\\program files", "c:\\users", "c:\\programdata"].includes(lower)) {
      throw new OpsError("a system directory cannot be host_root");
    }
    return n;
  }
  if (["/", "/etc", "/usr", "/var", "/home", "/root", "/tmp", "/srv", "/opt", "/mnt"].includes(n)) {
    throw new OpsError("host_root must be an OPS-specific child directory");
  }
  return n;
}

export function targetJoin(host, ...parts) {
  const p = adapter(host.platform);
  let cur = host.root;
  for (const part of parts) cur = p.join(cur, ...relative(part).split("/"));
  return cur;
}

export function within(path, root, platform) {
  const p = adapter(platform);
  if (!p.isAbsolute(path) || path.split(/[\\/]/).includes("..")) return false;
  const rel = p.relative(root, path);
  if (!rel || rel.startsWith("..") || p.isAbsolute(rel)) return false;
  return true;
}

export function noSymlinks(path, { allowMissing = true } = {}) {
  const chain = [];
  let cur = path;
  while (true) {
    chain.unshift(cur);
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  for (const q of chain) {
    let st;
    try {
      st = lstatSync(q);
    } catch (error) {
      if (error.code === "ENOENT") {
        if (allowMissing) continue;
        throw new OpsError(`missing path: ${q}`);
      }
      throw error;
    }
    if (st.isSymbolicLink()) throw new OpsError(`symlink/reparse point rejected: ${q}`);
  }
}

export function secure(path, directory = false) {
  if (process.platform !== "win32") {
    chmodSync(path, directory ? 0o700 : 0o600);
    return;
  }
  const who = spawnSync("whoami", ["/user", "/fo", "csv", "/nh"], { encoding: "utf8" });
  if (who.status !== 0) throw new Error(who.stderr);
  const sid = who.stdout.trim().split(",").at(-1).replaceAll('"', "");
  const flags = directory ? "(OI)(CI)F" : "F";
  const ic = spawnSync("icacls", [path, "/inheritance:r", "/grant:r", `*${sid}:${flags}`, "*S-1-5-18:F"], { encoding: "utf8" });
  if (ic.status !== 0) throw new Error(ic.stderr);
}

export function privateDir(path) {
  noSymlinks(path);
  const missing = [];
  let p = path;
  while (!existsSync(p)) {
    missing.push(p);
    const next = dirname(p);
    if (next === p) break;
    p = next;
  }
  for (const d of missing.reverse()) {
    mkdirSync(d, { mode: 0o700 });
    secure(d, true);
  }
  if (existsSync(path)) secure(path, true);
}

export function atomicWrite(path, data, mode = 0o600, { exclusive = false } = {}) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
  noSymlinks(path);
  privateDir(dirname(path));
  if (exclusive && existsSync(path)) throw new OpsError(`immutable artifact already exists: ${path}`);
  const tmp = join(dirname(path), `.ops-write-${randomBytes(6).toString("hex")}`);
  const fd = openSync(tmp, "w");
  try {
    writeSync(fd, buf);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    if (process.platform === "win32") secure(tmp);
    else chmodSync(tmp, mode);
    if (exclusive) {
      try {
        linkSync(tmp, path);
      } catch (error) {
        if (error.code === "EEXIST") throw new OpsError(`immutable artifact already exists: ${path}`);
        throw error;
      }
      unlinkSync(tmp);
    } else {
      try {
        renameSync(tmp, path);
      } catch (error) {
        if (process.platform === "win32" && (error.code === "EEXIST" || error.code === "EPERM" || error.code === "EACCES")) {
          unlinkSync(path);
          renameSync(tmp, path);
        } else {
          throw error;
        }
      }
    }
    if (process.platform !== "win32") chmodSync(path, mode);
  } catch (error) {
    try { unlinkSync(tmp); } catch {}
    throw error;
  }
}

export function writeJson(path, value, { exclusive = false } = {}) {
  assertJsonSafe(value);
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`, 0o600, { exclusive });
}

function assertNoDuplicateKeys(text) {
  let i = 0;
  const n = text.length;
  const skip = () => { while (i < n && /\s/.test(text[i])) i++; };
  function parseString() {
    i++;
    while (i < n) {
      if (text[i] === "\\") { i += 2; continue; }
      if (text[i] === '"') { i++; return; }
      i++;
    }
    throw new Error("Unterminated string");
  }
  function parseValue() {
    skip();
    const c = text[i];
    if (c === "{") return parseObject();
    if (c === "[") {
      i++; skip();
      if (text[i] === "]") { i++; return; }
      while (true) {
        parseValue(); skip();
        if (text[i] === ",") { i++; continue; }
        if (text[i] === "]") { i++; return; }
        throw new Error("Invalid array");
      }
    }
    if (c === '"') return parseString();
    if (c === "t" || c === "f" || c === "n") { while (i < n && /[a-z]/.test(text[i])) i++; return; }
    if (c === "-" || (c >= "0" && c <= "9")) { while (i < n && /[0-9eE+.\-]/.test(text[i])) i++; return; }
    throw new Error("Invalid JSON");
  }
  function parseObject() {
    i++; skip();
    const seen = new Set();
    if (text[i] === "}") { i++; return; }
    while (true) {
      skip();
      if (text[i] !== '"') throw new Error("Expected key");
      const start = i;
      parseString();
      const key = JSON.parse(text.slice(start, i));
      if (seen.has(key)) throw new Error(`duplicate JSON key: ${key}`);
      seen.add(key);
      skip();
      if (text[i] !== ":") throw new Error("Expected colon");
      i++;
      parseValue();
      skip();
      if (text[i] === ",") { i++; continue; }
      if (text[i] === "}") { i++; return; }
      throw new Error("Expected comma");
    }
  }
  parseValue();
}

export function readJson(path) {
  noSymlinks(path, { allowMissing: false });
  const text = readFileSync(path, "utf8");
  try {
    if (/\bNaN\b|\bInfinity\b/.test(text.replace(/"(?:\\.|[^"\\])*"/g, '""'))) {
      throw new Error("nonfinite");
    }
    assertNoDuplicateKeys(text);
    return JSON.parse(text);
  } catch (error) {
    throw new OpsError(`invalid JSON: ${path}: ${error.message}`);
  }
}

export function withLock(path, owner, fn) {
  privateDir(dirname(path));
  try {
    mkdirSync(path, { mode: 0o700 });
  } catch (error) {
    if (error.code === "EEXIST") throw new OpsError(`lock-held: ${path}; inspect owner, never auto-break`);
    throw error;
  }
  writeJson(join(path, "owner.json"), { ...owner, pid: process.pid, machine: hostname(), at: now() });
  try {
    return fn();
  } finally {
    try { unlinkSync(join(path, "owner.json")); } catch {}
    try { rmSync(path, { recursive: true, force: true }); } catch {}
  }
}

export function redact(text, secrets) {
  for (const value of [...new Set(secrets)].sort((a, b) => b.length - a.length)) {
    if (value) text = text.split(value).join("[REDACTED]");
  }
  return text.replace(/(password|passwd|token|secret|access_key)(\s*[=:]\s*)[^\s,;]+/gi, "$1$2[REDACTED]");
}

export function credentialsIn(value) {
  const found = new Set();
  const re = new RegExp(SECRET_RE.source, "g");
  let m;
  const blob = JSON.stringify(value);
  while ((m = re.exec(blob))) found.add(`${m[1]}@${m[2]}`);
  return found;
}

export function resolveSecrets(value, ledger) {
  if (typeof value === "string") {
    return value.replace(new RegExp(SECRET_RE.source, "g"), (_w, cid, version, field) => {
      const result = ledger?.entries?.[cid]?.[version]?.values?.[field];
      if (result === undefined) throw new OpsError(`missing credential: ${cid}@${version}:${field}`);
      if (typeof result !== "string") throw new OpsError("credential values must be strings");
      return result;
    });
  }
  if (Array.isArray(value)) return value.map((v) => resolveSecrets(v, ledger));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveSecrets(v, ledger)]));
  }
  return value;
}

export function emptyStatus() {
  return {
    schema_version: 3,
    workflow: "ops",
    revision: 0,
    controller: null,
    hosts: {},
    projects: {},
    deployments: {},
    allocations: {},
    bindings: {},
    releases: {},
    policies: { server_readme_credentials: false, server_operations: true, strict_docker_root: true },
    updated_at: null,
  };
}

export { withLock as lock };
