import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { digest, emptyStatus, now, writeJson } from "../tools/opslib/core.mjs";
import { route, readRegistry, statePath, targetDigest } from "../tools/opslib/workspace.mjs";
import { assessServer, readiness, checkServer, latestCheck } from "../tools/opslib/server_checks.mjs";
import { assertSpecScope, prepareTask, authorizeTask, runTask } from "../tools/opslib/tasks.mjs";
import { projectFleet, renderHtml, renderMarkdown, generateFleet } from "../tools/opslib/fleet.mjs";
import { parseWorkspaceArgs, workspaceCommand } from "../tools/opslib/workspace_cli.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "speculo-workspace-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const state = join(root, "state"); mkdirSync(state);
  const s = emptyStatus(); s.controller = { controller_id: "controller-a", state_root: state, created_at: now() };
  for (const id of ["node-a", "node-b"]) s.hosts[id] = { host_id: id, display_name: id, platform: process.platform === "win32" ? "windows" : "linux", transport: "local", root: join(root, id), identity: "a".repeat(64), connection: {} };
  for (const id of ["app-a", "app-b"]) s.projects[id] = { project_id: id, display_name: id, kind: "app", service_type: null, source: { type: "local", location: join(root, "source"), revision: "v1" } };
  writeJson(join(state, "status.json"), s);
  const save = () => writeJson(join(state, "status.json"), s);
  return { root, state, s, save };
}
function request(id = "task-one") {
  return { schema_version: 1, task_id: id, title: "Prepare one selected server", plan: "Inspect the explicitly selected server, prepare only its declared directory, verify the result, retain the original evidence, and never retry an unknown operation.", valid_for_hours: 2,
    scope: { scope: "server", server_ids: ["node-a"], project_ids: [], related_project_ids: [], allow_policy_changes: false, allow_public_ingress: false, allow_destructive: false }, input_paths: [],
    steps: [{ id: "prepare-root", title: "Prepare explicit directory", spec: { schema_version: 1, worker: "H", operation: "prepare", reason: "unit fixture", rollback_note: "retain", hosts: ["node-a"], host_actions: [{ host_id: "node-a", kind: "mkdir", path: "_host/cache", reason: "Create only the temporary fixture cache directory" }] } }] };
}
function inventory(h) {
  return { identity: h.identity, platform: "linux", tools: { node: { version: "v22.22.3" } },
    snapshots: { [h.root]: { kind: "directory" } }, diagnostics: { disks: { [h.root]: { free: 4 * 1024 ** 3 } }, memory: { MemAvailable: 1024 ** 3 } },
    docker_control: { status: "observed", endpoint: "unix:///var/run/docker.sock", data_root: posix.join(h.root, "_runtime/docker"), compose_version: "2.30.0" } };
}
function linuxServer(f) {
  return Object.assign(f.s.hosts["node-a"], { platform: "linux", root: "/srv/speculo-test/node-a" });
}
function directoryLink(target, path) {
  symlinkSync(target, path, process.platform === "win32" ? "junction" : "dir");
}
function adapterFor(f, options = {}) {
  const calls = { compile: 0, approve: 0, apply: 0 };
  let engine = "e".repeat(64), ledger = { entries: {} };
  const adapter = { load: readRegistry, validate: (s, kind) => { assert.equal(kind, "spec"); assert.equal(s.schema_version, 1); }, engineDigest: () => engine, ledgerLoad: () => ledger,
    compilePlan: (state, path) => {
      calls.compile++;
      const spec = JSON.parse(readFileSync(path, "utf8")), current = readRegistry(state), id = `run-${calls.compile}`;
      const plan = { run_id: id, worker: spec.worker, operation: spec.operation, controller_id: current.controller.controller_id, engine_digest: engine,
        hosts: { "node-a": current.hosts["node-a"] }, registry_scope: { hosts: ["node-a"], projects: [], deployments: [], allocations: [], bindings: [], policies: false, public_ingress: false },
        registry_after: structuredClone(current), operations: [{ host_id: "node-a", kind: "mkdir", deployment_id: null }], document_targets: [], affected_consumers: [], source_digests: {} };
      options.plan?.(plan);
      const planPath = join(state, "hosts/node-a/runs", id, "plan.json"); writeJson(planPath, plan);
      return { run_id: id, plan_path: planPath, plan_digest: digest(plan) };
    },
    approval: (_state, _run, _digest, by, statement) => { calls.approve++; assert.match(by, /^task:/); assert.match(statement, /Delegated exact-spec/); },
    apply: (state, _run) => { calls.apply++; options.beforeApply?.(); if (options.throwApply) throw new Error("transport disconnected");
      const s = readRegistry(state); s.revision++; writeJson(join(state, "status.json"), s); return { status: options.result ?? "completed" }; },
  };
  return { adapter, calls, changeEngine: () => { engine = "f".repeat(64); }, changeLedger: () => { ledger = { entries: { changed: true } }; } };
}
async function authorized(f, req, adapter) {
  const p = await prepareTask(f.state, req, adapter);
  authorizeTask(f.state, req.task_id, p.task_digest, "test-user", "Execute this exact task without per-step reconfirmation", req.scope.allow_destructive ? "I-APPROVE-THIS-EXACT-DESTRUCTIVE-TASK" : null);
  return p;
}

