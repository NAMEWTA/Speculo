/** Root-consent contracts, simulated SSH and real disposable local initialization. */
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { emptyStatus, digest, writeJson } from "../tools/opslib/core.mjs";
import { load, register, save, validate } from "../tools/opslib/model.mjs";
import { discoverServer, confirmServerRoot, validateRootConfirmation, onboardingHooks, observeServer, parseLinuxDiscovery } from "../tools/opslib/onboarding.mjs";
import { call, transportHooks } from "../tools/opslib/transport.mjs";
import { initializeHostSpec, connectionSpec, hostRecipesHooks } from "../tools/opslib/host_recipes.mjs";
import { compilePlan, plannerHooks } from "../tools/opslib/planner.mjs";
import { approval, apply } from "../tools/opslib/execution.mjs";
import { fileState } from "../tools/opslib/agent.mjs";
import { generateFleet } from "../tools/opslib/fleet.mjs";

function fixture(t, local = false) {
  const dir = mkdtempSync(join(tmpdir(), "ops-onboard-")), state = join(dir, "state");
  mkdirSync(state); mkdirSync(join(state, "private"));
  const registry = emptyStatus();
  registry.controller = { controller_id: "fixture", state_root: state, created_at: "2026-01-01T00:00:00Z" };
  writeFileSync(join(state, "status.json"), JSON.stringify(registry));
  writeFileSync(join(state, "private/credentials.json"), '{"schema_version":1,"entries":{}}');
  const knownHosts = join(dir, "known_hosts"); writeFileSync(knownHosts, "synthetic pinned key\n");
  const host = { host_id: "node-a", display_name: "Node A", platform: local ? process.platform === "win32" ? "windows" : process.platform : "linux",
    transport: local ? "local" : "ssh", root: local ? join(dir, "target") : "/home/wta/ops", identity: "a".repeat(64),
    connection: local ? {} : { hostname: "server.invalid", username: "wta", known_hosts: knownHosts, node: "/usr/bin/node", sudo: true } };
  const prev = onboardingHooks.observe;
  let facts = { identity: host.identity, platform: "linux", username: "wta", uid: "1000", home: "/home/wta", node: null, node_version: null };
  let check = { exists: false, writable: true, nonempty: false, owner: null };
  if (!local) onboardingHooks.observe = (_h, root) => ({ ...facts, ...(root ? { root_check: { ...check } } : {}) });
  t.after(() => { onboardingHooks.observe = prev; rmSync(dir, { recursive: true, force: true }); });
  return { dir, state, host, knownHosts, facts: (v) => { facts = { ...facts, ...v }; }, check: (v) => { check = { ...check, ...v }; },
    discover: () => discoverServer(state, host.host_id, host),
    confirm(root = host.root) {
      const d = discoverServer(state, host.host_id, host);
      const r = confirmServerRoot(state, host.host_id, d.discovery.receipt_id, root, "fixture-user", "Use this exact isolated root for this fixture");
      Object.assign(host, { root: r.root, identity: r.identity, root_confirmation: r.root_confirmation });
      return r;
    } };
}

function wire(values) { return Object.entries(values).map(([k, v]) => k + "=" + Buffer.from(v).toString("hex")).join("\n") + "\n"; }
const accountWire = { machine: "fixture-machine", system: "Linux", username: "wta", uid: "1000", home: "/accounts/wta", node: "", node_version: "" };

test("Linux wire discovery reads account database home, rejects malformed/noisy responses", () => {
  const r = parseLinuxDiscovery(wire(accountWire));
  assert.equal(r.home, "/accounts/wta"); assert.equal(r.node, null);
  assert.equal(r.identity, digest({ machine: "fixture-machine", platform: "Linux" }));
  for (const input of ["banner\n" + wire(accountWire), wire(accountWire) + "home=00\n", "home=xyz\n"]) assert.throws(() => parseLinuxDiscovery(input));
});

