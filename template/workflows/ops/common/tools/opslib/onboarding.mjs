/** S-owned account discovery and explicit root confirmation. No target writes. */
import { readFileSync } from "node:fs";
import { dirname, join, posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { digest, identifier, newId, now, noSymlinks, OpsError, rootPath, withLock, writeJson } from "./core.mjs";
import { load, validate } from "./model.mjs";
import { call, posixCall, validateSshEndpoint } from "./transport.mjs";
import { readBoundedJson, statePath } from "./workspace.mjs";

const SCRIPT = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../server-discover.sh"), "utf8").replace(/\r\n?/g, "\n");
export const onboardingHooks = { observe: observeServer };
const pathApi = (platform) => platform === "windows" ? win32 : posix;
const clean = (s) => typeof s === "string" && s.trim().length > 0 && s.length <= 4096 && !/[\x00-\x1f\x7f]/.test(s);

export function endpointDigest(host) {
  const c = { ...(host.connection || {}) };
  // Runtime selection may change after a pinned Node bootstrap, not SSH identity/trust.
  delete c.node;
  if (host.transport === "ssh") {
    validateSshEndpoint(c);
    noSymlinks(c.known_hosts, { allowMissing: false });
  }
  return digest({ platform: host.platform, transport: host.transport, connection: c,
    known_hosts_digest: host.transport === "ssh" ? digest(readFileSync(c.known_hosts)) : null });
}

export function parseLinuxDiscovery(stdout, withRoot = false) {
  const values = {};
  const keys = ["machine", "system", "username", "uid", "home", "node", "node_version",
    ...(withRoot ? ["root_exists", "root_writable", "root_nonempty", "root_owner"] : [])];
  for (const line of String(stdout).trimEnd().split(/\r?\n/)) {
    const match = /^([a-z_]+)=((?:[a-f0-9]{2})*)$/.exec(line);
    if (!match || !keys.includes(match[1]) || Object.hasOwn(values, match[1])) throw new OpsError("invalid Linux discovery response");
    values[match[1]] = Buffer.from(match[2], "hex").toString("utf8");
  }
  if (Object.keys(values).length !== keys.length || values.system !== "Linux" || !clean(values.machine)) throw new OpsError("incomplete Linux identity discovery");
  const facts = { identity: digest({ machine: values.machine.trim(), platform: "Linux" }), platform: "linux",
    username: values.username, uid: values.uid, home: values.home, node: values.node || null, node_version: values.node_version || null };
  if (withRoot) {
    for (const key of ["root_exists", "root_writable", "root_nonempty"]) if (!["true", "false"].includes(values[key])) throw new OpsError("invalid root observation");
    let owner = null;
    if (values.root_owner) { try { owner = JSON.parse(values.root_owner); } catch { throw new OpsError("invalid root owner marker"); } }
    facts.root_check = { exists: values.root_exists === "true", writable: values.root_writable === "true", nonempty: values.root_nonempty === "true", owner };
  }
  return facts;
}

export function observeServer(host, root = null) {
  if (host.transport === "ssh" && host.platform === "linux") {
    const result = posixCall(host.connection, SCRIPT, { sudo: false, args: root ? [root] : [], timeout: 30 });
    return parseLinuxDiscovery(result.stdout, Boolean(root));
  }
  if (host.transport === "ssh" && !host.connection?.node) throw new OpsError("non-Linux SSH discovery requires an existing Node executable");
  return call({ ...host, connection: host.transport === "ssh" ? { ...host.connection, sudo: false } : {} },
    { action: "onboarding", identity: null, root }, { timeout: 30 });
}

function validateFacts(host, facts) {
  if (!facts || facts.platform !== host.platform || !/^[a-f0-9]{64}$/.test(facts.identity || "")
    || !clean(facts.username) || !clean(facts.home) || !pathApi(host.platform).isAbsolute(facts.home)) throw new OpsError("reliable login account/home/identity unavailable");
  if (host.platform !== "windows" && !/^\d+$/.test(facts.uid)) throw new OpsError("reliable login uid unavailable");
  if (host.transport === "ssh") {
    const accountMatches = host.platform === "windows" ? facts.username.toLowerCase() === host.connection.username.toLowerCase() : facts.username === host.connection.username;
    if (!accountMatches) throw new OpsError("observed login account differs from SSH username");
  }
  return facts;
}

export function assertUniqueMachine(registry, host) {
  const peers = Object.values(registry.hosts).filter((h) => h.identity === host.identity);
  if (peers.length > 1) throw new OpsError("ambiguous legacy machine roots; preserve evidence and resolve the affected Host explicitly");
  if (peers.length && peers[0].host_id !== host.host_id) throw new OpsError("machine already registered; reuse Host " + peers[0].host_id + " and its root " + peers[0].root);
  return peers[0] || null;
}

function folder(state, id) { identifier(id, "server"); return join(state, "records", "servers", id, "onboarding"); }
function artifactPath(state, id, rid) { identifier(rid, "receipt"); return join(folder(state, id), rid + ".json"); }
function persist(state, id, rid, value, schema) {
  validate(value, schema);
  const path = artifactPath(state, id, rid);
  writeJson(path, value, { exclusive: true });
  if (digest(readBoundedJson(path)) !== digest(value)) throw new OpsError("onboarding receipt readback mismatch");
  return { receipt_id: rid, digest: digest(value) };
}

function assertSelectedPath(host, facts, root) {
  const normalized = rootPath(root, host.platform);
  if (!clean(root) || normalized !== root || (host.platform !== "windows" && root.includes("\\"))) throw new OpsError("selected root must be a normalized absolute path without control characters");
  const p = pathApi(host.platform);
  const home = p.normalize(facts.home);
  if (host.platform === "windows" ? home.toLowerCase() === root.toLowerCase() : home === root) throw new OpsError("select a dedicated child, not the login home itself");
  const system = host.platform === "windows" ? ["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"] : ["/etc", "/usr", "/bin", "/sbin", "/dev", "/proc", "/sys", "/boot"];
  for (const base of system) {
    const rel = p.relative(base, root);
    if (rel === "" || (!rel.startsWith("..") && !p.isAbsolute(rel))) throw new OpsError("system directory cannot contain a managed root");
  }
}

function assertRootObservation(host, facts, { legacy = false } = {}) {
  const c = facts.root_check;
  if (!c || typeof c.exists !== "boolean" || typeof c.nonempty !== "boolean" || c.writable !== true) throw new OpsError("selected root or nearest parent is not writable/searchable by the login account; provision permissions explicitly");
  if (c.owner && (c.owner.host_id !== host.host_id || c.owner.identity !== facts.identity)) throw new OpsError("root ownership conflict");
  if (!legacy && c.nonempty && !c.owner) throw new OpsError("nonempty unowned root; choose a dedicated empty directory or use a reviewed adoption plan");
}

export function discoverServer(state, serverId, endpoint) {
  statePath(state); identifier(serverId);
  const host = { host_id: serverId, platform: endpoint.platform, transport: endpoint.transport, connection: endpoint.connection || {} };
  validate({ platform: host.platform, transport: host.transport, connection: host.connection }, "server-connection");
  const registry = load(state);
  if (!registry.controller) throw new OpsError("initialize the controller before connecting a Host");
  if (!["linux", "windows", "darwin"].includes(host.platform) || !["local", "ssh"].includes(host.transport)) throw new OpsError("explicit platform and transport required");
  if (host.transport === "local" && Object.keys(host.connection).length) throw new OpsError("local connection must be empty");
  const before = endpointDigest(host);
  const facts = validateFacts(host, onboardingHooks.observe(host));
  const previous = assertUniqueMachine(registry, { ...host, identity: facts.identity });
  if (registry.hosts[serverId] && !previous) throw new OpsError("registered machine identity drift");
  if (before !== endpointDigest(host)) throw new OpsError("SSH trust changed during discovery");
  const id = newId("discovery");
  const record = { schema_version: 1, artifact: "ops-server-discovery", discovery_id: id, host_id: serverId,
    discovered_at: now(), endpoint: host, endpoint_digest: before, facts,
    suggested_root: previous?.root ?? pathApi(host.platform).join(facts.home, "ops"), registered: Boolean(previous) };
  const ref = persist(state, serverId, id, record, "server-discovery");
  return { status: previous ? "discovered-existing-host" : "discovered-not-confirmed", discovery: ref, ...record,
    next: previous ? "Reuse the registered root; connection changes require S verification and an exact approved plan." : "Ask the user to specify or accept the suggested root, then server-root-confirm." };
}

export function confirmServerRoot(state, serverId, discoveryId, root, by, statement) {
  statePath(state);
  if (!clean(by) || !clean(statement)) throw new OpsError("actual user confirmation by/statement required");
  const discovery = readBoundedJson(artifactPath(state, serverId, discoveryId));
  validate(discovery, "server-discovery");
  if (discovery.host_id !== serverId || discovery.discovery_id !== discoveryId) throw new OpsError("discovery identity mismatch");
  const host = discovery.endpoint;
  assertSelectedPath(host, discovery.facts, root);
  if (endpointDigest(host) !== discovery.endpoint_digest) throw new OpsError("SSH endpoint/trust changed; rediscover");
  const facts = validateFacts(host, onboardingHooks.observe(host, root));
  for (const k of ["identity", "username", "uid", "home"]) if (facts[k] !== discovery.facts[k]) throw new OpsError("login account/home/identity drift; rediscover");
  return withLock(join(state, ".locks", "catalog"), { operation: "server-root-confirm" }, () => {
    const registry = load(state);
    const previous = assertUniqueMachine(registry, { ...host, identity: facts.identity });
    if (registry.hosts[serverId] && !previous) throw new OpsError("registered machine identity drift");
    if (previous && previous.root !== root) throw new OpsError("registered root is immutable; explicit migration required");
    assertRootObservation(host, facts, { legacy: Boolean(previous && !previous.root_confirmation) });
    if (endpointDigest(host) !== discovery.endpoint_digest) throw new OpsError("SSH trust changed during root confirmation");
    const id = newId("root");
    const record = { schema_version: 1, artifact: "ops-root-confirmation", receipt_id: id, host_id: serverId,
      platform: host.platform, transport: host.transport, identity: facts.identity, root,
      account: { username: facts.username, uid: facts.uid, home: facts.home }, endpoint_digest: discovery.endpoint_digest,
      discovery: { receipt_id: discoveryId, digest: digest(discovery) }, confirmed_at: now(), by, statement };
    const ref = persist(state, serverId, id, record, "root-confirmation");
    return { status: "root-confirmed", host_id: serverId, root, identity: facts.identity, root_confirmation: ref,
      note: "Local confirmation evidence only; no directory created or software installed." };
  });
}

export function validateRootConfirmation(state, host, { fresh = false, freshLegacy = false, require = false, checkEndpoint = false } = {}) {
  const registry = load(state);
  const previous = registry.hosts[host.host_id];
  const ref = host.root_confirmation;
  if (!ref) {
    if (require || !previous || previous.identity !== host.identity || previous.root !== host.root || previous.root_confirmation) throw new OpsError("new Host requires server-root-confirm evidence before registration or target writes");
    if (freshLegacy) {
      const facts = validateFacts(host, onboardingHooks.observe(host, host.root));
      if (facts.identity !== host.identity) throw new OpsError("legacy target machine identity drift");
      assertRootObservation(host, facts, { legacy: true });
    }
    return null; // Existing v3 root remains authoritative; never fabricate retrospective consent.
  }
  assertUniqueMachine(registry, host);
  const record = readBoundedJson(artifactPath(state, host.host_id, ref.receipt_id));
  validate(record, "root-confirmation");
  if (digest(record) !== ref.digest || record.receipt_id !== ref.receipt_id
    || ["host_id", "identity", "platform", "transport", "root"].some((k) => host[k] !== record[k])) throw new OpsError("root confirmation digest/target mismatch");
  const discovery = readBoundedJson(artifactPath(state, host.host_id, record.discovery.receipt_id));
  validate(discovery, "server-discovery");
  if (digest(discovery) !== record.discovery.digest) throw new OpsError("discovery evidence digest mismatch");
  if (checkEndpoint && record.endpoint_digest !== endpointDigest(host)) throw new OpsError("confirmed SSH endpoint/trust drift; rediscover");
  if (fresh) {
    const facts = validateFacts(host, onboardingHooks.observe(host, host.root));
    if (facts.identity !== host.identity) throw new OpsError("target machine identity drift");
    // A reviewed connection-account update keeps the original root and confirmation.
    if (endpointDigest(host) === record.endpoint_digest && ["username", "uid", "home"].some((k) => facts[k] !== record.account[k])) throw new OpsError("login account/home drift; rediscover and review the connection");
    assertSelectedPath(host, facts, host.root);
    assertRootObservation(host, facts);
  }
  return record;
}

export function confirmedBootstrapHost(state, raw, serverId, root) {
  if (!state || !serverId) throw new OpsError("bootstrap apply requires --state and --host-id with root confirmation evidence");
  statePath(state);
  const previous = load(state).hosts[serverId];
  const ref = raw.root_confirmation ?? previous?.root_confirmation;
  if (!ref) {
    if (!previous || previous.root !== root || previous.platform !== "linux" || previous.transport !== "ssh") throw new OpsError("bootstrap requires server-root-confirm evidence");
    const host = { ...previous, connection: raw.connection || raw };
    if (endpointDigest(previous) !== endpointDigest(host)) throw new OpsError("legacy bootstrap connection changes require S verification first");
    assertUniqueMachine(load(state), host);
    validateRootConfirmation(state, host, { freshLegacy: true });
    return host;
  }
  const receipt = readBoundedJson(artifactPath(state, serverId, ref.receipt_id));
  const host = { host_id: serverId, platform: "linux", transport: "ssh", root,
    identity: receipt.identity, connection: raw.connection || raw, root_confirmation: ref };
  if (raw.identity && raw.identity !== "discover" && raw.identity !== receipt.identity) throw new OpsError("bootstrap machine identity mismatch");
  validateRootConfirmation(state, host, { require: true, fresh: true, checkEndpoint: true });
  return host;
}

export function rootSummary(state, host) {
  if (!host.root_confirmation) return { status: "legacy-registered", login_home: null, confirmed_at: null };
  const r = validateRootConfirmation(state, host);
  return { status: "confirmed", login_home: r.account.home, confirmed_at: r.confirmed_at };
}
