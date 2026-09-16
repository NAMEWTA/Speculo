/** CLI for explicit local recording and approved target mutations. */
import { existsSync, readdirSync, readFileSync, statSync, lstatSync, unlinkSync, rmdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative as pathRelative, resolve, sep } from "node:path";
import { hostname } from "node:os";
import {
  atomicWrite, digest, emptyStatus, identifier, newId, now, noSymlinks, OpsError, NodeMissing,
  privateDir, readJson, VERSION, withLock, writeJson,
} from "./core.mjs";
import { load, ledgerLoad, putCredential, register, save, validate, validateHost, validateStatus } from "./model.mjs";
import { call, probeLocal as transportProbeLocal } from "./transport.mjs";
import { compilePlan, locatePlan } from "./planner.mjs";
import { approval, apply, verifyJournal, requestBase } from "./execution.mjs";
import { STANDARD } from "./docs.mjs";
import { environmentSpec } from "./host_recipes.mjs";
import { fetchSource } from "./sources.mjs";
import { bootstrapNode, enroll, discoverOrMissing } from "./bootstrap.mjs";

export const cliHooks = { probeLocal: transportProbeLocal };
export function probeLocal() { return cliHooks.probeLocal(); }

function isRelativeTo(p, root) {
  const rel = pathRelative(root, p);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function initialize(state, controllerId) {
  identifier(controllerId);
  if (existsSync(state)) {
    noSymlinks(state);
    if (existsSync(join(state, "status.json"))) {
      const existing = readJson(join(state, "status.json"));
      if (existing.schema_version === 2 && (existing.active || []).length === 0 && (existing.archived || []).length === 0) {
        const extras = readdirSync(state).filter((n) => !["status.json", "changes", "archive"].includes(n));
        const leftover = [];
        for (const name of ["changes", "archive"]) {
          const dir = join(state, name);
          if (!existsSync(dir)) continue;
          const walk = (d) => {
            for (const n of readdirSync(d)) {
              const p = join(d, n);
              const st = lstatSync(p);
              if (st.isDirectory()) walk(p);
              else if (st.isFile() && n !== ".gitkeep") leftover.push(p);
            }
          };
          walk(dir);
        }
        if (extras.length || leftover.length) throw new OpsError("legacy runtime contains evidence; use import-legacy into a new state root");
      } else {
        validateStatus(existing);
        if (existing.controller != null) {
          if (existing.controller.controller_id !== controllerId) throw new OpsError("controller identity already fixed");
          return { status: "already-initialized", controller_id: controllerId, state_root: state };
        }
      }
    }
  }
  privateDir(state);
  return withLock(join(state, ".locks", "catalog"), { operation: "initialize" }, () => {
    const s = emptyStatus();
    s.controller = { controller_id: controllerId, state_root: state, created_at: now() };
    for (const rel of ["hosts", "projects", "releases", "private", "controller/inventory", "docs/standards", "knowledge"]) {
      privateDir(join(state, ...rel.split("/")));
    }
    save(state, s);
    writeJson(join(state, "private", "credentials.json"), { schema_version: 1, entries: {} });
    const inv = probeLocal();
    writeJson(join(state, "controller", "inventory", newId("snapshot") + ".json"), inv);
    atomicWrite(join(state, ".gitignore"), "*\n!.gitignore\n");
    atomicWrite(join(state, "docs", "standards", "DEPLOYMENT-STANDARD.md"), STANDARD);
    atomicWrite(join(state, "README.md"), "# OPS 控制端\n\n资源事实：status.json；主机：hosts/；发布：releases/；明文账本：private/credentials.json。替换静态 workflow 时绝不能删除这里。首次部署后自动生成双边详细档案。\n");
    return { status: "initialized", controller_id: controllerId, state_root: state, inventory_recorded: true };
  });
}

export function analyze(source) {
  noSymlinks(source, { allowMissing: false });
  if (!statSync(source).isDirectory()) throw new OpsError("source must be a project directory");
  const skip = new Set([".git", "node_modules", ".venv", "venv", "data", "backups", ".speculo", "dist", "build", "target"]);
  const evidence = [];
  const detected = [];
  const names = { "pyproject.toml": "python", "requirements.txt": "python", "package.json": "node", "pom.xml": "java", "build.gradle": "java", Dockerfile: "docker", "compose.yaml": "compose", "docker-compose.yml": "compose", "Cargo.toml": "rust", "go.mod": "go" };
  const walk = (root) => {
    let entries;
    try { entries = readdirSync(root, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const p = join(root, ent.name);
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) {
        if (!skip.has(ent.name)) walk(p);
        continue;
      }
      if (ent.name === ".env" || ent.name.endsWith(".env")) continue;
      if (ent.name in names) {
        if (statSync(p).size > 1024 * 1024) throw new OpsError("manifest exceeds scan bound");
        evidence.push({ path: pathRelative(source, p).replaceAll("\\", "/"), sha256: digest(readFileSync(p)), kind: names[ent.name] });
        detected.push(names[ent.name]);
      }
      if (evidence.length > 2000) throw new OpsError("source analysis bound exceeded");
    }
  };
  walk(source);
  return {
    source,
    detected: [...new Set(detected)].sort(),
    evidence,
    side_effects: "read-only; no repository code executed, no network download",
    next: "Create a deployment spec from actual project manifests; fix revision and storage/health/dependency mappings.",
  };
}

export function inspectRun(state, run) {
  const p = locatePlan(state, run);
  const plan = readJson(p);
  const ledger = ledgerLoad(state);
  const results = {};
  for (const [hid, h] of Object.entries(plan.hosts)) {
    try { results[hid] = call(h, { ...requestBase(plan, hid, ledger), action: "receipts" }); }
    catch (e) { if (e instanceof OpsError) results[hid] = { unavailable: e.message }; else throw e; }
  }
  return { run_id: plan.run_id, targets: results, journal: verifyJournal(join(dirname(p), "journal.jsonl")) };
}

export function breakControllerLock(state, ack) {
  if (ack !== "I-VERIFIED-NO-EXECUTION-IS-RUNNING") throw new OpsError("explicit recovery acknowledgement required");
  const p = join(state, ".locks", "catalog");
  noSymlinks(p);
  const owner = readJson(join(p, "owner.json"));
  if (owner.machine !== hostname()) throw new OpsError("lock owner belongs to a different controller machine; verify there first");
  const pid = owner.pid;
  try { process.kill(pid, 0); }
  catch (e) {
    if (e.code === "ESRCH") { /* gone */ }
    else if (e.code === "EPERM") throw new OpsError("cannot prove owner process is stopped");
    else throw e;
    // ESRCH: process not found, continue
    const evidence = join(state, "controller", "recovery", newId("lock") + ".json");
    writeJson(evidence, { owner, ack, recovered_at: now() });
    unlinkSync(join(p, "owner.json"));
    rmdirSync(p);
    return { status: "controller-lock-released", evidence, target_locks: "not modified; inspect remote receipts before resume" };
  }
  throw new OpsError("owner PID is still alive (or reused); refusing automatic lock removal");
}

export function importLegacy(state, source, controllerId) {
  noSymlinks(source, { allowMissing: false });
  if (existsSync(state) && readdirSync(state).length) throw new OpsError("legacy import destination must be empty and separate");
  if (source === state || isRelativeTo(state, source) || isRelativeTo(source, state)) throw new OpsError("legacy source/destination must be disjoint");
  const walkAll = (d, acc = []) => {
    for (const n of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, n.name);
      if (n.isSymbolicLink()) throw new OpsError("legacy evidence contains symlinks; preserve manually without following them");
      if (n.isDirectory()) walkAll(p, acc);
      else acc.push(p);
    }
    return acc;
  };
  walkAll(source);
  const result = initialize(state, controllerId);
  const dest = join(state, "legacy", newId("import"));
  privateDir(dest);
  const manifest = {};
  const files = [];
  const collect = (d) => {
    for (const n of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, n.name);
      if (n.isDirectory()) collect(p);
      else if (n.isFile()) files.push(p);
    }
  };
  collect(source);
  files.sort();
  for (const p of files) {
    const rel = pathRelative(source, p);
    const data = readFileSync(p);
    atomicWrite(join(dest, rel), data);
    manifest[rel.replaceAll("\\", "/")] = { sha256: digest(data), source_mode: statSync(p).mode & 0o777 };
  }
  writeJson(join(dest, "IMPORT-MANIFEST.json"), { source, at: now(), files: manifest, approvals_reused: false });
  return { ...result, legacy_evidence: dest, note: "source preserved, no hosts/deployments/passwords/approvals inferred" };
}