test("sudo-enabled Linux SSH discovery is unprivileged and does not need Node", (t) => {
  const f = fixture(t), prev = transportHooks.spawnSync;
  t.after(() => { transportHooks.spawnSync = prev; });
  let called = false;
  transportHooks.spawnSync = (cmd, args, options) => {
    called = true; assert.equal(cmd, "ssh"); assert.ok(args.includes("StrictHostKeyChecking=yes"));
    assert.ok(!args.at(-1).includes("sudo")); assert.ok(!args.at(-1).includes("node"));
    assert.ok(options.input.toString().includes('getent passwd "$uid"'));
    return { status: 0, stdout: wire(accountWire), stderr: "" };
  };
  assert.equal(observeServer(f.host).username, "wta"); assert.ok(called);
});

test("root, ordinary and custom account homes generate suggestions, never confirmation", (t) => {
  const f = fixture(t);
  for (const [username, uid, home] of [["root", "0", "/root"], ["wta", "1000", "/home/wta"], ["service_user", "1001", "/accounts/service user"]]) {
    f.host.connection.username = username; f.facts({ username, uid, home });
    const d = f.discover(); assert.equal(d.suggested_root, home + "/ops");
    assert.deepEqual(load(f.state).hosts, {});
    assert.throws(() => register(f.state, { hosts: [f.host] }), /requires server-root-confirm/);
  }
  assert.equal(existsSync(join(f.dir, "target")), false);
});

test("confirmed root locks retain login ownership while approved steps can use sudo", (t) => {
  const f = fixture(t), prev = transportHooks.spawnSync;
  t.after(() => { transportHooks.spawnSync = prev; });
  const commands = [];
  transportHooks.spawnSync = (_cmd, args) => {
    commands.push(args.at(-1));
    return { status: 0, stdout: JSON.stringify({ ok: true, result: {} }), stderr: "" };
  };
  f.host.root_confirmation = { receipt_id: "root-test", digest: "b".repeat(64) };
  for (const action of ["lock", "step", "unlock"]) call(f.host, { action });
  assert.equal(commands[0].startsWith("sudo "), false);
  assert.equal(commands[1].startsWith("sudo -n -- "), true);
  assert.equal(commands[2].startsWith("sudo "), false);
  delete f.host.root_confirmation;
  call(f.host, { action: "lock" });
  assert.equal(commands[3].startsWith("sudo -n -- "), true, "legacy privilege behavior is unchanged");
});

test("invalid endpoint and missing controller initialization fail before probing", (t) => {
  const f = fixture(t); onboardingHooks.observe = () => assert.fail("invalid inputs must not reach a target");
  assert.throws(() => discoverServer(f.state, "node-a", { ...f.host, connection: { ...f.host.connection, password: "synthetic-only" } }), /unknown/);
  const s = load(f.state); s.controller = null; save(f.state, s);
  assert.throws(() => f.discover(), /initialize the controller/);
});

test("Windows account discovery accepts SSH account casing and uses its actual home", (t) => {
  const f = fixture(t);
  f.host.platform = "windows"; f.host.connection.username = "WTA"; f.host.connection.shell = "powershell";
  f.facts({ platform: "windows", username: "wta", uid: "-1", home: "D:\\Profiles\\wta" });
  assert.equal(f.discover().suggested_root, "D:\\Profiles\\wta\\ops");
  f.facts({ username: "different-user" }); assert.throws(() => f.discover(), /login account differs/);
});

test("explicit default/custom roots register with immutable evidence and repeat without new consent", (t) => {
  const f = fixture(t); f.confirm("/data/ops");
  const ref = structuredClone(f.host.root_confirmation);
  register(f.state, { hosts: [f.host] }); register(f.state, { hosts: [f.host] });
  assert.equal(load(f.state).hosts["node-a"].root, "/data/ops");
  assert.deepEqual(load(f.state).hosts["node-a"].root_confirmation, ref);
  assert.equal(f.discover().suggested_root, "/data/ops");
  assert.throws(() => f.confirm("/new-root"), /immutable/);
  const other = { ...f.host, host_id: "node-b", root: "/other/ops" };
  assert.throws(() => register(f.state, { hosts: [other] }), /reuse Host/);
  assert.throws(() => discoverServer(f.state, "node-b", other), /reuse Host/);
});

