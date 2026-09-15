/** Strict resource contracts and atomic controller-side catalog operations. */
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  OpsError, canonical, digest, emptyStatus, exact, identifier, now, readJson, relative,
  rootPath, targetJoin, within, withLock, writeJson,
} from "./core.mjs";

const SCHEMAS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "schemas");

export function validate(value, schemaName) {
  const schema = JSON.parse(readFileSync(join(SCHEMAS, `${schemaName}.schema.json`), "utf8"));
  function walk(v, s, label) {
    if (s.$ref) {
      let node = schema;
      for (const k of s.$ref.replace(/^#\//, "").split("/")) node = node[k];
      return walk(v, node, label);
    }
    if (s.oneOf) {
      let successes = 0;
      for (const branch of s.oneOf) {
        try { walk(v, branch, label); successes++; } catch (error) {
          if (!(error instanceof OpsError)) throw error;
        }
      }
      if (successes !== 1) throw new OpsError(`${label}: oneOf contract not satisfied`);
    }
    const kinds = {
      object: (x) => x !== null && typeof x === "object" && !Array.isArray(x),
      array: Array.isArray,
      string: (x) => typeof x === "string",
      integer: (x) => Number.isInteger(x) && typeof x !== "boolean",
      boolean: (x) => typeof x === "boolean",
      null: (x) => x === null,
      number: (x) => typeof x === "number" && Number.isFinite(x),
    };
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      if (!types.some((t) => kinds[t](v))) throw new OpsError(`${label}: wrong type`);
    }
    if ("const" in s && v !== s.const) throw new OpsError(`${label}: wrong constant`);
    if (s.enum && !s.enum.includes(v)) throw new OpsError(`${label}: invalid enum`);
    if (typeof v === "string") {
      if (v.length < (s.minLength ?? 0) || v.length > (s.maxLength ?? 10000000)) throw new OpsError(`${label}: string length`);
      if (s.pattern && !new RegExp(s.pattern).test(v)) throw new OpsError(`${label}: invalid pattern`);
    }
    if (typeof v === "number" && Number.isFinite(v) && typeof v !== "boolean") {
      if (v < (s.minimum ?? -Infinity) || v > (s.maximum ?? Infinity)) throw new OpsError(`${label}: number out of range`);
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if ((s.required ?? []).some((k) => !(k in v))) {
        throw new OpsError(`${label}: missing ${pyList((s.required ?? []).filter((k) => !(k in v)).sort())}`);
      }
      const props = s.properties ?? {};
      for (const [k, item] of Object.entries(v)) {
        if (k in props) walk(item, props[k], `${label}.${k}`);
        else if (s.additionalProperties === false) throw new OpsError(`${label}: unknown field ${k}`);
        else if (s.additionalProperties && typeof s.additionalProperties === "object") walk(item, s.additionalProperties, `${label}.${k}`);
      }
      if (s.propertyNames) for (const k of Object.keys(v)) walk(k, s.propertyNames, `${label}.<key>`);
    }
    if (Array.isArray(v)) {
      if (v.length < (s.minItems ?? 0)) throw new OpsError(`${label}: too few items`);
      if (s.uniqueItems && new Set(v.map((x) => canonical(x).toString("hex"))).size !== v.length) {
        throw new OpsError(`${label}: duplicate items`);
      }
      v.forEach((x, i) => walk(x, s.items ?? {}, `${label}[${i}]`));
    }
  }
  walk(value, schema, schemaName);
}

function pyList(items) {
  return `[${items.map((x) => `'${x}'`).join(", ")}]`;
}

export function deploymentRoot(host, projectId, environment, instance, layout) {
  for (const x of [projectId, environment, instance]) identifier(x);
  if (layout === "flat") return targetJoin(host, projectId);
  if (layout === "instances") return targetJoin(host, projectId, `instances/${environment}/${instance}`);
  throw new OpsError("unknown deployment layout");
}

export function validateHost(host) {
  validate(host, "host");
  identifier(host.host_id);
  if (rootPath(host.root, host.platform) !== host.root) throw new OpsError("host root must be normalized");
  if (host.transport === "local" && host.connection && Object.keys(host.connection).length) {
    throw new OpsError("local host connection must be empty");
  }
  if (host.transport === "ssh") {
    const c = host.connection;
    for (const k of ["hostname", "username", "known_hosts", "node"]) {
      if (!c?.[k]) throw new OpsError("ssh connection missing " + k);
    }
    if (!/^[A-Za-z0-9_.:-]+$/.test(c.hostname) || c.hostname.startsWith("-")) throw new OpsError("unsafe SSH hostname");
    if (!/^[A-Za-z0-9_.-]+$/.test(c.username) || c.username.startsWith("-")) throw new OpsError("unsafe SSH username");
    const nodePattern = host.platform === "windows" ? /^[A-Za-z0-9_./:\\ +-]+$/ : /^[\/A-Za-z0-9_.+-]+$/;
    if (!nodePattern.test(c.node) || c.node.startsWith("-")) {
      throw new OpsError("SSH Node must be a safe executable path, not a command");
    }
    if (!["posix", "powershell"].includes(c.shell ?? "posix")) throw new OpsError("unsupported remote shell");
  }
  if (!/^[a-f0-9]{64}$/.test(host.identity)) throw new OpsError("host identity must be a probed machine digest");
}

export function validateStatus(s) {
  if (s.schema_version !== 3) {
    throw new OpsError("ops-legacy-state: preserve the old state; run import-legacy into a new empty state root");
  }
  validate(s, "status");
  const roots = new Set();
  const physicalRoots = [];
  for (const [hid, h] of Object.entries(s.hosts)) {
    validateHost(h);
    if (hid !== h.host_id) throw new OpsError("host index identity mismatch");
    const physical = `${h.identity}:${h.platform === "windows" ? h.root.toLowerCase() : h.root}`;
    if (roots.has(physical)) throw new OpsError("duplicate physical host/root registered under different IDs");
    roots.add(physical);
    for (const [identity, other, platform] of physicalRoots) {
      if (identity === h.identity && platform !== h.platform) throw new OpsError("same physical identity has inconsistent platform");
      if (identity === h.identity && (within(h.root, other, platform) || within(other, h.root, platform))) {
        throw new OpsError("overlapping registered host roots");
      }
    }
    physicalRoots.push([h.identity, h.root, h.platform]);
  }
  for (const [pid, p] of Object.entries(s.projects)) {
    validate(p, "project"); identifier(pid);
    if (pid !== p.project_id) throw new OpsError("project index identity mismatch");
    if (p.kind === "shared-service" && !p.service_type) throw new OpsError("shared provider requires service_type");
  }
  const used = new Set();
  const occupied = [];
  for (const [did, d] of Object.entries(s.deployments)) {
    validate(d, "deployment");
    if (did !== d.deployment_id) throw new OpsError("deployment index mismatch");
    if (!(d.host_id in s.hosts) || !(d.project_id in s.projects)) throw new OpsError("orphan deployment");
    const h = s.hosts[d.host_id];
    const expected = deploymentRoot(h, d.project_id, d.environment, d.instance, d.layout);
    if (d.root !== expected) throw new OpsError("deployment root does not follow host/project policy");
    const slot = `${h.identity}:${h.platform === "windows" ? expected.toLowerCase() : expected}`;
    if (used.has(slot)) throw new OpsError("two deployments occupy the same directory; use explicit instances layout");
    used.add(slot);
    for (const [identity, other, platform] of occupied) {
      if (identity === h.identity && platform !== h.platform) throw new OpsError("same physical identity has inconsistent platform");
      if (identity === h.identity && (within(expected, other, platform) || within(other, expected, platform))) {
        throw new OpsError("overlapping flat/instances deployment roots require an explicit migration");
      }
    }
    occupied.push([h.identity, expected, h.platform]);
    for (const item of d.storage) {
      if (!within(item.path, d.root, h.platform)) throw new OpsError("persistent path outside APP root");
    }
  }
  for (const [aid, a] of Object.entries(s.allocations)) {
    validate(a, "allocation");
    if (aid !== a.allocation_id || !(a.provider_deployment_id in s.deployments)) throw new OpsError("orphan allocation");
    const pd = s.deployments[a.provider_deployment_id];
    if (s.projects[pd.project_id].kind !== "shared-service") throw new OpsError("allocation provider must be shared-service");
    if (!(a.owner_project_id in s.projects)) throw new OpsError("allocation owner missing");
  }
  const resources = new Set();
  for (const a of Object.values(s.allocations)) {
    if (a.status === "retired") continue;
    const key = `${a.provider_deployment_id}|${a.resource_kind}|${a.resource_name}`;
    if (resources.has(key)) throw new OpsError("duplicate logical allocation: use one allocation for replicas");
    resources.add(key);
  }
  const edges = {};
  for (const [bid, b] of Object.entries(s.bindings)) {
    validate(b, "binding");
    if (bid !== b.binding_id || !(b.consumer_deployment_id in s.deployments)) throw new OpsError("orphan binding");
    const consumer = s.deployments[b.consumer_deployment_id];
    if (b.mode === "shared") {
      if (!(b.allocation_id in s.allocations)) throw new OpsError("binding allocation missing");
      const a = s.allocations[b.allocation_id];
      if (a.provider_deployment_id !== b.provider_deployment_id) throw new OpsError("binding provider disagrees with allocation");
      if (a.owner_project_id !== consumer.project_id || a.environment !== consumer.environment) {
        if (!(a.shared_owners ?? []).includes(consumer.project_id)) throw new OpsError("cross-app/environment sharing requires explicit shared owners");
      }
      if (b.credential_ref !== a.credential_ref) throw new OpsError("binding must use allocation's application credential");
      if (a.status === "retired" && b.status === "active") throw new OpsError("active consumer uses retired allocation");
      (edges[b.consumer_deployment_id] ??= new Set()).add(b.provider_deployment_id);
    } else if (b.mode === "external") {
      if (b.provider_deployment_id != null || b.allocation_id != null) throw new OpsError("external binding cannot claim local provider data");
    } else if (b.mode === "dedicated") {
      if (b.allocation_id != null || b.provider_deployment_id != null) throw new OpsError("dedicated component cannot reference shared provider/allocation");
    }
    if (b.status === "active" && consumer.status === "retired") throw new OpsError("retired deployment retains active binding");
  }
  const done = new Set();
  function visit(node, trail) {
    if (trail.has(node)) throw new OpsError("cyclic service dependencies");
    if (done.has(node)) return;
    for (const nxt of edges[node] ?? []) visit(nxt, new Set([...trail, node]));
    done.add(node);
  }
  for (const node of Object.keys(edges)) visit(node, new Set());
}

export function load(state) {
  const s = readJson(join(state, "status.json"));
  validateStatus(s);
  return s;
}

export function save(state, s, { bump = true } = {}) {
  validateStatus(s);
  if (bump) s.revision += 1;
  s.updated_at = now();
  writeJson(join(state, "status.json"), s);
}

export function ledgerLoad(state) {
  const p = join(state, "private", "credentials.json");
  if (!existsSync(p)) return { schema_version: 1, entries: {} };
  if (process.platform !== "win32" && (statSync(p).mode & 0o077)) {
    throw new OpsError("plaintext ledger permissions too broad; run chmod 600 explicitly");
  }
  return readJson(p);
}

export function putCredential(state, value) {
  exact(value, new Set(["credential_id", "version", "values", "purpose"]), new Set(["credential_id", "version", "values", "purpose"]), "credential");
  identifier(value.credential_id);
  if (!Number.isInteger(value.version) || value.version < 1 || !value.values || !Object.keys(value.values).length) {
    throw new OpsError("credential version/values invalid");
  }
  for (const [k, v] of Object.entries(value.values)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) || typeof v !== "string" || !v || v.includes("\x00")) {
      throw new OpsError("credential fields must be named nonempty strings");
    }
  }
  return withLock(join(state, ".locks", "catalog"), { operation: "credential-import" }, () => {
    load(state);
    const ledger = ledgerLoad(state);
    const entries = ledger.entries[value.credential_id] ??= {};
    const version = String(value.version);
    if (version in entries) {
      if (digest(entries[version].values) !== digest(value.values)) {
        throw new OpsError("immutable credential version: use a new explicit version");
      }
      return { credential_ref: `${value.credential_id}@${version}`, status: "unchanged" };
    }
    entries[version] = { values: value.values, purpose: value.purpose, created_at: now() };
    writeJson(join(state, "private", "credentials.json"), ledger);
    return { credential_ref: `${value.credential_id}@${version}`, status: "recorded-not-rotated-on-server" };
  });
}

export function register(state, request) {
  exact(request, new Set(["hosts", "projects"]), new Set(), "registration");
  return withLock(join(state, ".locks", "catalog"), { operation: "register" }, () => {
    const s = load(state);
    for (const [group, idkey] of [["hosts", "host_id"], ["projects", "project_id"]]) {
      for (const item of request[group] ?? []) {
        const key = item[idkey];
        if (key in s[group] && digest(s[group][key]) !== digest(item)) {
          throw new OpsError(`registered identity is immutable through register: ${group}/${key}; use a reviewed migration`);
        }
        s[group][key] = item;
      }
    }
    save(state, s);
    return { revision: s.revision, hosts: Object.keys(s.hosts), projects: Object.keys(s.projects) };
  });
}

export { emptyStatus };
