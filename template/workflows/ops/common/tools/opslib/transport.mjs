/** Strict host-key SSH and subprocess local transport. No passwords in argv. */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
      p = transportHooks.spawnSync(argv[0], argv.slice(1), {
        input: content,
        encoding: "utf8",
        timeout: timeout * 1000,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
      });
    } catch (e) {
      if (["step", "lock", "unlock"].includes(request.action)) throw new UnknownResult("target transport interrupted; inspect receipts before retry");
      throw new OpsError("target read unavailable: " + e);
    }
    return decode(p, request);
  }
  const c = host.connection;
  const kh = resolve(c.known_hosts);
  noSymlinks(kh, { allowMissing: false });
  const argv = ["ssh", "-T", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", `UserKnownHostsFile=${kh}`,
    "-o", "ConnectTimeout=15", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3", "-p", String(c.port ?? 22)];
  if (c.identity_file) argv.push("-i", c.identity_file, "-o", "IdentitiesOnly=yes");
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
    p = transportHooks.spawnSync(argv[0], argv.slice(1), {
      input: Buffer.from(content, "utf8"),
      encoding: "buffer",
      timeout: timeout * 1000,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
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
  const stdout = Buffer.isBuffer(p.stdout) ? p.stdout.toString("utf8") : (p.stdout || "");
  const stderr = Buffer.isBuffer(p.stderr) ? p.stderr.toString("utf8") : (p.stderr || "");
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
