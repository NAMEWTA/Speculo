/** Bounded, read-only SSH/public-key and runtime checks; never installs or changes sshd. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, posix } from "node:path";
import { digest, identifier, newId, now, noSymlinks, OpsError, withLock, writeJson } from "./core.mjs";
import { readBoundedJson, readRegistry, statePath, targetDigest } from "./workspace.mjs";

export const CHECK_IDS = Object.freeze([
  "registration", "ssh-publickey", "machine-identity", "linux", "node-runtime",
  "deployment-root", "disk-space", "memory", "docker-daemon", "compose-version", "docker-data-root",
  "least-privilege", "time-sync", "firewall", "egress", "backup-restore",
]);
const profiles = new Set(["base", "compose", "native"]);
const statuses = new Set(["pass", "fail", "warn", "unknown", "not-applicable"]);

function version(v) {
  const m = typeof v === "string" && /(?:^|\s)v?(\d+)\.(\d+)\.(\d+)(?:\s|$|[-+])/.exec(v);
  return m ? m.slice(1).map(Number) : null;
}
function atLeast(v, min) {
  const found = version(v);
  if (!found) return null;
  for (let i = 0; i < 3; i++) if (found[i] !== min[i]) return found[i] > min[i];
  return true;
}
function nodeSupported(v) {
  const parsed = version(v);
  return parsed ? atLeast(v, [22, 22, 3]) && parsed[0] < 25 : null;
}
function result(id, value, required, detail) {
  return { id, status: value == null ? "unknown" : value ? "pass" : "fail", required, detail };
}

export function assessServer(host, { profile = "base", inventory = null, keyLogin = null,
  minFreeMiB = 1024, minMemoryMiB = 256 } = {}) {
  if (!profiles.has(profile)) throw new OpsError("profile must be base, compose or native");
  for (const n of [minFreeMiB, minMemoryMiB]) if (!Number.isSafeInteger(n) || n < 1) throw new OpsError("resource thresholds must be positive integer MiB");
  const inv = inventory;
  const dc = inv?.docker_control;
  const requiredRuntime = profile !== "base";
  const disk = inv?.diagnostics?.disks?.[host.root]?.free;
  const memory = inv?.diagnostics?.memory?.MemAvailable;
  const checks = [
    result("registration", true, true, "Registered resource; not proof of connectivity"),
    host.transport === "ssh" ? result("ssh-publickey", keyLogin, true, "Strict pinned host key; publickey only; no password fallback")
      : { id: "ssh-publickey", status: "not-applicable", required: false, detail: "Explicit local target; not the controller by inference" },
    result("machine-identity", inv ? inv.identity === host.identity : null, true, "Observed machine identity must equal registered identity"),
    result("linux", inv ? inv.platform === "linux" : null, requiredRuntime, "This readiness profile covers Linux; other platforms retain legacy support"),
    result("node-runtime", nodeSupported(inv?.tools?.node?.version), requiredRuntime, "Node >=22.22.3 <25; missing Node does not prevent initial registration"),
    result("deployment-root", inv?.snapshots?.[host.root] ? inv.snapshots[host.root].kind === "directory" : null, requiredRuntime, "Dedicated root exists without symlink traversal; does not prove write permission"),
    result("disk-space", Number.isFinite(disk) ? disk >= minFreeMiB * 1024 * 1024 : null, requiredRuntime, `At least ${minFreeMiB} MiB free on root filesystem; project capacity still requires sizing`),
    result("memory", Number.isFinite(memory) ? memory >= minMemoryMiB * 1024 * 1024 : null, requiredRuntime, `At least ${minMemoryMiB} MiB available; not a workload capacity guarantee`),
    result("docker-daemon", dc ? dc.status === "observed" && typeof dc.endpoint === "string" && dc.endpoint.startsWith("unix://") : null, profile === "compose", "Reachable local Linux Docker daemon; remote Docker contexts are not this server"),
    result("compose-version", atLeast(dc?.compose_version, [2, 30, 0]), profile === "compose", "Compose >=2.30 for raw env_file; container health remains a deployment check"),
    result("docker-data-root", dc?.status === "observed" ? dc.data_root === posix.join(host.root, "_runtime/docker") : null, profile === "compose", "Existing Docker data must never be silently moved"),
    ...["least-privilege", "time-sync", "firewall", "egress", "backup-restore"].map((id) => ({
      id, status: "unknown", required: false, detail: "Requires requirement-specific evidence; no automatic mutation or blanket hardening",
    })),
  ];
  return checks;
}

export function readiness(checks, checkedAt, { at = new Date(), staleHours = 24 } = {}) {
  if (!Number.isFinite(staleHours) || staleHours <= 0) throw new OpsError("staleHours must be positive");
  const timestamp = Date.parse(checkedAt);
  if (!Number.isFinite(timestamp) || !Number.isFinite(at.getTime())) return "unknown";
  if (timestamp > at.getTime() + 60000) return "unknown";
  if (at.getTime() - timestamp > staleHours * 3600000) return "stale";
  if (!Array.isArray(checks) || !checks.length) return "unknown";
  const required = checks.filter((c) => c.required);
  if (!required.length) return "unknown";
  if (required.some((c) => c.status === "fail")) return "blocked";
  if (required.some((c) => c.status !== "pass")) return "unknown";
  return "ready";
}

export function validateCheck(report, host) {
  if (report?.schema_version !== 1 || report.artifact !== "ops-server-check" || report.host_id !== host.host_id
    || !profiles.has(report.profile) || !Number.isFinite(Date.parse(report.checked_at)) || !Array.isArray(report.checks)) {
    throw new OpsError("invalid server check report");
  }
  const found = new Set();
  for (const c of report.checks) {
    if (!CHECK_IDS.includes(c.id) || found.has(c.id) || !statuses.has(c.status) || typeof c.required !== "boolean") throw new OpsError("invalid or duplicate check item");
    found.add(c.id);
  }
  if (found.size !== CHECK_IDS.length) throw new OpsError("incomplete server checklist");
  if (!/^[a-f0-9]{64}$/.test(report.host_digest || "")) throw new OpsError("missing check host digest");
  return report;
}

export function latestCheck(state, host) {
  identifier(host.host_id);
  const folder = join(state, "records", "servers", host.host_id, "checks");
  const pointer = join(folder, "latest.json");
  noSymlinks(pointer);
  if (!existsSync(pointer)) return null;
  const p = readBoundedJson(pointer);
  identifier(p.check_id, "check_id");
  const value = readBoundedJson(join(folder, p.check_id + ".json"));
  if (digest(value) !== p.digest) throw new OpsError("server check receipt digest mismatch");
  validateCheck(value, host);
  return value;
}

export async function checkServer(state, serverId, options = {}, adapter = null) {
  statePath(state);
  identifier(serverId, "server");
  const registry = readRegistry(state);
  const host = registry.hosts[serverId];
  if (!host) throw new OpsError("unknown server; enroll through S first");
  if (host.platform !== "linux") throw new OpsError("server-check currently covers Linux only; use the existing platform-specific probe for other servers");
  // Reject malformed options before performing any network reads.
  assessServer(host, options);
  const pinnedTarget = targetDigest(host);
  if (!adapter) {
    const transport = await import("./transport.mjs");
    adapter = { call: transport.call, sshArgv: transport.sshArgv, spawn: spawnSync };
  }
  let keyLogin = null, inventory = null;
  if (host.transport === "ssh") {
    const argv = adapter.sshArgv(host.connection);
    argv.push("-o", "PreferredAuthentications=publickey", "-o", "PasswordAuthentication=no",
      "-o", "KbdInteractiveAuthentication=no", "--", host.connection.username + "@" + host.connection.hostname, "true");
    const p = adapter.spawn(argv[0], argv.slice(1), { encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
    keyLogin = !p.error && p.status === 0;
  }
  if (host.transport === "local" || keyLogin) {
    try { inventory = adapter.call(host, { action: "probe", include_docker: true, disk_roots: [host.root], paths: [host.root] }, { timeout: 180 }); }
    catch { /* A failed read is not evidence of health; keep inventory-dependent checks unknown. */ }
  }
  const report = {
    schema_version: 1, artifact: "ops-server-check", host_id: serverId,
    profile: options.profile ?? "base", checked_at: now(), host_digest: pinnedTarget,
    checks: assessServer(host, { ...options, keyLogin, inventory }),
  };
  validateCheck(report, host);
  // Refuse to attribute observations to a changed endpoint or identity.
  if (targetDigest(readRegistry(state).hosts[serverId]) !== report.host_digest) throw new OpsError("server changed while checking; do not publish misattributed evidence");
  const checkId = newId("check");
  const folder = join(state, "records", "servers", serverId, "checks");
  withLock(join(state, "records", ".locks", "check-" + serverId), { operation: "server-check" }, () => {
    writeJson(join(folder, checkId + ".json"), report, { exclusive: true });
    writeJson(join(folder, "latest.json"), { check_id: checkId, digest: digest(report) });
  });
  const status = readiness(report.checks, report.checked_at);
  return { status, server_id: serverId, profile: report.profile, report: join(folder, checkId + ".json"), checks: report.checks,
    note: "Read-only baseline, not application readiness, live monitoring or production acceptance" };
}
