/** Strict host-key SSH and subprocess local transport. No passwords in argv. */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, digest, noSymlinks, OpsError, redact, UnknownResult } from "./core.mjs";
import { fingerprint } from "./agent.mjs";

const AGENT = join(dirname(fileURLToPath(import.meta.url)), "agent.mjs");

export const transportHooks = { spawnSync };

function shlexQuote(s) {
  if (s === "") return "''";
  if (/[^\w@%+=:,./-]/.test(s)) return "'" + s.replaceAll("'", "'\"'\"'") + "'";
  return s;
}
function shlexJoin(args) {
  return args.map(shlexQuote).join(" ");
}

export function hostTransportDigest(host) {
  const c = host.connection;
  let kh = null;
  if (host.transport === "ssh") {
    const p = c.known_hosts;
    noSymlinks(p, { allowMissing: false });
    kh = digest(readFileSync(p));
  }
  return digest({ host, known_hosts_digest: kh });
}

export function validateSshEndpoint(c) {
  if (!c || typeof c !== "object") throw new OpsError("ssh endpoint missing");
  for (const k of ["hostname", "username", "known_hosts"]) {
    if (!c[k]) throw new OpsError("ssh connection missing " + k);
  }
  if (!/^[A-Za-z0-9_.:-]+$/.test(c.hostname) || c.hostname.startsWith("-")) throw new OpsError("unsafe SSH hostname");
  if (!/^[A-Za-z0-9_.-]+$/.test(c.username) || c.username.startsWith("-")) throw new OpsError("unsafe SSH username");
  if (![undefined, "posix", "powershell"].includes(c.shell)) throw new OpsError("unsupported remote shell");
}

export function sshArgv(connection, { scp = false } = {}) {
  validateSshEndpoint(connection);
  const kh = resolve(connection.known_hosts);
  noSymlinks(kh, { allowMissing: false });
  const argv = [
    scp ? "scp" : "ssh",
    ...(scp ? [] : ["-T"]),
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=yes",
    "-o", `UserKnownHostsFile=${kh}`,
    "-o", "ConnectTimeout=15",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=3",
    scp ? "-P" : "-p", String(connection.port ?? 22),
  ];
  if (connection.identity_file) argv.push("-i", connection.identity_file, "-o", "IdentitiesOnly=yes");
  return argv;
}

