/** OPS safety/contract tests. Adapter simulations are explicitly separate from real local subprocess tests. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, chmodSync, existsSync, symlinkSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as core from "../tools/opslib/core.mjs";
import * as model from "../tools/opslib/model.mjs";
import * as planner from "../tools/opslib/planner.mjs";
import * as execution from "../tools/opslib/execution.mjs";
import * as agent from "../tools/opslib/agent.mjs";
import * as transport from "../tools/opslib/transport.mjs";
import * as docs from "../tools/opslib/docs.mjs";
import * as services from "../tools/opslib/services.mjs";
import * as controlFiles from "../tools/opslib/control_files.mjs";
import { initialize, analyze, cliHooks } from "../tools/opslib/cli.mjs";
import { taskFiles } from "../tools/opslib/native_windows.mjs";

const { OpsError, UnknownResult, digest, writeJson, readJson, withLock, relative, identifier, rootPath, targetJoin, emptyStatus, now, resolveSecrets, redact, atomicWrite, canonical } = core;
const PASSWORD = 'TEST-ONLY-$literal-quote"-slash\\-not-production';

function deployment(project = "app-a", did = "app-a-prod", root = "/srv/ops", method = "native", host = null) {
  host = host || { platform: "linux", root };
  const depRoot = targetJoin(host, project);
  return {
    deployment_id: did, project_id: project, host_id: "node-a", environment: "prod", instance: "main", layout: "flat",
    method, version: "v1", observed_version: "v1", root: depRoot, status: "completed",
    installed_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", run_id: "run-old",
    compose_name: method === "compose" ? "ops-" + did : null, storage: [], commands: { start: [], stop: [], verify: [] },
    credential_refs: [], backup: "A project-specific backup is required.", recovery: "No automatic shared-database restore.",
    notes: [], source: { type: "local", location: "/source/" + project, revision: "v1" }, service: {},
  };
}

function minimalInventory(host, request) {
  const snapshots = {};
  for (const p of request.paths || []) {
    snapshots[p] = (request.deep_paths || []).includes(p) ? agent.treeState(p) : agent.fileState(p);
  }
  return {
    identity: host.identity, observed_at: now(), platform: host.platform, hostname: "fixture", architecture: "fixture",
    account: "fixture", uid: null, node: process.execPath, tools: {}, defaults: {},
    diagnostics: { memory: {}, issues: [], disks: {} },
    docker_control: {
      status: "observed", context: "fixture-context", endpoint: "unix:///fixture/docker.sock",
      id: "fixture-docker-id", data_root: targetJoin(host, "_runtime/docker"), compose_version: "2.30.0",
    },
    snapshots,
  };
}

function setupFixture() {
  const tmp = mkdtempSync(join(tmpdir(), "ops-tests-"));
  const state = join(tmp, "controller");
  const target = join(tmp, "server");
  const prevProbe = cliHooks.probeLocal;
  cliHooks.probeLocal = () => ({ identity: agent.fingerprint(), scope: "mock-initial-inventory-only" });
  initialize(state, "control-a");
  cliHooks.probeLocal = prevProbe;
  const platform = process.platform === "win32" ? "windows" : "linux";
  const host = {
    host_id: "node-a", display_name: "Node A", platform, transport: "local",
    root: target, identity: agent.fingerprint(), connection: {},
  };
  const project = {
    project_id: "app-a", display_name: "APP A", kind: "app", service_type: null,
    source: { type: "local", location: join(tmp, "source"), revision: "v1" },
  };
  model.register(state, { hosts: [host], projects: [project] });
  model.putCredential(state, { credential_id: "app-auth", version: 1, purpose: "Synthetic test only", values: { username: "app-user", password: PASSWORD } });
  const spec = (version = "v1", operation = "deploy", program = null) => {
    if (program == null) {
      program = `import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const dir = join(process.env.OPS_DATA_ROOT, "app", "storage");
mkdirSync(dir, { recursive: true });
const p = join(dir, "value.json");
const n = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).count + 1 : 1;
if (process.env.APP_USERNAME !== "app-user") throw new Error("username");
if (!process.env.APP_PASSWORD.startsWith("TEST-ONLY-")) throw new Error("password");
writeFileSync(p, JSON.stringify({ count: n, version: ${JSON.stringify(version)} }));
`;
    }
    return {
      schema_version: 1, worker: "D", operation, reason: "Disposable isolated test only",
      rollback_note: "Retain old data; use a new explicitly approved recovery plan.",
      deployments: [{
        deployment_id: "app-a-prod", project_id: "app-a", host_id: "node-a", environment: "prod", instance: "main",
        layout: "flat", method: "native", version,
        files: [{ path: "artifact/main.mjs", content: program }],
        env: { "app.env": { APP_USERNAME: "{{credential:app-auth@1:username}}", APP_PASSWORD: "{{credential:app-auth@1:password}}" } },
        native: { supervisor: "oneshot", argv: [process.execPath, "{{artifact}}/main.mjs"] },
        credential_refs: ["app-auth@1"],
        health: [{ type: "file", path: "data/app/storage/value.json" }],
        backup: "Back up only after process exit; this fixture has no shared data.",
        recovery: "A new matching-version plan preserves and verifies data.",
      }],
    };
  };
  const plan = (s = null) => {
    const f = join(tmp, "input.json");
    writeJson(f, s || spec());
    const prev = planner.plannerHooks.call;
    planner.plannerHooks.call = (h, request) => minimalInventory(h, request);
    try {
      const result = planner.compilePlan(state, f);
      return [result, readJson(result.plan_path)];
    } finally { planner.plannerHooks.call = prev; }
  };
  const approve = (info) => execution.approval(state, info.run_id, info.plan_digest, "test-admin", "Approve only the exact isolated test plan and its fixture data.");
  const runSpec = (s = null) => {
    const [info, p] = plan(s);
    approve(info);
    const result = execution.apply(state, info.run_id);
    return [info, p, result];
  };
  const graph = () => {
    const s = model.load(state);
    s.deployments["app-a-prod"] = deployment("app-a", "app-a-prod", host.root, "native", host);
    s.deployments["app-a-prod"].credential_refs = ["app-auth@1"];
    s.projects["mysql-main"] = {
      project_id: "mysql-main", display_name: "MySQL", kind: "shared-service", service_type: "mysql",
      source: { type: "image", location: "mysql@sha256:" + "a".repeat(64), revision: "digest-pinned" },
    };
    const d = deployment("mysql-main", "mysql-prod", host.root, "compose", host);
    d.credential_refs = ["mysql-admin@1"];
    d.service = { compose_service: "mysql" };
    s.deployments["mysql-prod"] = d;
    s.allocations["app-db"] = {
      allocation_id: "app-db", provider_deployment_id: "mysql-prod", owner_project_id: "app-a", environment: "prod",
      data_group: "app-a-prod", resource_kind: "database", resource_name: "app_a_prod", credential_ref: "app-auth@1",
      shared_owners: [], status: "active", recovery_scope: "logical", notes: "Fixture logical resource",
    };
    s.bindings["app-db-binding"] = {
      binding_id: "app-db-binding", consumer_deployment_id: "app-a-prod", mode: "shared",
      provider_deployment_id: "mysql-prod", allocation_id: "app-db", endpoint: "mysql-main:3306",
      credential_ref: "app-auth@1", status: "active", component: "mysql", network: "explicit-intranet",
    };
    return s;
  };
  return { tmp, state, target, platform, host, project, spec, plan, approve, runSpec, graph, cleanup: () => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} } };
}

function runFx(fn) {
  const fx = setupFixture();
  try { return fn(fx); } finally { fx.cleanup(); }
}

test("canonical order", () => {
  assert.equal(digest({ b: 1, a: 2 }), digest({ a: 2, b: 1 }));
});
test("nonfinite rejected", () => {
  assert.throws(() => canonical(Number.NaN));
});
test("duplicate json rejected", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-dup-"));
  const p = join(d, "x.json");
  writeFileSync(p, '{"x":1,"x":2}');
  assert.throws(() => readJson(p), OpsError);
  rmSync(d, { recursive: true, force: true });
});
test("exclusive artifact", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-ex-"));
  const p = join(d, "a.json");
  writeJson(p, { x: 1 }, { exclusive: true });
  assert.throws(() => writeJson(p, { x: 2 }, { exclusive: true }), OpsError);
  assert.deepEqual(readJson(p), { x: 1 });
  rmSync(d, { recursive: true, force: true });
});
test("lock is not autobroken", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-lock-"));
  withLock(join(d, "lock"), { why: "test" }, () => {
    assert.throws(() => withLock(join(d, "lock"), {}, () => {}), OpsError);
  });
  rmSync(d, { recursive: true, force: true });
});
test("symlink rejected", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-link-"));
  mkdirSync(join(d, "real"));
  try { symlinkSync(join(d, "real"), join(d, "link"), "dir"); }
  catch (e) {
    if (process.platform === "win32") { rmSync(d, { recursive: true, force: true }); return; }
    throw e;
  }
  assert.throws(() => atomicWrite(join(d, "link", "a.txt"), "x"), OpsError);
  rmSync(d, { recursive: true, force: true });
});
test("file permissions", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-perm-"));
  const p = join(d, "secret");
  atomicWrite(p, PASSWORD);
  if (process.platform !== "win32") {
    assert.equal(statSync(p).mode & 0o777, 0o600);
  }
  rmSync(d, { recursive: true, force: true });
});

test("credential raw values", () => {
  const ledger = { entries: { x: { 1: { values: { password: PASSWORD } } } } };
  assert.equal(resolveSecrets("{{credential:x@1:password}}", ledger), PASSWORD);
});
test("credential missing", () => {
  assert.throws(() => resolveSecrets("{{credential:x@1:password}}", { entries: {} }), OpsError);
});
test("redaction", () => {
  assert.ok(!redact("pw " + PASSWORD, [PASSWORD]).includes(PASSWORD));
});
test("env dollar literal", () => {
  assert.equal(planner.envFile({ P: 'a$$"z' }), 'P=a$$"z\n');
});
test("env newline rejected", () => {
  assert.throws(() => planner.envFile({ P: "a\nb" }), OpsError);
});
test("env key rejected", () => {
  assert.throws(() => planner.envFile({ "P-INVALID": "a" }), OpsError);
});
test("systemd env quote", () => {
  assert.equal(planner.envFile({ P: 'a"\\b' }, { systemd: true }), 'P="a\\"\\\\b"\n');
});
test("markdown secret backticks", () => {
  const l = { entries: { x: { 1: { purpose: "test", values: { password: 'a```b|c$"' } } } } };
  assert.ok(docs.credentialsText(["x@1"], l).includes('a```b|c$"'));
});
test("windows native json secret", () => {
  const vals = taskFiles("app-a", "C:\\Ops\\app-a", ["python", "C:\\Ops\\app-a\\main.py"], { P: "{{credential:x@1:password}}" }, { account: "X\\User" });
  const original = { kind: "write", json_values: JSON.parse(vals["service/task.json"]), content: vals["service/task.json"] };
  const actual = execution.resolvedOp(original, { entries: { x: { 1: { values: { password: PASSWORD } } } } });
  assert.equal(JSON.parse(Buffer.from(actual.content_b64, "base64").toString("utf8")).environment.P, PASSWORD);
});

for (const [index, value] of ["", "../a", "a/../b", "a//b", "/a", "a\\b", "C:a", "a/", "./a", "a\x00b"].entries()) {
  test(`relative reject ${String(index).padStart(2, "0")}`, () => {
    assert.throws(() => relative(value), OpsError);
  });
}
for (const [index, value] of ["app-a", "mysql-main", "a1", "host-22"].entries()) {
  test(`identifier valid ${String(index).padStart(2, "0")}`, () => {
    assert.equal(identifier(value), value);
  });
}
for (const [index, value] of ["", "App", "a_b", "-a", "a-", "a/b", "con", "com1", "lpt9", "a".repeat(81)].entries()) {
  test(`identifier reject ${String(index).padStart(2, "0")}`, () => {
    assert.throws(() => identifier(value), OpsError);
  });
}
for (const [index, value] of ["/", "/etc", "/var", "/tmp", "/srv", "relative", "/srv/../etc"].entries()) {
  test(`posix root reject ${String(index).padStart(2, "0")}`, () => {
    assert.throws(() => rootPath(value, "linux"), OpsError);
  });
}
for (const [index, value] of ["C:\\", "C:\\Windows", "C:\\Users", "\\\\server\\share\\ops", "C:\\Ops\\..\\data", "C:\\Ops:stream"].entries()) {
  test(`windows root reject ${String(index).padStart(2, "0")}`, () => {
    assert.throws(() => rootPath(value, "windows"), OpsError);
  });
}

test("empty v3 valid", () => { model.validateStatus(emptyStatus()); });

test("resource contracts", async (t) => {
  const each = (name, fn) => t.test(name, () => runFx(fn));
  await each("unknown schema field", (fx) => {
    const s = model.load(fx.state); s.secret = "bad";
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("legacy blocked", (fx) => {
    assert.throws(() => model.validateStatus({ schema_version: 2, active: [], archived: [] }), OpsError);
  });
  await each("credential version immutable", (fx) => {
    assert.throws(() => model.putCredential(fx.state, { credential_id: "app-auth", version: 1, purpose: "x", values: { username: "u", password: "changed" } }), OpsError);
  });
  await each("credential permissions rejected", (fx) => {
    if (process.platform === "win32") return;
    chmodSync(join(fx.state, "private", "credentials.json"), 0o644);
    assert.throws(() => model.ledgerLoad(fx.state), OpsError);
    chmodSync(join(fx.state, "private", "credentials.json"), 0o600);
  });
  await each("valid shared graph", (fx) => { model.validateStatus(fx.graph()); });
  await each("duplicate physical host", (fx) => {
    const s = model.load(fx.state); s.hosts["node-b"] = { ...fx.host, host_id: "node-b" };
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("host root nested", (fx) => {
    const s = model.load(fx.state); s.hosts["node-b"] = { ...fx.host, host_id: "node-b", root: join(fx.target, "nested") };
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("identity platform mismatch", (fx) => {
    const other = fx.platform === "windows" ? "linux" : "windows";
    const otherRoot = other === "linux" ? "/srv/ops" : "C:\\Ops";
    const s = model.load(fx.state); s.hosts["node-b"] = { ...fx.host, host_id: "node-b", platform: other, root: otherRoot };
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("dedicated cannot claim shared provider", (fx) => {
    const s = fx.graph(); Object.assign(s.bindings["app-db-binding"], { mode: "dedicated", allocation_id: null });
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("project root cannot override", (fx) => {
    const s = fx.graph(); s.deployments["app-a-prod"].root = join(fx.target, "elsewhere");
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("native data outside root", (fx) => {
    const s = fx.graph(); s.deployments["app-a-prod"].storage = [{ component: "app", purpose: "data", path: "/tmp/data" }];
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("flat instances overlap", (fx) => {
    const s = fx.graph();
    const d = structuredClone(s.deployments["app-a-prod"]);
    Object.assign(d, { deployment_id: "app-a-test", layout: "instances", environment: "test", root: join(fx.target, "app-a", "instances", "test", "main") });
    s.deployments[d.deployment_id] = d;
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("orphan provider", (fx) => {
    const s = fx.graph(); s.allocations["app-db"].provider_deployment_id = "missing";
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("duplicate allocation", (fx) => {
    const s = fx.graph(); s.allocations["app-db-copy"] = { ...s.allocations["app-db"], allocation_id: "app-db-copy" };
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("wrong binding password version", (fx) => {
    const s = fx.graph(); s.bindings["app-db-binding"].credential_ref = "app-auth@2";
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("external cannot claim managed data", (fx) => {
    const s = fx.graph(); s.bindings["app-db-binding"].mode = "external";
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("retired provider allocation", (fx) => {
    const s = fx.graph(); s.allocations["app-db"].status = "retired";
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("cross environment not implicit", (fx) => {
    const s = fx.graph(); s.allocations["app-db"].environment = "test";
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("unknown project kind", (fx) => {
    const s = fx.graph(); s.projects["mysql-main"].kind = "other";
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("strict docker cannot be disabled", (fx) => {
    const s = fx.graph(); s.policies.strict_docker_root = false;
    assert.throws(() => model.validateStatus(s), OpsError);
  });
  await each("provider admin app separation", (fx) => {
    const s = fx.graph();
    assert.throws(() => services.allocationOperation(s, s.deployments["mysql-prod"], s.allocations["app-db"], { adapter: "mysql", admin_credential_ref: "app-auth@1", app_username: "app-user" }), OpsError);
  });
  await each("mysql no global admin grants", (fx) => {
    const s = fx.graph();
    assert.throws(() => services.allocationOperation(s, s.deployments["mysql-prod"], s.allocations["app-db"], { adapter: "mysql", admin_credential_ref: "mysql-admin@1", app_username: "app-user", privileges: ["SUPER"] }), OpsError);
  });
  await each("mysql explicit scoped grants", (fx) => {
    const s = fx.graph();
    const op = services.allocationOperation(s, s.deployments["mysql-prod"], s.allocations["app-db"], { adapter: "mysql", admin_credential_ref: "mysql-admin@1", app_username: "app-user", privileges: ["SELECT"] });
    assert.deepEqual(op.privileges, ["SELECT"]);
    assert.equal(op.kind, "mysql-allocation");
  });
  await each("source docs preserve deployment revision", (fx) => {
    const s = fx.graph();
    s.projects["app-a"].source.revision = "newer-project-source";
    const text = docs.deploymentReadme(s, s.deployments["app-a-prod"], "run-test", now());
    assert.ok(!text.includes("newer-project-source"));
    assert.ok(text.includes("v1"));
  });
});

test("planner contracts", async (t) => {
  const each = (name, fn) => t.test(name, () => runFx(fn));
  await each("plan writes no target", (fx) => {
    const [info, plan] = fx.plan();
    assert.equal(existsSync(fx.target), false);
    assert.ok(!readFileSync(info.report, "utf8").includes(PASSWORD));
    assert.equal(plan.registry_digest, digest(model.load(fx.state)));
  });
  await each("missing health rejected", (fx) => {
    const s = fx.spec(); s.deployments[0].health = [];
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("unknown spec field rejected", (fx) => {
    const s = fx.spec(); s.do_anything = true;
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("inline native code rejected", (fx) => {
    const s = fx.spec(); s.deployments[0].native.argv = [process.execPath, "-c", "print(1)"];
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("native outside arg rejected", (fx) => {
    const s = fx.spec(); s.deployments[0].native.argv = [process.execPath, "/tmp/other.py"];
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("env path escape rejected", (fx) => {
    const s = fx.spec(); s.deployments[0].env["app.env"].APP_DATA_DIR = "/tmp/app-data";
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("env reserved root rejected", (fx) => {
    const s = fx.spec(); s.deployments[0].env["app.env"].OPS_DATA_ROOT = "{{data}}";
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("native multiple env requires order", (fx) => {
    const s = fx.spec(); s.deployments[0].env["extra.env"] = { EXTRA: "1" };
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("unknown env file rejected", (fx) => {
    const s = fx.spec(); s.deployments[0].native.env_files = ["missing.env"];
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("env vars reach native command", (fx) => {
    const [, p] = fx.plan();
    const commands = p.operations.filter((x) => x.kind === "command");
    assert.ok("APP_PASSWORD" in commands[0].env);
    assert.ok(commands[0].env.HOME.startsWith(join(fx.target, "app-a")));
  });
  await each("host command requires writes", (fx) => {
    assert.throws(() => fx.plan({ schema_version: 1, worker: "H", operation: "prepare", reason: "test", rollback_note: "test", host_actions: [{ host_id: "node-a", kind: "command", reason: "test", argv: ["echo", "safe"] }] }), OpsError);
  });
  await each("host command requires verification", (fx) => {
    assert.throws(() => fx.plan({ schema_version: 1, worker: "H", operation: "prepare", reason: "test", rollback_note: "test", host_actions: [{ host_id: "node-a", kind: "command", reason: "test", argv: ["echo", "safe"], writes: [join(fx.target, "_host", "x")] }] }), OpsError);
  });
  await each("project file traversal", (fx) => {
    const s = fx.spec(); s.deployments[0].files[0].path = "../else.py";
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("plaintext readme cannot be arbitrary file", (fx) => {
    const s = fx.spec(); s.deployments[0].files.push({ path: "README.md", content: "fake success" });
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("resource update root fixed", (fx) => {
    const s = fx.spec(); s.resource_updates = { hosts: [{ ...fx.host, root: join(fx.tmp, "else") }] };
    assert.throws(() => fx.plan(s), OpsError);
  });
  await each("resource source update planned", (fx) => {
    const s = fx.spec();
    const p = structuredClone(fx.project);
    p.source.revision = "v2";
    s.resource_updates = { projects: [p] };
    const [, plan] = fx.plan(s);
    assert.equal(plan.registry_after.deployments["app-a-prod"].source.revision, "v2");
    assert.equal(model.load(fx.state).projects["app-a"].source.revision, "v1");
  });
  await each("wrong approval digest", (fx) => {
    const [info] = fx.plan();
    assert.throws(() => execution.approval(fx.state, info.run_id, "0".repeat(64), "test", "explicit statement"), OpsError);
  });
  await each("unrelated host registration does not block approval", (fx) => {
    const [info] = fx.plan();
    model.register(fx.state, { hosts: [{ ...fx.host, host_id: "node-b", display_name: "Node B", root: join(fx.tmp, "server-b") }] });
    fx.approve(info);
  });
  await each("touched host catalog drift blocks approval", (fx) => {
    const [info] = fx.plan();
    const s = model.load(fx.state);
    s.hosts["node-a"] = { ...s.hosts["node-a"], display_name: "Renamed" };
    model.save(fx.state, s);
    assert.throws(() => fx.approve(info), OpsError);
  });
  await each("approval is immutable", (fx) => {
    const [info] = fx.plan();
    fx.approve(info);
    assert.throws(() => fx.approve(info), OpsError);
  });
  await each("plan tamper blocks apply", (fx) => {
    const [info, p] = fx.plan();
    fx.approve(info);
    p.reason = "changed";
    writeJson(info.plan_path, p);
    assert.throws(() => execution.apply(fx.state, info.run_id), OpsError);
  });
  await each("engine drift blocks apply", (fx) => {
    const [info] = fx.plan();
    fx.approve(info);
    const prev = execution.executionHooks.engineDigest;
    execution.executionHooks.engineDigest = () => "0".repeat(64);
    try { assert.throws(() => execution.apply(fx.state, info.run_id), OpsError); }
    finally { execution.executionHooks.engineDigest = prev; }
  });
  await each("credential drift blocks apply", (fx) => {
    const [info] = fx.plan();
    fx.approve(info);
    const l = model.ledgerLoad(fx.state);
    l.entries["app-auth"]["1"].values.password = "changed";
    writeJson(join(fx.state, "private", "credentials.json"), l);
    assert.throws(() => execution.apply(fx.state, info.run_id), OpsError);
  });
  await each("existing unowned project not overwritten", (fx) => {
    mkdirSync(join(fx.target, "app-a"), { recursive: true });
    assert.throws(() => fx.plan(), OpsError);
  });
  await each("compose requires digest", (fx) => {
    assert.throws(() => planner.composeModel({ compose: { services: { app: { image: "example:latest" } } } }, fx.host, join(fx.target, "app-a"), "ops-app-a", {}, {}), OpsError);
  });
  await each("compose rejects named volume", (fx) => {
    assert.throws(() => planner.composeModel({ compose: { services: { app: { image: "example@sha256:" + "a".repeat(64), volumes: [{ type: "volume", source: "named", target: "/data" }] } } } }, fx.host, join(fx.target, "app-a"), "ops-app-a", {}, {}), OpsError);
  });
  await each("compose rejects cross app data", (fx) => {
    assert.throws(() => planner.composeModel({ compose: { services: { app: { image: "example@sha256:" + "a".repeat(64), volumes: [{ type: "bind", source: join(fx.target, "app-b", "data", "a", "b"), target: "/data" }] } } } }, fx.host, join(fx.target, "app-a"), "ops-app-a", {}, {}), OpsError);
  });
  await each("compose rejects writable root", (fx) => {
    assert.throws(() => planner.composeModel({ compose: { services: { app: { image: "example@sha256:" + "a".repeat(64), read_only: false } } } }, fx.host, join(fx.target, "app-a"), "ops-app-a", {}, {}), OpsError);
  });
  await each("compose allows justified writable root", (fx) => {
    const [value] = planner.composeModel({
      compose: {
        services: {
          app: {
            image: "example@sha256:" + "a".repeat(64),
            read_only: false,
            writable_root_justification: "elasticsearch keystore tmp must be created at process start",
          },
        },
      },
    }, fx.host, join(fx.target, "app-a"), "ops-app-a", {}, {});
    assert.equal(value.services.app.read_only, false);
    assert.equal("writable_root_justification" in value.services.app, false);
  });
  await each("config files default to 0644", (fx) => {
    const s = fx.spec();
    s.deployments[0].files.push({ path: "config/redis.conf", content: "port 6379\n" });
    const [, plan] = fx.plan(s);
    const conf = plan.operations.find((o) => o.kind === "write" && String(o.path).replaceAll("\\", "/").endsWith("config/redis.conf"));
    const env = plan.operations.find((o) => o.kind === "write" && String(o.path).replaceAll("\\", "/").includes("/env/"));
    assert.equal(conf.mode, 0o644);
    assert.equal(env.mode, 0o600);
  });
  await each("host write-file cannot overlay generated docs", (fx) => {
    assert.throws(() => fx.plan({
      schema_version: 1, worker: "H", operation: "prepare", reason: "test overlay",
      rollback_note: "Retain generated host documentation.",
      host_actions: [{ host_id: "node-a", kind: "write-file", reason: "Overwrite generated README", path: "README.md", content: "fake success" }],
    }), OpsError);
  });
  await each("declared nginx control file is planned", (fx) => {
    const [, plan] = fx.plan({
      schema_version: 1, worker: "H", operation: "prepare", reason: "Persist reviewed nginx site",
      rollback_note: "Restore previous nginx conf from backup copy.",
      host_actions: [{
        host_id: "node-a", kind: "write-control", reason: "Public ingress site for reviewed backend",
        path: "/etc/nginx/conf.d/app.conf", content: "server { listen 57492; }\n",
        rollback: "Restore /etc/nginx/conf.d/app.conf from the run backup.",
        verification: [{ type: "command", argv: [process.execPath, "-e", "process.exit(0)"] }],
      }],
    });
    assert.ok(plan.external_files["node-a"].includes("/etc/nginx/conf.d/app.conf"));
    assert.equal(plan.operations.find((o) => o.path === "/etc/nginx/conf.d/app.conf").mode, 0o644);
  });
  await each("undeclared control path rejected", (fx) => {
    assert.throws(() => fx.plan({
      schema_version: 1, worker: "H", operation: "prepare", reason: "should fail",
      rollback_note: "Do not write arbitrary system files.",
      host_actions: [{ host_id: "node-a", kind: "write-control", reason: "not a control file", path: "/etc/passwd", content: "x\n" }],
    }), OpsError);
  });
  await each("core systemd unit control rejected", (fx) => {
    assert.throws(() => fx.plan({
      schema_version: 1, worker: "H", operation: "prepare", reason: "should fail",
      rollback_note: "Do not replace sshd unit files.",
      host_actions: [{
        host_id: "node-a", kind: "write-control", reason: "core unit forbidden",
        path: "/etc/systemd/system/sshd.service", content: "[Unit]\n",
        rollback: "Restore sshd.service from package.",
        verification: [{ type: "command", argv: [process.execPath, "-e", "process.exit(0)"] }],
      }],
    }), OpsError);
  });
  await each("declared control file needs verification", (fx) => {
    assert.throws(() => fx.plan({
      schema_version: 1, worker: "H", operation: "prepare", reason: "should fail",
      rollback_note: "Restore previous nginx conf from backup copy.",
      host_actions: [{
        host_id: "node-a", kind: "write-control", reason: "Public ingress site",
        path: "/etc/nginx/nginx.conf", content: "http {}\n",
        rollback: "Restore nginx.conf from backup.",
      }],
    }), OpsError);
  });
  await each("compose safe persistence model", (fx) => {
    const [value] = planner.composeModel({ compose: { services: { app: { image: "example@sha256:" + "a".repeat(64), volumes: [{ type: "bind", source: "data/app/storage", target: "/data" }] } } } }, fx.host, join(fx.target, "app-a"), "ops-app-a", { "app.env": {} }, {});
    assert.equal(value.services.app.read_only, true);
    assert.equal(value.services.app.volumes[0].bind.create_host_path, false);
    assert.equal(value.services.app.env_file[0].format, "raw");
  });
});

test("real native and dual docs", () => runFx((fx) => {
    const [info, , result] = fx.runSpec();
    assert.equal(result.status, "completed", JSON.stringify(result));
    const dep = model.load(fx.state).deployments["app-a-prod"];
    assert.equal(dep.observed_version, "v1");
    const remote = join(fx.target, "app-a");
    const local = join(fx.state, "hosts", "node-a", "deployments", "app-a-prod");
    assert.ok(!readFileSync(join(remote, "README.md"), "utf8").includes(PASSWORD));
    assert.ok(readFileSync(join(remote, "OPERATIONS.md"), "utf8").includes(PASSWORD));
    assert.ok(readFileSync(join(local, "README.md"), "utf8").includes(PASSWORD));
    assert.equal(readJson(join(local, "docs-receipt.json")).status, "both-sides-verified");
    assert.deepEqual(readFileSync(join(remote, "env", "app.env")), readFileSync(join(local, "server-files", "env", "app.env")));
    assert.equal(readJson(join(remote, "data", "app", "storage", "value.json")).count, 1);
    for (const f of [join(dirname(info.plan_path), "journal.jsonl"), join(dirname(info.plan_path), "execution.json")]) {
      assert.ok(!readFileSync(f, "utf8").includes(PASSWORD));
    }
}));
test("upgrade and rollback preserve data", () => runFx((fx) => {
    let r;
    [, , r] = fx.runSpec();
    assert.equal(r.status, "completed");
    [, , r] = fx.runSpec(fx.spec("v2", "upgrade"));
    assert.equal(r.status, "completed", JSON.stringify(r));
    [, , r] = fx.runSpec(fx.spec("v1", "rollback"));
    assert.equal(r.status, "completed", JSON.stringify(r));
    const value = readJson(join(fx.target, "app-a", "data", "app", "storage", "value.json"));
    assert.deepEqual(value, { count: 3, version: "v1" });
    assert.equal(readdirSync(join(fx.target, "app-a", "releases")).length, 3);
}));
test("retirement preserves data and credentials", () => runFx((fx) => {
    let r, p;
    [, , r] = fx.runSpec();
    assert.equal(r.status, "completed");
    [, p, r] = fx.runSpec({ schema_version: 1, worker: "D", operation: "uninstall", reason: "Stop only the disposable app", retire_deployments: ["app-a-prod"], rollback_note: "All data and credentials retained." });
    assert.equal(r.status, "completed", JSON.stringify(r));
    assert.equal(model.load(fx.state).deployments["app-a-prod"].status, "retired");
    assert.equal(existsSync(join(fx.target, "app-a", "data", "app", "storage", "value.json")), true);
    assert.equal(existsSync(join(fx.target, "app-a", "env", "app.env")), true);
    assert.equal(p.operations.some((o) => ["quarantine", "purge-quarantine"].includes(o.kind)), false);
}));
test("second apply blocked resume completed no repeat", () => runFx((fx) => {
    const [info, , r] = fx.runSpec();
    assert.equal(r.status, "completed");
    assert.throws(() => execution.apply(fx.state, info.run_id), OpsError);
    const again = execution.apply(fx.state, info.run_id, { resume: true });
    assert.equal(again.unchanged, true);
    assert.equal(readJson(join(fx.target, "app-a", "data", "app", "storage", "value.json")).count, 1);
}));
test("docs retry does not repeat native command", () => runFx((fx) => {
    const [info] = fx.plan();
    fx.approve(info);
    const real = execution.executionHooks.call;
    let failed = false;
    execution.executionHooks.call = (host, request, kw) => {
      if (request.action === "step" && String(request.operation?.step_id || "").startsWith("docs-") && !failed) {
        failed = true;
        throw new UnknownResult("simulated document transport interruption before dispatch");
      }
      return real(host, request, kw);
    };
    let r;
    try { r = execution.apply(fx.state, info.run_id); }
    finally { execution.executionHooks.call = real; }
    assert.equal(r.status, "docs_pending", JSON.stringify(r));
    assert.equal(existsSync(join(fx.state, "hosts", "node-a", "deployments", "app-a-prod", "README.md")), true);
    r = execution.apply(fx.state, info.run_id, { docsOnly: true });
    assert.equal(r.status, "completed", JSON.stringify(r));
    assert.equal(readJson(join(fx.target, "app-a", "data", "app", "storage", "value.json")).count, 1);
}));
test("actual failed command not replayed", () => runFx((fx) => {
    const [info, , r] = fx.runSpec(fx.spec("v1", "deploy", "process.exit(7);\n"));
    assert.equal(r.status, "partial", JSON.stringify(r));
    const dep = model.load(fx.state).deployments["app-a-prod"];
    assert.equal(dep.status, "failed");
    assert.equal(dep.observed_version, null);
    const again = execution.apply(fx.state, info.run_id, { resume: true });
    assert.equal(again.status, "failed");
    assert.ok(JSON.stringify(again).includes("not replayed"));
}));
test("unknown identity blocks target before data", () => runFx((fx) => {
    const [info] = fx.plan();
    fx.approve(info);
    const wrong = { ...fx.host, identity: "0".repeat(64) };
    assert.throws(() => transport.call(wrong, { action: "probe" }), OpsError);
    assert.equal(existsSync(fx.target), false);
}));
test("remote file drift stops before overwrite", () => runFx((fx) => {
    const [info] = fx.plan();
    fx.approve(info);
    const dest = join(fx.target, "app-a", "env", "app.env");
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, "UNAPPROVED=1\n");
    const r = execution.apply(fx.state, info.run_id);
    assert.equal(r.status, "failed");
    assert.equal(readFileSync(dest, "utf8"), "UNAPPROVED=1\n");
}));
test("journal tamper detected", () => runFx((fx) => {
    const [info, , r] = fx.runSpec();
    const j = join(dirname(info.plan_path), "journal.jsonl");
    const rows = readFileSync(j, "utf8").split(/\r?\n/).filter(Boolean);
    const value = JSON.parse(rows[0]);
    value.kind = "tampered";
    rows[0] = JSON.stringify(value);
    writeFileSync(j, rows.join("\n") + "\n");
    assert.throws(() => execution.verifyJournal(j), OpsError);
}));
test("quarantine then separate purge", () => runFx((fx) => {
    let hspec = {
      schema_version: 1, worker: "H", operation: "maintain", hosts: ["node-a"], reason: "Disposable cache fixture",
      rollback_note: "Keep isolated cache until separate purge is approved.",
      host_actions: [{ host_id: "node-a", kind: "write-file", reason: "Create only fixture cache", path: "_host/cache/demo/cache.txt", content: "Disposable cache" }],
    };
    let r, info;
    [, , r] = fx.runSpec(hspec);
    assert.equal(r.status, "completed", JSON.stringify(r));
    hspec = { ...hspec, host_actions: [{ host_id: "node-a", kind: "quarantine", reason: "Explicit isolate", path: join(fx.target, "_host", "cache", "demo", "cache.txt") }] };
    [info, , r] = fx.runSpec(hspec);
    assert.equal(r.status, "completed", JSON.stringify(r));
    const q = join(fx.target, "_host", "quarantine", info.run_id, "item-0001");
    assert.equal(existsSync(q), true);
    hspec = { ...hspec, host_actions: [{ host_id: "node-a", kind: "purge-quarantine", reason: "Separate irreversible deletion of this one approved cache fixture", path: q }] };
    [, , r] = fx.runSpec(hspec);
    assert.equal(r.status, "completed", JSON.stringify(r));
    assert.equal(existsSync(q), false);
}));

function agentFixture() {
  const tmp = mkdtempSync(join(tmpdir(), "ops-agent-test-"));
  const root = join(tmp, "target");
  const req = { action: "lock", root, identity: agent.fingerprint(), host_id: "node-a", run_id: "run-test", controller_id: "control-a", plan_digest: "a".repeat(64), external_files: [] };
  agent.main(req);
  return {
    tmp, root, req,
    step: (op) => agent.main({ ...req, action: "step", operation: op, operation_digest: digest(op) }),
    cleanup: () => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} },
  };
}

test("same receipt is not reexecuted", () => {
  const fx = agentFixture();
  try {
    const op = { step_id: "step-1", kind: "write", path: join(fx.root, "a.txt"), content_b64: Buffer.from("A").toString("base64"), expected: { kind: "absent" } };
    const one = fx.step(op); const two = fx.step(op);
    assert.deepEqual(one, two);
  } finally { fx.cleanup(); }
});
test("started only is unknown", () => {
  const fx = agentFixture();
  try {
    const p = join(fx.root, "_host", "runs", "run-test", "receipts");
    mkdirSync(p, { recursive: true });
    writeFileSync(join(p, "step-1.started.json"), "{}");
    const result = fx.step({ step_id: "step-1", kind: "mkdir", path: join(fx.root, "x") });
    assert.equal(result.status, "unknown");
    assert.equal(existsSync(join(fx.root, "x")), false);
  } finally { fx.cleanup(); }
});
test("target lock other owner rejected", () => {
  const fx = agentFixture();
  try { assert.throws(() => agent.main({ ...fx.req, run_id: "run-other" }), agent.Failure); }
  finally { fx.cleanup(); }
});
test("write beyond root fails", () => {
  const fx = agentFixture();
  try {
    const result = fx.step({ step_id: "step-1", kind: "write", path: join(dirname(fx.root), "outside"), content_b64: "WA==", expected: { kind: "absent" } });
    assert.equal(result.status, "failed");
  } finally { fx.cleanup(); }
});
test("identical bytes still secure permissions", () => {
  const fx = agentFixture();
  try {
    const p = join(fx.root, "secret");
    writeFileSync(p, "X");
    if (process.platform !== "win32") chmodSync(p, 0o644);
    const result = fx.step({ step_id: "step-1", kind: "write", path: p, content_b64: "WA==", expected: agent.fileState(p), mode: 0o600 });
    assert.equal(result.status, "succeeded");
    if (process.platform !== "win32") assert.equal(statSync(p).mode & 0o777, 0o600);
  } finally { fx.cleanup(); }
});
test("quarantine data forbidden", () => {
  const fx = agentFixture();
  try {
    const p = join(fx.root, "app-a", "data", "logs", "a");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "business");
    const result = fx.step({ step_id: "step-1", kind: "quarantine", path: p, item_id: "item-1", expected: agent.fileState(p) });
    assert.equal(result.status, "failed");
    assert.equal(existsSync(p), true);
  } finally { fx.cleanup(); }
});
test("purge needs isolation receipt", () => {
  const fx = agentFixture();
  try {
    const p = join(fx.root, "_host", "quarantine", "run-old", "item-1");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "unknown");
    const result = fx.step({ step_id: "step-1", kind: "purge-quarantine", path: p, expected: agent.treeState(p) });
    assert.equal(result.status, "failed");
  } finally { fx.cleanup(); }
});
test("mirror requires https", () => {
  assert.throws(() => agent.benchmarkMirrors({ candidates: [{ id: "x", ecosystem: "python", url: "http://example.invalid/a", expected_sha256: "0".repeat(64), trust: "official", approved: true }] }), agent.Failure);
});
test("mirror requires approval", () => {
  assert.throws(() => agent.benchmarkMirrors({ candidates: [{ id: "x", ecosystem: "python", url: "https://example.invalid/a", expected_sha256: "0".repeat(64), trust: "official", approved: false }] }), agent.Failure);
});
test("analyze does not run repo", () => {
  const fx = agentFixture();
  try {
    const source = join(fx.root, "source");
    mkdirSync(source);
    writeFileSync(join(source, "package.json"), '{"scripts":{"postinstall":"NEVER-RUN"}}');
    writeFileSync(join(source, ".env"), PASSWORD);
    const result = analyze(source);
    assert.deepEqual(result.detected, ["node"]);
    assert.ok(!JSON.stringify(result).includes(PASSWORD));
    assert.equal(result.evidence.length, 1);
  } finally { fx.cleanup(); }
});

test("ssh contract", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-ssh-"));
  const kh = join(d, "known_hosts");
  writeFileSync(kh, "fixture pinned key\n");
  const h = { host_id: "node-a", platform: "linux", transport: "ssh", identity: "a".repeat(64), connection: { hostname: "host.invalid", username: "ops", known_hosts: kh, node: "node" } };
  const captured = {};
  const prev = transport.transportHooks.spawnSync;
  transport.transportHooks.spawnSync = (cmd, args, kw) => {
    captured.argv = [cmd, ...args];
    Object.assign(captured, kw);
    return { status: 0, stdout: '{"ok":true,"result":{"scope":"simulated"}}', stderr: "" };
  };
  try {
    transport.call(h, { action: "step", secrets: [PASSWORD] });
    const joined = captured.argv.join(" ");
    assert.ok(captured.argv.includes("StrictHostKeyChecking=yes"));
    assert.ok(captured.argv.includes("BatchMode=yes"));
    assert.ok(!joined.includes(PASSWORD));
    assert.ok(captured.argv.includes("UserKnownHostsFile=" + kh));
    assert.ok(Buffer.isBuffer(captured.input));
    assert.equal(captured.encoding, "buffer");
  } finally { transport.transportHooks.spawnSync = prev; rmSync(d, { recursive: true, force: true }); }
});

test("knownhosts digest drift", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-kh-"));
  const kh = join(d, "known_hosts");
  writeFileSync(kh, "first");
  const h = { transport: "ssh", connection: { known_hosts: kh } };
  const before = transport.hostTransportDigest(h);
  writeFileSync(kh, "second");
  assert.notEqual(before, transport.hostTransportDigest(h));
  rmSync(d, { recursive: true, force: true });
});

test("command keeps raw docker json when secrets appear", () => {
  const fx = agentFixture();
  try {
    const secret = "1234";
    const json = JSON.stringify({ State: { Status: "running" }, Env: ["MYSQL_ROOT_PASSWORD=" + secret] });
    const prev = agent.agentHooks.spawnSync;
    agent.agentHooks.spawnSync = () => ({ status: 0, stdout: Buffer.from(json), stderr: Buffer.alloc(0) });
    try {
      const r = agent.command(["docker", "inspect", "x"], { cwd: fx.root, secrets: [secret] });
      assert.equal(JSON.parse(r.stdout).Env[0], "MYSQL_ROOT_PASSWORD=" + secret);
      assert.ok(!r.log_stdout.includes(secret));
      assert.equal(agent.parseDockerJson(r.stdout, "inspect").State.Status, "running");
    } finally { agent.agentHooks.spawnSync = prev; }
  } finally { fx.cleanup(); }
});

test("command stdin is buffer with encoding buffer", () => {
  const fx = agentFixture();
  try {
    const captured = {};
    const prev = agent.agentHooks.spawnSync;
    agent.agentHooks.spawnSync = (_cmd, _args, kw) => {
      Object.assign(captured, kw);
      return { status: 0, stdout: Buffer.from("ok"), stderr: Buffer.alloc(0) };
    };
    try {
      agent.command(["echo"], { cwd: fx.root, stdin: "hello" });
      assert.ok(Buffer.isBuffer(captured.input));
      assert.equal(captured.input.toString("utf8"), "hello");
      assert.equal(captured.encoding, "buffer");
    } finally { agent.agentHooks.spawnSync = prev; }
  } finally { fx.cleanup(); }
});

test("inspect container gate requires running healthy", () => {
  agent.inspectContainerGate({ Name: "/ok", State: { Status: "running" } });
  agent.inspectContainerGate({ Name: "/okh", State: { Status: "running", Health: { Status: "healthy" } } });
  assert.throws(() => agent.inspectContainerGate({ Name: "/exited", State: { Status: "exited" } }), agent.Failure);
  assert.throws(() => agent.inspectContainerGate({ Name: "/oom", State: { Status: "running", OOMKilled: true } }), agent.Failure);
  assert.throws(() => agent.inspectContainerGate({ Name: "/restart", State: { Status: "running", Restarting: true } }), agent.Failure);
  assert.throws(() => agent.inspectContainerGate({ Name: "/starting", State: { Status: "running", Health: { Status: "starting" } } }), agent.Failure);
});

test("control file helpers", () => {
  assert.equal(controlFiles.isBuiltinControlPath("/etc/docker/daemon.json"), true);
  assert.equal(controlFiles.isDeclaredControlPath("/etc/nginx/conf.d/app.conf"), true);
  assert.equal(controlFiles.isDeclaredControlPath("/etc/wireguard/wg0.conf"), true);
  assert.equal(controlFiles.defaultFileMode("config/redis.conf"), 0o644);
  assert.equal(controlFiles.defaultFileMode("env/app.env"), 0o600);
  assert.throws(() => controlFiles.assertSafeControlPath("/etc/shadow"), OpsError);
  assert.throws(() => controlFiles.assertSafeControlPath("/etc/systemd/system/sshd.service", { reason: "reviewed unit", rollback: "restore package unit" }), OpsError);
});

test("disjoint host plans apply sequentially", () => runFx((fx) => {
  model.register(fx.state, { hosts: [{ ...fx.host, host_id: "node-b", display_name: "Node B", root: join(fx.tmp, "server-b") }] });
  const specA = {
    schema_version: 1, worker: "H", operation: "maintain", hosts: ["node-a"], reason: "Host A cache fixture",
    rollback_note: "Keep isolated cache until a separate purge is approved.",
    host_actions: [{ host_id: "node-a", kind: "write-file", reason: "Create only fixture cache A", path: "_host/cache/a/cache.txt", content: "A" }],
  };
  const specB = {
    schema_version: 1, worker: "H", operation: "maintain", hosts: ["node-b"], reason: "Host B cache fixture",
    rollback_note: "Keep isolated cache until a separate purge is approved.",
    host_actions: [{ host_id: "node-b", kind: "write-file", reason: "Create only fixture cache B", path: "_host/cache/b/cache.txt", content: "B" }],
  };
  const [infoA] = fx.plan(specA);
  const [infoB] = fx.plan(specB);
  fx.approve(infoA);
  fx.approve(infoB);
  const rB = execution.apply(fx.state, infoB.run_id);
  assert.equal(rB.status, "completed", JSON.stringify(rB));
  const rA = execution.apply(fx.state, infoA.run_id);
  assert.equal(rA.status, "completed", JSON.stringify(rA));
  assert.equal(readFileSync(join(fx.target, "_host", "cache", "a", "cache.txt"), "utf8"), "A");
  assert.equal(readFileSync(join(fx.tmp, "server-b", "_host", "cache", "b", "cache.txt"), "utf8"), "B");
}));

test("host and fleet handbooks are markdown service tables", () => runFx((fx) => {
  const s = fx.graph();
  s.hosts["node-a"].host_services = [{
    id: "wg0", kind: "wireguard", unit: "wg-quick@wg0", listen_port: 51820,
    tunnel_address: "10.77.0.2/24", config_path: "/etc/wireguard/wg0.conf",
    notes: "入口隧道，不是 Clash 出口",
  }, {
    id: "nginx-public", kind: "nginx", unit: "nginx.service", listen_port: 57492,
    public_url: "http://203.0.113.10:57492/", config_path: "/etc/nginx/conf.d/app.conf",
  }];
  s.public_ingress = {
    schema_version: 1, title: "公网访问内网", path: "knowledge/public-ingress.json",
    not_the_same_as: "Clash TUN 是出口",
    mappings: [{ public: "http://203.0.113.10:57492/", layer4: "57492/tcp", via: ["nginx-public", "wg0"], backend: "10.77.0.2:8080" }],
    open_http_checklist: ["在入口主机增加 Nginx listen", "更新 WG AllowedIPs"],
    forbidden_ports: [22, 3306],
  };
  const fleet = docs.fleetDocument(s, ["node-a"], "run-test", now(), { ledger: model.ledgerLoad(fx.state), includeCredentials: true });
  const server = docs.hostReadme(s, "node-a", "run-test", now(), { full: true });
  for (const text of [fleet, server, docs.code("/srv/ops")]) {
    assert.ok(!text.includes("<code>"));
    assert.ok(!text.includes("<br>"));
  }
  assert.ok(fleet.includes("服务一览"));
  assert.ok(fleet.includes("说明"));
  assert.ok(fleet.includes("公网访问内网"));
  assert.ok(fleet.includes("10.77.0.2:8080"));
  assert.ok(fleet.includes("wg-quick@wg0"));
  assert.ok(fleet.includes("新开公网 HTTP"));
  assert.ok(fleet.includes(PASSWORD));
  assert.ok(!server.includes(PASSWORD));
  assert.ok(server.includes("服务一览"));
  assert.ok(docs.hostServicesDocument(s.hosts["node-a"]).includes("wg0"));
}));

test("host services and public ingress are delivered", () => runFx((fx) => {
  const host = { ...fx.host, host_services: [{
    id: "wg0", kind: "wireguard", unit: "wg-quick@wg0", listen_port: 51820,
    tunnel_address: "10.77.0.2/24", config_path: "/etc/wireguard/wg0.conf",
  }] };
  const spec = {
    schema_version: 1, worker: "H", operation: "maintain", hosts: ["node-a"],
    reason: "Record host ingress ledger",
    rollback_note: "Keep previous host-services ledger until a new plan replaces it.",
    resource_updates: { hosts: [host] },
    public_ingress: {
      schema_version: 1, title: "公网访问内网", path: "knowledge/public-ingress.json",
      mappings: [{ public: "http://203.0.113.10:57492/", layer4: "57492/tcp", via: ["wg0"], backend: "10.77.0.2:8080" }],
      open_http_checklist: ["更新 Nginx 与 WG", "刷新 public-ingress.json"],
      forbidden_ports: [22],
    },
    host_actions: [{ host_id: "node-a", kind: "write-file", reason: "Create only fixture cache", path: "_host/cache/demo/cache.txt", content: "cache" }],
  };
  const [, , r] = fx.runSpec(spec);
  assert.equal(r.status, "completed", JSON.stringify(r));
  const catalog = model.load(fx.state);
  assert.equal(catalog.hosts["node-a"].host_services[0].id, "wg0");
  assert.equal(catalog.public_ingress.mappings[0].backend, "10.77.0.2:8080");
  const remoteServices = readJson(join(fx.target, "knowledge", "host-services.json"));
  assert.equal(remoteServices.services[0].unit, "wg-quick@wg0");
  const remoteIngress = readJson(join(fx.target, "knowledge", "public-ingress.json"));
  assert.ok(remoteIngress.mappings[0].public.includes("57492"));
  const fleet = readFileSync(join(fx.state, "FLEET-DEPLOYMENTS.md"), "utf8");
  assert.ok(fleet.includes("服务一览"));
  assert.ok(fleet.includes("公网访问内网"));
  assert.ok(!fleet.includes("<code>"));
}));
