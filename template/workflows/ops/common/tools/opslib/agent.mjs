/** Ephemeral local/SSH target agent. No third-party modules or target installation.
Receives trusted code and a JSON request; never executes repository text implicitly.
*/
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync, chownSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readdirSync, readFileSync, renameSync, rmdirSync, rmSync, statfsSync, statSync,
  unlinkSync, writeSync, accessSync, constants as fsConstants,
} from "node:fs";
import { tmpdir, hostname, userInfo, machine as osMachine, type as osType } from "node:os";
import { dirname, join, delimiter, isAbsolute, relative, resolve, sep } from "node:path";
import { createConnection } from "node:net";

export class Failure extends Error {
  constructor(message) {
    super(message);
    this.name = "Failure";
  }
}

function stamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}
function packed(v) {
  return Buffer.from(JSON.stringify(sortKeys(v)), "utf8");
}
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  }
  return value;
}
function sha(v) {
  return createHash("sha256").update(Buffer.isBuffer(v) ? v : packed(v)).digest("hex");
}
function checkId(v) {
  if (typeof v !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) throw new Failure("invalid resource id");
}
function platformSystem() {
  if (process.platform === "win32") return "Windows";
  if (process.platform === "darwin") return "Darwin";
  if (process.platform === "linux") return "Linux";
  return osType();
}
function which(cmd) {
  if (!cmd) return null;
  const tryPath = (p) => { try { accessSync(p, fsConstants.F_OK); return p; } catch { return null; } };
  if (isAbsolute(cmd) || cmd.includes("/") || cmd.includes("\\")) return tryPath(cmd);
  const exts = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  const names = process.platform === "win32" && !exts.some((e) => cmd.toLowerCase().endsWith(e.toLowerCase()))
    ? [cmd, ...exts.map((e) => cmd + e)]
    : [cmd];
  for (const dir of (process.env.PATH || "").split(delimiter)) {
    for (const name of names) {
      const hit = tryPath(join(dir, name));
      if (hit) return hit;
    }
  }
  return null;
}
function currentSid() {
  const who = spawnSync("whoami", ["/user", "/fo", "csv", "/nh"], { encoding: "utf8" });
  if (who.status !== 0) throw new Error(who.stderr);
  const line = who.stdout.trim();
  const parts = [];
  let cur = "", inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts[1];
}
function noLinks(path) {
  path = resolve(path);
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
    try { st = lstatSync(q); } catch (e) { if (e.code === "ENOENT") continue; throw e; }
    if (st.isSymbolicLink()) throw new Failure("symlink/reparse point: " + q);
  }
}
function secureFile(path) {
  if (process.platform !== "win32") { chmodSync(path, 0o600); return; }
  const sid = currentSid();
  const ic = spawnSync("icacls", [path, "/inheritance:r", "/grant:r", `*${sid}:F`, "*S-1-5-18:F"], { encoding: "utf8" });
  if (ic.status !== 0) throw new Error(ic.stderr);
}
function mkdir(path, mode = 0o750) {
  noLinks(path);
  const missing = [];
  let p = path;
  while (!existsSync(p)) { missing.push(p); const n = dirname(p); if (n === p) break; p = n; }
  for (const d of missing.reverse()) mkdirSync(d, { mode });
}
function atomic(path, data, mode = 0o600) {
  noLinks(path);
  mkdir(dirname(path));
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const tmp = join(dirname(path), ".ops-" + randomBytes(6).toString("hex"));
  const fd = openSync(tmp, "w");
  try { writeSync(fd, buf); fsyncSync(fd); } finally { closeSync(fd); }
  try {
    if (process.platform === "win32") secureFile(tmp);
    else chmodSync(tmp, mode);
    try { renameSync(tmp, path); }
    catch (error) {
      if (process.platform === "win32" && (error.code === "EEXIST" || error.code === "EPERM" || error.code === "EACCES")) {
        unlinkSync(path); renameSync(tmp, path);
      } else throw error;
    }
    if (process.platform !== "win32") chmodSync(path, mode);
  } catch (error) {
    try { unlinkSync(tmp); } catch {}
    throw error;
  }
}
function wj(p, v) { atomic(p, JSON.stringify(v, null, 2) + "\n"); }
function rj(p) { noLinks(p); return JSON.parse(readFileSync(p, "utf8")); }

export function fingerprint() {
  let stable = "";
  for (const p of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
    try { stable = readFileSync(p, "utf8").trim(); break; } catch {}
  }
  if (process.platform === "win32") {
    try {
      const r = spawnSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { encoding: "utf8" });
      const m = r.stdout.match(/MachineGuid\s+REG_SZ\s+(\S+)/i);
      if (m) stable = m[1];
    } catch {}
  }
  if (platformSystem() === "Darwin" && !stable) {
    const p = spawnSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], { encoding: "utf8", timeout: 5000 });
    const m = p.stdout.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
    if (m) stable = m[1];
  }
  if (!stable) throw new Failure("stable machine identity unavailable; explicit identity adapter required");
  return sha({ machine: stable, platform: platformSystem() });
}

export function fileState(path, limit = 16 * 1024 * 1024) {
  path = resolve(path);
  noLinks(path);
  if (!existsSync(path)) return { kind: "absent" };
  const s = statSync(path);
  const st = lstatSync(path);
  if (st.isFile()) {
    if (s.size > limit) throw new Failure("snapshot exceeds bounded file size: " + path);
    const result = { kind: "file", sha256: sha(readFileSync(path)), size: s.size, mode: s.mode & 0o777 };
    const name = path.split(/[\\/]/).pop();
    if (name === ".ops-project.json" || name === ".ops-host.json") result.owner = rj(path);
    return result;
  }
  if (st.isDirectory()) {
    const entries = readdirSync(path).sort();
    if (entries.length > 10000) throw new Failure("directory snapshot exceeds 10000 entries");
    return { kind: "directory", entries_digest: sha(entries), entry_count: entries.length };
  }
  throw new Failure("unsupported file type: " + path);
}