function spawnTransport(argv, { input, timeout, encoding = "buffer" } = {}) {
  return transportHooks.spawnSync(argv[0], argv.slice(1), {
    input,
    encoding,
    timeout: timeout * 1000,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
}

function buffers(p) {
  const stdout = Buffer.isBuffer(p.stdout) ? p.stdout.toString("utf8") : (p.stdout || "");
  const stderr = Buffer.isBuffer(p.stderr) ? p.stderr.toString("utf8") : (p.stderr || "");
  return { stdout, stderr };
}

export function posixCall(endpoint, script, { timeout = 180, args = [], sudo = false } = {}) {
  validateSshEndpoint(endpoint);
  if ((endpoint.shell ?? "posix") === "powershell") {
    throw new OpsError("POSIX bootstrap is Linux-only; PowerShell targets still require an existing Node");
  }
  const useSudo = sudo || endpoint.sudo;
  let remote = ["/bin/sh", "-s", "--", ...args.map(String)];
  if (useSudo) remote = ["sudo", "-n", "--", ...remote];
  const argv = sshArgv(endpoint);
  argv.push("--", endpoint.username + "@" + endpoint.hostname, shlexJoin(remote));
  let p;
  try {
    p = spawnTransport(argv, { input: Buffer.from(String(script), "utf8"), timeout });
  } catch (e) {
    throw new OpsError("target posix unavailable: " + e);
  }
  if (p.error && (p.error.code === "ETIMEDOUT" || p.signal === "SIGTERM")) {
    throw new OpsError("target posix unavailable: " + p.error);
  }
  const { stdout, stderr } = buffers(p);
  if (p.status !== 0) {
    throw new OpsError("target posix failed: " + redact(stderr, []).slice(-2000));
  }
  return { status: p.status, stdout, stderr };
}

export function posixSend(endpoint, localFile, remotePath, { timeout = 180 } = {}) {
  validateSshEndpoint(endpoint);
  if ((endpoint.shell ?? "posix") === "powershell") {
    throw new OpsError("POSIX bootstrap is Linux-only; PowerShell targets still require an existing Node");
  }
  noSymlinks(localFile, { allowMissing: false });
  if (typeof remotePath !== "string" || !isAbsolute(remotePath) || remotePath.split("/").includes("..") || /[\s\n\r]/.test(remotePath)) {
    throw new OpsError("remote scp path must be absolute without spaces or ..");
  }
  const argv = sshArgv(endpoint, { scp: true });
  argv.push("--", localFile, `${endpoint.username}@${endpoint.hostname}:${remotePath}`);
  let p;
  try {
    p = spawnTransport(argv, { input: Buffer.alloc(0), timeout });
  } catch (e) {
    throw new OpsError("target scp unavailable: " + e);
  }
  if (p.error && (p.error.code === "ETIMEDOUT" || p.signal === "SIGTERM")) {
    throw new OpsError("target scp unavailable: " + p.error);
  }
  const { stderr } = buffers(p);
  if (p.status !== 0) throw new OpsError("target scp failed: " + redact(stderr, []).slice(-2000));
  return { status: 0, remotePath };
}

function injectRequest(source, request) {
  const b64 = Buffer.from(canonical(request)).toString("base64");
  const assign = `globalThis.OPS_REQUEST = JSON.parse(Buffer.from(${JSON.stringify(b64)}, "base64").toString("utf8"));`;
  const lines = source.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, assign);
  return lines.join("\n");
}

export function call(host, request, { timeout = 1800 } = {}) {
  request = { identity: host.identity, ...request };
  const content = injectRequest(readFileSync(AGENT, "utf8"), request);
  if (host.transport === "local") {
    const argv = [process.execPath, "--input-type=module"];
    let p;
    try {
      p = spawnTransport(argv, { input: content, timeout, encoding: "utf8" });
    } catch (e) {
      if (["step", "lock", "unlock"].includes(request.action)) throw new UnknownResult("target transport interrupted; inspect receipts before retry");
      throw new OpsError("target read unavailable: " + e);
    }
    return decode(p, request);
  }
  const c = host.connection;
  const argv = sshArgv(c);
  let remote = [c.node, "--input-type=module"];
  if (c.sudo) remote = ["sudo", "-n", "--", ...remote];
  let remoteCommand;
  if ((c.shell ?? "posix") === "powershell") {
    if (c.sudo) throw new OpsError("sudo not valid for PowerShell transport");
    const inner = "& " + remote.map((x) => "'" + x.replaceAll("'", "''") + "'").join(" ");
    const ps = Buffer.from(inner, "utf16le").toString("base64");
    remoteCommand = "powershell -NoProfile -NonInteractive -EncodedCommand " + ps;
  } else {
    remoteCommand = shlexJoin(remote);
  }
  argv.push("--", c.username + "@" + c.hostname, remoteCommand);
  let p;
  try {
    p = spawnTransport(argv, { input: Buffer.from(content, "utf8"), timeout });
  } catch (e) {
    if (["step", "lock", "unlock"].includes(request.action)) throw new UnknownResult("target transport interrupted; inspect receipts before retry");
    throw new OpsError("target read unavailable: " + e);
  }
  return decode(p, request);
}

function decode(p, request) {
  if (p.error && (p.error.code === "ETIMEDOUT" || p.signal === "SIGTERM")) {
    if (["step", "lock", "unlock"].includes(request.action)) throw new UnknownResult("target transport interrupted; inspect receipts before retry");
    throw new OpsError("target read unavailable: " + p.error);
  }
  const { stdout, stderr } = buffers(p);
  if (p.status !== 0) {
    const text = redact(stderr, request.secrets || []).slice(-2000);
    if (["step", "lock", "unlock"].includes(request.action)) throw new UnknownResult("target transport failed: " + text);
    throw new OpsError("target read failed: " + text);
  }
  let value;
  try { value = JSON.parse(stdout); }
  catch { throw new UnknownResult("invalid target response; stdout noise or interrupted operation"); }
  if (!value.ok) throw new OpsError("target blocked: " + (value.error || "unknown"));
  return value.result;
}

export function probeLocal() {
  const host = {
    host_id: "probe-local",
    platform: process.platform === "win32" ? "windows" : "linux",
    transport: "local",
    connection: {},
    identity: fingerprint(),
  };
  return call(host, { action: "probe" }, { timeout: 120 });
}
