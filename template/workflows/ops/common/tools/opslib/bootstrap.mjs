/** Node-less Linux SSH bootstrap: pinned Volta/Node via POSIX + scp, then enroll. */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, basename, join, posix as posixPath } from "node:path";
import { fileURLToPath } from "node:url";
import { digest, exact, identifier, newId, noSymlinks, NodeMissing, now, OpsError, privateDir, readJson, rootPath, targetJoin, withLock, writeJson } from "./core.mjs";
import { register, validateHost } from "./model.mjs";
import { call, posixCall, posixSend, validateSshEndpoint } from "./transport.mjs";
import { confirmedBootstrapHost, validateRootConfirmation } from "./onboarding.mjs";

const ACK = "I-APPROVE-THIS-BOOTSTRAP";
const TOOLS = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = readFileSync(join(TOOLS, "bootstrap-volta.sh"), "utf8").replace(/\r\n?/g, "\n");
const PIN_PATH = join(TOOLS, "..", "toolchains", "volta-linux.json");

export function loadVoltaPin() {
  const pin = JSON.parse(readFileSync(PIN_PATH, "utf8"));
  if (pin.schema_version !== 1 || pin.manager !== "volta") throw new OpsError("invalid volta-linux pin metadata");
  return pin;
}

export const bootstrapHooks = { loadPin: loadVoltaPin };

function rejectUnpinned(label, value) {
  const s = String(value ?? "");
  if (!s || /latest/i.test(s)) throw new OpsError(`${label} must be a concrete pinned name, not latest`);
  return s;
}

function safeFilename(name) {
  rejectUnpinned("installer filename", name);
  if (!/^[A-Za-z0-9._+-]+$/.test(name)) throw new OpsError("unsafe installer filename: " + name);
  return name;
}

function sha256File(path) {
  noSymlinks(path, { allowMissing: false });
  return digest(readFileSync(path));
}

function parseJsonLine(stdout, label) {
  const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
  const last = lines.at(-1);
  try { return JSON.parse(last); }
  catch { throw new OpsError(`${label} returned invalid JSON`); }
}

export function posixProbe(endpoint, nodePath) {
  const args = ["--probe"];
  if (nodePath) args.push(String(nodePath));
  const r = posixCall(endpoint, SCRIPT, { args, sudo: false });
  return parseJsonLine(r.stdout, "posix probe");
}

function linuxHost(root) {
  return { platform: "linux", root: rootPath(root, "linux") };
}

function installerDir(hostRoot) {
  return targetJoin(linuxHost(hostRoot), "_host/installers");
}

function managedVoltaHome(hostRoot, account) {
  return targetJoin(linuxHost(hostRoot), "_host/toolchains/" + account + "/volta");
}

function downloadHttps(url, dest) {
  let u;
  try { u = new URL(url); } catch { throw new OpsError("pin URL is invalid"); }
  if (u.protocol !== "https:" || u.username || u.password) throw new OpsError("pin URL must be credential-free https");
  privateDir(dirname(dest));
  const curl = spawnSync("curl", ["-fsSL", "--max-time", "120", "-o", dest, url], { encoding: "utf8" });
  if (curl.status === 0 && existsSync(dest)) return dest;
  const wget = spawnSync("wget", ["-q", "-O", dest, url], { encoding: "utf8" });
  if (wget.status === 0 && existsSync(dest)) return dest;
  throw new OpsError("controller download failed; pass reviewed local archives instead of --allow-network");
}

function resolveArchive({ archive, sha256, pinEntry, allowNetwork, cacheDir, label }) {
  const expected = pinEntry.sha256;
  if (sha256 && sha256 !== expected) throw new OpsError(`${label} sha256 does not match the reviewed pin`);
  let file = archive;
  if (!file) {
    if (!allowNetwork) throw new OpsError(`${label} archive is required unless --allow-network fetches the pinned URL`);
    file = join(cacheDir, safeFilename(pinEntry.filename));
    downloadHttps(pinEntry.url, file);
  }
  noSymlinks(file, { allowMissing: false });
  if (safeFilename(basename(file)) && /latest/i.test(basename(file))) throw new OpsError(`${label} archive name must not contain latest`);
  const actual = sha256File(file);
  if (actual !== expected) throw new OpsError(`${label} installer changed after review`);
  return { file, sha256: expected, filename: safeFilename(pinEntry.filename) };
}