function walkTree(root) {
  const out = [root];
  const st = lstatSync(root);
  if (!st.isDirectory()) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let names;
    try { names = readdirSync(dir); } catch { continue; }
    for (const name of names) {
      const p = join(dir, name);
      out.push(p);
      try { if (lstatSync(p).isDirectory()) stack.push(p); } catch {}
    }
  }
  return out;
}

export function treeState(path) {
  const root = resolve(path);
  noLinks(root);
  if (!existsSync(root)) throw new Failure("quarantine item no longer exists");
  const rows = [];
  let total = 0;
  for (const p of walkTree(root)) {
    noLinks(p);
    if (rows.length >= 10000) throw new Failure("purge manifest exceeds 10000 entries; split a reviewed cleanup");
    const info = fileState(p);
    if (info.kind === "file") total += info.size;
    if (total > 256 * 1024 * 1024) throw new Failure("purge manifest exceeds 256 MiB; split or use a separately reviewed cleanup adapter");
    const rel = relative(root, p).replaceAll("\\", "/");
    rows.push({ path: rel || ".", state: info });
  }
  return { kind: "tree", manifest_sha256: sha([...rows].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)), logical_bytes: total, entries: rows.length };
}

function diskUsage(p) {
  const s = statfsSync(p);
  const bsize = Number(s.bsize);
  return { total: Number(s.blocks) * bsize, free: Number(s.bfree) * bsize };
}

export function inventory(req) {
  const tools = {};
  for (const [name, args] of [["python3", ["--version"]], ["python", ["--version"]], ["uv", ["--version"]],
    ["java", ["-version"]], ["node", ["--version"]], ["npm", ["--version"]],
    ["volta", ["--version"]], ["docker", ["--version"]], ["git", ["--version"]], ["ssh", ["-V"]]]) {
    const path = which(name);
    const item = { path, status: "missing" };
    if (path) {
      try {
        const p = spawnSync(path, args, { encoding: "utf8", timeout: 8000 });
        item.status = p.status === 0 ? "observed" : "failed";
        item.version = ((p.stdout || "") + (p.stderr || "")).trim().slice(0, 2000);
      } catch { item.status = "unavailable"; }
    }
    tools[name] = item;
  }
  let docker_control = null;
  if (req.include_docker) {
    try {
      const context = spawnSync("docker", ["context", "show"], { encoding: "utf8", timeout: 20000 });
      if (context.status !== 0) throw new Error("docker context");
      const ctx = context.stdout.trim();
      const endpoint = JSON.parse(spawnSync("docker", ["context", "inspect", ctx, "--format", "{{json .Endpoints.docker.Host}}"], { encoding: "utf8", timeout: 20000 }).stdout.trim());
      const info = JSON.parse(spawnSync("docker", ["--context", ctx, "info", "--format", "{{json .}}"], { encoding: "utf8", timeout: 30000 }).stdout.trim());
      const compose = spawnSync("docker", ["--context", ctx, "compose", "version", "--short"], { encoding: "utf8", timeout: 20000 }).stdout.trim();
      docker_control = { status: "observed", context: ctx, endpoint, id: info.ID, data_root: info.DockerRootDir, os_type: info.OSType, compose_version: compose };
    } catch { docker_control = { status: "unavailable" }; }
  }
  const diagnostics = { issues: [], memory: {}, disks: {} };
  try {
    const mem = {};
    for (const line of readFileSync("/proc/meminfo", "utf8").split("\n")) {
      if (!line.includes(":")) continue;
      const [k, v] = line.split(":", 2);
      mem[k] = parseInt(v.trim().split(/\s+/)[0], 10) * 1024;
    }
    diagnostics.memory = Object.fromEntries(["MemTotal", "MemAvailable", "Cached", "SwapTotal", "SwapFree"].map((k) => [k, mem[k]]));
    if (mem.MemTotal && mem.MemAvailable / mem.MemTotal < 0.05) diagnostics.issues.push("low-memory-available: diagnose pressure before any cleanup");
  } catch {}
  for (const candidate of req.disk_roots ?? [userInfo().homedir]) {
    let p = candidate;
    while (!existsSync(p) && dirname(p) !== p) p = dirname(p);
    const usage = diskUsage(p);
    diagnostics.disks[candidate] = { observed_path: p, total: usage.total, free: usage.free };
    if (usage.free / Math.max(usage.total, 1) < 0.1) diagnostics.issues.push("low-disk-free:" + candidate);
  }
  const snapshots = {};
  for (const p of req.paths ?? []) snapshots[p] = (req.deep_paths ?? []).includes(p) ? treeState(p) : fileState(p);
  let uid = null;
  try { uid = process.getuid?.() ?? null; } catch { uid = null; }
  return {
    identity: fingerprint(), observed_at: stamp(), diagnostics, docker_control,
    platform: platformSystem().toLowerCase(),
    architecture: process.platform === "win32" ? (process.env.PROCESSOR_ARCHITECTURE || osMachine()) : (osMachine() || process.arch),
    hostname: hostname(),
    account: process.env.USERNAME || process.env.USER || "unknown",
    uid,
    node: process.execPath,
    tools,
    defaults: { JAVA_HOME: process.env.JAVA_HOME, PATH: process.env.PATH, SDKMAN_DIR: process.env.SDKMAN_DIR, VOLTA_HOME: process.env.VOLTA_HOME },
    snapshots,
  };
}