function parseArgs(argv) {
  argv = [...argv];
  const out = { _: [] };
  const take = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0) return undefined;
    if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`);
    const v = argv[i + 1];
    argv.splice(i, 2);
    return v;
  };
  const flag = (name) => {
    const i = argv.indexOf(name);
    if (i < 0) return false;
    argv.splice(i, 1);
    return true;
  };
  if (flag("--version")) return { command: "version" };
  out.state = take("--state");
  const command = argv.shift();
  if (!command) throw new Error("command required");
  out.command = command;
  const grab = (name) => { const v = take(name); if (v !== undefined) out[name.slice(2).replaceAll("-", "_")] = v; };
  if (command === "init") grab("--controller-id");
  else if (command === "probe") { grab("--host"); grab("--connection-file"); grab("--output"); }
  else if (command === "register") grab("--file");
  else if (command === "mirror-probe") { grab("--host"); grab("--file"); out.allow_network = flag("--allow-network"); }
  else if (command === "credential-put") grab("--file");
  else if (command === "analyze") grab("--source");
  else if (command === "environment-spec") { grab("--host"); grab("--file"); grab("--output"); }
  else if (command === "source-fetch") { grab("--project"); grab("--repository"); grab("--commit"); out.allow_network = flag("--allow-network"); }
  else if (command === "plan") grab("--file");
  else if (command === "approve") { grab("--run"); grab("--digest"); grab("--by"); grab("--statement"); }
  else if (["apply", "resume", "docs-sync", "inspect-run"].includes(command)) grab("--run");
  else if (command === "validate") { grab("--file"); grab("--schema"); }
  else if (command === "status") { /* none */ }
  else if (command === "recover-controller-lock") grab("--ack");
  else if (command === "import-legacy") { grab("--source"); grab("--controller-id"); }
  else if (command === "bootstrap-node") {
    grab("--connection-file"); grab("--host-id"); grab("--account"); grab("--host-root");
    grab("--volta-archive"); grab("--volta-sha256"); grab("--node-archive"); grab("--node-sha256");
    grab("--node-version"); grab("--ack");
    out.probe = flag("--probe");
    out.apply = flag("--apply");
    out.allow_network = flag("--allow-network");
  }
  else if (command === "enroll") grab("--file");
  else throw new Error("unknown command: " + command);
  if (argv.length) throw new Error("unrecognized arguments: " + argv.join(" "));
  return out;
}

export function main(argv = process.argv.slice(2)) {
  let args;
  try { args = parseArgs(argv); }
  catch (e) {
    process.stderr.write(String(e.message || e) + "\n");
    return 2;
  }
  if (args.command === "version") {
    process.stdout.write(VERSION + "\n");
    return 0;
  }
  if (!args.state && !["analyze", "probe", "validate", "bootstrap-node"].includes(args.command)) {
    process.stderr.write("--state is required; it is never guessed from cwd\n");
    return 2;
  }
  const state = args.state ? resolve(args.state) : null;
  try {
    let result;
    const cmd = args.command;
    if (cmd === "init") {
      if (!args.controller_id) throw new OpsError("--controller-id is required");
      result = initialize(state, args.controller_id);
    } else if (cmd === "probe") {
      if (args.host) {
        if (state == null) throw new OpsError("--host needs --state");
        const s = load(state);
        result = call(s.hosts[args.host], { action: "probe" }, { timeout: 180 });
        writeJson(join(state, "hosts", args.host, "inventory", newId("snapshot") + ".json"), result);
      } else if (args.connection_file) {
        const h = readJson(args.connection_file);
        const discovery = h.identity === "discover";
        if (h.transport === "ssh") discoverOrMissing(h);
        if (discovery) h.identity = "0".repeat(64);
        validateHost(h);
        result = call(h, { action: "probe", ...(discovery ? { identity: null } : {}) }, { timeout: 180 });
        if (discovery) {
          result.next = "ops.mjs --state STATE enroll --file register.json";
          result.registration_note = "Read-only discovery over your pinned known_hosts. Next must persist via enroll (or register + probe --host); discover is never valid for register/apply.";
        }
      } else result = probeLocal();
      if (args.output) writeJson(resolve(args.output), result);
    } else if (cmd === "register") result = register(state, readJson(args.file));
    else if (cmd === "mirror-probe") {
      if (!args.allow_network) throw new OpsError("mirror benchmarking requires explicit --allow-network");
      const s = load(state);
      const data = readJson(args.file);
      result = call(s.hosts[args.host], { action: "mirror-probe", candidates: data.candidates, rounds: data.rounds ?? 3 }, { timeout: 180 });
      const path = join(state, "hosts", args.host, "mirrors", newId("probe") + ".json");
      writeJson(path, result);
      result.local_report = path;
    } else if (cmd === "credential-put") result = putCredential(state, readJson(args.file));
    else if (cmd === "analyze") result = analyze(resolve(args.source));
    else if (cmd === "environment-spec") {
      const spec = environmentSpec(state, args.host, readJson(args.file));
      writeJson(resolve(args.output), spec);
      result = { spec_path: resolve(args.output), status: "generated-not-executed", next: "plan --file this-spec" };
    } else if (cmd === "source-fetch") {
      result = fetchSource(state, args.project, args.repository, args.commit, args.allow_network);
    } else if (cmd === "plan") result = compilePlan(state, resolve(args.file));
    else if (cmd === "approve") result = approval(state, args.run, args.digest, args.by, args.statement);
    else if (cmd === "apply" || cmd === "resume" || cmd === "docs-sync") {
      result = apply(state, args.run, { resume: cmd === "resume", docsOnly: cmd === "docs-sync" });
    } else if (cmd === "inspect-run") result = inspectRun(state, args.run);
    else if (cmd === "validate") {
      if (!args.file && state == null) throw new OpsError("validate requires --state or --file --schema");
      if (args.file) {
        if (!args.schema) throw new OpsError("--file requires --schema");
        const value = readJson(args.file);
        validate(value, args.schema);
        if (args.schema === "status") validateStatus(value);
        result = { valid: true, schema: args.schema };
      } else result = { valid: true, revision: load(state).revision };
    } else if (cmd === "status") {
      const s = load(state);
      result = {
        controller: s.controller, revision: s.revision, hosts: Object.keys(s.hosts),
        deployments: Object.values(s.deployments).map((d) => ({
          deployment_id: d.deployment_id, host_id: d.host_id, project_id: d.project_id,
          status: d.status, version: d.version, observed_version: d.observed_version,
        })),
      };
    } else if (cmd === "recover-controller-lock") result = breakControllerLock(state, args.ack);
    else if (cmd === "import-legacy") result = importLegacy(state, resolve(args.source), args.controller_id);
    else if (cmd === "bootstrap-node") result = bootstrapNode({ ...args, state });
    else if (cmd === "enroll") result = enroll(state, readJson(args.file));
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return ["failed", "partial", "unknown", "docs_pending", "blocked"].includes(result.status) ? 2 : 0;
  } catch (e) {
    const payload = { status: "blocked", error: e.message || String(e) };
    if (e instanceof NodeMissing) {
      payload.error = "node-missing";
      payload.next = e.next;
      payload.posix = e.posix;
    }
    process.stderr.write(JSON.stringify(payload) + "\n");
    return 2;
  }
}