export function bootstrapNode(args) {
  const apply = Boolean(args.apply);
  if (apply && args.probe) throw new OpsError("bootstrap-node --probe and --apply are mutually exclusive");
  if (!args.connection_file) throw new OpsError("--connection-file is required");
  const host = JSON.parse(readFileSync(args.connection_file, "utf8"));
  const endpoint = host.connection || host;
  validateSshEndpoint(endpoint);
  if ((endpoint.shell ?? "posix") === "powershell") {
    throw new OpsError("POSIX bootstrap is Linux-only; PowerShell targets still require an existing Node");
  }
  const pin = bootstrapHooks.loadPin();
  const posix = posixProbe(endpoint, endpoint.node);
  if (String(posix.arch || "").startsWith("unsupported")) throw new OpsError("unsupported target architecture: " + posix.arch);
  const arch = posix.arch;
  const pinArch = pin.archives[arch];
  if (!pinArch) throw new OpsError("no pinned Volta/Node archives for " + arch);

  if (!apply) {
    return { status: "probed", posix, pin: { volta_version: pin.volta_version, node_version: pin.node_version, arch } };
  }

  if (posix.node_usable && posix.tools?.node && posix.tools.node !== "missing") {
    return {
      status: "skipped-existing-node",
      connection_node: posix.node_path || posix.tools.node,
      posix,
      note: "existing Node left untouched; register it as connection.node",
    };
  }

  if (args.ack !== ACK) throw new OpsError("explicit acknowledgement I-APPROVE-THIS-BOOTSTRAP is required");
  if (!args.account) throw new OpsError("--account is required");
  if (!args.host_root) throw new OpsError("--host-root is required");
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,79}$/.test(args.account)) throw new OpsError("unsafe toolchain account");
  const hostRoot = rootPath(args.host_root, "linux");
  const nodeVersion = rejectUnpinned("node version", args.node_version || pin.node_version);
  if (nodeVersion !== pin.node_version) throw new OpsError("node version must match the reviewed pin " + pin.node_version);

  const cacheDir = args.state ? join(args.state, "private", "installers") : join(hostRoot, "_host", "installers-cache");
  const volta = resolveArchive({
    archive: args.volta_archive, sha256: args.volta_sha256, pinEntry: pinArch.volta,
    allowNetwork: Boolean(args.allow_network), cacheDir, label: "Volta",
  });
  const node = resolveArchive({
    archive: args.node_archive, sha256: args.node_sha256, pinEntry: pinArch.node,
    allowNetwork: Boolean(args.allow_network), cacheDir, label: "Node",
  });

  // Only read operations precede confirmation. The remote write gate is shared with H/D.
  const confirmed = confirmedBootstrapHost(args.state, host, args.host_id, hostRoot);
  if (args.account !== endpoint.username) throw new OpsError("bootstrap account must be the observed SSH login account");
  if (/[\s\\\0]/.test(hostRoot)) throw new OpsError("Node bootstrap scp requires a root without whitespace or backslashes; use an existing Node or a supported dedicated path");

  const installers = installerDir(hostRoot);
  const voltaHome = managedVoltaHome(hostRoot, args.account);
  return withLock(join(args.state, ".locks", "catalog"), { operation: "bootstrap-node", host_id: args.host_id }, () => {
    validateRootConfirmation(args.state, confirmed, { fresh: true, freshLegacy: true, checkEndpoint: true });
    const rootConfirmation = confirmed.root_confirmation ?? null;
    const attempt = join(args.state, "hosts", args.host_id, "bootstrap", "attempt-" + digest({ identity: confirmed.identity, root: hostRoot }).slice(0, 24) + ".json");
    const inputDigest = digest({ identity: confirmed.identity, root: hostRoot, account: args.account, node_version: nodeVersion, volta_sha256: volta.sha256, node_sha256: node.sha256 });
    noSymlinks(attempt);
    if (existsSync(attempt)) {
      const previous = readJson(attempt);
      if (args.recover_ack !== "I-VERIFIED-BOOTSTRAP-IS-STOPPED" || !args.recovery_statement?.trim()) throw new OpsError("bootstrap already started; inspect " + attempt + " and remote state, then explicitly supply --recover-ack I-VERIFIED-BOOTSTRAP-IS-STOPPED --recovery-statement with the actual recovery authorization; never replay blindly");
      if (previous.input_digest !== inputDigest) throw new OpsError("bootstrap recovery inputs differ from the original attempt; preserve evidence and prepare a separate repair plan");
      writeJson(join(dirname(attempt), newId("recovery") + ".json"), { previous_attempt: previous, ack: args.recover_ack, statement: args.recovery_statement, at: now() }, { exclusive: true });
    }
    writeJson(attempt, { status: "started", host_id: args.host_id, root: hostRoot, root_confirmation: rootConfirmation, input_digest: inputDigest, at: now() });
    const owner = JSON.stringify({ host_id: args.host_id, identity: confirmed.identity });
    // Match the existing agent-owned marker. Run as the login account so scp can write.
    // Recheck links immediately before mkdir; never chown/chmod an existing parent.
    posixCall(endpoint, "#!/bin/sh\nset -eu\numask 077\n[ ! -e \"$3/_host/execution.lock\" ] && [ ! -L \"$3/_host/execution.lock\" ] || { echo 'target execution lock exists; inspect before bootstrap' >&2; exit 2; }\nfor dest in \"$1\" \"$2\"; do p=$dest; while [ \"$p\" != / ]; do [ ! -L \"$p\" ] || exit 2; p=$(dirname -- \"$p\"); done; done\nmkdir -p -- \"$1\" \"$2\"\nif [ ! -e \"$3/.ops-host.json\" ]; then (set -C; printf '%s\\n' \"$4\" > \"$3/.ops-host.json\"); fi\n", { sudo: false, args: [installers, voltaHome, hostRoot, owner] });
    const remoteVolta = posixPath.join(installers, volta.filename);
    const remoteNode = posixPath.join(installers, node.filename);
    posixSend(endpoint, volta.file, remoteVolta);
    posixSend(endpoint, node.file, remoteNode);
    const applied = posixCall(endpoint, SCRIPT, {
      args: ["--apply", remoteVolta, volta.sha256, remoteNode, node.sha256, voltaHome, nodeVersion, ACK],
      timeout: 600,
      sudo: false,
    });
    const result = parseJsonLine(applied.stdout, "posix apply");
    result.status = result.status || "installed";
    result.posix_probe = posix;
    result.arch = arch;

    if (args.state && args.host_id) {
      identifier(args.host_id);
      const receipt = join(args.state, "hosts", args.host_id, "bootstrap", newId("receipt") + ".json");
      writeJson(receipt, { ...result, host_id: args.host_id, at: now() });
      writeJson(attempt, { status: "installed", host_id: args.host_id, root: hostRoot, root_confirmation: rootConfirmation, input_digest: inputDigest, receipt, at: now() });
      result.receipt = receipt;
    }
    return result;
  });
}