function under(path, root, allowRoot = false) {
  const p = resolve(path), r = resolve(root);
  if (!isAbsolute(p) || p.split(/[\\/]/).includes("..")) throw new Failure("nonabsolute/traversing path");
  const rel = relative(r, p);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Failure("path outside approved root: " + p);
  if (p === r && !allowRoot) throw new Failure("operation may not target entire host root");
  noLinks(p);
  return p;
}

function checkedPath(path, req, allowRoot = false) {
  if ((req.external_files ?? []).includes(path)) {
    noLinks(path);
    return resolve(path);
  }
  return under(path, req.root, allowRoot);
}

export function stripSecrets(text, values) {
  for (const v of [...new Set(values)].sort((a, b) => b.length - a.length)) {
    if (v) text = text.split(v).join("[REDACTED]");
  }
  return text.replace(/(password|passwd|token|secret|access_key)(\s*[=:]\s*)[^\s,;]+/gi, "$1$2[REDACTED]");
}

export const agentHooks = { spawnSync };

function stdinBuffer(stdin) {
  if (stdin == null) return undefined;
  return Buffer.isBuffer(stdin) ? stdin : Buffer.from(String(stdin), "utf8");
}

export function command(argv, { cwd, env = null, stdin = null, timeout = 300, secrets = null, success_codes = null } = {}) {
  if (!Array.isArray(argv) || !argv.length || !argv.every((x) => typeof x === "string" && !x.includes("\0"))) {
    throw new Failure("argv must be a nonempty string array");
  }
  const values = secrets || [];
  const runTmp = join(cwd, ".ops-command-tmp");
  mkdir(runTmp, 0o700);
  const outPath = join(runTmp, "out.bin"), errPath = join(runTmp, "err.bin");
  try {
    // Node 24: encoding "buffer" with a string input throws ERR_UNKNOWN_ENCODING.
    const p = agentHooks.spawnSync(argv[0], argv.slice(1), {
      cwd,
      env: { ...process.env, ...(env || {}), TMPDIR: runTmp, TMP: runTmp, TEMP: runTmp },
      input: stdinBuffer(stdin),
      timeout: timeout * 1000,
      maxBuffer: 32 * 1024 * 1024,
      encoding: "buffer",
      windowsHide: true,
    });
    if (p.error && p.error.code === "ETIMEDOUT") throw new Failure("command timed out; side effects may have occurred, inspect before replanning");
    if (p.error) throw new Failure(String(p.error.message || p.error));
    const rawOut = (p.stdout || Buffer.alloc(0)).subarray(0, 2 * 1024 * 1024);
    const rawErr = (p.stderr || Buffer.alloc(0)).subarray(0, 2 * 1024 * 1024);
    const stdout = rawOut.toString("utf8");
    const stderr = rawErr.toString("utf8");
    const result = {
      exit_code: p.status,
      stdout,
      stderr,
      log_stdout: stripSecrets(stdout, values),
      log_stderr: stripSecrets(stderr, values),
      output_sha256: sha(Buffer.concat([rawOut, rawErr])),
    };
    if (!(success_codes || [0]).includes(p.status)) {
      throw new Failure("command failed with exit=" + p.status + "; output_sha256=" + result.output_sha256 + "; " + result.log_stderr.slice(-1500));
    }
    return result;
  } finally {
    try { unlinkSync(outPath); } catch {}
    try { unlinkSync(errPath); } catch {}
    try { rmSync(runTmp, { recursive: true, force: true }); } catch {}
  }
}

function parseDockerJson(text, label) {
  try {
    return JSON.parse(String(text).trim());
  } catch (e) {
    throw new Failure(label + " is not valid JSON: " + (e.message || e));
  }
}

export { parseDockerJson };

export function inspectContainerGate(item) {
  const st = item.State || {};
  const name = item.Name || item.Id || "unknown";
  if (st.Status !== "running" || st.OOMKilled || st.Restarting) {
    throw new Failure("container not running after compose-up: " + name + " status=" + (st.Status || "unknown"));
  }
  if (st.Health && st.Health.Status && st.Health.Status !== "healthy") {
    throw new Failure("container health is " + st.Health.Status + " after compose --wait; TCP/proxy listen is not sufficient");
  }
}

function dockerBase(op) {
  const cmd = [op.docker || "docker"];
  if (op.context) cmd.push("--context", op.context);
  return cmd;
}
function composeBase(op) {
  return dockerBase(op).concat(["compose", "--project-name", op.compose_name, "--project-directory", op.project_root, "--file", join(op.project_root, "compose", "compose.yaml")]);
}

