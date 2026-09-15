/** Compile user-reviewed specifications into immutable, identity-bound execution plans. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative as pathRelative, resolve } from "node:path";
import { posix, win32 } from "node:path";
import {
  atomicWrite, canonical, credentialsIn, digest, identifier, newId, now, noSymlinks,
  OpsError, readJson, relative, targetJoin, within, withLock, writeJson,
} from "./core.mjs";
import { deploymentRoot, load, ledgerLoad, validate, validateStatus } from "./model.mjs";
import { call as transportCall, hostTransportDigest } from "./transport.mjs";
import { allocationOperation } from "./services.mjs";
import { credentialRefs, planReport, remotePaths } from "./docs.mjs";
import { taskFiles } from "./native_windows.mjs";
import { engineDigest } from "./execution.mjs";
import { assertSafeControlPath, defaultFileMode, reservedHostDocumentPaths } from "./control_files.mjs";

export const plannerHooks = { call: transportCall };

export function runDir(state, plan) {
  if (["I", "H"].includes(plan.worker) && Object.keys(plan.hosts).length === 1) {
    return join(state, "hosts", Object.keys(plan.hosts)[0], "runs", plan.run_id);
  }
  return join(state, "releases", plan.run_id);
}

export function locatePlan(state, value) {
  if (existsSync(value) && statSync(value).isFile()) {
    const resolved = resolve(value);
    noSymlinks(resolved, { allowMissing: false });
    const rel = pathRelative(resolve(state), resolved);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new OpsError("plan must belong to the selected controller state root");
    return resolved;
  }
  identifier(value, "run_id");
  const matches = [];
  const hostsDir = join(state, "hosts");
  if (existsSync(hostsDir)) {
    for (const hid of readdirSync(hostsDir)) {
      const p = join(hostsDir, hid, "runs", value, "plan.json");
      if (existsSync(p)) matches.push(p);
    }
  }
  const direct = join(state, "releases", value, "plan.json");
  if (existsSync(direct)) matches.push(direct);
  if (matches.length !== 1) throw new OpsError("run_id must resolve to exactly one stored plan");
  return matches[0];
}

export function templates(value, ctx, status) {
  if (typeof value === "string") {
    for (const [k, v] of Object.entries(ctx)) value = value.split("{{" + k + "}}").join(v);
    return value.replace(/\{\{(binding|allocation):([a-z0-9-]+):([a-z_]+)\}\}/g, (_m, kind, key, field) => {
      const table = status[kind === "binding" ? "bindings" : "allocations"];
      if (!table[key] || typeof table[key][field] !== "string") throw new OpsError("unknown binding/allocation substitution");
      return table[key][field];
    });
  }
  if (Array.isArray(value)) return value.map((x) => templates(x, ctx, status));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, templates(v, ctx, status)]));
  return value;
}

export function projectPath(host, root, rel) {
  const result = targetJoin({ ...host, root }, rel);
  if (!within(result, root, host.platform)) throw new OpsError("project path escapes root");
  return result;
}

export function envFile(values, { systemd = false } = {}) {
  const lines = [];
  for (const k of Object.keys(values).sort()) {
    let v = values[k];
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || typeof v !== "string" || /[\r\n\x00]/.test(v)) {
      throw new OpsError("env files require valid keys and single-line strings; multiline values belong in mounted files");
    }
    if (systemd) v = '"' + v.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"';
    lines.push(k + "=" + v);
  }
  return lines.join("\n") + "\n";
}

function pyList(items) {
  return `[${[...items].sort().map((x) => `'${x}'`).join(", ")}]`;
}

export function composeModel(spec, host, root, name, envs, ctx) {
  const model = structuredClone(spec.compose);
  if (![null, undefined, name].includes(model.name)) throw new OpsError("Compose identity cannot override registered deployment identity");
  model.name = name;
  if (!model.services || !Object.keys(model.services).length) throw new OpsError("Compose deployment needs at least one service");
  const mounts = [];
  const allowed = new Set(["image", "build", "command", "entrypoint", "environment", "env_file", "volumes", "ports", "healthcheck", "depends_on",
    "restart", "user", "read_only", "tmpfs", "labels", "networks", "cap_drop", "security_opt", "deploy", "init", "working_dir",
    "mem_limit", "cpus", "stop_grace_period", "logging", "profiles", "writable_root_justification"]);
  for (const [service, s] of Object.entries(model.services)) {
    identifier(service, "compose service");
    const unknown = Object.keys(s).filter((k) => !allowed.has(k));
    if (unknown.length) throw new OpsError("unsupported or unsafe Compose fields: " + pyList(unknown));
    if (!("image" in s) && !("build" in s)) throw new OpsError("service requires a pinned image or build");
    if (!("build" in s) && !/^[^\s]+@sha256:[a-f0-9]{64}$/.test(s.image)) {
      throw new OpsError("production Compose images must be pinned by sha256 digest, not floating tags");
    }
    if ("build" in s) {
      if (!s.build || typeof s.build !== "object" || Object.keys(s.build).some((k) => !["context", "dockerfile", "args", "target"].includes(k))) {
        throw new OpsError("build needs an explicit local context and Dockerfile");
      }
      s.build.context = projectPath(host, root, "compose/build");
      s.build.dockerfile = projectPath(host, root, "compose/Dockerfile");
    }
    if (credentialsIn(s.environment || {}).size) throw new OpsError("credentials must be injected through env/ files, not inline Compose environment");
    if (s.restart === undefined) s.restart = "unless-stopped";
    const justification = s.writable_root_justification;
    delete s.writable_root_justification;
    if (s.read_only === false) {
      if (typeof justification !== "string" || justification.trim().length < 12) {
        throw new OpsError("writable container rootfs hides undeclared persistence; declare bind/tmpfs paths instead");
      }
    } else {
      s.read_only = true;
    }
    if (s.tmpfs === undefined) s.tmpfs = ["/tmp", "/run"];
    const labels = s.labels && typeof s.labels === "object" && !Array.isArray(s.labels) ? s.labels : null;
    if (s.labels !== undefined && !labels) throw new OpsError("Compose labels must be a map");
    s.labels = labels || {};
    Object.assign(s.labels, { "ops.managed": "true", "ops.deployment": name });
    let files = s.env_file || [];
    if (typeof files === "string") files = [files];
    if (!files.length && Object.keys(envs).length === 1) files = Object.keys(envs);
    const converted = [];
    for (let f of files) {
      if (typeof f !== "string") throw new OpsError("env_file input must name files from this project's env map");
      if (f.startsWith("env/")) f = f.slice(4);
      if (!(f in envs)) throw new OpsError("Compose references an undeclared environment file: " + f);
      converted.push({ path: projectPath(host, root, "env/" + f), required: true, format: "raw" });
    }
    if (converted.length) s.env_file = converted;
    for (const mount of s.volumes || []) {
      if (!mount || typeof mount !== "object" || Object.keys(mount).some((k) => !["type", "source", "target", "read_only", "bind", "consistency"].includes(k))) {
        throw new OpsError("volume must use explicit safe long syntax");
      }
      if (mount.type !== "bind") throw new OpsError("named/anonymous volumes violate the fixed persistence-root contract");
      let source = mount.source;
      if (!source.startsWith("/") && !source.startsWith("\\") && !/^[A-Za-z]:/.test(source)) source = projectPath(host, root, source);
      if (!within(source, root, host.platform)) throw new OpsError("bind mount outside this project's root");
      const adapter = host.platform === "windows" ? win32 : posix;
      const rel = adapter.relative(root, source).replaceAll("\\", "/");
      const area = rel.split("/")[0];
      if (!["data", "logs", "config", "env", "backups", "run"].includes(area)) throw new OpsError("mount must be under data/logs/config/env/backups/run");
      if (!mount.read_only && !["data", "logs", "backups", "run"].includes(area)) throw new OpsError("config/env mounts must be read-only");
      if (area === "data" && rel.split("/").length < 3) throw new OpsError("data needs component/purpose naming");
      if (typeof mount.target !== "string" || !mount.target.startsWith("/")) throw new OpsError("container target must be absolute");
      mount.source = source;
      mount.bind = { create_host_path: false };
      mounts.push([source, area, mount.read_only ?? false]);
    }
  }
  const dollars = (v) => {
    if (typeof v === "string") return v.replaceAll("$", "$$");
    if (Array.isArray(v)) return v.map(dollars);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dollars(x)]));
    return v;
  };
  return [dollars(model), mounts];
}

export function catalogSlice(status, scope) {
  if (!scope || typeof scope !== "object") throw new OpsError("plan missing registry_scope; compile a new plan");
  const pick = (group) => Object.fromEntries((scope[group] || []).map((id) => [id, status[group]?.[id] ?? null]));
  const slice = {
    hosts: pick("hosts"),
    projects: pick("projects"),
    deployments: pick("deployments"),
    allocations: pick("allocations"),
    bindings: pick("bindings"),
  };
  if (scope.policies) slice.policies = status.policies;
  if (scope.public_ingress) slice.public_ingress = status.public_ingress ?? null;
  return slice;
}

export function sliceDigest(status, scope) {
  return digest(catalogSlice(status, scope));
}

export function computeRegistryScope(current, after, selected, ops, uniqueDocs) {
  const hosts = new Set(Object.keys(selected || {}));
  const deployments = new Set(uniqueDocs || []);
  const allocations = new Set();
  const bindings = new Set();
  const projects = new Set();
  for (const op of ops || []) {
    if (op.host_id) hosts.add(op.host_id);
    if (op.deployment_id) deployments.add(op.deployment_id);
    if (op.allocation_id) allocations.add(op.allocation_id);
  }
  const catalog = after || current;
  for (const did of [...deployments]) {
    const d = catalog.deployments?.[did] || current.deployments?.[did];
    if (d) { hosts.add(d.host_id); projects.add(d.project_id); }
  }
  for (const [bid, b] of Object.entries(catalog.bindings || {})) {
    if (deployments.has(b.consumer_deployment_id) || deployments.has(b.provider_deployment_id)) {
      bindings.add(bid);
      if (b.allocation_id) allocations.add(b.allocation_id);
      if (b.provider_deployment_id) deployments.add(b.provider_deployment_id);
      const provider = catalog.deployments?.[b.provider_deployment_id];
      if (provider) { hosts.add(provider.host_id); projects.add(provider.project_id); }
      const consumer = catalog.deployments?.[b.consumer_deployment_id];
      if (consumer) { hosts.add(consumer.host_id); projects.add(consumer.project_id); }
    }
  }
  for (const [aid, a] of Object.entries(catalog.allocations || {})) {
    if (allocations.has(aid) || deployments.has(a.provider_deployment_id)) {
      allocations.add(aid);
      if (a.provider_deployment_id) deployments.add(a.provider_deployment_id);
    }
  }
  for (const did of deployments) {
    const d = catalog.deployments?.[did] || current.deployments?.[did];
    if (d) { hosts.add(d.host_id); projects.add(d.project_id); }
  }
  return {
    hosts: [...hosts].sort(),
    projects: [...projects].sort(),
    deployments: [...deployments].sort(),
    allocations: [...allocations].sort(),
    bindings: [...bindings].sort(),
    policies: digest(current.policies) !== digest(after.policies),
    public_ingress: digest(current.public_ingress ?? null) !== digest(after.public_ingress ?? null),
  };
}

export function compilePlan(state, specPath) {
  const spec = readJson(specPath);
  validate(spec, "spec");
  return withLock(join(state, ".locks", "catalog"), { operation: "plan" }, () => {
    const current = load(state);
    if (current.controller == null) throw new OpsError("initialize the controller first");
    const after = structuredClone(current);
    const ledger = ledgerLoad(state);
    const revisions = spec.resource_updates || {};
    for (const [group, idkey, fixed] of [["hosts", "host_id", ["host_id", "root", "identity", "platform"]], ["projects", "project_id", ["project_id", "kind", "service_type"]]]) {
      for (const item of revisions[group] || []) {
        const previous = current[group][item[idkey]];
        if (previous == null || fixed.some((k) => previous[k] !== item[k])) {
          throw new OpsError("resource update cannot change identity/root/kind; create explicit migration resources");
        }
        after[group][item[idkey]] = structuredClone(item);
      }
    }
    if (spec.public_ingress !== undefined) after.public_ingress = structuredClone(spec.public_ingress);
    const rid = identifier(spec.run_id || newId("run"));
    if (rid in current.releases) throw new OpsError("run ID already exists");
    for (const [group, key] of [["allocations", "allocation_id"], ["bindings", "binding_id"]]) {
      for (const item of spec[group] || []) {
        if (item[key] in after[group] && digest(after[group][item[key]]) !== digest(item)) {
          if (group === "allocations") throw new OpsError("allocation identity/ownership changes require new resource and migration");
          if (!["migrate", "upgrade", "rollback"].includes(spec.operation)) throw new OpsError("binding update requires migration/upgrade/rollback plan");
        }
        after[group][item[key]] = structuredClone(item);
      }
    }
    for (const bid of spec.retire_bindings || []) {
      if (!(bid in after.bindings)) throw new OpsError("unknown binding to retire");
      after.bindings[bid].status = "retired";
    }
    const hosts = new Set([...(spec.hosts || []), ...(revisions.hosts || []).map((h) => h.host_id)]);
    const ops = [];
    const external = {};
    const sourceDigests = {};
    const specs = {};
    const docTargets = [];
    const add = (hostId, did, kind, kw = {}) => {
      hosts.add(hostId);
      const op = { step_id: `step-${String(ops.length + 1).padStart(4, "0")}`, host_id: hostId, deployment_id: did, kind, ...kw };
      ops.push(op);
      return op;
    };
    const fileOp = (hostId, did, path, { content = undefined, binary = undefined, mode = undefined } = {}) => {
      const data = { path, mode: mode ?? defaultFileMode(path) };
      if (content !== undefined) data.content = content;
      else data.content_b64 = Buffer.from(binary).toString("base64");
      return add(hostId, did, "write", data);
    };
    const healthOp = (hostId, did, item, ctx) => {
      const h = templates(item, ctx, after);
      const typ = h.type;
      delete h.type;
      if (typ === "command") {
        if (!h.argv) throw new OpsError("command health check needs argv");
        if (credentialsIn(h.argv).size) throw new OpsError("do not put credentials in command argv");
        const extra = "stdout_pattern" in h ? { stdout_pattern: h.stdout_pattern } : {};
        return add(hostId, did, "verify-command", { argv: h.argv, cwd: ctx.root, timeout: h.timeout ?? 60, env: h.env || {}, ...extra });
      }
      if (typ === "file") {
        let p = h.path;
        if (!within(p, ctx.root, after.hosts[hostId].platform)) p = projectPath(after.hosts[hostId], ctx.root, p);
        return add(hostId, did, "assert-file", { path: p, ...("sha256" in h ? { sha256: h.sha256 } : {}) });
      }
      return add(hostId, did, "health", { type: typ, ...h });
    };
    for (const d of spec.deployments || []) {
      const did = d.deployment_id;
      if (did in specs) throw new OpsError("duplicate deployment in specification");
      specs[did] = d;
      const hid = d.host_id;
      hosts.add(hid);
      if (!(hid in after.hosts) || !(d.project_id in after.projects)) throw new OpsError("register host and project before planning");
      const host = after.hosts[hid];
      const p = after.projects[d.project_id];
      const root = deploymentRoot(host, d.project_id, d.environment, d.instance, d.layout);
      const old = current.deployments[did];
      if (old && ["project_id", "host_id", "environment", "instance", "layout"].some((k) => old[k] !== d[k])) {
        throw new OpsError("deployment identity/path change: create a new deployment and an explicit data-migration plan");
      }
      if (old && spec.operation === "deploy") throw new OpsError("existing deployment requires upgrade/rollback/maintain, not fresh deploy");
      after.deployments[did] = {
        deployment_id: did, project_id: d.project_id, host_id: hid, environment: d.environment,
        instance: d.instance, layout: d.layout, method: d.method, version: d.version,
        observed_version: old ? old.observed_version : null, root, status: "planned",
        installed_at: old ? old.installed_at : null, updated_at: null, run_id: rid,
        compose_name: d.method === "compose" ? "ops-" + did : null, storage: [],
        commands: { start: [], stop: [], verify: [] },
        credential_refs: d.credential_refs || [], backup: d.backup, recovery: d.recovery,
        notes: d.notes || [], source: p.source, service: d.service || {},
      };
      docTargets.push(did);
    }
    const affected = new Set();
    const touchedProvider = new Set([...Object.keys(specs), ...(spec.retire_deployments || [])]);
    const touchedHosts = new Set((spec.host_actions || []).map((x) => x.host_id));
    for (const [did, d] of Object.entries(current.deployments)) {
      if (touchedHosts.has(d.host_id) && d.status !== "retired") { affected.add(did); touchedProvider.add(did); docTargets.push(did); }
    }
    for (const b of Object.values(current.bindings)) {
      if (b.status === "active" && touchedProvider.has(b.provider_deployment_id)) affected.add(b.consumer_deployment_id);
    }
    const missingAck = [...affected].filter((x) => !(spec.acknowledged_consumers || []).includes(x)).sort();
    if (missingAck.length) throw new OpsError("maintenance impact must be acknowledged for consumers: " + missingAck.join(", "));
    for (const item of spec.host_actions || []) {
      const hid = item.host_id;
      if (!(hid in after.hosts)) throw new OpsError("unknown host action target");
      const host = after.hosts[hid];
      const kind = item.kind;
      const hostroot = host.root;
      if (kind === "write-control" || kind === "write-file") {
        if (kind === "write-file") {
          const path = targetJoin(host, relative(item.path));
          if (reservedHostDocumentPaths(host, targetJoin).includes(path)) {
            throw new OpsError("generated host documentation cannot be supplied as a host write-file: " + path);
          }
          if ("content" in item) fileOp(hid, null, path, { content: item.content, mode: item.mode });
          else if ("source" in item) {
            const src = resolve(item.source);
            noSymlinks(src, { allowMissing: false });
            if (statSync(src).size > 16 * 1024 * 1024) throw new OpsError("host file exceeds 16 MiB");
            const data = readFileSync(src);
            sourceDigests[src] = digest(data);
            fileOp(hid, null, path, { binary: data, mode: item.mode });
          } else throw new OpsError("host write-file requires content/source");
          continue;
        }
        const path = item.path;
        const cls = assertSafeControlPath(path, { reason: item.reason, rollback: item.rollback || spec.rollback_note });
        if (cls === "declared") {
          if (!item.verification || !item.verification.length) {
            throw new OpsError("declared control files require explicit post-verification");
          }
        }
        (external[hid] ??= []).push(path);
        fileOp(hid, null, path, { content: item.content, mode: item.mode ?? 0o644 });
        if (item.verification) {
          for (const h of item.verification) healthOp(hid, null, h, { root: hostroot, host_root: hostroot });
        }
      } else if (kind === "mkdir") add(hid, null, "mkdir", { path: targetJoin(host, relative(item.path)), mode: item.mode ?? 0o750 });
      else if (kind === "quarantine" || kind === "purge-quarantine") {
        const path = item.path;
        if (!within(path, hostroot, host.platform)) throw new OpsError("cleanup must target a registered cache/log path under host_root");
        if (kind === "purge-quarantine" && !within(path, targetJoin(host, "_host/quarantine"), host.platform)) {
          throw new OpsError("purge can only target one previously isolated quarantine item");
        }
        add(hid, null, kind, { path, item_id: `item-${String(ops.length + 1).padStart(4, "0")}` });
      } else if (kind === "defaults") add(hid, null, "defaults", { expected: item.expected_defaults });
      else {
        const argv = item.argv;
        if (!argv || credentialsIn(argv).size) throw new OpsError("host command needs argv without plaintext credential arguments");
        const cwd = item.cwd ?? hostroot;
        if (cwd !== hostroot && !within(cwd, hostroot, host.platform)) throw new OpsError("host action cwd outside root");
        if (!item.writes) throw new OpsError("host command needs explicit write-set declaration");
        for (const path of item.writes) {
          if (!within(path, hostroot, host.platform) && !(external[hid] || []).includes(path)) {
            if (kind !== "install-toolchain") throw new OpsError("host command persistent writes outside root");
          }
        }
        if (kind === "install-toolchain" && !item.expected_defaults) throw new OpsError("toolchain migration requires explicit old default expectations");
        add(hid, null, "command", { argv, cwd, env: item.env || {}, timeout: item.timeout ?? 1800, declared_writes: item.writes, reason: item.reason });
        if (!item.verification) throw new OpsError("host mutations require explicit post-verification");
        for (const h of item.verification) healthOp(hid, null, h, { root: hostroot, host_root: hostroot });
        if (item.expected_defaults) add(hid, null, "defaults", { expected: item.expected_defaults });
      }
    }
    const provisions = {};
    for (const p of spec.provision || []) {
      if (!(p.allocation_id in after.allocations)) throw new OpsError("provision references unknown allocation");
      const a = after.allocations[p.allocation_id];
      if (a.status !== "planned") throw new OpsError("active allocations are reused, not reprovisioned or password-reset");
      (provisions[a.provider_deployment_id] ??= []).push(p);
    }
    const provisionFor = (provider) => {
      if (!(provider in after.deployments)) throw new OpsError("provider deployment not found");
      const dep = after.deployments[provider];
      const host = after.hosts[dep.host_id];
      for (const p of provisions[provider] || []) {
        const a = after.allocations[p.allocation_id];
        const adapter = p.adapter;
        if (adapter === "existing") {
          if (!("existing_verification" in p)) throw new OpsError("adopted allocation requires actual verification");
          const h = healthOp(dep.host_id, provider, p.existing_verification, { root: dep.root, host_root: host.root });
          h.allocation_id = a.allocation_id;
        } else {
          const [cid, version] = a.credential_ref.split("@");
          const account = ledger.entries?.[cid]?.[version]?.values?.username;
          if (account === undefined) throw new OpsError("allocation credential must contain the actual username and password");
          if (account !== p.app_username) throw new OpsError("allocation username differs from plaintext ledger username");
          const op = allocationOperation(after, dep, a, p);
          const kind = op.kind;
          delete op.kind;
          add(dep.host_id, provider, kind, { allocation_id: a.allocation_id, ...op });
        }
      }
    };
    for (const provider of Object.keys(provisions)) {
      if (!(provider in specs)) {
        if (!["completed", "running", "docs_pending"].includes(after.deployments[provider].status)) throw new OpsError("existing provider is not verified active");
        provisionFor(provider);
        docTargets.push(provider);
      }
    }
    const ordered = [];
    const visiting = new Set();
    const visit = (did) => {
      if (ordered.includes(did)) return;
      if (visiting.has(did)) throw new OpsError("dependency cycle");
      visiting.add(did);
      for (const b of Object.values(after.bindings)) {
        if (b.status === "active" && b.consumer_deployment_id === did && b.provider_deployment_id in specs) visit(b.provider_deployment_id);
      }
      visiting.delete(did);
      ordered.push(did);
    };
    for (const did of Object.keys(specs)) visit(did);
    for (const did of ordered) {
      let d = specs[did];
      const dep = after.deployments[did];
      const host = after.hosts[dep.host_id];
      const hid = host.host_id;
      const root = dep.root;
      const ctx = {
        root, host_root: host.root, data: projectPath(host, root, "data"), env: projectPath(host, root, "env"),
        logs: projectPath(host, root, "logs"), artifact: projectPath(host, root, `releases/${rid}/artifact`), run_id: rid,
      };
      d = templates(d, ctx, after);
      for (const path of [root, ...["env", "data", "config", "logs", "backups/owned", "backups/dependencies", "run", `releases/${rid}/artifact`].map((x) => projectPath(host, root, x))]) {
        add(hid, did, "mkdir", { path });
      }
      const marker = { deployment_id: did, project_id: dep.project_id, host_id: hid, environment: dep.environment, instance: dep.instance };
      fileOp(hid, did, projectPath(host, root, ".ops-project.json"), { content: JSON.stringify(marker, null, 2) + "\n" });
      for (const item of d.storage || []) {
        const area = item.area || "data";
        const rel = `${area}/${item.component}/${item.purpose}`;
        const path = projectPath(host, root, rel);
        const extra = {};
        for (const k of ["uid", "gid", "mode"]) if (k in item) extra[k] = item[k];
        add(hid, did, "mkdir", { path, ...extra });
        dep.storage.push({ component: item.component, purpose: item.purpose, path });
      }
      for (const f of d.files || []) {
        let rel = relative(f.path);
        if (["README.md", "OPERATIONS.md", "project.yaml", ".ops-project.json"].includes(rel) || rel.startsWith("run/") || rel.startsWith("env/")) {
          throw new OpsError("generated ownership/docs/env paths cannot be supplied as arbitrary files");
        }
        if (rel.startsWith("artifact/")) rel = `releases/${rid}/` + rel;
        else if (!["compose", "config", "scripts", "service", "data"].includes(rel.split("/")[0])) {
          throw new OpsError("project files must use artifact/compose/config/scripts/service/data");
        }
        const dest = projectPath(host, root, rel);
        if (("content" in f) === ("source" in f)) throw new OpsError("file requires exactly one of content/source");
        if ("content" in f) fileOp(hid, did, dest, { content: f.content, mode: f.mode });
        else {
          let src = f.source;
          if (!isAbsolute(src)) src = join(dirname(specPath), src);
          noSymlinks(src, { allowMissing: false });
          if (!statSync(src).isFile() || statSync(src).size > 16 * 1024 * 1024) throw new OpsError("source must be a regular file <=16 MiB");
          const content = readFileSync(src);
          sourceDigests[resolve(src)] = digest(content);
          fileOp(hid, did, dest, { binary: content, mode: f.mode });
        }
      }
      const envs = d.env || {};
      for (const values of [...Object.values(envs), d.native?.environment || {}]) {
        for (const [key, value] of Object.entries(values)) {
          if (/(?:DATA|UPLOAD|CACHE|LOG|TMP|TEMP|HOME|DIR|STORAGE)/i.test(key) && key !== "JAVA_HOME") {
            if ((value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) && !within(value, root, host.platform)) {
              throw new OpsError("persistent environment path outside project root: " + key);
            }
          }
          if (value.startsWith("sqlite:///")) {
            const sqlitePath = value.slice("sqlite:///".length);
            if (sqlitePath.startsWith("/") && !within(sqlitePath, root, host.platform)) throw new OpsError("SQLite URL escapes project persistence root");
          }
        }
      }
      for (const [filename, values] of Object.entries(envs)) {
        if (relative(filename).includes("/") || !(filename === ".env" || filename.endsWith(".env"))) {
          throw new OpsError("environment filenames must be .env or *.env");
        }
        const envop = fileOp(hid, did, projectPath(host, root, "env/" + filename), { content: envFile(values) });
        envop.env_values = values;
        envop.env_format = "raw";
      }
      const runtimeEnv = {
        OPS_PROJECT_ROOT: root, OPS_DATA_ROOT: ctx.data, OPS_LOG_ROOT: ctx.logs, OPS_RUN_ROOT: projectPath(host, root, "run"),
        XDG_DATA_HOME: projectPath(host, root, "data/app/storage"), XDG_CACHE_HOME: projectPath(host, root, "run/cache"),
        HOME: projectPath(host, root, "data/app/home"), USERPROFILE: projectPath(host, root, "data/app/home"),
        XDG_CONFIG_HOME: projectPath(host, root, "data/app/settings"), APPDATA: projectPath(host, root, "data/app/settings"), LOCALAPPDATA: projectPath(host, root, "data/app/settings"),
        UV_CACHE_DIR: projectPath(host, root, "run/cache/uv"), PIP_CACHE_DIR: projectPath(host, root, "run/cache/pip"), npm_config_cache: projectPath(host, root, "run/cache/npm"),
        TMPDIR: projectPath(host, root, "run/tmp"), TMP: projectPath(host, root, "run/tmp"), TEMP: projectPath(host, root, "run/tmp"),
      };
      if (d.method === "compose") {
        if (!("compose" in d)) throw new OpsError("Compose method requires a model");
        const [model, mounts] = composeModel(d, host, root, dep.compose_name, envs, ctx);
        const written = new Set(ops.filter((o) => o.kind === "write").map((o) => o.path));
        for (const [path, area] of mounts) {
          if (!written.has(path)) add(hid, did, "mkdir", { path });
          if (area === "data" && !dep.storage.some((x) => x.path === path)) {
            const parts = path.replaceAll("\\", "/").split("/");
            dep.storage.push({ component: parts.at(-2), purpose: parts.at(-1), path });
          }
        }
        fileOp(hid, did, projectPath(host, root, "compose/compose.yaml"), { content: JSON.stringify(model, null, 2) + "\n" });
        fileOp(hid, did, projectPath(host, root, "compose/build/.dockerignore"), { content: ".git\n.env\n*.env\ndata/\nbackups/\nOPERATIONS.md\nprivate/\n" });
        add(hid, did, "compose-up", { project_root: root, compose_name: dep.compose_name });
        const base = ["docker", "compose", "--project-name", dep.compose_name, "--project-directory", root, "--file", projectPath(host, root, "compose/compose.yaml")];
        dep.commands.start = [base.concat(["up", "-d", "--wait"])];
        dep.commands.stop = [base.concat(["stop"])];
        dep.commands.verify = [base.concat(["ps"])];
      } else {
        if (!("native" in d)) throw new OpsError("native method requires supervisor and argv");
        const n = d.native;
        const argv = n.argv;
        if (credentialsIn(argv).size) throw new OpsError("native credentials belong in env files, not argv");
        if (argv.slice(1).some((x) => ["-c", "-e", "--eval"].includes(x))) throw new OpsError("native application code must be a fixed artifact, not inline eval");
        for (const arg of argv.slice(1)) {
          const candidate = arg.split("=").pop();
          if ((candidate.startsWith("/") || /^[A-Za-z]:[\\/]/.test(candidate)) && !within(candidate, root, host.platform)) {
            throw new OpsError("native argument references a path outside the project root: " + candidate);
          }
        }
        if (!within(argv[0], root, host.platform) && !(["python3", "python", "java", "node", "bash", "sh", "dotnet"].includes(argv[0]) || isAbsolute(argv[0]))) {
          throw new OpsError("native executable must be explicit or a recognized runtime");
        }
        if (Object.keys(n.environment || {}).some((k) => k in runtimeEnv)) throw new OpsError("native environment cannot override persistence roots");
        const selectedEnvs = n.env_files ?? (Object.keys(envs).length === 1 ? Object.keys(envs) : []);
        if (Object.keys(envs).length > 1 && !("env_files" in n)) throw new OpsError("native deployment with multiple env files requires explicit env_files order");
        const combined = {};
        for (const filename of selectedEnvs) {
          if (!(filename in envs)) throw new OpsError("native references an undeclared env file");
          for (const [key, value] of Object.entries(envs[filename])) {
            if (key in combined && combined[key] !== value) throw new OpsError("conflicting native environment values; reconcile explicitly");
            combined[key] = value;
          }
        }
        Object.assign(combined, n.environment || {});
        if (Object.keys(combined).some((k) => k in runtimeEnv)) throw new OpsError("native env files cannot override reserved persistence roots");
        Object.assign(runtimeEnv, combined);
        for (const rel of ["run/tmp", "run/cache", "data/app/storage", "data/app/home", "data/app/settings", "logs/app"]) {
          add(hid, did, "mkdir", { path: projectPath(host, root, rel) });
        }
        if (!dep.storage.some((x) => x.path === runtimeEnv.XDG_DATA_HOME)) {
          dep.storage.push({ component: "app", purpose: "storage", path: runtimeEnv.XDG_DATA_HOME });
        }
        const supervisor = n.supervisor;
        if (supervisor === "systemd") {
          if (host.platform !== "linux") throw new OpsError("systemd is a Linux adapter");
          if (argv.some((x) => x.includes("\n") || x.includes("\r"))) throw new OpsError("newline in systemd argv");
          const unit = "ops-" + did + ".service";
          const unitpath = "/etc/systemd/system/" + unit;
          const account = n.account;
          if (!account || !/^[a-z_][a-z0-9_-]*[$]?$/.test(account)) throw new OpsError("native systemd requires an explicit service account");
          const envpath = projectPath(host, root, "env/service.env");
          const envop = fileOp(hid, did, envpath, { content: envFile(runtimeEnv, { systemd: true }) });
          envop.env_values = runtimeEnv;
          envop.env_format = "systemd";
          const quote = (s) => '"' + s.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("%", "%%") + '"';
          const content = "[Unit]\nDescription=OPS " + did + "\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nUser=" + account + "\nWorkingDirectory=" + quote(ctx.artifact) + "\nEnvironmentFile=" + quote(envpath) + "\nExecStart=:" + argv.map(quote).join(" ") + "\nRestart=on-failure\nUMask=0027\nNoNewPrivileges=true\nProtectSystem=strict\nProtectHome=read-only\nReadWritePaths=" + ["data", "logs", "run", "backups"].map((x) => quote(projectPath(host, root, x))).join(" ") + "\nStandardOutput=append:" + projectPath(host, root, "logs/app/stdout.log") + "\nStandardError=append:" + projectPath(host, root, "logs/app/stderr.log") + "\n\n[Install]\nWantedBy=multi-user.target\n";
          fileOp(hid, did, projectPath(host, root, "service/" + unit), { content, mode: 0o644 });
          (external[hid] ??= []).push(unitpath);
          fileOp(hid, did, unitpath, { content, mode: 0o644 });
          add(hid, did, "grant-runtime", { project_root: root, account, directories: [`releases/${rid}/artifact`, "config", "scripts", "data", "logs", "run"] });
          for (const a of [["systemctl", "daemon-reload"], ["systemctl", "enable", unit], ["systemctl", "restart", unit], ["systemctl", "is-active", "--quiet", unit]]) {
            add(hid, did, a[1] !== "is-active" ? "command" : "verify-command", { argv: a, cwd: root });
          }
          dep.commands = { start: [["systemctl", "start", unit]], stop: [["systemctl", "stop", unit]], verify: [["systemctl", "status", unit]] };
        } else if (supervisor === "windows-task") {
          if (host.platform !== "windows") throw new OpsError("Windows task adapter requires a native Windows host");
          for (const [rel, content] of Object.entries(taskFiles(did, root, argv, runtimeEnv, n))) {
            const taskop = fileOp(hid, did, projectPath(host, root, rel), { content });
            if (rel.endsWith("task.json")) taskop.json_values = JSON.parse(content);
          }
          const a = ["powershell", "-NoProfile", "-NonInteractive", "-File", projectPath(host, root, "service/install-task.ps1")];
          add(hid, did, "command", { argv: a, cwd: root });
          dep.commands = { start: [["schtasks", "/Run", "/TN", "OPS-" + did]], stop: [["schtasks", "/End", "/TN", "OPS-" + did]], verify: [["schtasks", "/Query", "/TN", "OPS-" + did, "/V"]] };
        } else {
          add(hid, did, "command", { argv, cwd: root, env: runtimeEnv, timeout: n.timeout ?? 300, declared_writes: [ctx.data, ctx.logs, projectPath(host, root, "run")] });
          dep.commands = { start: [argv], stop: [], verify: [] };
          dep.notes.push("Native oneshot: successful finite application run, not a resident daemon.");
        }
      }
      for (const h of d.health) healthOp(hid, did, h, ctx);
      const snapshot = { run_id: rid, version: dep.version, source: dep.source, planned_at: now(), method: dep.method };
      fileOp(hid, did, projectPath(host, root, `releases/${rid}/release.json`), { content: JSON.stringify(snapshot, null, 2) + "\n" });
      provisionFor(did);
    }
    for (const did of spec.retire_deployments || []) {
      if (!(did in after.deployments)) throw new OpsError("unknown deployment to retire");
      const dep = after.deployments[did];
      const hid = dep.host_id;
      hosts.add(hid);
      const consumers = Object.values(after.bindings).filter((b) => b.status === "active" && b.provider_deployment_id === did).map((b) => b.consumer_deployment_id);
      if (consumers.length) throw new OpsError("cannot retire shared service with active consumers: " + consumers.join(","));
      for (const b of Object.values(after.bindings)) {
        if (b.consumer_deployment_id === did) b.status = "retired";
      }
      if (dep.method === "compose") add(hid, did, "compose-stop", { project_root: dep.root, compose_name: dep.compose_name });
      else for (const a of dep.commands.stop) add(hid, did, "command", { argv: a, cwd: dep.root });
      const marker = Object.fromEntries(["deployment_id", "project_id", "host_id", "environment", "instance"].map((k) => [k, dep[k]]));
      add(hid, did, "assert-file", { path: projectPath(after.hosts[hid], dep.root, ".ops-project.json"), sha256: digest(Buffer.from(JSON.stringify(marker, null, 2) + "\n")) });
      dep.status = "retired";
      dep.run_id = rid;
      docTargets.push(did);
    }
    const provisionIds = new Set((spec.provision || []).map((x) => x.allocation_id));
    for (const a of spec.allocations || []) {
      if (!(a.allocation_id in current.allocations) && !provisionIds.has(a.allocation_id)) {
        throw new OpsError("new allocation requires a typed provisioning action or verified adoption");
      }
    }
    docTargets.push(...affected);
    for (const b of Object.values(after.bindings)) {
      if (b.status === "active" && docTargets.includes(b.consumer_deployment_id) && b.provider_deployment_id) {
        docTargets.push(b.provider_deployment_id);
      }
    }
    const uniqueDocs = [...new Set(docTargets)].sort();
    for (const did of uniqueDocs) hosts.add(after.deployments[did].host_id);
    if (!hosts.size) throw new OpsError("plan requires at least one registered host");
    if ([...hosts].some((h) => !(h in after.hosts))) throw new OpsError("unregistered target host");
    validateStatus(after);
    if (ops.length > 2000 || canonical(ops).length > 64 * 1024 * 1024) throw new OpsError("plan exceeds bounded 2000 operations/64 MiB; split into reviewed releases");
    const selected = Object.fromEntries([...hosts].sort().map((hid) => [hid, after.hosts[hid]]));
    const inventories = {};
    const snapshots = {};
    const docPreconditions = {};
    for (const [hid, host] of Object.entries(selected)) {
      const paths = new Set(ops.filter((o) => o.host_id === hid && ["write", "quarantine", "purge-quarantine"].includes(o.kind)).map((o) => o.path));
      for (const did of uniqueDocs) {
        if (after.deployments[did].host_id === hid) for (const p of remotePaths(after, after.deployments[did])) paths.add(p);
      }
      for (const p of [
        targetJoin(host, "knowledge/INDEX.md"),
        targetJoin(host, "knowledge/host-services.json"),
        targetJoin(host, "knowledge/public-ingress.json"),
        targetJoin(host, "README.md"),
        targetJoin(host, "DEPLOYMENTS.md"),
        targetJoin(host, "docs/standards/DEPLOYMENT-STANDARD.md"),
      ]) paths.add(p);
      for (const did of Object.keys(specs)) {
        const dep = after.deployments[did];
        if (dep.host_id === hid) paths.add(dep.root);
      }
      const needsDocker = uniqueDocs.some((did) => after.deployments[did].host_id === hid && after.deployments[did].method === "compose");
      const inv = plannerHooks.call(host, {
        action: "probe", paths: [...paths].sort(), disk_roots: [host.root], include_docker: needsDocker,
        deep_paths: ops.filter((o) => o.host_id === hid && o.kind === "purge-quarantine").map((o) => o.path),
      }, { timeout: 180 });
      if (needsDocker) {
        const control = inv.docker_control;
        if (!control || control.status !== "observed") throw new OpsError("Docker/Compose preparation is not verified; finish an approved H plan before D");
        if (!control.endpoint.startsWith("unix://") && !control.endpoint.startsWith("npipe://")) {
          throw new OpsError("Docker context points to a different machine; register that machine as the target host");
        }
        const wanted = targetJoin(host, "_runtime/docker");
        if (after.policies.strict_docker_root && control.data_root !== wanted) {
          throw new OpsError("existing Docker data-root differs from unified root; explicit H migration required, never silently move it");
        }
        const version = (control.compose_version.match(/\d+/g) || []).slice(0, 3).map(Number);
        const cmp = (a, b) => { for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0); } return 0; };
        if (cmp(version, [2, 30, 0]) < 0) throw new OpsError("generated raw env_file contract requires Docker Compose >=2.30");
        for (const op of ops) {
          if (op.host_id === hid && op.compose_name) { op.context = control.context; op.expected_docker_id = control.id; }
        }
        for (const did of uniqueDocs) {
          const dep = after.deployments[did];
          if (dep.host_id === hid && dep.method === "compose") {
            Object.assign(dep.service, { docker_context: control.context, docker_id: control.id });
            for (const commands of Object.values(dep.commands)) {
              for (const argv of commands) {
                if (argv[0] === "docker" && argv[1] === "compose") argv.splice(1, 0, "--context", control.context);
              }
            }
          }
        }
      }
      inventories[hid] = inv;
      snapshots[hid] = inv.snapshots;
      const writtenNow = new Set(ops.filter((o) => o.host_id === hid).map((o) => o.path).filter(Boolean));
      docPreconditions[hid] = Object.fromEntries(Object.entries(inv.snapshots).filter(([p]) => !writtenNow.has(p)));
    }
    for (const [did, d] of Object.entries(specs)) {
      const dep = after.deployments[did];
      const snap = snapshots[dep.host_id][dep.root];
      if (!(did in current.deployments) && snap.kind !== "absent" && !d.adopt_existing) {
        throw new OpsError("project directory exists: explicit verified adoption is required for " + did);
      }
    }
    const seen = new Set();
    for (const op of ops) {
      if (["write", "quarantine", "purge-quarantine"].includes(op.kind)) {
        op.expected = snapshots[op.host_id][op.path];
        if (op.path.endsWith(".ops-project.json") && ![null, undefined].includes(op.expected?.owner) && digest(op.expected.owner) !== digest(JSON.parse(op.content))) {
          throw new OpsError("project root is owned by a different deployment");
        }
        if (op.kind === "write") {
          const key = op.host_id + "\0" + op.path;
          if (seen.has(key)) throw new OpsError("two writes to the same file in one plan: " + op.path);
          seen.add(key);
          if (!["file", "absent"].includes(op.expected.kind)) throw new OpsError("file destination is not a regular file");
        }
      }
    }
    const refs = credentialsIn(ops);
    for (const d of Object.values(after.deployments)) for (const r of credentialRefs(after, d)) refs.add(r);
    for (const a of Object.values(after.allocations)) {
      if (uniqueDocs.includes(a.provider_deployment_id)) refs.add(a.credential_ref);
    }
    for (const b of Object.values(after.bindings)) {
      if (uniqueDocs.includes(b.consumer_deployment_id)) refs.add(b.credential_ref);
    }
    const cv = {};
    for (const ref of [...refs].sort()) {
      const [cid, version] = ref.split("@");
      const value = ledger.entries?.[cid]?.[version];
      if (!value) throw new OpsError("missing plaintext credential version: " + ref);
      cv[ref] = digest(value);
    }
    const created = now();
    const expires = new Date(Date.now() + (spec.expires_hours ?? 24) * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
    const registry_scope = computeRegistryScope(current, after, selected, ops, uniqueDocs);
    const plan = {
      schema_version: 1, artifact: "ops-resource-plan", run_id: rid, worker: spec.worker, operation: spec.operation, reason: spec.reason,
      created_at: created, expires_at: expires, controller_id: current.controller.controller_id,
      registry_digest: digest(current), registry_slice_digest: sliceDigest(current, registry_scope), registry_scope, registry_revision: current.revision,
      hosts: selected, transport_digests: Object.fromEntries(Object.entries(selected).map(([hid, h]) => [hid, hostTransportDigest(h)])),
      inventories, operations: ops, registry_after: after, credential_versions: cv, document_targets: uniqueDocs, document_preconditions: docPreconditions,
      allow_adopt_roots: spec.allow_adopt_roots || [], external_files: external, affected_consumers: [...affected].sort(), rollback_note: spec.rollback_note,
      risk: spec.risk ?? (spec.worker === "D" ? "production-critical" : "external-mutation"), source_digests: sourceDigests,
    };
    plan.engine_digest = engineDigest();
    validate(plan, "plan");
    const path = runDir(state, plan);
    writeJson(join(path, "plan.json"), plan, { exclusive: true });
    atomicWrite(join(path, "PLAN.md"), planReport(plan), 0o600, { exclusive: true });
    for (const hid of Object.keys(selected)) {
      const link = join(state, "hosts", hid, "runs", rid, "reference.json");
      writeJson(link, { run_id: rid, plan_path: pathRelative(state, join(path, "plan.json")).replaceAll("\\", "/"), plan_digest: digest(plan) }, { exclusive: true });
    }
    return { run_id: rid, plan_path: join(path, "plan.json"), report: join(path, "PLAN.md"), plan_digest: digest(plan), steps: ops.length, status: "awaiting-approval" };
  });
}