test("explicit layer routing distinguishes controller, access, server, project and inventory", (t) => {
  const f = fixture(t);
  assert.equal(route(f.s, { scope: "controller", server_ids: [], project_ids: [] }).work, "I-initialize");
  assert.equal(route(f.s, { scope: "server", server_ids: ["node-a"], project_ids: [] }).work, "H-host-manage");
  assert.equal(route(f.s, { scope: "project", server_ids: ["node-b"], project_ids: ["app-a"] }).work, "D-project-deploy");
  assert.equal(route(f.s, { scope: "inventory", server_ids: [], project_ids: [] }).work, "V-inventory-view");
  assert.deepEqual(route(f.s, { scope: "access", server_ids: ["new-node"], project_ids: [] }).registration_required, ["new-node"]);
  for (const c of [
    { scope: "controller", server_ids: ["node-a"], project_ids: [] }, { scope: "server", server_ids: ["node-a"], project_ids: ["app-a"] },
    { scope: "project", server_ids: [], project_ids: ["app-a"] }, { scope: "server", server_ids: ["missing"], project_ids: [] },
    { scope: "project", server_ids: ["node-a", "node-a"], project_ids: ["app-a"] },
  ]) assert.throws(() => route(f.s, c));
});
test("workspace rejects guessed roots, traversal, symlinks, duplicate JSON keys and orphan deployments", (t) => {
  const f = fixture(t);
  for (const path of [".", "/", f.state + "/../state"]) assert.throws(() => statePath(path));
  const link = join(f.root, "linked"); directoryLink(f.state, link); assert.throws(() => statePath(link), /symlink/);
  writeFileSync(join(f.state, "status.json"), '{"schema_version":3,"schema_version":3}'); assert.throws(() => readRegistry(f.state), /duplicate JSON/);
  f.s.deployments.dangling = { deployment_id: "dangling", host_id: "missing", project_id: "app-a" }; f.save(); assert.throws(() => readRegistry(f.state), /orphan/);
});
test("workspace argument parser rejects duplicates, unknown flags and missing values", () => {
  assert.equal(workspaceCommand(["--state", "/x", "fleet"]), "fleet"); assert.equal(workspaceCommand(["--state", "/x", "apply", "--run", "abc"]), null);
  assert.deepEqual(parseWorkspaceArgs(["fleet", "--state", "/x", "--stale-hours", "8"]), { command: "fleet", state: "/x", "stale-hours": "8" });
  for (const a of [["fleet"], ["fleet", "--state", "/x", "--state", "/y"], ["fleet", "--state"], ["fleet", "--state", "/x", "--project", "app-a"]]) assert.throws(() => parseWorkspaceArgs(a));
});
test("CLI help works without network, server dependencies or state", () => {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), "../tools/ops.mjs");
  const r = spawnSync(process.execPath, [path, "workspace-help"], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /server-check/);
});
test("Linux checklist distinguishes missing, failed, profile-ready and stale evidence", (t) => {
  const f = fixture(t), h = linuxServer(f), inv = inventory(h), at = new Date("2026-01-01T00:00:00Z");
  assert.equal(readiness(assessServer(h), at.toISOString(), { at }), "unknown");
  assert.equal(readiness(assessServer(h, { profile: "compose", inventory: inv }), at.toISOString(), { at }), "ready");
  assert.equal(readiness(assessServer(h, { profile: "compose", inventory: inv }), at.toISOString(), { at: new Date("2026-01-03T00:00:00Z") }), "stale");
  assert.equal(readiness(assessServer(h, { inventory: inv }), "2027-01-01", { at }), "unknown");
  for (const change of [i => { i.identity = "b".repeat(64); }, i => { i.tools.node.version = "v22.16.0"; }, i => { i.tools.node.version = "v25.0.0"; }, i => { i.docker_control.compose_version = "2.29.9"; }, i => { i.docker_control.endpoint = "tcp://other:2375"; }, i => { i.docker_control.data_root = "/var/lib/docker"; }, i => { i.diagnostics.memory.MemAvailable = 1; }]) {
    const v = structuredClone(inv); change(v); assert.equal(readiness(assessServer(h, { profile: "compose", inventory: v }), at.toISOString(), { at }), "blocked");
  }
});
test("server check uses pinned public-key-only SSH and records restricted evidence", async (t) => {
  const f = fixture(t), h = linuxServer(f), kh = join(f.root, "known_hosts"); writeFileSync(kh, "fixture verified key");
  Object.assign(h, { transport: "ssh", connection: { hostname: "example.invalid", username: "deploy", known_hosts: kh } }); f.save();
  let spawned = 0, called = 0;
  const a = { sshArgv: () => ["ssh", "-o", "StrictHostKeyChecking=yes"], spawn: (_cmd, args) => { spawned++; assert.ok(args.includes("PasswordAuthentication=no")); assert.ok(args.includes("KbdInteractiveAuthentication=no")); return { status: 0 }; }, call: () => { called++; return inventory(h); } };
  await assert.rejects(checkServer(f.state, "node-a", { profile: "bad" }, a)); assert.equal(spawned, 0);
  const r = await checkServer(f.state, "node-a", { profile: "compose" }, a); assert.equal(r.status, "ready"); assert.equal(called, 1);
  const check = latestCheck(f.state, h); assert.equal(check.host_digest, targetDigest(h)); assert.equal(check.checks.length, 16);
  if (process.platform !== "win32") assert.equal(statSync(r.report).mode & 0o777, 0o600);
  writeFileSync(kh, "different key"); assert.notEqual(check.host_digest, targetDigest(h));
});
test("failed SSH login never triggers Node probe and is not reported ready", async (t) => {
  const f = fixture(t), h = linuxServer(f), kh = join(f.root, "known_hosts"); writeFileSync(kh, "fixture"); Object.assign(h, { transport: "ssh", connection: { hostname: "invalid", username: "deploy", known_hosts: kh } }); f.save();
  const r = await checkServer(f.state, "node-a", {}, { sshArgv: () => ["ssh"], spawn: () => ({ status: 255 }), call: () => { throw new Error("must not probe"); } });
  assert.equal(r.status, "blocked"); assert.equal(r.checks.find(c => c.id === "machine-identity").status, "unknown");
});
test("task preparation does not execute; one authorization runs ordered steps without repeated confirmation", async (t) => {
  const f = fixture(t), a = adapterFor(f), req = request(); req.steps.push({ ...structuredClone(req.steps[0]), id: "verify-root" });
  const p = await prepareTask(f.state, req, a.adapter); assert.deepEqual(a.calls, { compile: 0, approve: 0, apply: 0 });
  await assert.rejects(runTask(f.state, req.task_id, a.adapter), /missing path/);
  assert.throws(() => authorizeTask(f.state, req.task_id, "0".repeat(64), "test-user", "explicit confirmation"), /digest mismatch/);
  authorizeTask(f.state, req.task_id, p.task_digest, "test-user", "Execute the already confirmed exact task");
  const r = await runTask(f.state, req.task_id, a.adapter); assert.equal(r.status, "completed"); assert.equal(r.steps.length, 2); assert.deepEqual(a.calls, { compile: 2, approve: 2, apply: 2 });
  await assert.rejects(runTask(f.state, req.task_id, a.adapter), /already started/); assert.equal(a.calls.apply, 2);
});
test("task IDs, frozen specs and authorization are immutable", async (t) => {
  const f = fixture(t), a = adapterFor(f), req = request(), p = await authorized(f, req, a.adapter);
  await assert.rejects(prepareTask(f.state, req, a.adapter), /already exists/);
  assert.throws(() => authorizeTask(f.state, req.task_id, p.task_digest, "test-user", "same explicit confirmation"), /immutable/);
  writeJson(join(f.state, "records/tasks/task-one/specs/prepare-root.json"), { changed: true });
  assert.equal((await runTask(f.state, req.task_id, a.adapter)).status, "blocked"); assert.equal(a.calls.compile, 0);
});
test("task rejects server/project confusion and indirect provider/consumer scope escalation before planning", (t) => {
  const f = fixture(t), req = request();
  assert.throws(() => assertSpecScope({ ...req.steps[0].spec, worker: "D", host_actions: [] }, req.scope, f.s), /cannot silently/);
  assert.throws(() => assertSpecScope({ ...req.steps[0].spec, hosts: ["node-b"] }, req.scope, f.s), /outside task/);
  f.s.deployments.provider = { deployment_id: "provider", host_id: "node-b", project_id: "app-b", status: "completed" };
  f.s.allocations.db = { allocation_id: "db", provider_deployment_id: "provider", owner_project_id: "app-a", shared_owners: [] };
  assert.throws(() => assertSpecScope({ schema_version: 1, worker: "D", operation: "deploy", provision: [{ allocation_id: "db" }] }, { ...req.scope, scope: "project", project_ids: ["app-a"], related_project_ids: ["app-b"] }, f.s), /outside task/);
  f.s.deployments.consumer = { deployment_id: "consumer", host_id: "node-a", project_id: "app-a", status: "completed" };
  f.s.bindings.link = { binding_id: "link", provider_deployment_id: "provider", consumer_deployment_id: "consumer", status: "active" };
  assert.throws(() => assertSpecScope(req.steps[0].spec, { ...req.scope, related_project_ids: ["app-a", "app-b"] }, f.s), /outside task/);
});
test("task stops on expiry, executor, credential, input and catalog drift before any execution", async (t) => {
  for (const kind of ["expiry", "engine", "ledger", "input", "catalog"]) {
    await t.test(kind, async (sub) => {
      const f = fixture(sub), a = adapterFor(f), req = request();
      const input = join(f.root, "installer.bin"); writeFileSync(input, "reviewed"); req.input_paths = [input];
      if (kind === "expiry") {
        const p = await prepareTask(f.state, req, a.adapter); const path = join(f.state, "records/tasks/task-one/task.json"), task = JSON.parse(readFileSync(path, "utf8")); task.expires_at = "2020-01-01T00:00:00Z"; writeJson(path, task);
        assert.throws(() => authorizeTask(f.state, req.task_id, digest(task), "test-user", "explicit confirmed task"), /expired/); assert.ok(p.task_digest); return;
      }
      await authorized(f, req, a.adapter);
      if (kind === "engine") a.changeEngine(); if (kind === "ledger") a.changeLedger(); if (kind === "input") writeFileSync(input, "modified"); if (kind === "catalog") { f.s.revision++; f.save(); }
      await assert.rejects(runTask(f.state, req.task_id, a.adapter), /drift|changed/); assert.equal(a.calls.apply, 0);
    });
  }
});
test("destructive and policy changes need explicitly bounded authorization", async (t) => {
  const f = fixture(t), a = adapterFor(f), req = request(); req.steps[0].spec.operation = "migrate";
  await assert.rejects(prepareTask(f.state, req, a.adapter), /destructive/);
  assert.throws(() => assertSpecScope({ worker: "D", operation: "deploy", retire_deployments: ["app-a-prod"] }, { ...request().scope, scope: "project", project_ids: ["app-a"] }, f.s), /destructive/);
  req.scope.allow_destructive = true; const p = await prepareTask(f.state, req, a.adapter);
  assert.throws(() => authorizeTask(f.state, req.task_id, p.task_digest, "test-user", "explicit confirmed task"), /independently explicit/);
  assert.throws(() => assertSpecScope({ ...request().steps[0].spec, plaintext_documentation: true }, request().scope, f.s), /policy change/);
});
test("compiled scope escalation and unpinned artifacts stop before approval and preserve plan references", async (t) => {
  for (const kind of ["target", "source", "hidden-catalog"]) await t.test(kind, async sub => {
    const f = fixture(sub), a = adapterFor(f, { plan: p => {
      if (kind === "target") p.hosts["node-b"] = f.s.hosts["node-b"];
      if (kind === "source") p.source_digests[join(f.root, "unreviewed")] = "a".repeat(64);
      if (kind === "hidden-catalog") p.registry_after.projects["app-b"].service_type = "changed";
    } }); await authorized(f, request(), a.adapter);
    const r = await runTask(f.state, "task-one", a.adapter); assert.equal(r.status, "blocked"); assert.equal(a.calls.approve, 0); assert.equal(a.calls.apply, 0); assert.equal(r.steps[0].run_id, "run-1");
  });
});
test("failed, unknown and docs_pending results stop later steps and cannot replay", async (t) => {
  for (const outcome of ["failed", "unknown", "docs_pending", "throw"]) await t.test(outcome, async sub => {
    const f = fixture(sub), a = adapterFor(f, { result: outcome, throwApply: outcome === "throw" }), req = request(); req.steps.push({ ...structuredClone(req.steps[0]), id: "next-step" });
    await authorized(f, req, a.adapter); const r = await runTask(f.state, req.task_id, a.adapter);
    assert.equal(r.status, outcome === "throw" ? "unknown" : outcome); assert.equal(a.calls.apply, 1); assert.equal(a.calls.compile, 1);
    await assert.rejects(runTask(f.state, req.task_id, a.adapter), /already started/);
  });
});
test("fleet projects both directions, host services and external providers without exporting secret fields", (t) => {
  const f = fixture(t), sentinel = "NEVER-EXPORT-THIS-SECRET";
  f.s.hosts["node-a"].connection.password = sentinel; f.s.hosts["node-a"].host_services = [{ id: "edge", kind: "nginx", notes: sentinel, public_url: `https://invalid/?token=${sentinel}` }];
  f.s.projects["app-a"].source = { repository: `https://user:${sentinel}@invalid` };
  f.s.deployments["app-prod"] = { deployment_id: "app-prod", host_id: "node-a", project_id: "app-a", status: "docs_pending", version: "v2", observed_version: "v1", root: "/srv/ops/app-a", env: { PASSWORD: sentinel }, notes: [sentinel], credential_refs: [sentinel] };
  f.s.bindings.external = { binding_id: "external", consumer_deployment_id: "app-prod", provider_deployment_id: null, mode: "external", status: "active", credential_ref: sentinel };
  const d = projectFleet(f.s); assert.deepEqual(d.servers[0].project_ids, ["app-a"]); assert.deepEqual(d.projects[0].server_ids, ["node-a"]); assert.equal(d.servers[0].host_services[0].service_id, "edge");
  assert.equal(d.deployments[0].desired_version, "v2"); assert.equal(d.deployments[0].observed_version, "v1"); assert.equal(d.bindings[0].provider_deployment_id, null);
  assert.ok(!JSON.stringify(d).includes(sentinel)); assert.ok(!renderHtml(d).includes(sentinel)); assert.ok(!renderMarkdown(d).includes(sentinel));
});
test("HTML rendering is deterministic, escaped, offline and CSP hashes match executable bytes", (t) => {
  const f = fixture(t); f.s.hosts["node-a"].display_name = '</script><img src=x onerror="alert(1)">'; const d = projectFleet(f.s, {}, [], { at: new Date("2026-01-01") });
  const html = renderHtml(d); assert.equal(html, renderHtml(d)); assert.ok(!html.includes(f.s.hosts["node-a"].display_name)); assert.ok(html.includes("\\u003c/script\\u003e")); assert.ok(!html.includes("innerHTML")); assert.ok(!html.includes("fetch("));
  const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].find(m => m[0].startsWith("<script>"))[1];
  assert.ok(html.includes("sha256-" + createHash("sha256").update(script).digest("base64"))); assert.match(html, /connect-src 'none'/);
  const md = renderMarkdown(d); assert.ok(!md.includes("<img"));
});
test("fleet writes immutable generations, verifies readback and retains one consistent landing page", async (t) => {
  const f = fixture(t), at = new Date("2026-01-01T00:00:00Z");
  // A secret ledger is deliberately unreadable JSON. View generation must not open it.
  mkdirSync(join(f.state, "private")); writeFileSync(join(f.state, "private/credentials.json"), "NOT JSON, DO NOT READ");
  const a = adapterFor(f); await authorized(f, request(), a.adapter);
  const first = generateFleet(f.state, { at }), second = generateFleet(f.state, { at }); assert.equal(first.view_id, second.view_id);
  assert.ok(readFileSync(first.markdown, "utf8").includes(first.view_id)); assert.ok(existsSync(first.html));
  const before = readFileSync(first.markdown, "utf8"); writeFileSync(first.html, "tampered"); assert.throws(() => generateFleet(f.state, { at }), /readback mismatch/); assert.equal(readFileSync(first.markdown, "utf8"), before);
});
test("fleet refuses symlink outputs and catalog locks without overwriting old entry", (t) => {
  const f = fixture(t), outsideDir = join(f.root, "outside"), outside = join(outsideDir, "sentinel.txt");
  mkdirSync(outsideDir); writeFileSync(outside, "untouched");
  if (process.platform === "win32") directoryLink(outsideDir, join(f.state, "FLEET.md"));
  else symlinkSync(outside, join(f.state, "FLEET.md"));
  assert.throws(() => generateFleet(f.state), /symlink/); assert.equal(readFileSync(outside, "utf8"), "untouched");
  rmSync(join(f.state, "FLEET.md")); mkdirSync(join(f.state, ".locks/catalog"), { recursive: true }); assert.throws(() => generateFleet(f.state), /catalog lock/);
});