function composeUp(op, req) {
  const root = checkedPath(op.project_root, req);
  const base = composeBase(op);
  const docker = dockerBase(op);
  const info = command(docker.concat(["info", "--format", "{{json .}}"]), { cwd: root, timeout: 30, secrets: req.secrets || [] });
  const daemon = parseDockerJson(info.stdout, "docker info");
  if (daemon.ID !== op.expected_docker_id) throw new Failure("Docker daemon identity changed since approval");
  const actual = daemon.DockerRootDir;
  if (req.strict_docker_root !== false) {
    under(actual, req.root);
    if (resolve(actual) !== join(req.root, "_runtime", "docker")) {
      throw new Failure("Docker data-root must be registered host_root/_runtime/docker; existing engine migration needs a separate approved host plan");
    }
  }
  command(base.concat(["config", "--quiet"]), { cwd: root, timeout: 30, secrets: req.secrets || [] });
  const model = JSON.parse(readFileSync(join(root, "compose", "compose.yaml"), "utf8"));
  if (Object.values(model.services).some((s) => "build" in s)) {
    command(base.concat(["build", "--pull=false"]), { cwd: root, timeout: op.timeout || 1200, secrets: req.secrets || [] });
  }
  command(base.concat(["pull", "--ignore-buildable"]), { cwd: root, timeout: op.timeout || 1200, secrets: req.secrets || [] });
  for (const [name, service] of Object.entries(model.services)) {
    const image = service.image || op.compose_name + "-" + name;
    const conf = command(docker.concat(["image", "inspect", image, "--format", "{{json .Config.Volumes}}"]), { cwd: root, timeout: 30, secrets: req.secrets || [] });
    const declared = parseDockerJson(conf.stdout, "image volumes for " + image) || {};
    const mapped = new Set([...(service.volumes || []).map((v) => v.target), ...(service.tmpfs || [])]);
    const missing = Object.keys(declared).filter((k) => !mapped.has(k));
    if (missing.length) throw new Failure("image declares unmapped VOLUME(s), refusing anonymous persistence: " + JSON.stringify(missing.sort()));
  }
  command(base.concat(["up", "--detach", "--remove-orphans", "--wait", "--wait-timeout", String(op.wait_timeout || 120)]), { cwd: root, timeout: op.timeout || 1200, secrets: req.secrets || [] });
  const ids = command(base.concat(["ps", "--all", "--quiet"]), { cwd: root, timeout: 30 }).stdout.split(/\s+/).filter(Boolean);
  if (!ids.length) throw new Failure("Compose returned no containers");
  for (const cid of ids) {
    const item = parseDockerJson(command(docker.concat(["inspect", cid]), { cwd: root, timeout: 30, secrets: req.secrets || [] }).stdout, "docker inspect")[0];
    inspectContainerGate(item);
    for (const mount of item.Mounts || []) {
      if (mount.Type === "volume") throw new Failure("anonymous/named persistence detected after start; stop and reconcile");
      if (mount.Type === "bind") under(mount.Source, root);
    }
  }
  return { containers: ids, docker_data_root: actual, compose_name: op.compose_name, verified_at: stamp() };
}