test("missing user statement, unsafe paths, nonempty roots, permissions and ownership block confirmation", (t) => {
  const f = fixture(t), d = f.discover();
  const confirm = (root = f.host.root, statement = "Use this isolated root") => confirmServerRoot(f.state, "node-a", d.discovery.receipt_id, root, "user", statement);
  for (const statement of ["", "   "]) assert.throws(() => confirm(f.host.root, statement), /confirmation/);
  for (const root of ["relative", "/", "/root", "/home/wta", "/etc/nested", "/data/../root", "/data/ops\n", "/data\\ops"]) assert.throws(() => confirm(root));
  f.check({ writable: false }); assert.throws(() => confirm(), /writable/);
  f.check({ writable: true, exists: true, nonempty: true }); assert.throws(() => confirm(), /unowned/);
  f.check({ owner: { host_id: "other", identity: f.host.identity } }); assert.throws(() => confirm(), /ownership/);
  assert.deepEqual(load(f.state).hosts, {});
});

test("identity, home, trust and receipt drift never authorize the changed target", (t) => {
  const f = fixture(t), d = f.discover();
  const confirm = () => confirmServerRoot(f.state, "node-a", d.discovery.receipt_id, f.host.root, "user", "Use this exact root");
  f.facts({ home: "/changed/home" }); assert.throws(confirm, /drift/);
  f.facts({ home: "/home/wta", identity: "b".repeat(64) }); assert.throws(confirm, /drift/);
  f.facts({ identity: "a".repeat(64) });
  writeFileSync(f.knownHosts, "changed host key"); assert.throws(confirm, /trust changed/);
  f.confirm();
  assert.throws(() => register(f.state, { hosts: [{ ...f.host, root: "/elsewhere/ops" }] }), /mismatch/);
  const receipt = join(f.state, "records/servers/node-a/onboarding", f.host.root_confirmation.receipt_id + ".json");
  const data = JSON.parse(readFileSync(receipt)); data.statement = "tampered"; writeFileSync(receipt, JSON.stringify(data));
  assert.throws(() => register(f.state, { hosts: [f.host] }), /mismatch/);
});

test("same-machine connection update preserves the selected root and verifies new account access", (t) => {
  const f = fixture(t); f.confirm(); register(f.state, { hosts: [f.host] });
  f.facts({ username: "root", uid: "0", home: "/root" });
  const endpoint = { ...f.host, connection: { ...f.host.connection, username: "root" } };
  const spec = connectionSpec(f.state, "node-a", endpoint);
  assert.equal(spec.resource_updates.hosts[0].root, "/home/wta/ops");
  assert.deepEqual(spec.resource_updates.hosts[0].root_confirmation, f.host.root_confirmation);
  assert.equal(load(f.state).hosts["node-a"].connection.username, "wta");
  f.check({ writable: false }); assert.throws(() => connectionSpec(f.state, "node-a", endpoint), /writable/);
});

test("legacy v3 roots and evidence stay unchanged; ambiguous reconnection is blocked", (t) => {
  const f = fixture(t), s = load(f.state); s.hosts["node-a"] = { ...f.host, root: "/srv/ops" }; save(f.state, s);
  const before = readFileSync(join(f.state, "status.json"));
  assert.equal(f.discover().suggested_root, "/srv/ops");
  assert.equal(validateRootConfirmation(f.state, s.hosts["node-a"]), null);
  assert.deepEqual(readFileSync(join(f.state, "status.json")), before);
  s.hosts["old-second"] = { ...s.hosts["node-a"], host_id: "old-second", root: "/srv/second" }; save(f.state, s);
  assert.throws(() => f.discover(), /ambiguous legacy/);
});

test("real local root rejects symlink ancestors and existing unrelated files", (t) => {
  const f = fixture(t, true), real = join(f.dir, "real"), link = join(f.dir, "link"); mkdirSync(real);
  symlinkSync(real, link, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => f.confirm(join(link, "ops")), /symlink|reparse/i);
  mkdirSync(f.host.root); writeFileSync(join(f.host.root, "README.md"), "User file, preserve");
  assert.throws(() => f.confirm(), /unowned/);
  assert.equal(readFileSync(join(f.host.root, "README.md"), "utf8"), "User file, preserve");
});