test("workspace task and fleet integrate with the real legacy planner/approval/apply gateway", async (t) => {
  // A partial source overlay can run pure tests; installed-repository CI must exercise this branch.
  const modelPath = resolve(dirname(fileURLToPath(import.meta.url)), "../tools/opslib/model.mjs");
  if (!existsSync(modelPath)) { t.skip("legacy runtime absent in partial source overlay; full repository CI required"); return; }
  const f = fixture(t);
  const { fingerprint } = await import("../tools/opslib/agent.mjs");
  const { validate } = await import("../tools/opslib/model.mjs");
  const example = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../examples/task-host.example.json"), "utf8"));
  validate(example.steps[0].spec, "spec");
  f.s.hosts["node-a"].identity = fingerprint(); f.save();
  writeJson(join(f.state, "private/credentials.json"), { schema_version: 1, entries: {} });
  const p = await prepareTask(f.state, request());
  authorizeTask(f.state, "task-one", p.task_digest, "local-test-user", "Execute only this temporary local test directory preparation");
  const r = await runTask(f.state, "task-one");
  assert.equal(r.status, "completed", JSON.stringify(r));
  assert.ok(existsSync(join(f.s.hosts["node-a"].root, "_host/cache")));
  const view = generateFleet(f.state); assert.equal(view.status, "generated");
  const data = JSON.parse(readFileSync(view.json, "utf8")); assert.equal(data.tasks[0].status, "completed");
  assert.ok(data.releases.some(v => v.run_id === r.steps[0].run_id));
});

test("H and D cannot be mislabeled to cross server/project boundaries", (t) => {
  const f = fixture(t), s = request().scope;
  const d = { deployment_id: "app-prod", host_id: "node-a", project_id: "app-a" };
  assert.throws(() => assertSpecScope({ worker: "H", deployments: [d] }, { ...s, related_project_ids: ["app-a"] }, f.s), /H cannot/);
  assert.throws(() => assertSpecScope({ worker: "D", host_actions: [{ host_id: "node-a", kind: "mkdir" }] }, { ...s, scope: "project", project_ids: ["app-a"] }, f.s), /D cannot/);
  assert.doesNotThrow(() => assertSpecScope({ worker: "D", operation: "deploy", deployments: [{ ...d, compose: { services: { app: { environment: { project_id: "vendor-data-not-a-resource", host_id: "vendor-setting" } } } } }] }, { ...s, scope: "project", project_ids: ["app-a"] }, f.s));
});