function pyQuote(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function allocation(op, req) {
  const provider = checkedPath(op.provider_root, req);
  const aid = op.allocation_id;
  checkId(aid);
  const marker = join(provider, "allocations", aid + ".json");
  if (op.compose_name) {
    const info = parseDockerJson(command(dockerBase(op).concat(["info", "--format", "{{json .}}"]), { cwd: provider, timeout: 30 }).stdout, "provider docker info");
    if (info.ID !== op.expected_docker_id) throw new Failure("provider Docker daemon identity drift");
  }
  const ownership = {
    allocation_id: aid, resource: op.resource, app_username: op.app_username,
    owner_project_id: op.owner_project_id, environment: op.environment, credential_ref: op.credential_ref,
  };
  if (existsSync(marker)) {
    if (JSON.stringify(rj(marker)) !== JSON.stringify(ownership)) throw new Failure("allocation ownership conflict");
    return { allocation_id: aid, status: "already-owned-no-password-reset" };
  }
  if (op.kind === "mysql-allocation") {
    const base = dockerBase(op).concat(["compose", "--project-name", op.compose_name, "--project-directory", provider, "--file", join(provider, "compose", "compose.yaml"),
      "exec", "-T", "-e", "MYSQL_PWD", op.compose_service, "mysql", "--batch", "--skip-column-names", "--user", op.admin_username]);
    const env = { MYSQL_PWD: op.admin_password };
    const sql = (q) => command(base, { cwd: provider, env, stdin: q, timeout: 120, secrets: req.secrets || [] }).stdout.trim();
    const db = op.resource, user = op.app_username;
    const exists = sql("SELECT (SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='" + db + "')+(SELECT COUNT(*) FROM mysql.user WHERE user='" + user + "');\n");
    if (exists !== "0") throw new Failure("database/user already exists without allocation marker; verified adoption required");
    const hx = Buffer.from(op.app_password).toString("hex");
    const q = "CREATE DATABASE `" + db + "`;\nSET @p=CONVERT(0x" + hx + " USING utf8mb4);\nSET @s=CONCAT('CREATE USER ''" + user + "''@''%'' IDENTIFIED BY ',QUOTE(@p));\nPREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;\nGRANT " + op.privileges.join(",") + " ON `" + db + "`.* TO '" + user + "'@'%';\n";
    sql(q);
    const app = [...base.slice(0, -1), user, "--database", db];
    command(app, { cwd: provider, env: { MYSQL_PWD: op.app_password }, stdin: "SELECT DATABASE();\n", timeout: 30, secrets: req.secrets || [] });
  } else if (op.kind === "redis-allocation") {
    const base = dockerBase(op).concat(["compose", "--project-name", op.compose_name, "--project-directory", provider, "--file", join(provider, "compose", "compose.yaml"),
      "exec", "-T", "-e", "REDISCLI_AUTH", op.compose_service, "redis-cli", "--user", op.admin_username, "--raw"]);
    const env = { REDISCLI_AUTH: op.admin_password };
    const old = command(base.concat(["ACL", "GETUSER", op.app_username]), { cwd: provider, env, secrets: req.secrets || [] }).stdout.trim();
    if (old) throw new Failure("Redis user exists without allocation marker; verified adoption required");
    const args = ["ACL", "SETUSER", op.app_username, "reset", "on", ">" + op.app_password, "~" + op.prefix + ":*", "resetchannels", "-@all", "+@read", "+@write", "-@dangerous", "+ping"];
    const resp = "*" + args.length + "\r\n" + args.map((x) => "$" + Buffer.byteLength(x) + "\r\n" + x + "\r\n").join("");
    const reply = command(base.concat(["--pipe"]), { cwd: provider, env, stdin: resp, secrets: req.secrets || [] }).stdout;
    if (!reply.includes("errors: 0")) throw new Failure("Redis ACL pipe did not confirm zero errors");
    const saved = command(base.concat(["ACL", "SAVE"]), { cwd: provider, env, secrets: req.secrets || [] }).stdout.trim();
    if (saved !== "OK") throw new Failure("Redis ACL persistence was not confirmed");
    const app = [...base];
    app[app.indexOf("--user") + 1] = op.app_username;
    const pong = command(app.concat(["PING"]), { cwd: provider, env: { REDISCLI_AUTH: op.app_password }, secrets: req.secrets || [] }).stdout.trim();
    if (pong !== "PONG") throw new Failure("new Redis ACL could not authenticate");
  } else if (op.kind === "minio-allocation") {
    let u;
    try { u = new URL(op.endpoint); } catch { throw new Failure("invalid MinIO endpoint"); }
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname || u.username || u.password) throw new Failure("invalid MinIO endpoint");
    const auth = pyQuote(op.admin_username) + ":" + pyQuote(op.admin_password) + "@";
    const url = u.protocol + "//" + auth + u.host + u.pathname + u.search + u.hash;
    const env = { MC_HOST_ops: url };
    const mc = [op.client_path, "--config-dir", join(provider, "run", "mc"), "--json"];
    mkdir(join(provider, "run", "mc"), 0o700);
    const buckets = command(mc.concat(["ls", "ops"]), { cwd: provider, env, secrets: req.secrets || [] }).stdout;
    if (buckets.split("\n").filter((l) => l.trim()).some((line) => { try { return JSON.parse(line).key?.replace(/\/$/, "") === op.resource; } catch { return false; } })) {
      throw new Failure("MinIO bucket exists without allocation marker");
    }
    const users = command(mc.concat(["admin", "user", "list", "ops"]), { cwd: provider, env, secrets: req.secrets || [] }).stdout;
    if (users.includes(op.app_username)) throw new Failure("MinIO user exists without allocation marker");
    command(mc.concat(["mb", "ops/" + op.resource]), { cwd: provider, env, secrets: req.secrets || [] });
    if (!op.secret_argv_acknowledged) throw new Failure("MinIO secret argv exposure not approved");
    command(mc.concat(["admin", "user", "add", "ops", op.app_username, op.app_password]), { cwd: provider, env, secrets: req.secrets || [] });
    const policy = { Version: "2012-10-17", Statement: [
      { Effect: "Allow", Action: ["s3:GetBucketLocation", "s3:ListBucket"], Resource: ["arn:aws:s3:::" + op.resource] },
      { Effect: "Allow", Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"], Resource: ["arn:aws:s3:::" + op.resource + "/*"] },
    ] };
    const policyPath = join(provider, "config", "minio", "policies", aid + ".json");
    wj(policyPath, policy);
    command(mc.concat(["admin", "policy", "create", "ops", aid, policyPath]), { cwd: provider, env, secrets: req.secrets || [] });
    command(mc.concat(["admin", "policy", "attach", "ops", aid, "--user", op.app_username]), { cwd: provider, env, secrets: req.secrets || [] });
    const appauth = pyQuote(op.app_username) + ":" + pyQuote(op.app_password) + "@";
    const appurl = u.protocol + "//" + appauth + u.host + u.pathname + u.search + u.hash;
    command(mc.concat(["ls", "ops/" + op.resource]), { cwd: provider, env: { MC_HOST_ops: appurl }, secrets: req.secrets || [] });
  } else throw new Failure("unknown allocation adapter");
  wj(marker, ownership);
  return { allocation_id: aid, status: "provisioned-and-authenticated", ownership_path: marker };
}

function getpwnam(name) {
  const text = readFileSync("/etc/passwd", "utf8");
  for (const line of text.split("\n")) {
    const [user, , uid, gid] = line.split(":");
    if (user === name) return { pw_uid: Number(uid), pw_gid: Number(gid) };
  }
  throw new Failure("unknown account: " + name);
}

function b64decode(s) {
  if (typeof s !== "string" || s.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(s)) throw new Failure("invalid base64");
  return Buffer.from(s, "base64");
}

function httpGetSync(url, { timeoutMs = 4000, limit = 1048576, headers = {}, redirectOrigin = null } = {}) {
  const payload = JSON.stringify({ url, timeoutMs, limit, headers, redirectOrigin });
  const code = `
    const http = require("http"); const https = require("https");
    const {url, timeoutMs, limit, headers, redirectOrigin} = JSON.parse(process.argv[1]);
    function go(u, hops) {
      if (hops > 10) { console.error("too many redirects"); process.exit(2); }
      const lib = u.startsWith("https:") ? https : http;
      const req = lib.get(u, { headers, timeout: timeoutMs }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, u).href;
          if (redirectOrigin) {
            const o = new URL(u), n = new URL(next);
            if (o.protocol !== n.protocol || o.host !== n.host) { console.error("cross-origin mirror redirect rejected"); process.exit(3); }
          }
          res.resume();
          return go(next, hops + 1);
        }
        const chunks = []; let n = 0;
        res.on("data", c => { n += c.length; if (n <= limit) chunks.push(c); });
        res.on("end", () => process.stdout.write(JSON.stringify({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8"), truncated: n > limit })));
      });
      req.on("timeout", () => { req.destroy(new Error("timeout")); });
      req.on("error", e => { process.stderr.write(e.message); process.exit(2); });
    }
    go(url, 0);
  `;
  const p = spawnSync(process.execPath, ["-e", code, payload], { encoding: "utf8", timeout: timeoutMs + 2000 });
  if (p.status === 3) throw new Failure("cross-origin mirror redirect rejected");
  if (p.status !== 0) throw new Failure(p.stderr || "http request failed");
  return JSON.parse(p.stdout);
}

function tcpConnectSync(host, port, timeoutMs) {
  const p = spawnSync(process.execPath, ["-e", `
    const net = require("net");
    const s = net.connect({host: process.argv[1], port: +process.argv[2]}, () => { s.end(); process.exit(0); });
    s.setTimeout(+process.argv[3], () => { s.destroy(); process.exit(2); });
    s.on("error", () => process.exit(2));
  `, host, String(port), String(timeoutMs)], { timeout: timeoutMs + 1000 });
  return p.status === 0;
}

function execute(op, req) {
  const kind = op.kind;
  const secrets = req.secrets || [];
  if (kind.endsWith("-allocation")) return allocation(op, req);
  if (kind === "grant-runtime") {
    if (process.platform === "win32") throw new Failure("POSIX runtime grant cannot be used on Windows");
    const account = getpwnam(op.account);
    const root = checkedPath(op.project_root, req);
    const hostroot = resolve(req.root);
    chmodSync(hostroot, 0o755);
    const grantDirs = [root];
    let x = dirname(root);
    while (x !== hostroot && x.startsWith(hostroot) && x !== dirname(x)) {
      grantDirs.push(x);
      x = dirname(x);
    }
    for (const p of grantDirs) {
      noLinks(p); chownSync(p, -1, account.pw_gid); chmodSync(p, 0o750);
    }
    for (const rel of op.directories) {
      const base = under(join(root, rel), root);
      mkdir(base);
      let count = 0;
      for (const p of walkTree(base)) {
        count += 1;
        if (count > 10000) throw new Failure("runtime permission grant exceeds scan bound");
        noLinks(p);
        chownSync(p, -1, account.pw_gid);
        if (["data", "logs", "run"].includes(rel.split("/")[0])) chownSync(p, account.pw_uid, account.pw_gid);
        const st = statSync(p);
        chmodSync(p, (st.isDirectory() || (st.mode & 0o111)) ? 0o750 : 0o640);
      }
    }
    return { account: op.account, project_root: root, directories: op.directories };
  }
  if (kind === "mkdir") {
    const p = checkedPath(op.path, req);
    mkdir(p, Number(op.mode ?? 488));
    if (process.platform !== "win32" && "mode" in op) chmodSync(p, op.mode);
    if (process.platform !== "win32" && ("uid" in op || "gid" in op)) chownSync(p, op.uid ?? -1, op.gid ?? -1);
    return { path: p, state: fileState(p) };
  }
  if (kind === "write") {
    const p = checkedPath(op.path, req);
    const data = b64decode(op.content_b64);
    const current = fileState(p);
    const expected = op.expected;
    const name = p.split(/[\\/]/).pop();
    if (name === ".ops-project.json" && current.kind === "file" && JSON.stringify(rj(p)) !== JSON.stringify(JSON.parse(data.toString("utf8")))) {
      throw new Failure("cannot overwrite another deployment ownership marker");
    }
    if (current.kind === "file" && current.sha256 === sha(data)) {
      if (process.platform === "win32") secureFile(p);
      else chmodSync(p, op.mode ?? 0o600);
      return { path: p, sha256: sha(data), unchanged: true, state: fileState(p) };
    }
    if (sha(current) !== sha(expected ?? { kind: "absent" })) throw new Failure("file drift since plan: " + p);
    if (current.kind === "file") {
      const backup = join(req.root, "_host", "runs", req.run_id, "before", sha(Buffer.from(String(p))) + ".bin");
      if (!existsSync(backup)) atomic(backup, readFileSync(p));
    }
    atomic(p, data, op.mode ?? 384);
    return { path: p, sha256: sha(data), state: fileState(p) };
  }
  if (kind === "command" || kind === "verify-command") {
    const cwd = checkedPath(op.cwd, req, true);
    const r = command(op.argv, { cwd, env: op.env, stdin: op.stdin, timeout: op.timeout ?? 300, secrets });
    if ("expect_stdout" in op && r.stdout.trim() !== op.expect_stdout.trim()) throw new Failure("verification stdout mismatch");
    if ("stdout_pattern" in op && !new RegExp(op.stdout_pattern).test(r.stdout)) throw new Failure("verification pattern mismatch");
    return r;
  }
  if (kind === "compose-up") return composeUp(op, req);
  if (kind === "compose-stop") {
    const root = checkedPath(op.project_root, req);
    return command(composeBase(op).concat(["stop"]), { cwd: root, timeout: 120, secrets });
  }
  if (kind === "health") {
    const deadline = Date.now() + (op.timeout ?? 60) * 1000;
    let last = "";
    while (Date.now() < deadline) {
      try {
        if (op.type === "tcp") {
          if (!tcpConnectSync(op.hostname, op.port, 3000)) throw new Failure("tcp connect failed");
        } else if (op.type === "http") {
          let u;
          try { u = new URL(op.url); } catch { throw new Failure("invalid health URL"); }
          if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) throw new Failure("invalid health URL");
          const r = httpGetSync(op.url, { timeoutMs: 4000, limit: 1048576 });
          if (r.status !== (op.status ?? 200)) throw new Failure("unexpected HTTP status");
          if (op.contains && !r.body.includes(op.contains)) throw new Failure("health body mismatch");
        } else throw new Failure("unsupported health type");
        return { healthy: true, at: stamp() };
      } catch (e) {
        last = e.message || String(e);
        spawnSync(process.execPath, ["-e", "setTimeout(()=>{},1000)"], { timeout: 2000 });
      }
    }
    throw new Failure("health timeout: " + last);
  }
  if (kind === "assert-file") {
    const p = checkedPath(op.path, req);
    const s = fileState(p);
    if (s.kind !== "file") throw new Failure("expected persistent file missing");
    if (op.sha256 && s.sha256 !== op.sha256) throw new Failure("persistent file hash mismatch");
    return s;
  }
  if (kind === "purge-quarantine") {
    const src = checkedPath(op.path, req);
    const qroot = join(req.root, "_host", "quarantine");
    const rel = relative(qroot, src);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Failure("purge outside quarantine");
    const parts = rel.split(/[\\/]/).filter(Boolean);
    if (parts.length !== 2) throw new Failure("purge must name one run/item, not a quarantine root");
    const originalReceipts = join(req.root, "_host", "runs", parts[0], "receipts");
    let owned = false;
    try {
      for (const name of readdirSync(originalReceipts)) {
        if (!name.endsWith(".json") || name.endsWith(".started.json")) continue;
        const rec = rj(join(originalReceipts, name));
        if (rec.result?.quarantine_path === src && rec.status === "succeeded") owned = true;
      }
    } catch {}
    if (!owned) throw new Failure("no successful isolation receipt owns this quarantine item");
    const observed = treeState(src);
    if (sha(observed) !== sha(op.expected ?? {})) throw new Failure("quarantine content changed after planning");
    const before = diskUsage(src).free;
    const st = lstatSync(src);
    if (st.isDirectory()) rmSync(src, { recursive: true, force: true });
    else unlinkSync(src);
    const after = diskUsage(qroot).free;
    return { deleted_quarantine: src, logical_bytes: observed.logical_bytes, observed_free_space_delta: after - before, irreversible: true };
  }
  if (kind === "quarantine") {
    const src = checkedPath(op.path, req);
    const rel = relative(req.root, src);
    const parts = rel.split(/[\\/]/);
    const posixRel = rel.replaceAll("\\", "/");
    if (!(posixRel.startsWith("_host/cache/") || parts.includes("logs"))) {
      throw new Failure("cleanup only supports registered cache/log targets; data/env/backups/releases are protected");
    }
    if (parts.some((p) => ["data", "env", "backups", "releases"].includes(p))) throw new Failure("protected path");
    if (sha(fileState(src)) !== sha(op.expected ?? {})) throw new Failure("cleanup candidate drift");
    const dst = join(req.root, "_host", "quarantine", req.run_id, op.item_id);
    mkdir(dirname(dst));
    if (existsSync(dst)) throw new Failure("quarantine destination exists");
    renameSync(src, dst);
    return { quarantine_path: dst, released_bytes: 0, note: "same-volume isolation is not disk reclamation" };
  }
  if (kind === "defaults") {
    const current = inventory({});
    for (const [name, expected] of Object.entries(op.expected)) {
      const actual = current.tools[name];
      if (!actual || actual.version !== expected.version) throw new Failure("default runtime not restored: " + name);
    }
    return { defaults_verified: Object.keys(op.expected), at: stamp() };
  }
  throw new Failure("unsupported operation kind: " + kind);
}

function median(times) {
  const a = [...times].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function benchmarkMirrors(req) {
  const candidates = req.candidates || [];
  if (!(candidates.length >= 1 && candidates.length <= 6)) throw new Failure("mirror test requires 1..6 explicitly approved candidates");
  const rounds = req.rounds ?? 3;
  if (![1, 2, 3].includes(rounds)) throw new Failure("mirror rounds must be 1..3");
  const limit = 262144;
  const results = [];
  for (const item of candidates) {
    if (JSON.stringify(Object.keys(item).sort()) !== JSON.stringify(["approved", "ecosystem", "expected_sha256", "id", "trust", "url"])) {
      throw new Failure("mirror candidate contract mismatch");
    }
    checkId(item.id);
    let url;
    try { url = new URL(item.url); } catch { throw new Failure("mirror samples require credential-free HTTPS with certificate verification"); }
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
      throw new Failure("mirror samples require credential-free HTTPS with certificate verification");
    }
    if (!item.approved || !["official", "intranet", "approved-third-party"].includes(item.trust)) throw new Failure("unapproved mirror candidate");
    if (!/^[a-f0-9]{64}$/.test(item.expected_sha256)) throw new Failure("mirror sample needs a preverified SHA-256");
    const times = [];
    let error = null;
    for (let i = 0; i < rounds; i++) {
      try {
        const started = process.hrtime.bigint();
        const r = httpGetSync(item.url, { timeoutMs: 5000, limit: limit + 1, headers: { "User-Agent": "Speculo-OPS/2.2 mirror-probe" }, redirectOrigin: true });
        const elapsed = Number(process.hrtime.bigint() - started) / 1e9;
        const data = Buffer.from(r.body);
        if (data.length > limit) throw new Failure("sample exceeds 256 KiB bound");
        if (sha(data) !== item.expected_sha256) throw new Failure("sample integrity mismatch");
        times.push(elapsed);
      } catch (e) { error = e.message || String(e); break; }
    }
    results.push({ id: item.id, ecosystem: item.ecosystem, url: item.url, verified: times.length === rounds, median_seconds: times.length ? median(times) : null, error });
  }
  const best = {};
  for (const row of results) {
    if (row.verified && (!(row.ecosystem in best) || row.median_seconds < best[row.ecosystem].median_seconds)) best[row.ecosystem] = row;
  }
  return {
    identity: fingerprint(), observed_at: stamp(), candidates: results, best_by_ecosystem: best,
    configuration_changed: false,
    note: "Candidate trust and sample digest are supplied by the administrator. Measured latency is not a guarantee of future download speed. A separate approved plan changes configuration.",
  };
}

export function main(req) {
  const identity = fingerprint();
  if (req.identity && identity !== req.identity) throw new Failure("target identity drift");
  const action = req.action;
  if (action === "probe") return inventory(req);
  if (action === "mirror-probe") return benchmarkMirrors(req);
  if (action === "snapshot") return { identity, paths: Object.fromEntries((req.paths || []).map((p) => [p, fileState(p)])), at: stamp() };
  const root = resolve(req.root);
  const parts = root.split(/[\\/]/).filter(Boolean);
  if (!isAbsolute(root) || parts.length < 2 || root.split(/[\\/]/).includes("..")) {
    throw new Failure("unsafe host root");
  }
  noLinks(root);
  for (const key of ["host_id", "run_id", "controller_id"]) checkId(req[key]);
  const owner = { host_id: req.host_id, run_id: req.run_id, controller_id: req.controller_id, plan_digest: req.plan_digest };
  const marker = join(root, ".ops-host.json");
  const lockdir = join(root, "_host", "execution.lock");
  if (action === "lock") {
    if (existsSync(root) && !existsSync(marker)) {
      let nonempty = false;
      try { nonempty = readdirSync(root).length > 0; } catch {}
      if (nonempty && !req.adopt_root) throw new Failure("nonempty unowned host root; explicit adoption plan required");
    }
    mkdir(root, 0o755);
    if (process.platform !== "win32" && (statSync(root).mode & 0o022)) {
      throw new Failure("host root is group/world writable; secure it in an explicit host preparation step before deployment");
    }
    if (process.platform === "win32") {
      const sid = currentSid();
      const ic = spawnSync("icacls", [root, "/inheritance:r", "/grant:r", `*${sid}:(OI)(CI)F`, "*S-1-5-18:(OI)(CI)F"], { encoding: "utf8" });
      if (ic.status !== 0) throw new Error(ic.stderr);
    }
    if (existsSync(marker)) {
      const got = rj(marker);
      if (got.host_id !== req.host_id || got.identity !== identity) throw new Failure("host root ownership conflict");
    } else wj(marker, { host_id: req.host_id, identity });
    mkdir(dirname(lockdir));
    try {
      mkdirSync(lockdir, { mode: 0o700 });
      wj(join(lockdir, "owner.json"), owner);
    } catch (e) {
      if (e.code === "EEXIST") {
        if (!existsSync(join(lockdir, "owner.json")) || JSON.stringify(rj(join(lockdir, "owner.json"))) !== JSON.stringify(owner)) {
          throw new Failure("target lock held by another operation");
        }
      } else if (e instanceof Failure) throw e;
      else throw e;
    }
    return { locked: true, owner };
  }
  if (!existsSync(marker) || JSON.stringify(rj(marker)) !== JSON.stringify({ host_id: req.host_id, identity })) {
    throw new Failure("target root marker missing/conflicting");
  }
  if (action === "receipts") {
    const folder = join(root, "_host", "runs", req.run_id, "receipts");
    const receipts = {};
    if (existsSync(folder)) {
      for (const name of readdirSync(folder).sort()) {
        if (!name.endsWith(".json")) continue;
        receipts[name.replace(/\.json$/, "")] = rj(join(folder, name));
      }
    }
    return { receipts };
  }
  if (!existsSync(lockdir) || JSON.stringify(rj(join(lockdir, "owner.json"))) !== JSON.stringify(owner)) {
    throw new Failure("target lock not owned");
  }
  if (action === "unlock") {
    try { unlinkSync(join(lockdir, "owner.json")); } catch {}
    try { rmdirSync(lockdir); }
    catch { rmSync(lockdir, { recursive: true, force: true }); }
    return { unlocked: true };
  }
  if (action !== "step") throw new Failure("unknown agent action");
  const op = req.operation;
  checkId(op.step_id);
  const receipts = join(root, "_host", "runs", req.run_id, "receipts");
  mkdir(receipts, 0o700);
  const receipt = join(receipts, op.step_id + ".json");
  const started = join(receipts, op.step_id + ".started.json");
  const opDigest = req.operation_digest;
  if (existsSync(receipt)) {
    const r = rj(receipt);
    if (r.operation_digest !== opDigest) throw new Failure("operation digest mismatch");
    return r;
  }
  if (existsSync(started)) return { status: "unknown", step_id: op.step_id, reason: "started without terminal receipt; do not replay blindly" };
  const callLock = join(lockdir, "active-call");
  try { mkdirSync(callLock, { mode: 0o700 }); }
  catch (e) {
    if (e.code === "EEXIST") throw new Failure("another target call is executing or crashed; inspect before manual recovery");
    throw e;
  }
  try {
    wj(started, { operation_digest: opDigest, at: stamp(), pid: process.pid });
    let record;
    try {
      let result = execute(op, req);
      if (result && typeof result === "object") {
        result = Object.fromEntries(Object.entries(result).filter(([k]) => k !== "stdout" && k !== "stderr"));
      }
      record = { status: "succeeded", step_id: op.step_id, operation_digest: opDigest, at: stamp(), result };
    } catch (e) {
      record = {
        status: "failed", step_id: op.step_id, operation_digest: opDigest, at: stamp(),
        error: stripSecrets(e.message || String(e), req.secrets || []),
        side_effects_possible: !["health", "assert-file", "defaults", "verify-command"].includes(op.kind),
      };
    }
    wj(receipt, record);
    return record;
  } finally {
    try { rmSync(callLock, { recursive: true, force: true }); } catch {}
  }
}

function emit(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

if (globalThis.OPS_REQUEST !== undefined) {
  try {
    emit({ ok: true, result: main(globalThis.OPS_REQUEST) });
  } catch (e) {
    emit({ ok: false, error: stripSecrets(e.message || String(e), (globalThis.OPS_REQUEST || {}).secrets || []) });
  }
}