test("real local onboarding and approved minimal initialization deliver both sides, then reuse directories", (t) => {
  const f = fixture(t, true); f.confirm(); register(f.state, { hosts: [f.host] });
  assert.equal(existsSync(f.host.root), false, "registration must not create target directories");
  const pp = plannerHooks.call, hp = hostRecipesHooks.call;
  const inventory = (h, req) => ({ identity: h.identity, platform: h.platform, tools: {}, defaults: {}, diagnostics: {},
    snapshots: Object.fromEntries((req.paths || []).map(p => [p, fileState(p)])) });
  plannerHooks.call = inventory; hostRecipesHooks.call = inventory;
  t.after(() => { plannerHooks.call = pp; hostRecipesHooks.call = hp; });
  const spec = initializeHostSpec(f.state, "node-a");
  assert.ok(spec.host_actions.length > 0); assert.ok(spec.host_actions.every(a => a.kind === "mkdir"));
  const specPath = join(f.dir, "init.json"); writeJson(specPath, spec);
  const plan = compilePlan(f.state, specPath);
  assert.equal(existsSync(f.host.root), false, "planning must not prepare the target");
  approval(f.state, plan.run_id, plan.plan_digest, "fixture-user", "Initialize only this disposable local Host");
  const redirected = join(f.dir, "redirected"); mkdirSync(redirected);
  symlinkSync(redirected, f.host.root, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => apply(f.state, plan.run_id), /symlink|reparse/i);
  assert.equal(existsSync(join(redirected, ".ops-host.json")), false);
  unlinkSync(f.host.root);
  const result = apply(f.state, plan.run_id); assert.equal(result.status, "completed", JSON.stringify(result));
  for (const p of ["README.md", "DEPLOYMENTS.md", "docs/standards/DEPLOYMENT-STANDARD.md", ".ops-host.json"]) assert.ok(existsSync(join(f.host.root, p)), p);
  assert.equal(initializeHostSpec(f.state, "node-a").host_actions.length, 0);
  assert.equal(existsSync(join(f.host.root, "_runtime/docker")), false, "minimal initialization never installs Docker");
  const previous = onboardingHooks.observe; onboardingHooks.observe = () => assert.fail("V must not connect to targets");
  try {
    const view = generateFleet(f.state); const data = JSON.parse(readFileSync(view.json)); validate(data, "fleet-view");
    assert.equal(data.servers[0].root_confirmation.status, "confirmed");
    assert.equal(data.servers[0].initialization.documents, "both-sides-verified");
    assert.equal(data.servers[0].initialization.runtime, "unverified");
    assert.ok(!readFileSync(view.html, "utf8").includes("Use this exact isolated root"));
    const s = load(f.state), last = s.releases[plan.run_id];
    s.releases["pending-fixture"] = { ...last, run_id: "pending-fixture", status: "docs_pending", updated_at: new Date(Date.now() + 2000).toISOString() };
    save(f.state, s);
    const pending = JSON.parse(readFileSync(generateFleet(f.state).json));
    assert.equal(pending.servers[0].initialization.documents, "unknown", "an older receipt cannot conceal a newer pending delivery");
  } finally { onboardingHooks.observe = previous; }
});

test("Linux shell adapter matches real account identity without creating the selected root", { skip: process.platform !== "linux" && "Linux shell execution requires a Linux runner" }, (t) => {
  const f = fixture(t, true), script = fileURLToPath(new URL("../tools/server-discover.sh", import.meta.url));
  const run = spawnSync("/bin/sh", [script, f.host.root], { encoding: "utf8", timeout: 30000 });
  assert.equal(run.status, 0, run.stderr);
  const shell = parseLinuxDiscovery(run.stdout, true), native = observeServer(f.host, f.host.root);
  for (const key of ["identity", "username", "uid", "home"]) assert.equal(shell[key], native[key]);
  assert.equal(existsSync(f.host.root), false);
});