export function enroll(state, request) {
  exact(request, new Set(["hosts", "projects"]), new Set(), "enroll");
  const hosts = request.hosts ?? [];
  if (!hosts.length) throw new OpsError("enroll requires hosts");
  const enrolled = [];
  for (const raw of hosts) {
    const host = { ...raw, connection: { ...(raw.connection || {}) } };
    if (host.transport !== "ssh") throw new OpsError("enroll currently supports ssh hosts; local hosts use register");
    validateSshEndpoint(host.connection);
    if ((host.connection.shell ?? "posix") === "powershell") {
      throw new OpsError("POSIX bootstrap/enroll is Linux-only");
    }
    if (!host.connection.node) throw new NodeMissing({ tools: { node: "missing" }, node_usable: false });
    const posix = posixProbe(host.connection, host.connection.node);
    if (posix.tools?.node === "missing" || posix.node_usable === false) throw new NodeMissing(posix);
    const discovery = host.identity === "discover" || host.identity == null;
    if (discovery) host.identity = "0".repeat(64);
    if (!posixPath.isAbsolute(host.connection.node) || host.connection.node.includes("\\")) {
      throw new OpsError("connection.node must be the absolute path returned by bootstrap-node");
    }
    validateHost(host);
    const observed = call(host, { action: "probe", ...(discovery ? { identity: null } : {}) }, { timeout: 180 });
    host.identity = observed.identity;
    validateHost(host);
    validateRootConfirmation(state, host, { checkEndpoint: true });
    register(state, { hosts: [host], projects: request.projects });
    const inventory = call(host, { action: "probe" }, { timeout: 180 });
    const snap = join(state, "hosts", host.host_id, "inventory", newId("snapshot") + ".json");
    writeJson(snap, inventory);
    enrolled.push({
      host_id: host.host_id,
      identity: host.identity,
      connection_node: host.connection.node,
      inventory,
      snapshot: snap,
    });
  }
  return {
    status: "enrolled",
    hosts: enrolled,
    host_id: enrolled[0].host_id,
    identity: enrolled[0].identity,
    inventory: enrolled[0].inventory,
    connection_node: enrolled[0].connection_node,
  };
}

export function discoverOrMissing(host) {
  if (host.transport !== "ssh") return null;
  validateSshEndpoint(host.connection);
  const posix = posixProbe(host.connection, host.connection?.node);
  const missing = posix.tools?.node === "missing" || posix.node_usable === false;
  if (missing) throw new NodeMissing(posix);
  if (!host.connection.node && posix.node_path) host.connection.node = posix.node_path;
  return posix;
}
